import { DemoFixture } from '../domain/types';

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
