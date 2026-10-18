# T07 — Complete backup and controlled recovery

## Prerequisites

T06 verified.

Read [the master plan](../00_MASTER_PLAN.md), [execution contract](../01_EXECUTION_CONTRACT.md), [status](../STATUS.md) and [acceptance tests](../04_ACCEPTANCE_TESTS.md). This card assigns only the work below.

## Build checklist

- [ ] Version a complete owner export containing accounts/openings, events/postings/sources, batches/review decisions, categories/rules/aliases, statements/allocations, EMI occurrences and planning/expected-income preferences.
- [ ] Exclude credentials, auth sessions, owner-authorisation configuration and default original file blobs. Preserve required relationships and safe change history; document any intentionally excluded disposable cache.
- [ ] Validate all fields, safe integers, real dates, uniqueness, same-owner references and financial semantics before restoring. A checksum detects accidental change; it does not replace validation or authenticate arbitrary content.
- [ ] Implement an explicit replace/merge policy and dry-run impact preview. Use an atomic server transaction, an idempotency key and safe conflict handling. Require a recovery copy before destructive replacement; do not overwrite existing owner records silently.
- [ ] Surface export/write/restore/storage failures and keep old state on validation/transaction failure. Do not fall back to fixture data.
- [ ] Verify undo preserves independent observations after restore and that restored rules/settings produce the same next-entry behaviour.

## Exit checks before reporting

- [ ] AT09, AT15 and AT16 pass on a clean isolated store plus a populated failure case.
- [ ] Export→clean restore reproduces exact balances and all categories/rules/allocations/instalment relationships; test a future rule after restore.
- [ ] Checksum-consistent but semantically inconsistent input is rejected; failed restore leaves the previous dataset unchanged.
- [ ] Provide a repeatable private owner recovery procedure and actual database verification evidence.

## Handoff

Coverage: F11, F12; AT09, AT15–AT16.

Complete the second-pass review, save a sanitised task report under `docs/production/reports/T07.md` using [the template](../TASK_REPORT_TEMPLATE.md), and update production/root status. Report completed, failed, blocked and unverified checks separately. Finish the assigned work without routine permission loops; stop before the next task.
