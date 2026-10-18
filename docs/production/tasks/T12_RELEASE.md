# T12 — Product polish, PWA and full release verification

## Prerequisites

T00–T11 mandatory checks verified, or an owner-approved documented scope change. Do not silently waive blocked AI/audio/auth gates.

Read [the master plan](../00_MASTER_PLAN.md), [execution contract](../01_EXECUTION_CONTRACT.md), [status](../STATUS.md) and [acceptance tests](../04_ACCEPTANCE_TESTS.md). This card assigns only the work below.

## Build checklist

- [ ] Finish coherent Overview/Transactions/Accounts/Imports/Review/Bills/Assistant/Settings flows, recipient drill-downs and empty/loading/error/unsupported states. Remove debug/milestone/invariant proof jargon from normal screens.
- [ ] Repair dialog focus/labels/keyboard access, visible focus, zoom, readable type/contrast, long merchant text and 360px/1366px layouts. Verify actual chosen phone/browser and laptop.
- [ ] Use build-aware asset caching with an update strategy. Cache app assets, not private financial responses; explain connection requirements. Test fresh offline shell reload, unavailable save and new-release update.
- [ ] Run the full acceptance scenario, ownership/transaction tests, complete clean restore and provider-outage checks on a release candidate. Recheck every declared supported layout/capture path.
- [ ] Resolve dependency advisories with controlled upgrades and lockfile; review runtime vs tooling risk separately. Reduce large routes/charts where useful, without a framework/hosting rewrite.
- [ ] Verify existing Vercel SPA routes, environment, OAuth callbacks, owner-only data access and backend secret separation. Prepare rollback/export steps; deploy only if that concrete deployment is authorised.
- [ ] Update status/README/support matrix with evidence and limitations. Leave n8n/Drive/messages as optional unimplemented work, not release dependencies.

## Exit checks before reporting

- [ ] AT01–AT24 and OC01–OC06 have evidence at the right layer, with actual hosted auth, cross-device, OCR, Gemini/audio and selected device checks.
- [ ] All original PRD AC01–AC13 are mapped to observed outcomes. Unverified/unsupported cases are explicit and no future milestone is falsely green.
- [ ] Tests/build/CI, asset update/offline behaviour, backup restore and direct non-owner denials pass on the candidate.
- [ ] Report the tested commit/deployment and residual risks. If publishing is not authorised or a mandatory integration remains blocked, deliver the verified candidate and exact remaining gate; do not claim a full public release.

## Handoff

Coverage: F21–F24 and whole-project release gate; all AT/OC criteria.

Complete the second-pass review, save a sanitised task report under `docs/production/reports/T12.md` using [the template](../TASK_REPORT_TEMPLATE.md), and update production/root status. Report completed, failed, blocked and unverified checks separately. Finish the assigned work without routine permission loops; stop before the next task.
