# Merge into the existing project instructions during T00

This file is a merge instruction, not a replacement `AGENTS.md`.

- Read and preserve the existing financial, privacy, ownership, budget and verification rules.
- Replace the stale “initial M0 documentation-only task” boundary with the active production task workflow below. Mark the original `ANTIGRAVITY_START.md` handoff as historical and link to `docs/production/00_MASTER_PLAN.md`.
- Keep `docs/PRD.md` as the product requirements source. The production master plan defines the implementation decisions for the new sequence; reconcile older architecture/task-plan conflicts in `docs/DECISIONS.md`, with explicit links and dates.
- Apply `docs/production/01_EXECUTION_CONTRACT.md` to every assigned production task. Read it and the active task before editing.
- Run only the task the user assigns. Finish its reversible implementation, verification and fixes without routine permission loops. Do not silently start the next task or expand scope.
- Require the task's evidence before `VERIFIED`. A unit test, mock request, SQL file or configuration screenshot cannot stand in for live sign-in, connected persistence, real extraction or an actual provider request.
- Production starts empty, fails closed when configuration/auth/storage is unavailable, and has no automatic demo/local-data fallback. Keep synthetic fixtures isolated to tests and development checks.
- Financial writes use a shared validated domain contract and an atomic owner-scoped database boundary. Model proposals and parsed documents never write arbitrary ledger fields directly.
- Keep the Gemini key and privileged database credentials on the backend. RLS and backend ownership checks are both required. No automatic paid use, billing activation, alternate provider, account rotation or messaging workflow is authorised by this pack.
- After each task, review the changed code and real flow, update both the production evidence ledger and the repository status entry point, and report using `docs/production/TASK_REPORT_TEMPLATE.md`.
- Use one primary implementer. Do not launch subagents unless the user requests delegation.

Merge once, remove contradictory wording, and report the resulting instruction changes. Do not scatter different versions of these rules across multiple hidden agent configuration files.
