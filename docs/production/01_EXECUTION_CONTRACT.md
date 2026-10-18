# Execution contract for every assigned task

## Before editing

- [ ] Read root AGENTS, PRD, production master plan, current production status and the assigned task. Read only the relevant audit sections and source modules next.
- [ ] Inspect branch/commit and working tree. Preserve unrelated/uncommitted work. Use a reviewable branch; do not reset or overwrite the user's changes.
- [ ] Restate the task outcome and exit checks in a short update. Confirm dependencies from evidence, not from a green milestone label.
- [ ] Identify external setup needed, then complete independent work in this task. Do not ask for all credentials upfront.

## While implementing

- [ ] Stay inside the assigned task plus necessary defect fixes in its path. Log optional ideas; do not implement them automatically.
- [ ] Route every financial input through the same validated command semantics. Keep extraction, proposal, review and persistence separate.
- [ ] Implement the real capability or show an honest unavailable state. Never simulate OCR, generated answers, auth, sync or successful saves in production.
- [ ] Use current official provider docs and exact pinned packages/lockfile. Read actual package/CLI help before assuming commands.
- [ ] Keep secrets, raw statements and real financial data out of Git, prompts and routine logs. Use isolated synthetic test data.
- [ ] Resolve ordinary reversible implementation choices without repeated permission requests. Ask only for material missing requirements, unapproved spend, destructive changes or outside-scope account actions.
- [ ] Leave unrelated features and future tasks alone. Use one implementer unless the user requests delegation.

## Mandatory second pass before the report

- [ ] Inspect the complete diff and changed files. Trace one real user path through UI, validation, repository and persistence/result handling.
- [ ] Check every task checkbox against observable behaviour. Fix any discovered omission or mark it incomplete.
- [ ] Run relevant meaningful tests plus build/type checks when code changes require them. Test failure paths that matter for the task, using independently expected results.
- [ ] Run required live/database/browser checks in their actual environment. A mocked API response cannot prove live integration. If not run, say why.
- [ ] Check idempotency, ownership, date/account selection and data-loss behaviour where touched. Verify failures leave no partial financial write.
- [ ] If UI changed, inspect 360px and 1366px relevant states, keyboard/focus and clear error messages. If a device check is unavailable, record it as unverified.
- [ ] Check there are no new canned defaults, fake confidence scores, silent local fallbacks or misleading completion labels.
- [ ] Update `docs/production/STATUS.md`, a per-task report, relevant decisions and the root `docs/STATUS.md` entry point. Do not mark future tasks complete.
- [ ] State residual limits honestly and name the exact next task. Do not start it without the user's next assignment.

## Evidence rules

For each exit check record: requirement ID, tested commit, environment, command/action, observed outcome and expected outcome. Keep a short sanitised result or a path to evidence. Do not publish secrets or real financial screenshots in the repository.

Use these states: `NOT_STARTED`, `IN_PROGRESS`, `IMPLEMENTED_UNVERIFIED`, `VERIFIED`, `BLOCKED`, `FAILED`, `DEFERRED`. `VERIFIED` requires all mandatory exit checks for that task. Report partial subchecks separately; do not call a whole integration done because a subset passed. Code can be ready for owner setup while the task remains unverified.

Existing tests are a baseline. Do not delete/weaken a failing assertion or change an expected amount merely to get green output. When a legitimate specification change invalidates an old audit probe, explain it and add the new acceptance case. The legacy audit runner is a reproduction aid, not the current acceptance specification.

The final report must use [the template](TASK_REPORT_TEMPLATE.md), distinguish observed evidence from assumptions, and explicitly answer: **Did I implement the assigned behaviour, verify its success/failure paths, and check that I stayed within scope?** A self-review is a second pass by the same agent, not an independent audit.
