# First Antigravity task

Paste the following into a new Planning conversation after opening this repository folder. No credentials are needed.

```text
This is the documentation starter for my personal-finance-tracker project.

Read README.md, AGENTS.md, all documents under docs/, and the synthetic fixture under fixtures/. There is no runnable app yet. Treat the PRD as the requirements source of truth. Gemini is the selected app AI provider; n8n is optional later. The app must work on phone and laptop, learn categorisation rules, reconcile statement imports with daily entries, and correctly handle credit cards and EMIs.

Complete M0 only:
1. Summarise the confirmed scope, current repository contents, and open decisions.
2. Identify contradictions or missing details that would materially affect M1. Resolve routine implementation choices using the documented defaults, and record assumptions. Do not block on API keys, billing, exact bank statement formats, or n8n because M1 uses synthetic data.
3. Create docs/M1_TASK_PLAN.md with a concrete file/module plan, package choices, responsive screen plan, financial calculation approach, and meaningful validation checklist for M1.
4. Update docs/STATUS.md with the actual review outcome, blockers, and immediate next action.
5. Report the result and wait for my instruction to start M1. Do not scaffold or implement the application during this initial review. Do not request or print secrets, activate billing, deploy, or access real statements.

M1 will be a local runnable React/TypeScript/Vite prototype with the overview, accounts, transactions, manual entry, and correct synthetic-data totals. Cards/imports/assistant may have clearly labelled later-milestone navigation; do not fake those integrations. Keep changes inside this repository and do not overwrite unrelated work.
```

## Following instruction after the review

When satisfied with the review, tell Antigravity:

```text
Start M1 using docs/M1_TASK_PLAN.md and the project instructions. Implement and verify the complete milestone, update README with exact run commands and docs/STATUS.md with evidence, and show me the running result. Continue through routine reversible fixes without stopping for repeated confirmations. If an external dependency blocks one part, report it and complete independent work. Do not start M2 or change cloud accounts, billing, or deployment.
```

## Development model

Use Gemini 3.8 Flash initially; Medium reasoning for routine tasks and High for difficult accounting or debugging if the selector supports it. Model access is governed by the coding tool's subscription and quota, not this app's eventual API key. Stronger optional models depend on the actual account and Antigravity surface; use only included access. Set AI Credit Overages to Never. Check `docs/SOURCES.md` when provider availability changes.
