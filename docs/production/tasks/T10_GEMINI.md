# T10 — Hosted Gemini, grounded tools and usage controls

## Prerequisites

T09 verified; project/model/secret setup required. Finish independent backend/UI work even if live/data-route activation is blocked.

Read [the master plan](../00_MASTER_PLAN.md), [execution contract](../01_EXECUTION_CONTRACT.md), [status](../STATUS.md) and [acceptance tests](../04_ACCEPTANCE_TESTS.md). This card assigns only the work below.

## Build checklist

- [ ] Remove browser API-key configuration/sessionStorage usage and direct provider fetch. Implement an authenticated owner-only Edge Function with server-held GEMINI_API_KEY and a supported configurable model.
- [ ] Verify actual API project access, quota and data-processing/budget route using current docs and a synthetic live request. Real-finance inference starts disabled until an appropriate route and allowed spend are evidenced; no billing activation/paid fallback is automatic.
- [ ] Use shared period/as-of/planning/account context and allowlisted read tools. Missing amount, unknown purpose or required account must request clarification. Write proposals require owner confirmation and T01/T05 validation.
- [ ] Centralise final outbound request schemas/alias masking for questions, descriptions, labels and every tool result. Use minimal relevant records/aggregates; treat document instructions and model replies as untrusted data.
- [ ] Bind monetary facts to deterministic tool results and source references. Prefer structured fact references rendered by the UI; reject fabricated/contradictory claims and invalid function arguments instead of relying on a prompt promise.
- [ ] Enforce model/input/output/tool/turn/time limits, atomic owner usage reservations, cache invalidation and cancellation. Record actual provider usage without prompt logging; test quota exhaustion and parallel request races.
- [ ] Provide honest unavailable/timeout/quota states and useful deterministic dashboard insights. Do not present a canned local chat response as live Gemini.

## Exit checks before reporting

- [ ] AT19–AT22 and AT13 pass, including final serialised outbound payload tests with synthetic identifiers.
- [ ] A real permitted synthetic call completes the actual function/tool exchange on the configured model; mocks are labelled as unit tests.
- [ ] Dashboard and assistant agree after date/reserve/data edits; proposed edits are revalidated on confirmation and do not duplicate on retry.
- [ ] Record real-data activation evidence separately. If that route or allowance is unresolved, state IMPLEMENTED_UNVERIFIED/BLOCKED and keep real-data AI off.
- [ ] Run relevant tests/build and verify no provider secret in client source, storage, bundle, logs or normal UI.

## Handoff

Coverage: F08, F09, F14, F15; AT13, AT19–AT22.

Complete the second-pass review, save a sanitised task report under `docs/production/reports/T10.md` using [the template](../TASK_REPORT_TEMPLATE.md), and update production/root status. Report completed, failed, blocked and unverified checks separately. Finish the assigned work without routine permission loops; stop before the next task.
