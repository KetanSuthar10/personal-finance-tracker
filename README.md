# Personal Finance Tracker

An installable personal finance web app for bank/card statement imports, daily expense capture, remembered categorisation, card bills, EMIs, and an integrated Gemini assistant.

**Status: Production Transition (Task T00 Baseline), 18 October 2026 (Asia/Kolkata).**
The application is transitioning from the local prototype milestone phase to the production release sequence guided by the [Production Master Plan](docs/production/00_MASTER_PLAN.md) and [Execution Contract](docs/production/01_EXECUTION_CONTRACT.md). Current progress and verified evidence are recorded in the [Production Status Ledger](docs/production/STATUS.md).

> [!NOTE]
> The repository contains working local prototype screens and a suite of 58 automated unit tests operating on synthetic fixtures. In production, the application starts with an empty database per authenticated owner, fails closed when unauthenticated, and uses an authenticated backend Gemini proxy.

## Running the application locally

Ensure Node (v20+ or v24+) is installed.

```bash
# 1. Install pinned dependencies
npm install

# 2. Run automated financial invariant & unit test suite
npm test

# 3. Build production bundle (TypeScript type check + Vite bundler)
npm run build

# 4. Start local development server
npm run dev
```

The application will start at `http://127.0.0.1:5173/` or `http://localhost:5173/`.

## Architecture & Production Transition

| Component | Prototype State | Production Target (Master Plan) |
| --- | --- | --- |
| **Auth & Identity** | Local session / demo owner | Supabase Auth with Google OAuth, server-controlled owner UUID whitelist |
| **Ledger Persistence** | Browser memory / LocalStorage | Supabase PostgreSQL with Row Level Security (RLS) & transactional RPCs |
| **Accounting Engine** | Integer paise arithmetic, signed net position | Shared validated domain contracts, atomic database balance invariants |
| **Gemini AI Assistant** | Local deterministic stub / optional session key | Authenticated Supabase Edge Function proxy, server-side key, outbound identifier masking |
| **Receipt / Document Capture** | Synthetic preview & fixture testing | Real on-device / client-side OCR and maintained document parsers |
| **Hosting** | Local Vite dev server | Existing Vercel deployment with continuous integration (GitHub Actions) |

## Documentation Index

| File | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Controlling instructions, financial invariants, and execution contract |
| [docs/production/00_MASTER_PLAN.md](docs/production/00_MASTER_PLAN.md) | Production architecture, boundaries, and migration decisions |
| [docs/production/01_EXECUTION_CONTRACT.md](docs/production/01_EXECUTION_CONTRACT.md) | Rigorous engineering contract and evidence requirements for all tasks |
| [docs/production/STATUS.md](docs/production/STATUS.md) | **Active production evidence ledger** (tasks T00–T12) |
| [docs/STATUS.md](docs/STATUS.md) | Entry point to project status pointing to the production ledger |
| [docs/PRD.md](docs/PRD.md) | Product scope, user journeys, and acceptance criteria |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Confirmed choices and architectural reconciliations |
| [docs/production/04_ACCEPTANCE_TESTS.md](docs/production/04_ACCEPTANCE_TESTS.md) | Independent acceptance tests and invariant scenarios |
