# T02 — Atomic database and owner access boundaries

## Prerequisites

T01 verified. Hosted verification needs the selected Supabase test project; continue schema/test implementation if setup is missing.

Read [the master plan](../00_MASTER_PLAN.md), [execution contract](../01_EXECUTION_CONTRACT.md), [status](../STATUS.md) and [acceptance tests](../04_ACCEPTANCE_TESTS.md). This card assigns only the work below.

## Build checklist

- [ ] Inspect existing migrations and target migration history. Prepare forward-compatible migrations using current Supabase tooling; do not edit an already-applied migration or replace existing data silently.
- [ ] Create the core account/event/posting/provenance/category/settings schema with same-owner foreign keys, safe money constraints, record versions and immutable command/idempotency identities. Plan later allocations/instalments/rules with forward migrations rather than claiming those features now.
- [ ] Store the allowed owner UUID in trusted server-controlled configuration. Enable RLS and least-needed grants on every exposed table/view/RPC. Only that owner may access finance records, including direct calls; a new signup cannot enrol itself.
- [ ] Implement transactional command boundaries for account/event writes, updates and source linkage. Derive identity server-side, revalidate semantics and return an authoritative result. Do not rely only on React validation or pass a client-supplied user_id as authority.
- [ ] Prefer owner-scoped/invoker access. If privileged functions are necessary, document the narrow reason, explicit ownership check, safe search path and execute grants. Add rollback, idempotency and concurrency checks.
- [ ] Write database allow/deny and transaction tests. Update environment/setup docs with placeholders only and current verified commands.

## Exit checks before reporting

- [ ] Apply and test on an isolated database: AT13 and AT15, including owner, non-owner, signed-out and forged-owner requests.
- [ ] An injected failure cannot leave an event without required postings/source support. Repeated command identity returns one effect.
- [ ] Cross-owner references and owner-config changes from the client fail; all newly exposed tables/functions have appropriate policy tests.
- [ ] Record actual migration/test output and security review. Without a database run, mark IMPLEMENTED_UNVERIFIED, not VERIFIED.

## Handoff

Coverage: F07, ownership and persistence boundaries; AT13, AT15.

Complete the second-pass review, save a sanitised task report under `docs/production/reports/T02.md` using [the template](../TASK_REPORT_TEMPLATE.md), and update production/root status. Report completed, failed, blocked and unverified checks separately. Finish the assigned work without routine permission loops; stop before the next task.
