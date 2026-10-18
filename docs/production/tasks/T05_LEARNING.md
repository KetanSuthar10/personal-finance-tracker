# T05 — Recipient memory and category corrections

## Prerequisites

T04 verified.

Read [the master plan](../00_MASTER_PLAN.md), [execution contract](../01_EXECUTION_CONTRACT.md), [status](../STATUS.md) and [acceptance tests](../04_ACCEPTANCE_TESTS.md). This card assigns only the work below.

## Build checklist

- [ ] Add persistent owner-scoped categories, counterparties/aliases and future category rules with optional account/description constraints, explicit priority, active state and provenance.
- [ ] Apply rules centrally to every new draft/entry/import route. Treat a consciously selected transaction category as an override; do not overwrite it with a broad rule.
- [ ] Add transaction edits and category correction with distinct transaction-only and future-rule choices. Make it possible for the same person/cafe to have different purposes under explicit constraints.
- [ ] Provide an uncertainty inbox and useful recipient/category spending drill-downs with the shared period and supporting records.
- [ ] Provide a preview/selection for historical bulk recategorisation. Record changes; do not silently apply a new future rule to old entries or unrelated accounts.
- [ ] Use deterministic rules first. Gemini suggestions remain optional and cannot be required to teach a rule or keep the ledger usable.

## Exit checks before reporting

- [ ] AT11–AT12 pass across manual entry and imports with matching/nonmatching/conflicting rules.
- [ ] Teaching a cafe rule changes the next matching draft; a one-time correction and an explicit manual override remain local.
- [ ] Rule scope/priority and historical changes are visible and reversible; direct non-owner access fails for new tables.
- [ ] Actual UI flow, relevant tests and build pass; the pure rule-helper test alone does not complete this task.

## Handoff

Coverage: F13, F23; AT11–AT12.

Complete the second-pass review, save a sanitised task report under `docs/production/reports/T05.md` using [the template](../TASK_REPORT_TEMPLATE.md), and update production/root status. Report completed, failed, blocked and unverified checks separately. Finish the assigned work without routine permission loops; stop before the next task.
