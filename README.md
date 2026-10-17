# Personal Finance Tracker

An installable personal finance web app for bank/card statement imports, daily expense capture, remembered categorisation, card bills, EMIs, and an integrated Gemini assistant.

**Status: Milestone M1 runnable prototype, version 0.1, 18 October 2026 (Asia/Kolkata).** Local React/TypeScript/Vite prototype with Overview, Accounts, Transactions, Manual Entry, and deterministic integer paise accounting verified against bundled synthetic fixtures. No external backend credentials, live AI keys, or cloud deployments are required for this milestone.

## Running the application locally

Ensure Node LTS (v20+ or v22+) is installed.

```bash
# 1. Install pinned dependencies
npm install

# 2. Run automated financial invariant & accounting test suite
npm test

# 3. Build production bundle (TypeScript type checking + Vite bundler)
npm run build

# 4. Start local development server
npm run dev
```

The application will start at `http://127.0.0.1:5173/` or `http://localhost:5173/`.

## Key features implemented in M1

- **Deterministic Integer Paise Accounting**: All monetary arithmetic operates in integer paise (`1 INR = 100 paise`), preventing floating point rounding errors.
- **Signed Net-Position Ledger**: Bank and cash assets are positive; credit card liabilities are negative and presented as positive outstanding balances.
- **Overview Dashboard**: Five key metric cards (Received Income, Net Spending, Liquid Funds, Card Outstanding, Net Position) with explicit mathematical invariant proof banner:
  $$\text{Opening (₹1,200)} + \text{Income (₹6,000)} - \text{Spending (₹900)} = \text{Closing (₹6,300)}$$
- **Visual & Accessible Breakdowns**: Category spending chart with both Recharts visualization and accessible tabular breakdown.
- **Accounts Screen**: Bank, Cash, and Card accounts displaying opening positions, period deltas, and current balances.
- **Transactions Ledger & Drawer**: Search, filter by account/category/type, responsive table and card views, and slide-over detail drawer showing exact account postings and provenance.
- **Manual Daily Entry**: Modal supporting 5 economic event types (Expense, Income, Refund, Own Transfer, Card Repayment) with immediate ledger updates.
- **Reset Demo Data**: Easily restore the exact initial synthetic fixture state at any time.
- **Clear Milestone Navigation**: Upcoming capabilities (Statements & Imports [M2], Cards & EMIs [M4], Gemini Assistant [M5], Settings & Sync [M3]) are honestly labelled as planned milestones without fake integrations.

## Documentation Index

| File | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Invariants and instructions for coding assistants |
| [docs/PRD.md](docs/PRD.md) | Product scope, user journeys, acceptance criteria |
| [docs/M1_TASK_PLAN.md](docs/M1_TASK_PLAN.md) | M1 concrete implementation plan and verification checklist |
| [docs/STATUS.md](docs/STATUS.md) | Current progress, latest validation evidence, and next actions |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Entities, monetary conventions, reconciliation rules |
| [docs/TECH_ARCHITECTURE.md](docs/TECH_ARCHITECTURE.md) | Proposed stack, data flows, AI and privacy boundaries |
| [docs/UX_DESIGN.md](docs/UX_DESIGN.md) | Responsive screens, states, and interaction design |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Confirmed choices, proposed defaults, unresolved items |
| [docs/SETUP_AND_GIT.md](docs/SETUP_AND_GIT.md) | Folder, Git, model, and credential setup |
| [docs/SOURCES.md](docs/SOURCES.md) | Official references for changeable provider facts |

