# T03 — Google login and the first real connected ledger

## Prerequisites

T02 verified and owner OAuth/environment setup from 03_OWNER_SETUP.md.

Read [the master plan](../00_MASTER_PLAN.md), [execution contract](../01_EXECUTION_CONTRACT.md), [status](../STATUS.md) and [acceptance tests](../04_ACCEPTANCE_TESTS.md). This card assigns only the work below.

## Build checklist

- [ ] Implement Google sign-in, the actual callback/session flow, sign-out, refresh and access-denied/error states using current SDK guidance. Register only the required exact redirects and identity scopes.
- [ ] Build the Supabase repository and use it as production's durable source. Production starts empty; missing config, expired auth or database failures cannot load DEMO_FIXTURE or fall back to LocalStorage.
- [ ] Add owner onboarding and bank/cash/card create/edit/opening setup, categories/defaults and normal add/edit transaction flows. Preserve history when changing openings; show the impact of edits and support safe correction rather than delete-only drawers.
- [ ] Use owner-scoped reads and atomic commands from T02. Refetch after saves and on focus; use record versions/idempotency and clear pending/failure/conflict states. Do not show a successful save before it is durable.
- [ ] Show recorded balance date separately from last statement-confirmed date. Remove fixture/milestone/debug copy from ordinary owner screens touched here.
- [ ] Clear in-memory financial state on logout and isolate synthetic development/test fixtures from the production bundle/runtime. Keep auth sessions separate from any prohibited financial-data browser cache.

## Exit checks before reporting

- [ ] Complete AT13–AT15 on actual hosted integration, including Google callback/refresh/logout, direct denial and save failure.
- [ ] Create an account and expense on laptop; see the same committed records after refresh/refocus on phone. Record actual device/environment.
- [ ] First owner session contains no invented balances, sample statements or rules. Configuration/database failure leaves an honest setup/error state.
- [ ] Relevant tests/build and responsive entry/account checks pass; record exact missing live steps rather than calling config code a working integration.

## Handoff

Coverage: F07, F12, F16, F18, F23; AT13–AT15.

Complete the second-pass review, save a sanitised task report under `docs/production/reports/T03.md` using [the template](../TASK_REPORT_TEMPLATE.md), and update production/root status. Report completed, failed, blocked and unverified checks separately. Finish the assigned work without routine permission loops; stop before the next task.
