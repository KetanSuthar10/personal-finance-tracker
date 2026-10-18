# T08 — PDF and XLSX statement adapters

## Prerequisites

T07 verified; actual declared bank/card structural layouts available.

Read [the master plan](../00_MASTER_PLAN.md), [execution contract](../01_EXECUTION_CONTRACT.md), [status](../STATUS.md) and [acceptance tests](../04_ACCEPTANCE_TESTS.md). This card assigns only the work below.

## Build checklist

- [ ] Add maintained local XLSX parsing and text-PDF extraction, including page/column reconstruction, using the existing candidate/review/commit pipeline rather than a second ledger implementation.
- [ ] Deliver and list one identified bank PDF, one card PDF and the chosen XLSX layout. Preserve available transaction/posting dates, references and statement summary/balance facts.
- [ ] Handle local PDF unlock without storing the password. Detect scanned/unsupported PDFs and explain the next step; T09 supplies actual OCR page processing for required selected scanned layouts.
- [ ] Bound file size/pages/processing time and record tested limits. Handle malformed files, multi-page headers/totals, CR/DR signs, date ambiguities and parse failures visibly.
- [ ] Route card payment, refund and EMI-conversion rows to the correct canonical semantics or review. Never let text extraction success imply financial reconciliation success.
- [ ] Preserve parser/version provenance and expose supported layouts; do not advertise universal PDF/XLSX support.

## Exit checks before reporting

- [ ] AT10 and AT18 pass on independent files with known row counts, balances and expected totals.
- [ ] Password-protected, malformed and scanned files get the declared correct handling without data loss or external uploads.
- [ ] Reimporting each supported file is idempotent, and all row/counterpart review decisions use T04 behaviour.
- [ ] Actual layout verification is recorded; absent real structural samples remain an explicit integration gap.

## Handoff

Coverage: F17; AT10, AT18.

Complete the second-pass review, save a sanitised task report under `docs/production/reports/T08.md` using [the template](../TASK_REPORT_TEMPLATE.md), and update production/root status. Report completed, failed, blocked and unverified checks separately. Finish the assigned work without routine permission loops; stop before the next task.
