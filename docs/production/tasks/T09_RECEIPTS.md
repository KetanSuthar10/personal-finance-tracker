# T09 — Real receipt and screenshot OCR

## Prerequisites

T08 verified.

Read [the master plan](../00_MASTER_PLAN.md), [execution contract](../01_EXECUTION_CONTRACT.md), [status](../STATUS.md) and [acceptance tests](../04_ACCEPTANCE_TESTS.md). This card assigns only the work below.

## Build checklist

- [ ] Replace all filename/sample-based extraction with actual image-pixel OCR, preferably browser worker processing. Reuse OCR/page rendering for selected scanned statement layouts required by T08.
- [ ] Keep extracted text, OCR evidence and the parsed transaction draft distinct. Extract amount/merchant/date/reference only when supported by the content; do not inject fixture UTRs, dates or confidence.
- [ ] Show an editable preview, unresolved fields and account/category review. Run accepted drafts through T01/T05. Missing fields produce correction, not invented defaults.
- [ ] Handle image orientation, low quality, duplicate file selection, cancellation and resource limits with useful error states. Do not retain/upload originals by default.
- [ ] Test independently generated images, including the supplied Audit Stationery ₹987.65 input and different names/amounts/filenames. A parser test on canned text is insufficient.
- [ ] Retain synthetic OCR fixtures in tests only; no sample transaction must enter the owner's database automatically.

## Exit checks before reporting

- [ ] AT17 passes from actual file upload through OCR, draft review and confirmed database entry.
- [ ] Renaming the same image does not change the extracted merchant/amount. Different image pixels change the result appropriately.
- [ ] Poor/unreadable input is visibly uncertain or rejected; confidence is not an unsupported 100% promise.
- [ ] Any required scanned statement layout is tested through page OCR plus T04 review; run relevant tests/build and phone capture checks.

## Handoff

Coverage: F01; AT17 and selected scanned cases in AT18.

Complete the second-pass review, save a sanitised task report under `docs/production/reports/T09.md` using [the template](../TASK_REPORT_TEMPLATE.md), and update production/root status. Report completed, failed, blocked and unverified checks separately. Finish the assigned work without routine permission loops; stop before the next task.
