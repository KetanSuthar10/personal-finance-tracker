# T04 — CSV import, reconciliation and safe undo

## Prerequisites

T03 verified. Identify the first bank CSV layout privately; unsupported layouts remain explicit.

Read [the master plan](../00_MASTER_PLAN.md), [execution contract](../01_EXECUTION_CONTRACT.md), [status](../STATUS.md) and [acceptance tests](../04_ACCEPTANCE_TESTS.md). This card assigns only the work below.

## Build checklist

- [ ] Implement one declared bank layout plus an explicit column/sign mapping flow. Preserve source dates/descriptions/references, file content fingerprint, row identity/multiplicity, parser version, rejected rows and available opening/closing evidence.
- [ ] Validate every row, real dates, debit/credit conventions and statement balance reconciliation. Never silently skip invalid rows or choose a column/type solely from a broad substring.
- [ ] Separate duplicate observations from possible event matches. Scope references to owner/account/source, preserve identical legitimate payments, and prevent one event being automatically consumed by multiple rows.
- [ ] Add a row-level review queue with accept-new/link/reject/correct actions. Equal amount/date alone is insufficient for an exact match. Unresolved rows cannot silently create or merge financial events.
- [ ] Resolve transfer/repayment counterpart and source-side direction explicitly. Match bank/card observations of one repayment to one canonical event; bank credits/refunds do not automatically become income.
- [ ] Commit batches atomically with idempotent retry. Implement undo by removing the batch's contribution while preserving manual edits and other sources; preview effects. Fix sample-selection stale state in any retained development utility.

## Exit checks before reporting

- [ ] AT04–AT10 pass against database-backed integration and independently expected ledger totals.
- [ ] Repeated file/retry creates no inflation; two cafe payments plus pharmacy survive; a reference on another account is not discarded.
- [ ] Bank/card repayment import produces bank −300/card +300 exactly once. Undo A retains independent B/manual support.
- [ ] Actual declared CSV layout is verified; if it is unavailable, code may be implemented but layout verification stays blocked.

## Handoff

Coverage: F02, F03, F10, F17; AT04–AT10.

Complete the second-pass review, save a sanitised task report under `docs/production/reports/T04.md` using [the template](../TASK_REPORT_TEMPLATE.md), and update production/root status. Report completed, failed, blocked and unverified checks separately. Finish the assigned work without routine permission loops; stop before the next task.
