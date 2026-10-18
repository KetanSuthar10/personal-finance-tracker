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
import { calculatePeriodSummary } from '../domain/ledger';
import { DEMO_FIXTURE, DEMO_STATEMENTS, DEMO_EMIS, DEMO_PLANNING_CONFIG } from './demoFixture';
import { LedgerRepository } from './repository';
import { createBackup, validateAndParseBackup } from '../domain/backup';

const DEMO_RULES: CategoryRule[] = [
  {
    id: 'rule_demo_1',
    recipient_pattern: 'Swiggy',
    category: 'Food & Dining',
    created_at: '2026-10-01T00:00:00.000Z',
    match_count: 5
  },
  {
    id: 'rule_demo_2',
    recipient_pattern: 'Uber',
    category: 'Transportation',
    created_at: '2026-10-01T00:00:00.000Z',
    match_count: 3
  },
  {
    id: 'rule_demo_3',
    recipient_pattern: 'Netflix',
    category: 'Entertainment',
    created_at: '2026-10-01T00:00:00.000Z',
    match_count: 1
  }
];

const STORAGE_KEY_ACCOUNTS = 'pft_accounts_v1';
const STORAGE_KEY_EVENTS = 'pft_events_v1';
const STORAGE_KEY_BATCHES = 'pft_batches_v1';
const STORAGE_KEY_STATEMENTS = 'pft_statements_v1';
const STORAGE_KEY_EMIS = 'pft_emis_v1';
const STORAGE_KEY_PLANNING = 'pft_planning_v1';
const STORAGE_KEY_RULES = 'pft_rules_v1';

export class LocalLedgerRepository implements LedgerRepository {
  private accounts: Account[];
  private events: FinancialEvent[];
  private batches: ImportBatch[];
  private statements: CardStatement[];
  private emiPlans: EmiPlan[];
  private planningConfig: CashPlanningConfig;
  private rules: CategoryRule[];

  constructor() {
    this.accounts = this.loadAccounts();
    this.events = this.loadEvents();
    this.batches = this.loadBatches();
    this.statements = this.loadStatements();
    this.emiPlans = this.loadEmiPlans();
    this.planningConfig = this.loadPlanningConfig();
    this.rules = this.loadRules();
  }

  private loadAccounts(): Account[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return [...DEMO_FIXTURE.accounts];
  }

  private loadEvents(): FinancialEvent[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY_EVENTS);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return [...DEMO_FIXTURE.events];
  }

  private loadBatches(): ImportBatch[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY_BATCHES);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return [];
  }

  private loadStatements(): CardStatement[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY_STATEMENTS);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return [...DEMO_STATEMENTS];
  }

  private loadEmiPlans(): EmiPlan[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY_EMIS);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return [...DEMO_EMIS];
  }

  private loadPlanningConfig(): CashPlanningConfig {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY_PLANNING);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return { ...DEMO_PLANNING_CONFIG };
  }

  private loadRules(): CategoryRule[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY_RULES);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return [...DEMO_RULES];
  }

  private persist() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(this.accounts));
        window.localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(this.events));
        window.localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(this.batches));
        window.localStorage.setItem(STORAGE_KEY_STATEMENTS, JSON.stringify(this.statements));
        window.localStorage.setItem(STORAGE_KEY_EMIS, JSON.stringify(this.emiPlans));
        window.localStorage.setItem(STORAGE_KEY_PLANNING, JSON.stringify(this.planningConfig));
        window.localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(this.rules));
      }
    } catch {
      // Ignore quota errors in private browsing
    }
  }

  async getAccounts(): Promise<Account[]> {
    return [...this.accounts];
  }

  async addAccount(accountData: CreateAccountData): Promise<Account> {
    const id = accountData.id || `acc_${accountData.type}_${Date.now()}`;
    const newAcc: Account = {
      ...accountData,
      id,
      current_position_paise: accountData.opening_position_paise,
    };
    this.accounts.push(newAcc);
    this.persist();
    return newAcc;
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
    const idx = this.accounts.findIndex(a => a.id === id);
    if (idx === -1) {
      throw new Error(`Account ${id} not found`);
    }
    const updated = { ...this.accounts[idx], ...updates };
    this.accounts[idx] = updated;
    this.persist();
    return updated;
  }

  async getEvents(options?: { fromDate?: string; throughDate?: string }): Promise<FinancialEvent[]> {
    let result = [...this.events];
    if (options?.fromDate) {
      result = result.filter(e => e.date >= options.fromDate!);
    }
    if (options?.throughDate) {
      result = result.filter(e => e.date <= options.throughDate!);
    }
    return result.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }

  async getEventById(id: string): Promise<FinancialEvent | null> {
    return this.events.find(e => e.id === id) || null;
  }

  async addEvent(eventData: Omit<FinancialEvent, 'id'>): Promise<FinancialEvent> {
    if (!Number.isSafeInteger(eventData.income_paise) || !Number.isSafeInteger(eventData.spending_paise)) {
      throw new Error('Income and spending paise must be finite safe integers.');
    }
    for (const p of eventData.postings) {
      if (!Number.isSafeInteger(p.delta_paise)) {
        throw new Error(`Posting delta_paise must be a finite safe integer: ${p.delta_paise}`);
      }
    }
    const id = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newEvent: FinancialEvent = { ...eventData, id };
    this.events.push(newEvent);
    this.persist();
    return newEvent;
  }

  async updateEvent(id: string, updates: Partial<FinancialEvent>): Promise<FinancialEvent> {
    const index = this.events.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error(`Event with id ${id} not found`);
    }
    const updated = { ...this.events[index], ...updates };
    this.events[index] = updated;
    this.persist();
    return updated;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const initialLen = this.events.length;
    this.events = this.events.filter(e => e.id !== id);
    if (this.events.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  async getSummary(fromDate: string, throughDate: string): Promise<PeriodSummary> {
    return calculatePeriodSummary(this.accounts, this.events, fromDate, throughDate);
  }

  async getImportBatches(): Promise<ImportBatch[]> {
    return [...this.batches].sort((a, b) => b.imported_at.localeCompare(a.imported_at));
  }

  async commitImportBatch(
    batch: ImportBatch,
    newEvents: FinancialEvent[],
    updatedEvents: FinancialEvent[]
  ): Promise<void> {
    this.events.push(...newEvents);
    for (const updated of updatedEvents) {
      const idx = this.events.findIndex(e => e.id === updated.id);
      if (idx !== -1) {
        this.events[idx] = updated;
      }
    }
    this.batches.push(batch);
    this.persist();
  }

  async undoImportBatch(batchId: string): Promise<boolean> {
    const batch = this.batches.find(b => b.id === batchId);
    if (!batch || batch.status === 'undone') {
      return false;
    }

    const createdSet = new Set(batch.created_event_ids);
    this.events = this.events.filter(e => !createdSet.has(e.id));

    for (const mergedId of batch.merged_event_ids) {
      const idx = this.events.findIndex(e => e.id === mergedId);
      if (idx !== -1) {
        const evt = this.events[idx];
        if (evt.source_observations) {
          evt.source_observations = evt.source_observations.filter(obs => obs.batch_id !== batchId);
        }
      }
    }

    batch.status = 'undone';
    this.persist();
    return true;
  }

  // M4: Statements & EMIs
  async getCardStatements(): Promise<CardStatement[]> {
    return [...this.statements].sort((a, b) => b.statement_date.localeCompare(a.statement_date));
  }

  async addCardStatement(stmt: Omit<CardStatement, 'id'>): Promise<CardStatement> {
    const id = `stmt-${Date.now()}`;
    const newStmt: CardStatement = { ...stmt, id };
    this.statements.push(newStmt);
    this.persist();
    return newStmt;
  }

  async getEmiPlans(): Promise<EmiPlan[]> {
    return [...this.emiPlans];
  }

  async addEmiPlan(emi: Omit<EmiPlan, 'id'>): Promise<EmiPlan> {
    const id = `emi-${Date.now()}`;
    const newEmi: EmiPlan = { ...emi, id };
    this.emiPlans.push(newEmi);
    this.persist();
    return newEmi;
  }

  async getPlanningConfig(): Promise<CashPlanningConfig> {
    return { ...this.planningConfig };
  }

  async updatePlanningConfig(config: Partial<CashPlanningConfig>): Promise<CashPlanningConfig> {
    this.planningConfig = { ...this.planningConfig, ...config };
    this.persist();
    return { ...this.planningConfig };
  }

  // Category Rules (M5)
  async getCategoryRules(): Promise<CategoryRule[]> {
    return [...this.rules];
  }

  async addCategoryRule(ruleData: Omit<CategoryRule, 'id' | 'created_at' | 'match_count'>): Promise<CategoryRule> {
    const newRule: CategoryRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipient_pattern: ruleData.recipient_pattern.trim(),
      category: ruleData.category.trim(),
      account_id: ruleData.account_id || undefined,
      created_at: new Date().toISOString(),
      match_count: 0
    };
    this.rules.unshift(newRule);
    this.persist();
    return newRule;
  }

  async deleteCategoryRule(id: string): Promise<boolean> {
    const initialLen = this.rules.length;
    this.rules = this.rules.filter(r => r.id !== id);
    if (this.rules.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // Backup & Restore (M3)
  async exportBackup(): Promise<string> {
    const payload = createBackup({
      accounts: this.accounts,
      events: this.events,
      batches: this.batches,
      statements: this.statements,
      emiPlans: this.emiPlans,
      planningConfig: this.planningConfig,
    });
    return JSON.stringify(payload, null, 2);
  }

  async restoreBackup(jsonString: string): Promise<{ success: boolean; eventCount: number; accountCount: number }> {
    const validation = validateAndParseBackup(jsonString);
    if (!validation.isValid || !validation.payload) {
      throw new Error(validation.error || 'Invalid backup file.');
    }

    const { accounts, events, batches, statements, emiPlans, planningConfig } = validation.payload.data;

    this.accounts = accounts;
    this.events = events;
    this.batches = batches || [];
    this.statements = statements || [];
    this.emiPlans = emiPlans || [];
    if (planningConfig) {
      this.planningConfig = planningConfig;
    }

    this.persist();

    return {
      success: true,
      eventCount: this.events.length,
      accountCount: this.accounts.length,
    };
  }

  async resetToDemo(): Promise<void> {
    this.accounts = JSON.parse(JSON.stringify(DEMO_FIXTURE.accounts));
    this.events = JSON.parse(JSON.stringify(DEMO_FIXTURE.events));
    this.batches = [];
    this.statements = JSON.parse(JSON.stringify(DEMO_STATEMENTS));
    this.emiPlans = JSON.parse(JSON.stringify(DEMO_EMIS));
    this.planningConfig = { ...DEMO_PLANNING_CONFIG };
    this.rules = JSON.parse(JSON.stringify(DEMO_RULES));
    this.persist();
  }
}
