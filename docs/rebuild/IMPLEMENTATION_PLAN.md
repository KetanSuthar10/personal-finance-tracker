# Rebuild Implementation Plan — Personal Finance Tracker

**Date**: 19 October 2026  
**Status**: APPROVED BASELINE (Ready for Phase 1)  
**Governing Strategy**: Phased, test-driven, independently verifiable execution with zero mock shortcuts.

---

## Roadmap Overview

```
Phase 0: Baseline & Audit ──────────► [COMPLETED]
    │
Phase 1: Config & Secret Purge ─────► [COMPLETED]
    │
Phase 2: Auth & Owner Gate ─────────► [COMPLETED]
    │
Phase 3: Database & RLS ────────────► [COMPLETED]
    │
Phase 4: Cloud Repo & Modes ────────► [COMPLETED]
    │
Phase 5: Financial Correctness ─────► [COMPLETED]
    │
Phase 6: AI Security & Capture ─────► [COMPLETED]
    │
Phase 7: Full Testing Suite ────────► [COMPLETED]
    │
Phase 8: Docs & Deployment ─────────► [COMPLETED]
```

---

## Phase Details & Task Specifications

### Phase 1 — Replace Supabase Project Configuration & Purge Hardcoded Secrets
- **Goal**: Completely remove legacy hardcoded project URL and keys. Require explicit frontend environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). Fail closed and gracefully when unconfigured.
- **Affected Files**:
  - `src/lib/supabase.ts`
  - `.env.example`
  - `.gitignore`
  - `src/tests/database_auth.test.ts`
  - `docs/production/reports/T03.md` (sanitize historical reference)
- **Action Items**:
  1. Remove `DEFAULT_SUPABASE_URL` and `DEFAULT_SUPABASE_ANON_KEY` from `src/lib/supabase.ts`.
  2. Implement strict URL parsing: validate that `VITE_SUPABASE_URL` is a valid HTTPS Supabase URL (`https://*.supabase.co`).
  3. Support canonical `VITE_SUPABASE_PUBLISHABLE_KEY` and fallback `VITE_SUPABASE_ANON_KEY`.
  4. Ensure `supabase` client is only instantiated when valid configuration is present, or exports a safe unconfigured indicator.
  5. Update `.env.example` with clear instructions and placeholders only.
  6. Update `src/tests/database_auth.test.ts` so the configuration test verifies environment validation behavior without requiring secrets.
- **Verification Gates**:
  - `npm test` passes `database_auth.test.ts`.
  - `npm run build` generates a dist bundle with 0 occurrences of `mpjjetxtpekrxeyivlkv`.
  - App displays an unconfigured setup state if variables are missing, without throwing unhandled exceptions.

---

### Phase 2 — Rebuild Authentication & Fail-Closed Owner Authorization
- **Goal**: Fix the critical fail-open vulnerability in `AuthContext.tsx`. Implement complete auth lifecycle: email/password signin, signup, password recovery, password update, Google OAuth handling, session restoration, and secure owner bootstrap.
- **Affected Files**:
  - `src/context/AuthContext.tsx`
  - `src/features/auth/AuthPage.tsx`
  - `src/features/auth/AccessDeniedPage.tsx`
  - `src/features/auth/OwnerBootstrapModal.tsx` (new component for unconfigured owner claim)
  - `src/App.tsx`
  - `src/tests/auth_and_sync.test.ts`
  - `src/tests/database_auth.test.ts`
- **Action Items**:
  1. Rewrite `checkOwnerStatus` in `AuthContext.tsx`:
     - If RPC or query fails, status is `{ isOwner: false, ownerConfigured: unknown, state: 'error' }`. Never grant owner status on error.
     - If database has 0 owner rows, status is `{ isOwner: false, ownerConfigured: false, state: 'unconfigured' }`.
     - Only grant `isOwner: true` if server-verified `auth.uid()` matches `app_owner_config.owner_user_id`.
  2. Implement Password Reset:
     - Add `resetPasswordForEmail(email)` to `AuthContext.tsx`.
     - Add "Forgot Password?" tab and form to `AuthPage.tsx`.
     - Listen for `PASSWORD_RECOVERY` event in `onAuthStateChange` and open password update modal.
  3. Implement Owner Bootstrap:
     - When `ownerConfigured === false`, render `OwnerBootstrapPage` requiring the initial user to claim ownership via server-validated bootstrap RPC.
  4. Non-owners strictly routed to `AccessDeniedPage` with sign-out action.
- **Verification Gates**:
  - Unit tests verifying:
    - RPC failure results in access denied.
    - Unconfigured owner state blocks access to financial dashboard.
    - Password recovery email triggers expected Supabase API call.
    - Owner enrollment is restricted to the first user and blocked thereafter.

---

### Phase 3 — Database, Migrations, RLS & Atomic RPCs
- **Goal**: Audit, order, and document PostgreSQL migrations. Verify RLS policies, safe integer constraints, and atomic RPC boundaries for both single events and batch imports.
- **Affected Files**:
  - `supabase/migrations/20261018000001_initial_schema.sql`
  - `supabase/migrations/20261018000002_owner_and_transactional_boundaries.sql`
  - `supabase/combined_production_schema.sql`
  - `supabase/migrations/20261019000003_batch_import_and_bootstrap.sql` (new migration)
- **Action Items**:
  1. Add migration `20261019000003_batch_import_and_bootstrap.sql`:
     - RPC `bootstrap_app_owner()`: allows the first authenticated user to claim ownership ONLY if `app_owner_config` is empty.
     - RPC `commit_import_batch()`: atomic transaction for batch imports, postings, observations, and batch status.
  2. Update `supabase/combined_production_schema.sql` to include new RPCs so fresh instances can be set up in 1 step.
  3. Document precise migration execution order and rollback procedures.
- **Verification Gates**:
  - SQL schema syntax validation.
  - Tests for `execute_financial_command` and `commit_import_batch` atomicity.

---

### Phase 4 — Cloud Repository and Data Isolation
- **Goal**: Enforce explicit application modes (`cloud` vs `demo` vs `local`). Prevent silent repository swapping or local demo contamination when cloud sync experiences errors.
- **Affected Files**:
  - `src/data/repository.ts`
  - `src/data/supabaseRepository.ts`
  - `src/data/localRepository.ts`
  - `src/context/LedgerContext.tsx`
  - `src/tests/repository.test.ts`
  - `src/tests/auth_and_sync.test.ts`
- **Action Items**:
  1. Update `LedgerContext.tsx`:
     - Remove silent fallback to `LocalLedgerRepository` on auth/sync failure.
     - Expose explicit `mode: 'cloud' | 'demo'`.
     - In cloud mode, persistence failure displays a dedicated retry banner or error modal, preserving dirty form input.
  2. Update `SupabaseLedgerRepository`:
     - Implement `commitImportBatch` calling the atomic PostgreSQL RPC `commit_import_batch`.
     - Handle session expiration and network interruption cleanly.
- **Verification Gates**:
  - Automated tests asserting that cloud repo never loads demo fixtures.
  - Test asserting that an import failure rolls back completely.

---

### Phase 5 — Financial Correctness & Domain Regression Suite
- **Goal**: Verify all financial invariants: integer paise math, balanced postings for transfers, card payments, refunds, duplicate handling, EMI schedules, and safe integer boundaries.
- **Affected Files**:
  - `src/domain/commandService.ts`
  - `src/domain/ledger.ts`
  - `src/domain/cards.ts`
  - `src/domain/reconciliation.ts`
  - `src/tests/canonical_ledger.test.ts`
  - `src/tests/cards.test.ts`
  - `src/tests/reconciliation.test.ts`
- **Action Items**:
  1. Audit refund spending reduction vs positive reimbursement.
  2. Audit card payment posting direction (bank -paise, card +paise / net zero).
  3. Ensure duplicate detection in reconciliation does not collapse distinct transactions with identical amounts on the same day.
  4. Ensure EMI plans correctly calculate unbilled instalments without duplicate counting of settled statements.
- **Verification Gates**:
  - All financial domain unit tests pass with zero floating-point math.

---

### Phase 6 — AI Security, Privacy Proxy & Receipt Capture Safety
- **Goal**: Remove raw API key handling from client browser storage. Secure outbound AI context, enforce masking of account identifiers, and maintain honest OCR labeling.
- **Affected Files**:
  - `src/features/assistant/AssistantPage.tsx`
  - `src/features/assistant/AssistantConfigModal.tsx`
  - `src/domain/gemini.ts`
  - `src/domain/ocr.ts`
  - `src/features/capture/ReceiptCaptureTab.tsx`
- **Action Items**:
  1. Remove `sessionStorage.setItem('pft_gemini_key')`.
  2. Configure assistant to call Supabase Edge Function or local deterministic engine when Edge Function is unconfigured.
  3. Ensure all serialized prompts mask account numbers, user names, and exact reference IDs.
  4. Maintain truthful OCR labeling (receipt uploads explain that live client OCR is scheduled for T09; parser heuristics tested via synthetic fixtures).
- **Verification Gates**:
  - Zero browser storage of AI API keys.
  - Core ledger functions (transactions, balances, accounts) work 100% when AI is disabled.

---

### Phase 7 — Comprehensive Test Suite & Release Verification
- **Goal**: Run all test suites, type checking, build pipelines, and record verified results in `TEST_RESULTS.md`.
- **Action Items**:
  1. Run `npm test` across all 14+ suites.
  2. Run `tsc --noEmit` and `npm run build`.
  3. Verify bundle size and ensure no secrets are bundled.
  4. Record complete test output and metrics.
- **Verification Gates**:
  - 100% test pass rate across all suites.

---

### Phase 8 — Documentation & Owner Deployment Runbook
- **Goal**: Provide complete documentation, owner setup instructions, and deployment guide.
- **Affected Files**:
  - `README.md`
  - `START_HERE.md`
  - `.env.example`
  - `docs/rebuild/CHANGELOG.md`
  - `docs/rebuild/DEPLOYMENT_GUIDE.md`
- **Action Items**:
  1. Document step-by-step setup for creating a new Supabase project.
  2. Document running migrations and bootstrapping owner UUID.
  3. Document Google OAuth provider configuration in Google Cloud Console & Supabase.
  4. Document Vercel deployment environment variables.
