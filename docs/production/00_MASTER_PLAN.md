# Production master plan

Version 1.0 | 18 October 2026 | Target specification, not completion evidence

## 1. Destination and current baseline

Build a single-owner INR personal finance web app used on phone and laptop. It records salary and irregular income, daily expenses, monthly statements, recipient/category memory, card bills, partial repayments, EMI schedules and transparent cash planning. Gemini helps interpret and explain; deterministic code controls money and durable writes.

The reviewed baseline is commit `d7c0a0efa17cb47094d03fb8e2e585d05766ba05`. Fetched main still matched it when this pack was prepared. It has runnable screens and 58 passing fixture tests, with major correctness and integration gaps documented in [the audit](evidence/FINANCE_TRACKER_REVIEW.md). Inspect the actual current checkout at T00; preserve newer changes and update the baseline if it has moved.

**Production means:** empty owner data at first sign-in, real account setup, persistent database writes, server-enforced access and accurate capability labels. Synthetic fixtures remain in tests and staging. Missing configuration produces a useful blocked/setup state; it never loads fake balances or silently uses a browser repository.

## 2. Decisions for this sequence

| Layer | Choice | Responsibility |
| --- | --- | --- |
| Client | Existing React + TypeScript + Vite | Responsive app and editable capture/import drafts |
| UI | Existing Tailwind/components + Recharts | Consistent accessible views; repair rather than redesign |
| Validation | Shared TypeScript schemas; Zod or equivalent | Validate forms, rows, domain commands and AI arguments |
| Database | Supabase PostgreSQL | Shared durable canonical records and ownership constraints |
| Sign-in | Supabase Auth with Google | Single owner, session handling and access rejection |
| Financial writes | Validated, transactional PostgreSQL RPCs | Enforce owner, event/posting invariants, idempotency and versions |
| Backend | Supabase Edge Functions | Authenticated Gemini/tools and operations needing secrets |
| Extraction | Maintained CSV/XLSX parsers, PDF.js, actual browser OCR | Local extraction and layout adapters; preview before commit |
| AI | Hosted Gemini behind a server adapter | Bounded interpretation, category proposals and explanations |
| Hosting | Existing Vercel deployment | Keep current hosting unless a proven requirement changes it |
| Tests | Existing Vitest + targeted database/browser integration checks | Independent correctness, ownership and actual user flows |
| Automation | n8n optional after release gate | No dependency in login, capture, import, ledger or chat |

The old Cloudflare hosting recommendation is superseded by the existing Vercel deployment for this sequence. Record this and the production/auth decisions once in `docs/DECISIONS.md`; do not create a hosting migration as an extra task. Verify and pin supported dependency versions when adding/upgrading them. No specific model ID or free-tier entitlement is assumed by this document.

## 3. Boundaries and data flow

Browser capture produces a **draft command**. A shared domain service validates amount, dates, type, account selection and relationships. The authenticated repository submits a command with an idempotency key and expected version. A database transaction verifies ownership and all invariants, persists the event/postings/provenance together, and returns the authoritative result. Reads and dashboard aggregations use the same definitions and selected dates. Refetch after a committed write and on device focus; real-time subscriptions are optional.

Imports follow: local extraction → normalised source rows → validation and balance evidence → duplicate/match candidates → explicit review → atomic commit → batch receipt. Unresolved rows are not quietly committed or discarded. A stable batch identity and source fingerprints make retry safe.

Assistant requests follow: authenticated client → Edge Function identity/owner check → allowlisted read tools → minimal outbound DTO with aliases → Gemini → validated answer or draft proposal → explicit confirmation → normal financial command service. The model never controls SQL, owner identity, arbitrary URLs or direct writes. Category memory lives in the database, not in model conversation history.

## 4. Logical data model

Implement logical groups in maintainable tables; justify any combination in the decision log. Do not recreate all tables simply to mirror this list.

| Group | Records and required relationships |
| --- | --- |
| Identity | Owner UUID in server-controlled configuration; profile/settings; currency/timezone/defaults |
| Accounts | Bank, cash, card; explicit loan/EMI liability where needed for a supplied standalone loan schedule; opening date/position and last statement-confirmed position/date |
| Classification | Categories, stable counterparties, source aliases, scoped category rules, precedence and manual overrides |
| Ledger | Canonical events, account postings, linked refunds/purchases/transfers, source observations, record version and change history |
| Imports | Batches, content fingerprint/parser version, source row identity, accepted/rejected match decisions, source evidence and undo contribution |
| Cards | Statements with issuer facts, payments and explicit allocations; unbilled postings kept distinct |
| EMIs | Plan plus individual instalment occurrences, principal/interest/fees where evidenced, billed/settled links and lifecycle state |
| Planning | Other commitments, expected income linked to actual receipts, essentials, savings/reserve inputs and horizon |
| Recovery/AI | Versioned complete export schema, insight cache keyed by owner/data/config revision, usage counters without prompt logging |

All cross-record references preserve the same owner. Constrain references to source batches, purchases, statements and instalments. Payment allocations cannot exceed the payment. A scheduled obligation and its billed statement share an identity relationship, so one due cannot be reserved twice. Avoid duplicating derived settled balances as independently editable facts.

## 5. Financial contract

- Store INR as finite safe integer paise. Validate inputs and aggregate results, and bound database BIGINT values before converting to JavaScript numbers. Monetary formatting is a display operation.
- Signed net position: asset increases positive; liability increases negative. Opening balances are not income. Card overpayments remain visible as credits.
- Income is settled earned/received income only. Loan proceeds, own transfers, credit limits, repayments, refunds and expected income are not earned income.
- Spending is purchases plus explicit interest/fees minus recognised refunds. State event/posting-date policy; preserve source dates. Default user dates and periods use Asia/Kolkata.
- Own transfers and card repayments have both linked account movements, zero income and zero spending. Match bank-side/card-side observations to the same event.
- The sum of included account posting changes equals received income minus spending under the chosen event semantics; validate each event type as well as aggregate equations. Do not call this a complete double-entry general ledger.
- Carry pre-period activity into period opening positions. Do not reapply transactions already represented by an account's opening position. Retain event and posting dates when they differ.
- EMI conversion retains original purchase spending. Principal settlement is a balance movement; recorded finance charges are spending. Use supplied lender schedules rather than pretending an estimated formula is an issuer payoff quote.
- Liquid funds include recorded bank/cash assets only. A planning estimate subtracts each unpaid obligation occurrence once plus chosen essentials/savings/reserve. Expected income is separately labelled. Unknown dues/rates remain unknown.
- Equal dates and amounts are not unique identities. Preserve repeated legitimate purchases and queue uncertain matches.

## 6. Authentication, privacy and files

Google sign-in is part of the connected release. Owner authorisation is enforced by database policies and backend checks against a server-controlled owner UUID. A UI email check or any logged-in user's UUID by itself is insufficient for this single-owner product. Never let a new signup make itself the owner. Disallow non-owner access even through direct database/RPC calls. Handle session refresh, logout and denied callbacks.

Keep `VITE_SUPABASE_URL` and the Supabase publishable key in frontend configuration; neither is a privileged secret. Keep Gemini/API secrets, OAuth client secret and privileged database keys out of the browser and Git. Use current provider guidance for token validation. Avoid service-role access where owner-scoped access suffices.

Production stores parsed records and necessary provenance. Original statements, receipt images and audio are transient/local by default. Do not upload them to a public hosting directory or a public bucket. Optional private original-file retention is a later explicit owner choice. Document size/page/time limits, reject unsupported files clearly, and never persist a PDF password. Google sign-in does not request Google Drive permission.

For the first connected release, do not persist financial API responses or ledger data in the service worker/LocalStorage. Keep app assets available offline and explain that a connection is needed to save/load financial records. Full offline financial sync is a separate feature, not a hidden requirement for releasing a usable PWA. Clear in-memory owner data on logout and prevent account crossover.

## 7. Gemini and zero-spend constraint

Target no new recurring subscriptions and no unapproved charges. The finance core must work without inference. A Pro consumer subscription/key screenshot does not verify this API project's model access, credits, quota or data route. Verify those in T10; never rotate accounts to bypass limits.

Google's terms checked on 18 October 2026 distinguish unpaid and paid API data handling and instruct users not to submit sensitive/confidential/personal information to unpaid services. Identifier masking alone is insufficient evidence that a financial history is suitable for that route. Consequently, build and test the integration with synthetic requests, then verify an appropriate real-data route and the owner's spending allowance before activation. This is an external integration gate, not permission to substitute mock replies or call AI complete. If that route requires unauthorised spending, keep AI accurately unavailable while core development continues. See [sources](SOURCES.md).

Configure the model server-side from supported options in the actual project. Start with a small capable model proven by representative tasks, not an old hardcoded model name. Proposed initial app bounds: up to two provider calls per question, two allowlisted tool executions total, at most 25 relevant rows per tool, a short output cap around 512 tokens, timeout/cancellation, and an owner usage allowance checked before requests. Confirm compatible limits and set actual token reservation/accounting in T10; do not advertise a displayed estimate as an enforced cap. Cache by data/period/preference revision and invalidate on changes. No paid fallback or unrelated provider is automatic.

Mask every final outbound message, tool result and attachment-derived field at one boundary using stable aliases and explicit schemas. Keep amounts/dates needed for authorised calculations, minimise narrative and block known identifier leaks. Log usage/latency/status without financial prompts. Show deterministic figures and source references separately from generated explanation; validate structured claims/proposals against tool results.

## 8. Product screens and scope

Use Overview, Transactions, Accounts, Imports, Review, Bills & EMIs, Assistant and Settings. Include recipient/category drill-down, selected date range and honest freshness. Support edits, transaction-only category correction, explicit future rules and reviewed historical bulk changes. Give meaningful empty, loading, save failure, unsupported-layout and access-denied states. Keep developer milestones and invariant diagnostics out of normal screens.

Direct bank login, payment execution, tax filing, trading, multi-user sharing, multi-currency, new hosting infrastructure and autonomous messages are outside this release. n8n/Drive/notifications can be chosen after T12; possession of a subscription alone does not select a workflow.

## 9. Delivery gates

Follow [the task index](02_TASK_INDEX.md). T00 reconciles instructions; T01 fixes canonical writes/calculations; T02–T03 deliver schema, Google auth and the first real cross-device ledger slice; T04–T07 deliver imports/learning/commitments/recovery; T08–T11 finish documents/OCR/Gemini/voice; T12 verifies and releases. No task is complete because its screen renders.

Use `IMPLEMENTED_UNVERIFIED` for code whose mandatory live check has not run, and `BLOCKED` for an unmet external prerequisite. The agent finishes independent assigned work and names the remaining gate precisely. Only passed, recorded evidence earns `VERIFIED`.

Keep the original PRD as the product source of truth and update its implementation references. This sequence supersedes old task plans where recorded in DECISIONS; retain them as history. A change to scope, stack, money definitions, budget or data handling needs an explicit decision entry and affected-doc updates, not a silent agent interpretation.
