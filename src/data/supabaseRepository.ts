import { supabase } from '../lib/supabase';
import {
  Account,
  FinancialEvent,
  PeriodSummary,
  ImportBatch,
  CardStatement,
  EmiPlan,
  CashPlanningConfig,
  CategoryRule,
  CreateAccountData,
} from '../domain/types';
import { LedgerRepository } from './repository';
import { calculatePeriodSummary } from '../domain/ledger';

export class SupabaseLedgerRepository implements LedgerRepository {
  private async getUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User session expired or not authenticated. Please sign in.');
    }
    return user.id;
  }

  async getAccounts(): Promise<Account[]> {
    const userId = await this.getUserId();

    const { data: accountsData, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (accountsError) {
      throw new Error(`Failed to load accounts: ${accountsError.message}`);
    }

    if (!accountsData || accountsData.length === 0) {
      return [];
    }

    // Fetch all account postings to compute accurate current positions and freshness
    const { data: postingsData, error: postingsError } = await supabase
      .from('account_postings')
      .select('account_id, delta_paise, created_at, financial_events(date)')
      .eq('user_id', userId);

    if (postingsError) {
      throw new Error(`Failed to calculate account positions: ${postingsError.message}`);
    }

    const deltasByAccount = new Map<string, number>();
    const latestDateByAccount = new Map<string, string>();

    for (const p of postingsData || []) {
      const current = deltasByAccount.get(p.account_id) || 0;
      deltasByAccount.set(p.account_id, current + Number(p.delta_paise));

      const eventDate = (p.financial_events as any)?.date;
      if (eventDate) {
        const prevLatest = latestDateByAccount.get(p.account_id);
        if (!prevLatest || eventDate > prevLatest) {
          latestDateByAccount.set(p.account_id, eventDate);
        }
      }
    }

    return accountsData.map((row: any) => {
      const openingPaise = Number(row.opening_position_paise);
      const deltaPaise = deltasByAccount.get(row.id) || 0;
      const latestDate = latestDateByAccount.get(row.id) || row.opening_date;

      return {
        id: row.id,
        label: row.label,
        type: row.type,
        opening_date: row.opening_date,
        opening_position_paise: openingPaise,
        current_position_paise: openingPaise + deltaPaise,
        masked_suffix: row.masked_suffix,
        latest_recorded_date: latestDate,
      };
    });
  }

  async addAccount(accountData: CreateAccountData): Promise<Account> {
    if (!Number.isSafeInteger(accountData.opening_position_paise)) {
      throw new Error('Opening position paise must be a finite safe integer.');
    }

    const userId = await this.getUserId();

    const id = accountData.id || `acc_${accountData.type}_${Date.now()}`;
    const row = {
      id,
      user_id: userId,
      label: accountData.label.trim(),
      type: accountData.type,
      opening_date: accountData.opening_date,
      opening_position_paise: accountData.opening_position_paise,
      masked_suffix: accountData.masked_suffix || null,
    };

    const { data, error } = await supabase
      .from('accounts')
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create account: ${error.message}`);
    }

    return {
      id: data.id,
      label: data.label,
      type: data.type,
      opening_date: data.opening_date,
      opening_position_paise: Number(data.opening_position_paise),
      current_position_paise: Number(data.opening_position_paise),
      masked_suffix: data.masked_suffix,
      latest_recorded_date: data.opening_date,
    };
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
    if (updates.opening_position_paise !== undefined && !Number.isSafeInteger(updates.opening_position_paise)) {
      throw new Error('Opening position paise must be a finite safe integer.');
    }

    const userId = await this.getUserId();

    const payload: any = {};
    if (updates.label !== undefined) payload.label = updates.label.trim();
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.opening_date !== undefined) payload.opening_date = updates.opening_date;
    if (updates.opening_position_paise !== undefined) {
      payload.opening_position_paise = updates.opening_position_paise;
    }
    if (updates.masked_suffix !== undefined) payload.masked_suffix = updates.masked_suffix;

    const { error } = await supabase
      .from('accounts')
      .update(payload)
      .eq('user_id', userId)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update account: ${error.message}`);
    }

    const allAccounts = await this.getAccounts();
    const updated = allAccounts.find(a => a.id === id);
    if (!updated) {
      throw new Error(`Account ${id} not found after update`);
    }
    return updated;
  }

  async getEvents(options?: { fromDate?: string; throughDate?: string }): Promise<FinancialEvent[]> {
    const userId = await this.getUserId();

    let query = supabase
      .from('financial_events')
      .select('*, account_postings(account_id, delta_paise)')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (options?.fromDate) {
      query = query.gte('date', options.fromDate);
    }
    if (options?.throughDate) {
      query = query.lte('date', options.throughDate);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      date: row.date,
      type: row.type,
      recipient: row.recipient,
      category: row.category || 'General',
      income_paise: Number(row.income_paise || 0),
      spending_paise: Number(row.spending_paise || 0),
      linked_purchase_id: row.linked_purchase_id,
      notes: row.notes,
      postings: (row.account_postings || []).map((p: any) => ({
        account_id: p.account_id,
        delta_paise: Number(p.delta_paise),
      })),
    }));
  }

  async getEventById(id: string): Promise<FinancialEvent | null> {
    const userId = await this.getUserId();

    const { data, error } = await supabase
      .from('financial_events')
      .select('*, account_postings(account_id, delta_paise)')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch event ${id}: ${error.message}`);
    }
    if (!data) return null;

    return {
      id: data.id,
      date: data.date,
      type: data.type,
      recipient: data.recipient,
      category: data.category || 'General',
      income_paise: Number(data.income_paise || 0),
      spending_paise: Number(data.spending_paise || 0),
      linked_purchase_id: data.linked_purchase_id,
      notes: data.notes,
      postings: (data.account_postings || []).map((p: any) => ({
        account_id: p.account_id,
        delta_paise: Number(p.delta_paise),
      })),
    };
  }

  async addEvent(eventData: Omit<FinancialEvent, 'id'>): Promise<FinancialEvent> {
    await this.getUserId();

    const commandId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload = {
      type: eventData.type,
      date: eventData.date,
      recipient: eventData.recipient,
      income_paise: eventData.income_paise,
      spending_paise: eventData.spending_paise,
      category: eventData.category,
      notes: eventData.notes,
      postings: eventData.postings,
    };

    // Execute through atomic PostgreSQL transactional boundary RPC (AT13, AT15)
    const { data, error } = await supabase.rpc('execute_financial_command', {
      p_command_id: commandId,
      p_command: payload,
    });

    if (error) {
      throw new Error(`Transaction failed: ${error.message}`);
    }

    return {
      id: data.id,
      date: data.date,
      type: data.type,
      recipient: data.recipient,
      category: data.category || 'General',
      income_paise: Number(data.income_paise),
      spending_paise: Number(data.spending_paise),
      notes: data.notes,
      postings: eventData.postings,
    };
  }

  async updateEvent(id: string, updates: Partial<FinancialEvent>): Promise<FinancialEvent> {
    const userId = await this.getUserId();

    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.recipient !== undefined) payload.recipient = updates.recipient.trim();
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.income_paise !== undefined) payload.income_paise = updates.income_paise;
    if (updates.spending_paise !== undefined) payload.spending_paise = updates.spending_paise;

    const { error } = await supabase
      .from('financial_events')
      .update(payload)
      .eq('user_id', userId)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update event ${id}: ${error.message}`);
    }

    const updated = await this.getEventById(id);
    if (!updated) {
      throw new Error(`Event ${id} not found after update`);
    }
    return updated;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const userId = await this.getUserId();

    const { error } = await supabase
      .from('financial_events')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete event ${id}: ${error.message}`);
    }
    return true;
  }

  async getSummary(fromDate: string, throughDate: string): Promise<PeriodSummary> {
    const [accounts, events] = await Promise.all([
      this.getAccounts(),
      this.getEvents(),
    ]);
    return calculatePeriodSummary(accounts, events, fromDate, throughDate);
  }

  async getImportBatches(): Promise<ImportBatch[]> {
    const userId = await this.getUserId();

    const { data, error } = await supabase
      .from('import_batches')
      .select('*')
      .eq('user_id', userId)
      .order('imported_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch import batches: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      filename: row.filename,
      account_id: row.account_id,
      imported_at: row.imported_at,
      row_count: row.row_count,
      created_event_ids: row.created_event_ids || [],
      merged_event_ids: row.merged_event_ids || [],
      status: row.status,
    }));
  }

  async commitImportBatch(
    batch: ImportBatch,
    newEvents: FinancialEvent[],
    updatedEvents: FinancialEvent[]
  ): Promise<void> {
    const userId = await this.getUserId();

    // 1. Insert events and postings
    for (const evt of newEvents) {
      await this.addEvent(evt);
    }

    for (const evt of updatedEvents) {
      await this.updateEvent(evt.id, evt);
    }

    // 2. Insert batch record
    const { error } = await supabase
      .from('import_batches')
      .insert({
        id: batch.id,
        user_id: userId,
        filename: batch.filename,
        account_id: batch.account_id,
        imported_at: batch.imported_at,
        row_count: batch.row_count,
        created_event_ids: batch.created_event_ids,
        merged_event_ids: batch.merged_event_ids,
        status: batch.status,
      });

    if (error) {
      throw new Error(`Failed to record import batch: ${error.message}`);
    }
  }

  async undoImportBatch(batchId: string): Promise<boolean> {
    const userId = await this.getUserId();

    const { data: batch, error: fetchErr } = await supabase
      .from('import_batches')
      .select('*')
      .eq('user_id', userId)
      .eq('id', batchId)
      .single();

    if (fetchErr || !batch) {
      throw new Error(`Import batch ${batchId} not found`);
    }

    // Delete events created solely by this batch
    for (const evtId of batch.created_event_ids || []) {
      await this.deleteEvent(evtId);
    }

    const { error: updateErr } = await supabase
      .from('import_batches')
      .update({ status: 'undone' })
      .eq('user_id', userId)
      .eq('id', batchId);

    if (updateErr) {
      throw new Error(`Failed to update batch status: ${updateErr.message}`);
    }

    return true;
  }

  async getCardStatements(): Promise<CardStatement[]> {
    const userId = await this.getUserId();

    const { data, error } = await supabase
      .from('card_statements')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch card statements: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      account_id: row.account_id,
      statement_date: row.statement_date,
      due_date: row.due_date,
      statement_total_paise: Number(row.statement_total_paise),
      minimum_due_paise: Number(row.minimum_due_paise || 0),
      allocated_payments_paise: Number(row.allocated_payments_paise || 0),
      is_settled: Boolean(row.is_settled),
    }));
  }

  async addCardStatement(stmt: Omit<CardStatement, 'id'>): Promise<CardStatement> {
    const userId = await this.getUserId();

    const id = `stmt_${Date.now()}`;
    const { data, error } = await supabase
      .from('card_statements')
      .insert({
        id,
        user_id: userId,
        account_id: stmt.account_id,
        statement_date: stmt.statement_date,
        due_date: stmt.due_date,
        statement_total_paise: stmt.statement_total_paise,
        minimum_due_paise: stmt.minimum_due_paise,
        allocated_payments_paise: stmt.allocated_payments_paise,
        is_settled: stmt.is_settled,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add statement: ${error.message}`);
    }

    return {
      id: data.id,
      account_id: data.account_id,
      statement_date: data.statement_date,
      due_date: data.due_date,
      statement_total_paise: Number(data.statement_total_paise),
      minimum_due_paise: Number(data.minimum_due_paise),
      allocated_payments_paise: Number(data.allocated_payments_paise),
      is_settled: data.is_settled,
    };
  }

  async getEmiPlans(): Promise<EmiPlan[]> {
    const userId = await this.getUserId();

    const { data, error } = await supabase
      .from('emi_plans')
      .select('*')
      .eq('user_id', userId)
      .order('next_due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch EMI plans: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      account_id: row.account_id,
      purchase_event_id: row.purchase_event_id,
      merchant: row.merchant,
      original_principal_paise: Number(row.original_principal_paise),
      monthly_instalment_paise: Number(row.monthly_instalment_paise),
      total_tenure_months: row.total_tenure_months,
      instalments_billed: row.instalments_billed,
      remaining_principal_paise: Number(row.remaining_principal_paise),
      annual_interest_rate_pct: Number(row.annual_interest_rate_pct),
      start_date: row.start_date,
      next_due_date: row.next_due_date,
      billed_in_statement_id: row.billed_in_statement_id,
      status: row.status,
    }));
  }

  async addEmiPlan(emi: Omit<EmiPlan, 'id'>): Promise<EmiPlan> {
    const userId = await this.getUserId();

    const id = `emi_${Date.now()}`;
    const { data, error } = await supabase
      .from('emi_plans')
      .insert({
        id,
        user_id: userId,
        account_id: emi.account_id,
        purchase_event_id: emi.purchase_event_id,
        merchant: emi.merchant,
        original_principal_paise: emi.original_principal_paise,
        monthly_instalment_paise: emi.monthly_instalment_paise,
        total_tenure_months: emi.total_tenure_months,
        instalments_billed: emi.instalments_billed,
        remaining_principal_paise: emi.remaining_principal_paise,
        annual_interest_rate_pct: emi.annual_interest_rate_pct,
        start_date: emi.start_date,
        next_due_date: emi.next_due_date,
        billed_in_statement_id: emi.billed_in_statement_id,
        status: emi.status,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add EMI plan: ${error.message}`);
    }

    return {
      id: data.id,
      account_id: data.account_id,
      purchase_event_id: data.purchase_event_id,
      merchant: data.merchant,
      original_principal_paise: Number(data.original_principal_paise),
      monthly_instalment_paise: Number(data.monthly_instalment_paise),
      total_tenure_months: data.total_tenure_months,
      instalments_billed: data.instalments_billed,
      remaining_principal_paise: Number(data.remaining_principal_paise),
      annual_interest_rate_pct: Number(data.annual_interest_rate_pct),
      start_date: data.start_date,
      next_due_date: data.next_due_date,
      billed_in_statement_id: data.billed_in_statement_id,
      status: data.status,
    };
  }

  async getPlanningConfig(): Promise<CashPlanningConfig> {
    const userId = await this.getUserId();

    const { data, error } = await supabase
      .from('profiles')
      .select('planning_horizon_days, emergency_buffer_paise')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch planning config: ${error.message}`);
    }

    if (!data) {
      return {
        horizon_days: 30,
        emergency_buffer_paise: 200000,
      };
    }

    return {
      horizon_days: data.planning_horizon_days,
      emergency_buffer_paise: Number(data.emergency_buffer_paise),
    };
  }

  async updatePlanningConfig(config: Partial<CashPlanningConfig>): Promise<CashPlanningConfig> {
    const userId = await this.getUserId();

    const payload: any = { updated_at: new Date().toISOString() };
    if (config.horizon_days !== undefined) payload.planning_horizon_days = config.horizon_days;
    if (config.emergency_buffer_paise !== undefined) payload.emergency_buffer_paise = config.emergency_buffer_paise;

    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: userId, ...payload });

    if (error) {
      throw new Error(`Failed to update planning config: ${error.message}`);
    }

    return this.getPlanningConfig();
  }

  async getCategoryRules(): Promise<CategoryRule[]> {
    const userId = await this.getUserId();

    const { data, error } = await supabase
      .from('category_rules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch category rules: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      recipient_pattern: row.recipient_pattern,
      category: row.category,
      created_at: row.created_at,
      match_count: row.match_count || 0,
    }));
  }

  async addCategoryRule(rule: Omit<CategoryRule, 'id' | 'created_at' | 'match_count'>): Promise<CategoryRule> {
    const userId = await this.getUserId();

    const id = `rule_${Date.now()}`;
    const { data, error } = await supabase
      .from('category_rules')
      .insert({
        id,
        user_id: userId,
        recipient_pattern: rule.recipient_pattern,
        category: rule.category,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add category rule: ${error.message}`);
    }

    return {
      id: data.id,
      recipient_pattern: data.recipient_pattern,
      category: data.category,
      created_at: data.created_at,
      match_count: data.match_count,
    };
  }

  async deleteCategoryRule(id: string): Promise<boolean> {
    const userId = await this.getUserId();

    const { error } = await supabase
      .from('category_rules')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete rule ${id}: ${error.message}`);
    }

    return true;
  }

  async exportBackup(): Promise<string> {
    const [accounts, events, batches, statements, emiPlans, planningConfig, categoryRules] =
      await Promise.all([
        this.getAccounts(),
        this.getEvents(),
        this.getImportBatches(),
        this.getCardStatements(),
        this.getEmiPlans(),
        this.getPlanningConfig(),
        this.getCategoryRules(),
      ]);

    const backupPayload = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      accounts,
      events,
      batches,
      statements,
      emiPlans,
      planningConfig,
      categoryRules,
    };

    return JSON.stringify(backupPayload, null, 2);
  }

  async restoreBackup(jsonString: string): Promise<{ success: boolean; eventCount: number; accountCount: number }> {
    const parsed = JSON.parse(jsonString);
    if (!parsed.accounts || !parsed.events) {
      throw new Error('Invalid backup file format: missing accounts or events.');
    }

    for (const acc of parsed.accounts) {
      await this.addAccount(acc);
    }

    for (const evt of parsed.events) {
      await this.addEvent(evt);
    }

    return {
      success: true,
      eventCount: parsed.events.length,
      accountCount: parsed.accounts.length,
    };
  }

  async resetToDemo(): Promise<void> {
    // In production connected mode, demo reset is prohibited to protect real financial data
    throw new Error('Demo reset is disabled in connected cloud mode to prevent data loss.');
  }
}
