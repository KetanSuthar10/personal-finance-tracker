# Product requirements

Version 0.1 | 18 October 2026 | Status: draft for implementation review

## Problem and outcome

The owner receives salary plus irregular additional income and uses several payment methods, including credit cards paid fully or partially and purchases converted to EMIs. Monthly statements do not provide a unified, understandable view of spending, recipients, outstanding commitments, and income. Daily entries must coexist with later statement imports without duplication.

Build a clean personal finance PWA that makes those records understandable and supports a directly integrated Gemini assistant. Scope is one individual's finances, INR, phone and laptop. Target no new recurring subscriptions; a paid API activation or top-up is not authorised simply because a subscription benefit exists.

## Confirmed requirements

- Personal finances only; one owner initially, access on phone and laptop.
- Salary plus irregular income; expected income is visibly separate from received money.
- Monthly imports from bank PDFs/CSV/XLSX and credit-card PDFs, with actual supported formats validated before claiming support.
- Daily capture through text, form, voice-to-text, recorded voice notes, and receipt/payment screenshots. These input modes are delivered in phases, not silently dropped.
- Remember recipient/merchant categories and the owner's explicit future-matching instructions. A recipient can have several purposes.
- Ask about unfamiliar or uncertain transactions using a compact review queue.
- Track card bills, due dates, repayments, partial balances, EMI purchases, interest, and fees supported by supplied records.
- Explain spending patterns and available-money estimates based on transparent inputs.
- Integrated hosted Gemini; no laptop-hosted model, manual copy/paste dependency, or local AI service.
- Mask account/card identifiers before external AI processing. This is additional protection, not a substitute for appropriate provider data terms.
- Google sign-in and Supabase shared storage; prototype can run independently with synthetic data.

## User journeys

### Daily expense

The owner enters `120 cafe, UPI` or uses a form/dictation. The app proposes amount, date, account, recipient, and category; uncertainty is editable. Saved data appears immediately in totals. If it later appears in a statement, link the observations to one event. `UPI` is a payment method, not an account: ask for an account if no explicit default exists.

### Monthly statement

Choose an account and file. Parse locally where practical. Preview date range, extracted amounts, opening/closing balance evidence, possible duplicates, and rejected rows. Review uncertain mappings and confirm import. Store provenance and let the owner undo that batch without deleting independent records. Re-importing identical content must not inflate totals. Password-protected PDFs may be unlocked locally if supported; do not save the password.

### Teach a category

Select related transactions, set a category, and choose transaction-only or future rule. A rule includes recipient alias plus optional description/account constraints. Record rule scope and precedence. A later correction does not silently recategorise unrelated historical records. Provide an explicit preview for bulk historical changes.

### Understand cash and obligations

Show received income, spending, liquid balances, and upcoming obligations. Credit limits are not income. Expected freelance invoices remain separate. Show statement freshness and possible missing daily entries. A card balance is not a bank-provided payoff quote. Record interest/fees when known and flag unresolved values.

### Ask the assistant

Examples: `What increased this month?`, `How much did I spend at this cafe?`, `What is due before my next salary?`, and `Remember these payments as food.` Gemini requests limited tools; deterministic code supplies figures and record references. The interface links conclusions to supporting records and separates suggestions from stored changes.

## Scope by milestone

| Stage | Included outcome |
| --- | --- |
| M0 | Review this documentation and create an actionable M1 plan |
| M1 | Runnable responsive demo: overview, accounts, transactions, manual form, deterministic totals, synthetic fixtures |
| M2 | One real statement layout at a time; CSV mapping and PDF extraction; provenance, review, deduplication, reversible imports; synthetic statement fixtures first |
| M3 | Supabase persistence, Google sign-in, owner policies, cross-device verification, data export/restore |
| M4 | Card statements/payments, partial balances, EMI lifecycles, projection and due items |
| M5 | Integrated Gemini with verified data-policy route, structured entry, bounded tools, rules, cached insights, usage controls |
| M6 | Receipt/image OCR, recorded voice notes, remaining capture modes, installable PWA polish and deployment |
| Optional M7 | Chosen n8n workflows, Drive intake/backup, proactive notifications |

M1 may use browser persistence for synthetic demo records only, clearly labelled. Real transactions and exact account balances must not be demanded to develop M1. Discovery of additional accounts or statement templates changes importer scope, not the confirmed product goal.

## Financial definitions

- **Received income:** settled income events in the selected period, excluding openings, own transfers, refunds, and card payments.
- **Spending:** purchases plus explicit interest/fees minus recognised refunds. State which dates are used; default event/posting date in Asia/Kolkata, with source transaction dates retained. Cash flow is a separate view.
- **Liquid funds:** bank/cash asset balances; excludes unused card credit and expected earnings.
- **Card outstanding:** recorded liability balance, including known postings, with an as-of date. Remaining statement due and unbilled activity are distinct fields.
- **Planning amount:** liquid funds minus unpaid obligations in the chosen horizon, planned essentials, and the owner's chosen savings/minimum-balance allocation. Deduplicate card-billed EMIs against card bills and exclude already-paid obligations. The horizon and missing assumptions must be visible. This is an estimate, not a guarantee.
- **EMI:** distinguish purchase recognition, principal schedule, actual payment, and finance charges. Reclassifying a purchase into EMI is not new spending or an automatic refund.

## Acceptance criteria

| ID | Requirement | Evidence |
| --- | --- | --- |
| AC01 | Phone and laptop usability | Key flows usable at 360px and 1366px, keyboard accessible |
| AC02 | Financial accuracy | Synthetic fixture reconciles to documented expected balances/totals |
| AC03 | No duplicate import inflation | Repeated file import creates no additional canonical spending |
| AC04 | Daily/import reconciliation | Manual expense plus matching statement row results in one event with both sources |
| AC05 | Ambiguity preserved | Same-date equal-amount legitimate purchases can coexist; uncertain matches reach review |
| AC06 | Learning is scoped | Owner-defined rule applies to matching future entries; transaction-only correction remains local |
| AC07 | Card/transfer correctness | Repayments and own transfers do not inflate income/spending |
| AC08 | Partial payment and EMI correctness | Remaining bill/obligation is shown; purchase/principal not counted repeatedly |
| AC09 | Honest freshness | Imported as-of date and projected/unverified figures are distinguishable |
| AC10 | Connected privacy | Ownership enforced server-side and with RLS; secrets absent from browser bundle |
| AC11 | Grounded assistant | Answers reference calculated data; missing information produces clarification, not invented totals |
| AC12 | AI outage independence | Tracking, imports, and charts still operate when quota/API fails |
| AC13 | Recoverability | Export and clean restore reproduce records and relationships in a controlled test |

## Non-goals for the first release

Direct bank login or live open-banking aggregation, automatic payments/trades, credit scoring, tax filing, investment recommendations, multi-user sharing, multiple currencies, commercial subscription billing, and training a custom model. Notifications do not imply SMS/WhatsApp or background push has already been selected.

## Open decisions

Track these in [DECISIONS.md](DECISIONS.md): actual bank/card layouts; Gemini project quotas, eligibility and real-data route; owner login allowlist; supported browser/dictation combinations; notification channel; retention of original files; irregular income labels and savings choices. No open account credential is a blocker for synthetic M1 work.
