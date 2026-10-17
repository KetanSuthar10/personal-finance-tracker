import { DemoFixture, CardStatement, EmiPlan, CashPlanningConfig } from '../domain/types';

export const DEMO_STATEMENTS: CardStatement[] = [
  {
    id: 'stmt-2026-09',
    account_id: 'demo-card',
    statement_date: '2026-09-30',
    due_date: '2026-10-20',
    statement_total_paise: 80000, // ₹800.00 total bill
    minimum_due_paise: 5000,    // ₹50.00 minimum due
    allocated_payments_paise: 30000, // ₹300.00 repayment made on 07/10
    is_settled: false, // ₹500.00 remaining due
  },
];

export const DEMO_EMIS: EmiPlan[] = [
  {
    id: 'emi-laptop',
    merchant: 'Sample Electronics - Work Laptop',
    account_id: 'demo-card',
    original_principal_paise: 3000000, // ₹30,000.00
    monthly_instalment_paise: 525000,  // ₹5,250.00
    total_tenure_months: 6,
    instalments_billed: 2,
    remaining_principal_paise: 2000000, // ₹20,000.00
    annual_interest_rate_pct: 14.0,
    start_date: '2026-08-15',
    next_due_date: '2026-10-20',
    billed_in_statement_id: 'stmt-2026-09', // DEDUPLICATED against statement bill!
    status: 'active',
  },
  {
    id: 'emi-phone',
    merchant: 'Mobile Store - Smartphone',
    account_id: 'demo-card',
    original_principal_paise: 1500000, // ₹15,000.00
    monthly_instalment_paise: 260000,  // ₹2,600.00
    total_tenure_months: 6,
    instalments_billed: 0,
    remaining_principal_paise: 1500000,
    annual_interest_rate_pct: 12.0,
    start_date: '2026-10-10',
    next_due_date: '2026-11-10', // Standalone, due in November
    status: 'active',
  },
];

export const DEMO_PLANNING_CONFIG: CashPlanningConfig = {
  horizon_days: 30,
  emergency_buffer_paise: 200000, // ₹2,000.00 reserve
};

export const DEMO_FIXTURE: DemoFixture = {
  fixture_version: 1,
  synthetic: true,
  description: "Fictional INR ledger for M1 calculation checks; not the owner's finances.",
  currency: "INR",
  timezone: "Asia/Kolkata",
  period: { "from": "2026-10-01", "through": "2026-10-17" },
  money_unit: "integer_paise",
  posting_convention: "signed_net_position_assets_positive_liabilities_negative",
  accounts: [
    { "id": "demo-bank", "label": "Demo bank", "type": "bank", "opening_date": "2026-09-30", "opening_position_paise": 100000, "masked_suffix": "•• 4128" },
    { "id": "demo-cash", "label": "Cash wallet", "type": "cash", "opening_date": "2026-09-30", "opening_position_paise": 20000 },
    { "id": "demo-card", "label": "Demo credit card", "type": "card", "opening_date": "2026-09-30", "opening_position_paise": 0, "masked_suffix": "•• 9012" }
  ],
  events: [
    { "id": "salary", "date": "2026-10-01", "type": "income", "recipient": "Demo employer", "category": "Salary", "income_paise": 500000, "spending_paise": 0, "postings": [{ "account_id": "demo-bank", "delta_paise": 500000 }] },
    { "id": "cafe", "date": "2026-10-03", "type": "purchase", "recipient": "Sample cafe", "category": "Dining", "income_paise": 0, "spending_paise": 12000, "postings": [{ "account_id": "demo-bank", "delta_paise": -12000 }] },
    { "id": "parking", "date": "2026-10-04", "type": "purchase", "recipient": "Sample parking", "category": "Transport", "income_paise": 0, "spending_paise": 6000, "postings": [{ "account_id": "demo-cash", "delta_paise": -6000 }] },
    { "id": "groceries", "date": "2026-10-05", "type": "purchase", "recipient": "Sample grocery store", "category": "Groceries", "income_paise": 0, "spending_paise": 80000, "postings": [{ "account_id": "demo-card", "delta_paise": -80000 }] },
    { "id": "card-payment", "date": "2026-10-07", "type": "card_payment", "recipient": "Demo credit card", "category": null, "income_paise": 0, "spending_paise": 0, "postings": [{ "account_id": "demo-bank", "delta_paise": -30000 }, { "account_id": "demo-card", "delta_paise": 30000 }] },
    { "id": "cash-withdrawal", "date": "2026-10-08", "type": "own_transfer", "recipient": "Cash wallet", "category": null, "income_paise": 0, "spending_paise": 0, "postings": [{ "account_id": "demo-bank", "delta_paise": -10000 }, { "account_id": "demo-cash", "delta_paise": 10000 }] },
    { "id": "client-income", "date": "2026-10-10", "type": "income", "recipient": "Demo client", "category": "Additional income", "income_paise": 100000, "spending_paise": 0, "postings": [{ "account_id": "demo-bank", "delta_paise": 100000 }] },
    { "id": "grocery-refund", "date": "2026-10-12", "type": "refund", "linked_purchase_id": "groceries", "recipient": "Sample grocery store", "category": "Groceries", "income_paise": 0, "spending_paise": -10000, "postings": [{ "account_id": "demo-card", "delta_paise": 10000 }] },
    { "id": "card-fee", "date": "2026-10-14", "type": "fee", "recipient": "Demo card issuer", "category": "Finance charges", "income_paise": 0, "spending_paise": 2000, "postings": [{ "account_id": "demo-card", "delta_paise": -2000 }] }
  ],
  expected: {
    closing_positions_paise: { "demo-bank": 648000, "demo-cash": 24000, "demo-card": -42000 },
    received_income_paise: 600000,
    net_spending_paise: 90000,
    liquid_funds_paise: 672000,
    card_outstanding_paise: 42000,
    opening_net_position_paise: 120000,
    closing_net_position_paise: 630000
  },
  notes: [
    "Reference income_paise and spending_paise values document expected event semantics; a production engine should derive them from validated event types and amounts, not trust imported totals.",
    "Card repayment is partial relative to the purchase; it is not an additional expense.",
    "Forecasts, EMI conversions and import matching need separate milestone fixtures before being claimed as implemented."
  ]
};
