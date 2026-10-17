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
