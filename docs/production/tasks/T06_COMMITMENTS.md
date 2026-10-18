# T06 — Cards, EMI lifecycle, income and planning

## Prerequisites

T05 verified; statement/schedule examples and owner planning inputs are handled privately.

Read [the master plan](../00_MASTER_PLAN.md), [execution contract](../01_EXECUTION_CONTRACT.md), [status](../STATUS.md) and [acceptance tests](../04_ACCEPTANCE_TESTS.md). This card assigns only the work below.

## Build checklist

- [ ] Add real statement create/import-review support with explicit card association, issuer facts, due/minimum/remaining values, unbilled activity and overpayment handling for multiple cards.
- [ ] Implement payment-to-statement allocations transactionally, including partial/excess payment, reversal and rollover. Enforce total allocation capacity; never apply every later payment to every bill.
- [ ] Model individual EMI instalment occurrences with billed/paid links and lifecycle. Preserve purchase recognition across conversion, principal settlement, fees/interest, refund, completion and foreclosure.
- [ ] Where a standalone loan is tracked, add validated liability-account and principal/known-charge commands consistent with T01; a payment's principal is not a fresh expense. Use supplied schedules and label estimates/unknown issuer values.
- [ ] Implement expected income states and links to received income without increasing liquid balances twice. Include essentials/savings/reserve and every unpaid due occurrence once in the selected planning horizon.
- [ ] Replace 'Safe to spend' certainty with a transparent planning estimate, dates, calculation components and missing assumptions. Prevent repeated conversion of one purchase into duplicate active plans.

## Exit checks before reporting

- [ ] OC01–OC06 pass including the ₹800 planning fixture, paid billed EMI, multi-month occurrences and two-card allocation.
- [ ] A complete purchase→conversion→two-instalment→partial-payment→refund/fee→rollover fixture reconciles without duplicate spending.
- [ ] Expected income remains separate and actual receipt linkage does not double-add. New tables/RPCs pass ownership and rollback checks.
- [ ] Relevant tests/build and real multi-card/EMI UI flows pass; unknown rate/payoff information is never invented.

## Handoff

Coverage: F05, F06, F18, F19; OC01–OC06.

Complete the second-pass review, save a sanitised task report under `docs/production/reports/T06.md` using [the template](../TASK_REPORT_TEMPLATE.md), and update production/root status. Report completed, failed, blocked and unverified checks separately. Finish the assigned work without routine permission loops; stop before the next task.
