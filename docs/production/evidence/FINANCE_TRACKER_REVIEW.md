# Personal Finance Tracker — implementation review

Reviewed 17 October 2026 UTC / 18 October 2026 Asia/Kolkata.

**Verdict: a useful runnable prototype, with substantial gaps before a real-data personal finance pilot. Keep the foundation; repair correctness and complete the core workflows.** The repository's statement that milestones M0–M6 are all “complete and verified” is not supported by the deployed app or the implementation. Several working demonstrations are being presented as completed product capabilities.

## 1. What was reviewed

- Website: https://personal-finance-tracker-kohl-one.vercel.app/
- Repository: https://github.com/KetanSuthar10/personal-finance-tracker
- Commit: `d7c0a0efa17cb47094d03fb8e2e585d05766ba05` (HEAD and fetched main agreed at review time).
- Requirements: `docs/PRD.md`, `TECH_ARCHITECTURE.md`, `DATA_MODEL.md`, `UX_DESIGN.md`, implementation/task plans, `STATUS.md`, README and AGENTS instructions.
- Runtime: deployed desktop browser, fresh demo session with synthetic entries; source review; production build; existing unit tests; 19 additional targeted probes of domain logic and request construction.

The built JavaScript filename `index-Pl-XqyRg.js` matched the deployed script name. This strongly links the reviewed source/build to the deployment; it is not a byte-for-byte deployment provenance attestation.

No source files in the repository were changed. No commits, deployments, database mutations, real bank statements, real account credentials, or live Gemini requests were made. Browser changes were limited to synthetic records in this review browser's local demo storage. The uploaded test receipt was synthetic, and its incorrect proposed transaction was not saved.

### Evidence labels

**Live** means observed on the deployed website. **Probe** means reproduced by executing the checked-out application functions using synthetic data. **Source** means a directly visible implementation path. **Unverified** means the review did not exercise that environment or integration. A source finding is not being described as an observed production incident.

### Verification results

| Check | Result | Meaning |
| --- | --- | --- |
| Existing `npm test` | 58/58 tests, 11 suites passed | The implemented fixture assertions pass; not proof of full PRD compliance |
| `npm run build` | Passed | TypeScript and Vite production compilation succeeds |
| Additional domain/privacy probes | 19 selected failure cases reproduced | Deliberately chosen risk cases, not a random sample or an overall failure percentage |
| Basic live desktop flows | Loaded and navigated successfully | Overview, accounts, transactions, imports, cards, assistant and settings available |
| Local persistence | Synthetic entry and imported records survived reload | Persistence works in this browser under normal storage conditions |
| Runtime dependency audit | `npm audit --omit=dev`: 0 reported vulnerabilities | Snapshot of the current advisory database, not a security guarantee |
| Full dependency audit | 13 vulnerable package entries: 5 moderate, 6 high, 2 critical | These are development/tooling dependencies; not evidence of exploitable critical code in the deployed static app |
| Live Gemini / Google login / cross-device sync | Unverified or absent | No API key was supplied; no connected runtime exists in the reviewed app |
| 360px phone, microphone, installed/offline PWA | Not exercised on real device | Responsive/a11y/offline findings below are source-based where stated |

## 2. What has been done well

1. **The technical foundation fits this stage.** React, TypeScript, Vite and reusable UI components are reasonable for a responsive personal finance app. No framework rewrite is justified by this review.
2. **There is a separate financial domain layer.** Integer paise, explicit event types, account postings, provenance records and deterministic functions are valuable choices. The canonical posting builder has the right basic semantics for purchases, refunds, transfers and repayments when invoked correctly.
3. **The fixture dashboard reconciles.** Initially the demo showed ₹6,000 received income, ₹900 net spending, ₹6,720 liquid funds, ₹420 card outstanding and ₹6,300 net position. This is a useful baseline test.
4. **Manual form entry, transaction search and drill-down work.** A synthetic ₹10 expense saved and persisted. Searching its unique merchant text returned 1 of 12 records. The drawer shows amount, account and metadata.
5. **The simple import happy path works.** The sample bank CSV preview found seven rows, five matches and two new events. Commit created the two new events. Repeating the sample showed all seven already imported and zero new rows.
6. **Important concepts are visible.** Bills, recorded repayments, minimum due, EMIs, reserve and horizon are distinct UI concepts. This provides a useful base for correcting their calculations.
7. **An assistant action-review pattern exists.** Tool execution and proposal cards are preferable to allowing free-form model output to mutate the ledger directly. The local fallback lets the UI run without a subscription or API key.
8. **There is useful preparatory database work.** The SQL enables RLS on its eight tables and uses owner keys and composite foreign keys for some critical relations. Export/restore also has version and checksum scaffolding. These are foundations, not completed connected features.

## 3. Does it follow the documents?

It follows the high-level product structure and parts of the M1 prototype. It does not meet the documented end-to-end M2–M6 outcomes.

| Area | Original documented outcome | Current implementation | Assessment |
| --- | --- | --- | --- |
| M1 dashboard/entry | Responsive synthetic prototype, reliable deterministic totals | Runnable screens and basic form; hardcoded dates and capture-specific correctness defects remain | Substantial prototype, incomplete acceptance |
| M2 statements | Bank CSV/XLSX/PDF and card PDF delivered by supported layout, review, provenance, safe reconciliation/undo | CSV only; sample workflow works; matching and undo have data-loss cases | Partial |
| M3 storage/auth | Google login, Supabase persistence, owner access, phone/laptop sync and tested restore | LocalStorage repository only; SQL file and backup UI exist | Connected milestone not implemented |
| M4 commitments | Multiple statements, partial repayments, EMI lifecycle, reliable projections | One-card-oriented demo UI; allocation and schedule defects | Partial |
| M5 Gemini | Server-side integration, verified data route, efficient tools, applied rules, grounded answers | Browser API key, direct fetch, legacy model options, local canned engine, unwired rules | Partial and conflicting with architecture |
| M6 capture/release | Actual image OCR, recorded voice-note intake, usable PWA, release verification | Receipt simulation, browser speech dictation, text parser, incomplete cache | Not complete |
| Optional n8n | Only if a chosen automation needs it | No dependency on n8n | Correct to defer |

The M3 task plan narrowed its scope to schema/export/settings while the PRD still required actual auth and persistence. M5 explicitly switched to a browser session key despite the backend-secret architecture. These are changes in scope/architecture that were not reconciled with the main requirements. A later task plan calling itself approved is not evidence that the original outcome was delivered.

## 4. Findings that block a real-data pilot

### F01 — Receipt upload fabricates extracted content

**Evidence: Live + Source.** `src/features/capture/ReceiptCaptureTab.tsx:68` reads the file as an image preview, then chooses predefined sample text according to the filename. It never extracts the pixels' text.

**Reproduction:** upload `audit-receipt-98765.png`, containing “Audit Stationery” and “INR 987.65.” The deployed app proposed “Blue Tokai Coffee Roasters,” ₹240, a sample UTR and **100% confidence**. It labelled the result as locally parsed extracted transaction details.

**Impact:** a real screenshot can generate an entirely unrelated transaction that the owner could accept believing it was read. The seven OCR tests exercise text parsing, not image OCR.

**Required correction:** disable or explicitly label the upload as a simulation immediately. Implement actual OCR separately from receipt-text parsing; show the actual extracted text and editable draft. Missing or low-confidence fields must remain unresolved. Add a real image-to-draft integration test using an independently constructed image.

### F02 — Reconciliation can silently merge different expenses

**Evidence: Probe + Source.** `src/domain/reconciliation.ts:125` matches equal account deltas within three days. If exactly one event is found, it calls it `EXACT_MATCH` without requiring recipient/reference agreement.

**Reproductions:**

- A ₹120 “UNRELATED PHARMACY” row becomes an exact match to the ₹120 cafe expense.
- Two distinct ₹120 rows with different references both merge into one manual event; the result contains zero new events and one updated event.
- A reference already seen on another account causes the new account's row to be skipped as already imported (`:97`).

**Impact:** legitimate repeated purchases can disappear. This directly conflicts with the user's central requirement: many similar payments to the same recipient must remain separate transactions while sharing a learned category.

**Required correction:** distinguish duplicate source observations from potential event matches. Scope fingerprints to account/source, reserve a matched event within the batch, preserve multiplicity, require stronger identity for automatic linking and send ambiguous cases to an actionable review queue.

### F03 — Imported card repayments can reverse both balances

**Evidence: Probe + Source.** `src/domain/reconciliation.ts:246` always passes the imported account as the outgoing primary account to `buildEventPostings`.

**Reproduction:** import a card-side “PAYMENT RECEIVED” credit of ₹500. Actual postings are **card −₹500, bank +₹500**. Expected postings are **bank −₹500, card +₹500**. The import UI also selects the first other account as the transfer counterpart (`src/features/imports/ImportsPage.tsx:101`), without knowing which account was involved.

**Impact:** recorded card debt grows while liquid funds grow on a repayment. A bank-side and card-side observation of the same transfer are also not safely reconciled by this design.

**Required correction:** model source-side direction explicitly, ask for/resolve the counterpart and link both account observations to one canonical repayment. Cover bank-side, card-side and both-sided imports with the same expected end state.

### F04 — Quick capture bypasses canonical financial semantics

**Evidence: Source.** `src/features/capture/QuickCaptureModal.tsx:35` constructs postings separately from the canonical builder.

- A refund creates a positive account posting but zero spending reduction.
- A transfer or card payment produces only one positive posting, rather than paired source/destination postings.
- Fast text always selects the first bank account (`:75`), even when the parsed text identifies cash; it saves without the documented editable proposal step.

**Impact:** the same economic event has different results depending on how it is entered. The display of a balancing equation does not detect or prevent this.

**Required correction:** use one validated event-creation service for form, text, voice, receipt, import and assistant proposals. Require destination accounts for transfers and clarify unknown account choices.

### F05 — One repayment can pay multiple statements on paper

**Evidence: Probe + Source.** `src/domain/cards.ts:17` totals every qualifying payment after each statement's date, with no explicit payment-to-statement allocation ledger or upper period boundary.

**Reproduction:** one ₹500 payment is counted against two overlapping outstanding statements, yielding ₹1,000 allocated payments in aggregate.

**Impact:** the app can understate remaining dues. The displayed remaining due is not reliable when multiple statements exist.

**Required correction:** maintain explicit payment allocations, prevent allocations above a payment's amount, define treatment of excess payments/refunds and calculate every bill from its own allocations. Persist actual statement association rather than relying on a note string.

### F06 — EMI planning can count paid dues again and miss later instalments

**Evidence: Probe + Source.** `src/domain/cards.ts:112` only records unpaid statements in its deduplication set.

**Reproductions:**

- An EMI of ₹200 already included in a completely paid bill reappears as a standalone ₹200 obligation.
- A 90-day domain calculation includes only one ₹200 monthly instalment rather than three (₹600). The current UI exposes up to 45 days; the underlying one-next-due model can also miss a second instalment within an appropriate 45-day window.

**Impact:** the prominently displayed “Safe to spend” amount can be too high or too low.

**Required correction:** represent scheduled instalments and their billed/paid state individually; sum all unpaid occurrences in the horizon. Deduplicate by instalment identity, including settled bills. Show “Planning estimate” with assumptions until this is verified.

### F07 — The Google login and shared database runtime do not exist yet

**Evidence: Live + Source.** `src/context/LedgerContext.tsx` constructs `LocalLedgerRepository`; `src/data/localRepository.ts` persists browser keys. There is no Supabase client implementation or Google login UI. Settings accurately calls the current storage browser-local, but milestone/status labels claim M3 completion.

**Impact:** phone and laptop do not share data; clearing browser storage removes that copy. Being deployed on Vercel does not turn LocalStorage into a server database. This is an incomplete feature, not evidence that anyone else's data is publicly readable.

**Required correction:** implement and verify the authenticated repository, owner restriction and initial account setup. Keep synthetic demo data separate. Test a record created on one device appearing on the other, and an unauthorised identity receiving no financial records.

### F08 — Outbound Gemini masking misses the real outbound content

**Evidence: Probe + Source.** `src/domain/gemini.ts:296` masks a small context-count object; it interpolates raw `userQuery` into the first request and sends raw tool results in the second request (`:378`).

**Reproduction:** with `fetch` replaced by an in-process stub, a synthetic 12-digit account number in a question appears in the first request; a synthetic account label with that number appears in the tool-result request. No real network request or real identifier was used.

**Impact:** the UI's claim that identifiers are masked before any network request is false for these paths.

**Required correction:** use a central outbound boundary that transforms every message, attachment-derived text and tool result into an allowlisted DTO. Use stable account aliases and test the final serialised requests, not just the standalone masking helper. Do not assume identifier masking addresses every aspect of financial-data privacy.

### F09 — The API-key arrangement conflicts with the intended deployment

**Evidence: Live + Source.** `src/features/assistant/AssistantPage.tsx:55` loads the key from `sessionStorage`; `src/domain/gemini.ts:280` calls Google's API directly from the browser with that key. The UI describes storage as “volatile session memory,” which understates browser-accessible session storage.

**Impact:** this is a bring-your-own-browser-key prototype, not the documented server-controlled personal assistant. It lacks the intended server access checks, model policy and quota controls. No exposed production secret or public key leak was demonstrated in this review.

**Required correction:** use an authenticated backend/Edge Function and server-held secret. Configure model allowlists and usage limits there. A frontend publishable database key has a different role from a Gemini API secret; do not combine those concerns.

### F10 — Undo can delete an event still supported by another import

**Evidence: Probe + Source.** `src/data/localRepository.ts:245` deletes every event originally created by the batch being undone.

**Reproduction:** batch A creates an event; active batch B adds an independent source observation to it; undo A removes the whole event despite B still supporting it.

**Required correction:** undo should remove that batch's observations first, then decide whether the canonical event still has independent sources or manual support. Make the operation atomic and show its effect before confirmation. Preserve changes made independently after import.

### F11 — Backup validation and completeness are insufficient

**Evidence: Probe + Source.** `src/data/localRepository.ts:328` exports no category rules. Restore does not replace/clear them, so an old browser's rules can remain beside restored data. `src/domain/backup.ts:101` checks posting references and integer deltas but not full event semantics, duplicate identities, dates, linked bills/EMIs or all numeric fields.

**Reproduction:** a checksum-consistent payload with an income amount inconsistent with its postings is accepted. This is a missing semantic validation, not a claim that a checksum should authenticate a malicious file.

**Required correction:** version a complete backup schema, include learned rules/preferences/relationships, validate using the same domain invariants as writes, preview replace semantics and test restore into a clean empty store. Reject invalid data before changing state.

### F12 — Persistence failures can look like successful saves

**Evidence: Source.** `src/data/localRepository.ts:151` writes several LocalStorage keys separately and swallows persistence exceptions. Parse failures during loading silently fall back to demo data.

**Impact:** storage quota/availability errors can leave memory updated but not durable, or leave only some keys written. Reload can lose a reportedly saved entry or mix states without a useful error.

**Required correction:** surface save failures, avoid partial multi-key commits, retain last good state and provide a recovery path for corrupt stores. This was not induced in the deployed browser.

## 5. Missing or incomplete MVP behaviour

### F13 — Learned categories are saved but never applied

**Evidence: Probe + Source.** `src/domain/rules.ts` has a matching implementation, but real entry/import flows do not call it. Saving an “AUDIT LEARNING → Audit Custom” rule and then adding a matching expense leaves its category “General.”

There is no transaction-level category correction workflow in the drawer, no clear transaction-only versus future-rule action, and no historical bulk-change preview. This is the largest gap against the user's original cafe/recipient-learning idea.

**Next:** connect scoped rules to every ingestion route, preserve explicit category choices, support alias/account/description constraints and test conflicting purposes for the same recipient. Add an “Apply to this transaction” / “Use for future matches” choice and an uncertainty queue.

### F14 — The assistant invents missing input and uses fixture dates

**Evidence: Probe + Source.** The local engine turns “record a coffee” into a ₹120 proposal (`src/domain/gemini.ts:52`). A November summary request returns an October tool range (`:225`). `src/domain/assistant.ts:252` builds commitments with October dates and a zero reserve rather than the dashboard's actual planning configuration.

**Impact:** the current no-key assistant is a keyword-based demo, not a generally capable finance agent. Proposal confirmation reduces automatic harm but does not make an invented amount acceptable. The assistant can disagree with the dashboard because it uses different parameters.

**Next:** share the selected period, as-of date, planning preferences and account defaults across tools. Missing amounts/destinations need clarification. Validate tool arguments and returned structured proposals before showing them. Attribute figures to records and computed ranges; a prompt saying “cannot invent numbers” is not an enforcement mechanism.

### F15 — Live Gemini configuration is stale and not verified

**Evidence: Live + Source + provider documentation.** The picker offers Gemini 1.5 Flash, 2.0 Flash and 1.5 Pro; its default is 1.5 Flash. Google's current deprecation page explicitly lists `gemini-2.0-flash` as shut down on **1 June 2026**. The legacy options need replacement with models actually available to the chosen API project.

The implementation also needs an integration test of its complete function-call exchange, including its `role: 'function'` response shape (`src/domain/gemini.ts:383`). This review did not send a real request and does not claim that this shape was observed causing a provider error.

Usage is mainly a displayed estimate. There is no enforced daily budget, request timeout/abort, output-token ceiling or insight cache. One follow-up call bounds turns, but does not by itself ensure an efficient token budget. Quota fallback exists in source; the real provider failure route was not exercised.

**Next:** verify supported model IDs, project quota and data-processing route using synthetic data; configure them on the backend. Add small context DTOs, bounded outputs, cancellation, actual usage recording, caching and deterministic fallback. Multiple consumer subscriptions are not an implementation of API quotas or a reason to rotate accounts to evade limits.

Provider source: https://ai.google.dev/gemini-api/docs/deprecations (checked during review).

### F16 — Date selection and freshness are not usable yet

**Evidence: Live + Source.** The header is fixed to 1–17 October 2026. A normal manual entry defaulted to 18 October and was saved, visible in Recent Activity and Transactions, while the KPI totals remained unchanged. The selected range correctly excludes that date, but the app gives no period control to include it. Its “all 12 events balance” text also describes all records while the displayed equation covers only the selected range.

`src/domain/ledger.ts` calculates a period opening from original account openings rather than carrying forward prior events. Changing a probe's start date to 5 October makes opening + period income − period spending equal ₹1,480 while closing is ₹6,300. Account cards show “As-of” using the opening date, alongside a current balance.

**Next:** add a shared date/range selector and a separate account balance-as-of value. Carry previous activity into period openings, honour account opening dates, and distinguish statement-confirmed balance, recorded balance and estimated current balance. Use Asia/Kolkata consistently instead of scattered UTC `toISOString()` defaults.

### F17 — Import format coverage and error handling are incomplete

**Evidence: Live + Source.** The UI accepts CSV, with no bank/card PDF extraction, XLSX reader or supported-layout registry. Generic CSV auto-detection is not equivalent to validating actual bank formats. No full opening/closing balance check or useful rejected-row review is implemented.

`normalizeDate('31/02/2026')` accepts `2026-02-31`. Bank credits labelled REFUND become additional income. Card refunds receive a fixed Groceries category. Missing/ambiguous columns and debit/credit conventions need explicit review. The “load sample” handler updates selected account state and immediately processes using the previous state, so a previously selected card can affect sample classification.

**Next:** implement one agreed real bank CSV layout with precise mapping, invalid-row reasons and balance checks before expanding. Keep support labels honest. Then add one text-PDF/card layout and XLSX, with password and scanned-PDF handling explicitly defined. Never silently drop a row.

### F18 — Accounts, statements and EMI lifecycle cannot be fully managed

**Evidence: Live + Source.** Accounts is display-only; there is no normal add/edit account or opening-position setup. Statements are fixture-backed without a user-facing create/import statement workflow. The cards page selects the first card account. Payment logic can use that first card even when another statement belongs to another card.

EMI conversion can be repeated without preventing duplicate plans, accepts fees as eligible purchases and uses “now plus 30 days” for next due rather than a verified schedule. Existing plans have no complete payment/instalment advancement, completion or foreclosure workflow. The generic instalment formula is not evidence that bank principal/interest/taxes/fees have been reconciled.

**Next:** implement account onboarding, explicit statement-card association, recorded schedule intake and lifecycle transitions. Link purchase recognition, principal reduction, interest and fees without counting the purchase again. Use supplied lender schedule values where available.

### F19 — Expected income and full planning inputs are missing

**Evidence: Source + UI scope review.** Salary and additional received income exist. A separate expected-income lifecycle is not implemented. Planned essentials and the user's savings/minimum-balance allocation are not fully represented in the present planning calculation; it uses a reserve and known obligations.

**Next:** separate expected/received/cancelled income and keep forecasts out of liquid funds. Add the chosen planning inputs and disclose unknown obligations. Leave strategic advice as an explanation of reliable calculations rather than allowing generated advice to compensate for missing ledger facts.

### F20 — Recorded voice-note support is not implemented

**Evidence: Source.** `VoiceCaptureTab.tsx` supports browser speech recognition, typed transcripts and examples. There is no audio-file upload/transcription workflow matching the documented recorded voice-note requirement. Live dictation was not microphone-tested here. Browser recognition can depend on browser/provider network services; it should not be described as guaranteed local transcription.

The transcript parser also needs stronger handling of dates, Indian number formatting, refunds and account hints. Text-parser unit tests do not demonstrate voice capture or transcription reliability.

**Next:** label dictation accurately, define supported browsers and permission/error behaviour, retain a text fallback, and deliver recorded audio intake as its own tested step.

## 6. Release quality and user experience

### F21 — The offline cache misses the actual application bundle

**Evidence: Source.** `public/sw.js` precaches `/`, `/index.html`, the manifest and icon. It never precaches or saves the built hashed JS/CSS responses. It uses cache-first HTML with a fixed `pft-cache-v1` name.

**Impact:** the service worker alone cannot reliably reload the complete app offline, and cached HTML can retain old asset references across releases. A normal browser HTTP cache may hide this problem in some sessions; offline failure was not reproduced with device/network emulation here.

**Next:** use a generated asset manifest/build-aware service worker, an update strategy and offline navigation tests after a fresh install. Verify icon/install requirements on the target phone browsers and show pending/failed sync states when connected storage is added.

### F22 — Accessibility is incomplete

**Evidence: Source and desktop observations.** `index.html` disables user scaling. The shared modal has a dialog role and Escape handler, but no focus trap/restoration or title association. The custom capture modal lacks the same dialog semantics. Several filters rely on placeholders/visual context, transaction rows are clickable containers, and small type is widespread.

**Next:** allow zoom, add accessible labels and keyboard-operable record buttons, consistently implement dialog focus, verify contrast and visible focus. Run the core flows at 360px and 1366px, keyboard only and screen-reader semantics. This is not a completed mobile/a11y certification.

### F23 — The screen structure is useful, but implementation language dominates

**Evidence: Live.** The dashboard has readable grouping, restrained colours and clear primary amounts. However, user screens include “INR Integer Paise,” “Deterministic Invariant Proof,” acceptance-criterion references, internal IDs, milestone badges and raw account identifiers. The dark capture modal and assistant feel different from the light dashboard. Navigation says Gemini is planned while its page is present; other incomplete milestones say live.

**Next:** keep Overview, Transactions, Imports, Bills & EMIs, Assistant and Settings as the core structure. Move proofs/debug information to developer diagnostics. Use “Spent this month,” “Bills due,” “Planning estimate” and “Needs your review.” Add a recipient spending view and an actionable review inbox. Make freshness and local-demo status visible on mobile too. Standardise spacing, typography, loading/error/empty states and modal design. Avoid a visual rewrite until the flows are correct.

### F24 — Project status and tests overstate verification

**Evidence: Repository.** `docs/STATUS.md` claims all M0–M6 complete. README still describes M1. Task plans diverge from the PRD, and some links point to a developer's Windows `file:///` path. Tests target helpers and fixtures; they do not cover the live image path, connected auth, provider integration, multi-statement allocation, all capture routes or real mobile flows. No CI workflow is present in the reviewed files.

The production JavaScript bundle is approximately 722 kB minified / 202 kB gzip and triggers Vite's size warning. Current development dependencies have advisories. These are maintenance/performance work, not the primary reason the financial workflows fail.

**Next:** make one honest status matrix, use relative documentation links, require evidence for each acceptance criterion, add CI build/tests and a small set of meaningful browser integration tests. Resolve dependency advisories through controlled upgrades, keep the lockfile, and split large routes/charts after correctness. Do not use a “58 tests passed” badge as a completion gate for features those tests never exercise.

## 7. Prepared database design: useful, not production-verified

`supabase/migrations/20261018000001_initial_schema.sql` enables RLS across all eight tables and predicates ownership using `auth.uid() = user_id`. Composite references from postings to owner/account/event are a good starting point. The current `FOR ALL ... USING` policies should not be falsely described as permitting user reassignment merely because they omit an explicit `WITH CHECK`: PostgreSQL uses the `USING` expression as the check when no separate check is defined.

Before connecting real records, complete these gaps:

- Owner login allowlist and backend identity enforcement; RLS is per-row ownership, not the single-owner product allowlist by itself.
- A tested transaction/RPC boundary for an event plus its postings and for import commit/undo. Current tables do not enforce all cross-row economic invariants.
- Referential integrity for source batch links, purchase links and EMI/statement links; several are free text rather than constrained relationships.
- Durable rule storage, instalment occurrences/payment allocations, source/freshness metadata and expected income as the final domain design requires.
- Explicit required grants and role behaviour in the target project's configuration, with two-user and signed-out allow/deny tests.
- Safe integer-range handling between PostgreSQL BIGINT and JavaScript numbers, and record/type validation on every write.

No migration was applied and no deployed RLS policy was inspected with credentials. The review therefore makes no claim that a configured production database is secure or insecure. Official guidance used for this boundary: https://supabase.com/docs/guides/database/postgres/row-level-security .

## 8. Acceptance-criteria assessment

| PRD criterion | Assessment | Evidence / remaining gate |
| --- | --- | --- |
| AC01 phone/laptop usability | Partial; phone unverified | Desktop usable; mobile and keyboard checks outstanding; a11y gaps F22 |
| AC02 financial accuracy | Fixture passes; broader gate fails | F03–F06, F16 and F17 |
| AC03 repeated imports | Simple repeat passes; broader gate fails | Sample repeated successfully; account scope and multiplicity defects F02 |
| AC04 daily/import reconciliation | Simple match passes; unsafe generally | F02 matches unrelated events and reuses one event |
| AC05 ambiguity preserved | Fails | No enforced decision per ambiguous row; repeated equal amounts can collapse |
| AC06 scoped learning | Fails | Rules are saved but not called by ingestion; correction UX missing |
| AC07 transfers/card payments | Fails across capture routes | Canonical helper works; imports and quick capture invoke/build incorrectly |
| AC08 partial payments/EMIs | Fails | Shared payment allocation and paid-EMI planning issues |
| AC09 freshness | Fails | Static period, opening date labelled as as-of, no reliable statement confirmation |
| AC10 connected privacy | Not implemented / outbound defect | No auth runtime; browser secret approach and masking gaps |
| AC11 grounded assistant | Fails | Missing amount invented; fixture period; inconsistent commitments parameters |
| AC12 AI outage independence | Partial | No-key tracking works; real quota/failure integration unverified |
| AC13 recoverability | Partial; full gate fails | Backup scaffold exists; rules omitted, semantic validation and undo defects |

## 9. Recommended repair sequence

Do not start n8n, new dashboards or more agent features before these gates. None of the first repair steps requires purchasing an AI subscription or providing Google credentials in chat.

### Phase A — Make the prototype honest and protect correctness

1. Correct STATUS/README/navigation claims and disable the receipt simulation for real uploads.
2. Introduce a shared validated event service and use it for every capture path; fix refund/transfer/card-payment directions.
3. Fix duplicate detection and manual/import matching, add row-level review, and preserve repeated legitimate payments.
4. Fix undo provenance, backup completeness/validation and surfaced persistence errors.

**Exit gate:** all original tests plus regression cases for F01–F04 and F10–F13 pass, and the same transaction has the same ledger effect through each capture route.

### Phase B — Deliver a trustworthy personal ledger

1. Add account setup, date selection and actual imported/as-of metadata.
2. Deliver one real bank CSV layout with row errors and balance reconciliation, then one card/PDF layout.
3. Implement payment allocations, statement-card association and instalment lifecycle; add planning assumptions and expected income.
4. Wire category learning and the transaction-only/future-rule workflow into all ingestion paths.

**Exit gate:** a synthetic multi-month scenario with repeated cafe payments, two accounts, two cards, a refund, transfers, partial payment and card-billed EMI reconciles to independently calculated expected totals; undo/export/clean restore preserve it.

### Phase C — Connect devices and Gemini safely

1. Implement owner Google sign-in and the authenticated database repository; prove phone/laptop sync and rejected unauthorised access.
2. Implement the backend Gemini boundary with complete outbound masking, a supported configurable model, project-specific quota check, budget and caching.
3. Make assistant tools use the same dates/preferences/calculations as the dashboard, clarify missing fields and show supporting transactions.

**Exit gate:** synthetic live API requests work, provider quota errors leave capture usable, request-boundary privacy tests pass, and no Gemini secret is needed in client code.

### Phase D — Complete capture and release verification

Implement actual image OCR and recorded audio intake; verify dictation on chosen browsers, accessible phone layouts, complete offline assets, update behaviour and sync conflict recovery. Add receipt/voice fixtures that are independent of the parser's own canned samples. Only then reconsider optional n8n reminders, Drive intake or backups.

## 10. Evidence pack and reproduction

The accompanying `audit.cjs` runs the 19 targeted probes against this exact codebase. It loads TypeScript domain files from a checkout with dependencies installed, replaces network fetch with a local stub for the two request-payload checks, and uses synthetic data. It does not alter the repository or persist browser data. It writes a JSON results file.

```bash
# Use a local checkout at the reviewed commit with npm dependencies installed.
node /path/to/audit.cjs /path/to/personal-finance-tracker /path/to/results.json
```

An `issue_reproduced: true` result means actual behaviour differs from that probe's expected behaviour. This runner is an audit reproduction aid, not a replacement for regression tests added to the repository. It does not exit nonzero merely because a known defect was reproduced. The 19 cases overlap some finding groups and do not cover every issue in this report.

`domain-audit-results.json` contains the observed expected/actual results; monetary integers there are paise. `dependency-audit.json` is the full tooling-inclusive npm advisory snapshot. The synthetic input receipt is included for repeating the upload test. Browser screenshots are kept separate from the saved evidence pack.

### Immediate next development task

Create a single repair milestone for **financial correctness and truthful feature status**, beginning with Phase A. Preserve the existing stack and design foundation. Require small changes with the relevant regression evidence before marking each requirement complete. A new PRD is unnecessary; update the existing documents to reflect reality and use this review as the repair backlog.
