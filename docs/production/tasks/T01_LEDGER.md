# T01 — Canonical ledger and date correctness

## Prerequisites

T00 verified.

Read [the master plan](../00_MASTER_PLAN.md), [execution contract](../01_EXECUTION_CONTRACT.md), [status](../STATUS.md) and [acceptance tests](../04_ACCEPTANCE_TESTS.md). This card assigns only the work below.

## Build checklist

- [ ] Introduce one validated command service for purchase, income, refund, fee, own transfer and card payment. Route form, quick text, voice/receipt draft acceptance, import mapping and assistant confirmation through it; unsupported routes stay gated.
- [ ] Validate safe integer paise and aggregate safety, finite values, real calendar dates, known account types/IDs, positive user-entered amounts and distinct source/destination accounts. Require clarification rather than guessing missing amount/account/date.
- [ ] Correct refund spending reduction and paired transfer/payment postings. Define the imported account's direction separately from the outgoing source; do not default to the first other account.
- [ ] Correct opening-date cutoffs, carried period openings and shared Asia/Kolkata date helpers. Add a usable shared period selector and honest recorded/statement-confirmed as-of metadata semantics.
- [ ] Use shared schemas and deterministic calculations; make a local repository only a test/development adapter pending T03, not a production fallback.

## Exit checks before reporting

- [ ] AT01–AT03 pass with independently specified amounts, including the shorter period and invalid-input paths.
- [ ] The same accepted event has the same effect through all currently supported entry paths; missing destinations do not write.
- [ ] Future-dated entries are visibly outside the current period and can be included by selecting the appropriate range.
- [ ] Run relevant regression tests and build; inspect changed UI at phone/laptop widths. Report any entry path still gated.

## Handoff

Coverage: F03, F04, F14, F16; AT01–AT03.

Complete the second-pass review, save a sanitised task report under `docs/production/reports/T01.md` using [the template](../TASK_REPORT_TEMPLATE.md), and update production/root status. Report completed, failed, blocked and unverified checks separately. Finish the assigned work without routine permission loops; stop before the next task.
