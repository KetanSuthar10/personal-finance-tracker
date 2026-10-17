# Milestone 1 (M1) Implementation Task Plan

Status: Approved planning document for M1 execution  
Target: Local runnable React/TypeScript/Vite prototype with synthetic data foundation

---

## 1. Objectives & Scope Boundary

### Included in M1
- **Runnable Local SPA**: Vite + React + TypeScript web application running locally via `npm run dev`.
- **Domain Accounting Engine**: Pure TypeScript implementation of integer paise arithmetic, signed net-position ledger conventions, and period aggregations matching `fixtures/demo-transactions.json` exactly.
- **Repository Abstraction**: `LedgerRepository` interface with `LocalFixtureRepository` implementation supporting initial fixture seeding, in-memory/localStorage mutation, and "Reset Demo Data".
- **Responsive Layout Shell**:
  - Desktop (≥1024px): Collapsible left sidebar navigation, top header with period selector and "Add Entry" CTA.
  - Mobile (<768px): Sticky compact top bar, bottom navigation bar (Overview, Transactions, Accounts, More).
- **Core Screen Implementations**:
  1. **Overview / Dashboard**: KPI summary cards (Received Income, Net Spending, Liquid Funds, Card Outstanding, Net Position), category spending breakdown, simple monthly trend, recent transaction list.
  2. **Accounts View**: Account cards grouped by type (Bank, Cash, Credit Card) displaying opening balances, accepted delta, current position, and data freshness badge.
  3. **Transactions View**: Search by recipient/notes, filters (account, category, event type), tabular desktop view / stacked mobile card list, and transaction detail slide-over drawer showing individual account postings.
  4. **Manual Add / Edit Entry**: Unified form/drawer supporting 5 economic event types:
     - Income (destination account, recipient, category, amount)
     - Purchase / Expense (source account, recipient, category, amount)
     - Refund (target account, recipient, category, negative spending, linked purchase reference)
     - Own Transfer (source account debit, destination account credit, no income/spending)
     - Card Payment (bank debit, card credit, no income/spending)
- **Navigation Placeholders**: Clearly labelled, honest placeholder views for upcoming milestones (Statement Imports & Review [M2], Cards & EMI Plans [M4], AI Assistant [M5], Settings/Connected Sync [M3]).
- **Automated Verification**: Vitest unit test suite covering financial calculations, rupee-to-paise parsing, net-position invariants, transfer exclusions, and fixture reconciliation.

### Explicitly Excluded from M1
- No real bank statement PDF/CSV parsing or OCR (deferred to M2).
- No backend Supabase database, RLS policies, or Google OAuth (deferred to M3).
- No live Gemini API calls, API key requirements, or external cloud requests (deferred to M5).
- No n8n workflows, background cron jobs, or real push notifications (deferred to M7).
- No actual user credentials or real financial records.

---

## 2. Package Choices & Technical Specifications

| Dependency | Purpose | Justification |
| --- | --- | --- |
| `vite` | Build tool & dev server | Fast HMR, standard modern ESM bundler. |
| `react` & `react-dom` | UI framework | Component model, hooks, robust ecosystem. |
| `typescript` | Static typing | Strict financial schema validation and compile-time correctness. |
| `tailwindcss` (v3.4) | Styling & design tokens | Fast responsive utility styling, matches design system tokens. |
| `postcss` & `autoprefixer`| CSS post-processing | Browser compatibility for standard modern CSS. |
| `lucide-react` | Icons | Clean, lightweight, tree-shakeable icon set. |
| `recharts` | Visualizations | Responsive SVG charts for category spending and trends. |
| `clsx` & `tailwind-merge` | Class utility | Safe conditional Tailwind class compositions (`cn` helper). |
| `vitest` | Unit testing | Native Vite test runner, blazing fast execution for domain logic. |

*Note on runtime versions:* Node LTS (v20+ or v22+) is expected. Dependencies will be pinned with exact versions in `package.json` and committed alongside `package-lock.json`.

---

## 3. Concrete File & Module Plan

```text
personal-finance-tracker/
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── src/
│   ├── main.tsx                         # Application entrypoint
│   ├── App.tsx                          # App layout, router & navigation state
│   ├── index.css                        # Tailwind directives & CSS custom variables
│   │
│   ├── domain/                          # Pure business logic (Zero external UI dependencies)
│   │   ├── money.ts                     # Integer paise conversions, safe formatting (₹), validation
│   │   ├── types.ts                     # Canonical TypeScript interfaces (Account, Event, Posting, Period)
│   │   └── ledger.ts                    # Deterministic balance, income, spending, and position calculations
│   │
│   ├── data/                            # Repository layer
│   │   ├── repository.ts                # LedgerRepository interface definition
│   │   ├── demoFixture.ts               # Bundled copy/loader of fixtures/demo-transactions.json
│   │   └── localRepository.ts           # LocalStorage / In-memory implementation of LedgerRepository
│   │
│   ├── context/
│   │   └── LedgerContext.tsx            # React state provider exposing accounts, events, and actions
│   │
│   ├── components/                      # Shared UI components
│   │   ├── layout/
│   │   │   ├── Shell.tsx                # Responsive container with Desktop Sidebar & Mobile BottomNav
│   │   │   ├── Header.tsx               # Header with month filter, freshness badge, and Add Entry CTA
│   │   │   ├── Sidebar.tsx              # Desktop navigation
│   │   │   └── MobileNav.tsx            # Mobile bottom navigation bar
│   │   ├── ui/                          # Design primitives (button, badge, modal, input, select, card)
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Input.tsx
│   │   └── common/
│   │       ├── MoneyDisplay.tsx         # Standardized INR paise presentation component
│   │       ├── MilestoneBadge.tsx       # "M1 Live" vs "M2 Planned" indicator
│   │       └── EmptyState.tsx           # Helpful empty state illustration
│   │
│   ├── features/                        # Feature-specific screens & components
│   │   ├── overview/
│   │   │   ├── OverviewPage.tsx         # Dashboard layout
│   │   │   ├── KpiCards.tsx             # 5 core metric cards (Income, Spend, Liquid, Card, Net)
│   │   │   ├── CategorySpendChart.tsx   # Category breakdown (Recharts + text table fallback)
│   │   │   └── RecentTransactions.tsx   # Top 5 recent activities with quick links
│   │   ├── accounts/
│   │   │   ├── AccountsPage.tsx         # Grouped account listing (Bank, Cash, Cards)
│   │   │   └── AccountCard.tsx          # Card with opening, postings delta, closing position
│   │   ├── transactions/
│   │   │   ├── TransactionsPage.tsx     # Filterable list/table
│   │   │   ├── TransactionFilters.tsx   # Date, account, category, and type filters
│   │   │   ├── TransactionRow.tsx       # Responsive row (desktop columns, mobile stacked card)
│   │   │   └── TransactionDrawer.tsx    # Slide-over detail drawer showing postings & provenance
│   │   ├── entry/
│   │   │   └── AddEntryModal.tsx        # Add / Edit transaction modal form with event type selector
│   │   └── placeholders/
│   │       ├── ImportsPlaceholder.tsx   # Milestone 2 placeholder
│   │       ├── CommitmentsPlaceholder.tsx # Milestone 4 placeholder
│   │       └── AssistantPlaceholder.tsx # Milestone 5 placeholder
│   │
│   └── tests/                           # Unit and integration test suite
│       ├── money.test.ts                # Rupee/paise round-trip and validation tests
│       ├── ledger.test.ts               # Invariant checks and fixture reconciliation tests
│       └── repository.test.ts           # CRUD and reset-demo-data repository tests
```

---

## 4. Financial Calculation Approach & Invariants

### 1. Integer Paise Standard
- Store all amounts as safe finite signed integers representing paise (`1 INR = 100 paise`).
- **Parsing logic**: Convert user-entered rupee decimal strings (e.g. `"120.50"`) using exact string parsing or `Math.round(Number(str) * 100)` with verification to prevent IEEE 754 floating point inaccuracies.
- **Formatting logic**: Display as `₹1,20,500.00` formatted via `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.

### 2. Net Position Convention
- **Assets (Bank, Cash)**: Positive position = available funds; positive delta = funds added; negative delta = funds disbursed.
- **Liabilities (Credit Cards)**: Negative position = liability owed; negative delta = increased borrowing (spending); positive delta = repayment or refund.
- **Card Display**: A net position of `-42,000 paise` is displayed as `₹420.00 Outstanding`. Overpayments (+ balance) are explicitly labelled.

### 3. Economic Event Typing & Formulas
```text
Event Types:
  - 'income'       : Increases received_income; Positive posting to Asset account.
  - 'purchase'     : Increases net_spending; Negative posting to Asset or Liability account.
  - 'refund'       : Decreases net_spending (negative spending_paise); Positive posting to account.
  - 'card_payment' : Neutral (0 income, 0 spending); Debit Bank (negative), Credit Card (positive).
  - 'own_transfer' : Neutral (0 income, 0 spending); Debit Source (negative), Credit Target (positive).
  - 'fee'          : Increases net_spending; Negative posting to account.
```

### 4. Reconciliation Equation
$$\text{Closing Net Position} = \text{Opening Net Position} + \text{Received Income} - \text{Net Spending}$$
$$\sum_{\text{accounts}} \text{Account Closing Position} = \text{Closing Net Position}$$

For `demo-transactions.json`:
- Opening Net Position: $100000 + 20000 + 0 = 120000\text{ paise}$ ($₹1,200$)
- Received Income: $500000 + 100000 = 600000\text{ paise}$ ($₹6,000$)
- Net Spending: $12000 + 6000 + 80000 - 10000 + 2000 = 90000\text{ paise}$ ($₹900$)
- Closing Net Position: $120000 + 600000 - 90000 = 630000\text{ paise}$ ($₹6,300$)
- Accounts:
  - Demo Bank: $100000 + 500000 - 12000 - 30000 - 10000 + 100000 = 648000\text{ paise}$ ($₹6,480$)
  - Cash Wallet: $20000 - 6000 + 10000 = 24000\text{ paise}$ ($₹240$)
  - Demo Card: $0 - 80000 + 30000 + 10000 - 2000 = -42000\text{ paise}$ ($-₹420$, Outstanding $₹420$)
  - Sum of positions: $648000 + 24000 - 42000 = 630000\text{ paise}$ ($₹6,300$). Perfect match.

---

## 5. Responsive Screen Plan & UX Details

| Screen | Phone (<768px) | Laptop / Desktop (≥1024px) |
| --- | --- | --- |
| **Navigation** | Sticky top bar with logo & quick "Add" button; bottom navigation bar with 4 primary tabs. | Persistent 240px left sidebar with icons, active highlight, and collapse toggle. |
| **Overview** | 2-column or stacked KPI cards, horizontal swipeable chart, stacked recent items. | 4/5-card KPI row, side-by-side category chart & trend chart, full transaction preview table. |
| **Accounts** | Single-column cards showing available balance, pending postings, and freshness. | 3-column grid displaying Bank, Cash, and Card metrics with breakdown details. |
| **Transactions** | Compact stacked cards with date, recipient, category badge, and amount. Tap opens bottom sheet. | Dense table with sortable columns, inline status badges, and right-side slide-over drawer. |
| **Add / Edit Entry** | Full-screen bottom sheet with large numeric keypad input and clear segment selector. | Centered modal dialog with keyboard shortcuts (`Esc` to close, `Enter` to submit). |

---

## 6. Meaningful Validation Checklist for M1

### Automated Domain & Unit Tests (`npm test`)
- [ ] `money.test.ts`:
  - `toPaise("120.50")` yields `12050`
  - `toPaise("0.01")` yields `1`
  - `toPaise("100")` yields `10000`
  - Rejects non-numeric, negative, or infinite values
  - `formatRupees(648000)` formats as `"₹6,480.00"`
- [ ] `ledger.test.ts`:
  - Reconciles `fixtures/demo-transactions.json` exactly to expected values
  - Confirms card repayment creates 0 income and 0 spending
  - Confirms own-account transfer creates 0 income and 0 spending
  - Confirms refund decreases net spending and increases account position
  - Confirms opening position is excluded from current period income/spending
  - Verifies sum of account closing positions equals closing net position
- [ ] `repository.test.ts`:
  - Seed loading matches fixture length (9 events, 3 accounts)
  - Adding a manual expense updates account position and net spending
  - "Reset Demo Data" restores initial state cleanly

### Manual Verification (`npm run dev`)
- [ ] Responsive UI verified at mobile viewport (360px × 740px) with no horizontal scroll.
- [ ] Responsive UI verified at laptop viewport (1366px × 768px).
- [ ] Manual Entry: Add a new expense (e.g. ₹500 at "Bookstore" from Bank); verify Bank decreases by ₹500, Spending increases by ₹500, Net Position decreases by ₹500.
- [ ] Manual Entry: Add a card repayment (₹100 from Bank to Card); verify Bank decreases by ₹100, Card outstanding decreases by ₹100, Income and Spending remain unchanged.
- [ ] Reset button restores exact fixture numbers.
- [ ] Later milestone placeholders clearly indicate future phases without faking functionality.
