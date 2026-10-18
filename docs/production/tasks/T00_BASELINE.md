# T00 — Baseline and truthful status

## Prerequisites

None. This is the first task; later tasks are not authorised by it.

Read [the master plan](../00_MASTER_PLAN.md), [execution contract](../01_EXECUTION_CONTRACT.md), [status](../STATUS.md) and [acceptance tests](../04_ACCEPTANCE_TESTS.md). This card assigns only the work below.

## Build checklist

- [ ] Record current branch/commit, working tree, Node/package manager and actual npm scripts. Preserve newer/uncommitted changes. Compare the audit baseline with current source before assuming a defect remains.
- [ ] Merge AGENTS_UPDATE_INSTRUCTIONS.md into root AGENTS; retire the obsolete M0-only boundary. Reconcile PRD/architecture/DECISIONS references with the production master plan, including Google login, Vercel, empty production data and backend Gemini.
- [ ] Correct README, root STATUS and navigation claims. Point root status to the production evidence ledger. Do not mark M0–M6 complete based on existing unit tests.
- [ ] Gate the fabricated image-upload extraction and browser-key live-AI path so they cannot accept real inputs as functioning production features. Keep synthetic parser fixtures in tests. These small safety/status edits are the only application changes in this task.
- [ ] Run the existing test/build baseline once. Use the legacy audit runner where compatible to reproduce findings; its output is diagnostic, not a pass/fail release gate. Add a basic CI test/build workflow using the verified commands, without secrets or automatic deployment.

## Exit checks before reporting

- [ ] Read all controlling documents and show the reconciled instruction/decision changes without duplicate contradictory rules.
- [ ] Record actual test/build results and the current audit reproduction status; failures remain visible.
- [ ] The app cannot claim real OCR or live Gemini from simulated/browser-key paths; unavailable capabilities are labelled honestly.
- [ ] Create reports/T00.md and update the ledger with evidence. No later task is marked implemented.

## Handoff

Coverage: F01, F09, F24; baseline reproduction only.

Complete the second-pass review, save a sanitised task report under `docs/production/reports/T00.md` using [the template](../TASK_REPORT_TEMPLATE.md), and update production/root status. Report completed, failed, blocked and unverified checks separately. Finish the assigned work without routine permission loops; stop before the next task.
