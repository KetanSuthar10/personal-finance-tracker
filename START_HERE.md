# Start the real personal finance app

18 October 2026 | Handoff for Antigravity | Documentation and task pack, not implemented integrations

This pack continues the existing repository: https://github.com/KetanSuthar10/personal-finance-tracker . Keep its React/TypeScript application. The destination is an authenticated, persistent personal finance app with an integrated Gemini assistant and no seeded demo records in production.

## Add the pack to the project

1. Extract this ZIP outside the project first. Open the existing `personal-finance-tracker` folder in Antigravity.
2. Copy the extracted `docs/production/` directory into the project's `docs/` directory. It is a new directory and should not replace the older PRD, architecture or task plans.
3. Copy `AGENTS_UPDATE_INSTRUCTIONS.md` to the repository root. Antigravity will merge it with the existing `AGENTS.md` during T00. Do not blindly overwrite that file.
4. Open `FIRST_PROMPT.md`, copy its prompt into Antigravity, and run **T00 only**. No screenshots or media are needed to transfer these instructions.
5. Read its report and check that it contains actual evidence. Then give the next task ID from the task index. All task files may live in the project at once; only one is active.

If `docs/production/` already exists, compare contents before replacing anything. Preserve local code and uncommitted work. Do not copy the old audit's generated data into a production database.

## What to read

| File | Purpose |
| --- | --- |
| [00_MASTER_PLAN.md](docs/production/00_MASTER_PLAN.md) | Complete target, architecture, financial conventions and release boundaries |
| [01_EXECUTION_CONTRACT.md](docs/production/01_EXECUTION_CONTRACT.md) | Rules Antigravity follows during every task and before reporting |
| [02_TASK_INDEX.md](docs/production/02_TASK_INDEX.md) | Ordered small tasks and dependencies |
| [03_OWNER_SETUP.md](docs/production/03_OWNER_SETUP.md) | What you configure and where; no passwords in chat |
| [04_ACCEPTANCE_TESTS.md](docs/production/04_ACCEPTANCE_TESTS.md) | Concrete expected outcomes, including independent amounts |
| [05_FINDING_MAP.md](docs/production/05_FINDING_MAP.md) | Where each of the 24 review findings is addressed |
| [STATUS.md](docs/production/STATUS.md) | Honest progress and evidence ledger; initially not started |
| [TASK_REPORT_TEMPLATE.md](docs/production/TASK_REPORT_TEMPLATE.md) | Required completion report format |
| [SOURCES.md](docs/production/SOURCES.md) | Official integration references and what needs rechecking |

The audit and its synthetic diagnostic runner are in `docs/production/evidence/`. The audit describes the reviewed commit; it is not proof that later changes work.

## Give Antigravity one task at a time

After T00, use this message, replacing the ID and filename from the index:

```text
Start T01 using docs/production/tasks/T01_LEDGER.md.
Read the master plan, execution contract, current status and this task first.
Implement only this task and necessary fixes within its scope. Verify its exit checks,
review your changes, update status, and use the task report template before replying.
Do not start the next task. Never call an untested integration complete.
```

If a task is blocked, the report must identify the exact missing setup item and distinguish implemented code from verified live behaviour. Complete all independent work inside that task. You do not need to provide every credential before T00 or T01.

## Keep the workflow economical

- Carry the master plan, execution contract, status and active task in each fresh agent session. Read the full audit only for relevant findings.
- Use one primary implementation agent. Do not launch a team or request a full rewrite.
- Implement a coherent small change, run the relevant checks once, fix failures, then perform a second review pass. Do not repeatedly rerun unrelated tests to pad a report.
- Use real credentials only in provider settings or local ignored environment files. Test fixtures stay synthetic even though the final product is real.
- Keep n8n and Drive automation outside this build sequence until the core app passes release checks.

This pack does not deploy, create provider accounts, activate billing or make the app ready for real data by itself. A checked box needs an observed result.
