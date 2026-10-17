export type AccountType = 'bank' | 'cash' | 'card';

export type EventType =
  | 'income'
  | 'purchase'
  | 'refund'
  | 'card_payment'
  | 'own_transfer'
  | 'fee';

export interface AccountPosting {
  account_id: string;
  delta_paise: number;
}

export interface SourceObservation {
  id: string;
  source_type: 'manual' | 'statement_import';
  batch_id?: string;
  raw_description?: string;
  ref_no?: string;
  extracted_date?: string;
  extracted_amount_paise?: number;
}

export interface FinancialEvent {
  id: string;
  date: string; // YYYY-MM-DD in Asia/Kolkata
  type: EventType;
  recipient: string;
  category: string | null;
  income_paise: number;
  spending_paise: number;
  postings: AccountPosting[];
  linked_purchase_id?: string;
  notes?: string;
  source_observations?: SourceObservation[];
}

export interface ImportBatch {
  id: string;
  filename: string;
  account_id: string;
  imported_at: string;
  row_count: number;
  created_event_ids: string[];
  merged_event_ids: string[];
  status: 'active' | 'undone';
}

export type MatchStatus = 'NEW_RECORD' | 'EXACT_MATCH' | 'UNCERTAIN_MATCH' | 'DUPLICATE_IMPORT';

export interface ImportRowCandidate {
  row_index: number;
  date: string;
  description: string;
  ref_no?: string;
  debit_paise: number;
  credit_paise: number;
  delta_paise: number;
  inferred_type: EventType;
  inferred_category: string | null;
  match_status: MatchStatus;
  matched_event_id?: string;
  confidence_reason?: string;
}

export interface CardStatement {
  id: string;
  account_id: string;
  statement_date: string;
  due_date: string;
  statement_total_paise: number;
  minimum_due_paise: number;
  allocated_payments_paise: number;
  is_settled: boolean;
}

export interface EmiPlan {
  id: string;
  purchase_event_id?: string;
  account_id: string;
  merchant: string;
  original_principal_paise: number;
  monthly_instalment_paise: number;
  total_tenure_months: number;
  instalments_billed: number;
  remaining_principal_paise: number;
  annual_interest_rate_pct: number;
  start_date: string;
  next_due_date: string;
  billed_in_statement_id?: string; // Links to statement bill for deduplication!
  status: 'active' | 'completed' | 'foreclosed';
}

export interface CashPlanningConfig {
  horizon_days: number;
  emergency_buffer_paise: number;
}

export interface CashPlanningSummary {
  liquid_funds_paise: number;
  card_bills_due_paise: number;
  standalone_emis_due_paise: number;
  deduplicated_emis_count: number;
  total_upcoming_obligations_paise: number;
  emergency_buffer_paise: number;
  planning_available_paise: number;
}



export interface Account {
  id: string;
  label: string;
  type: AccountType;
  opening_date: string;
  opening_position_paise: number;
  currency?: string;
  masked_suffix?: string;
}

export interface PeriodSummary {
  from: string;
  through: string;
  received_income_paise: number;
  net_spending_paise: number;
  liquid_funds_paise: number;
  card_outstanding_paise: number;
  opening_net_position_paise: number;
  closing_net_position_paise: number;
  closing_positions_paise: Record<string, number>;
  category_breakdown: Record<string, number>;
}

export interface DemoFixture {
  fixture_version: number;
  synthetic: boolean;
  description: string;
  currency: string;
  timezone: string;
  period: {
    from: string;
    through: string;
  };
  money_unit: string;
  posting_convention: string;
  accounts: Account[];
  events: FinancialEvent[];
  expected: {
    closing_positions_paise: Record<string, number>;
    received_income_paise: number;
    net_spending_paise: number;
    liquid_funds_paise: number;
    card_outstanding_paise: number;
    opening_net_position_paise: number;
    closing_net_position_paise: number;
  };
  notes: string[];
}

export interface CategoryRule {
  id: string;
  recipient_pattern: string;
  category: string;
  account_id?: string;
  created_at: string;
  match_count: number;
}

export interface ToolCallExecution {
  name: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown>;
  supporting_record_count?: number;
}

export interface ActionProposal {
  type: 'create_entry' | 'create_rule';
  payload: {
    entry?: {
      type: EventType;
      amount_paise: number;
      date: string;
      account_id: string;
      recipient: string;
      category?: string;
      notes?: string;
    };
    rule?: {
      recipient_pattern: string;
      category: string;
      account_id?: string;
    };
  };
  status: 'pending' | 'accepted' | 'dismissed';
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  tool_calls?: ToolCallExecution[];
  action_proposal?: ActionProposal;
  token_estimate?: number;
  is_mock?: boolean;
}
