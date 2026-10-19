# Rebuild Changelog & Architectural Decisions — Personal Finance Tracker

All notable changes and architectural decisions made during the recovery and rebuild of the Personal Finance Tracker application are documented in this file.

---

## [Phase 0 — Baseline Audit & Plan] — 2026-10-19

### Established
- Full repository code, test, and configuration audit performed.
- Baseline build diagnostic: `tsc && vite build` passed (Exit 0).
- Baseline test diagnostic: 14 test suites, 86 tests (85 passed, 1 failed due to undefined anon key in test env).
- Created rebuild documentation hub under `docs/rebuild/`:
  - `BASELINE_AUDIT.md`: Complete codebase inventory, runtime diagnostics, and discrepancy table.
  - `ARCHITECTURE_MAP.md`: Topology diagram, authentication lifecycle, mutation flows, and database schema mappings.
  - `SECURITY_FINDINGS.md`: Detailed analysis of 7 identified vulnerabilities (SEC-01 through SEC-07).
  - `IMPLEMENTATION_PLAN.md`: 8-phase execution roadmap with gates and criteria.
  - `TEST_RESULTS.md`: Detailed test run output, durations, and failure analysis.
  - `CHANGELOG.md`: This decision and modification ledger.

### Identified Critical Vulnerabilities
- **SEC-01**: Hardcoded old Supabase project URL (`mpjjetxtpekrxeyivlkv`) and anon key compiled into production JS bundle.
- **SEC-02**: Dangerous fail-open logic in `AuthContext.tsx` where RPC error or unconfigured database assigns `isOwner: true`.
- **SEC-03**: Browser `sessionStorage` credential storage and client-side transmission of Gemini API keys.
- **SEC-04**: Non-atomic multi-event persistence in `SupabaseLedgerRepository.commitImportBatch`.
- **SEC-05**: Silent repository fallback in `LedgerContext.tsx` to `LocalLedgerRepository` loading synthetic demo fixture.
- **SEC-06**: Missing core authentication workflows (password reset request, password recovery callback, password update).
- **SEC-07**: Unvalidated client initialization in `src/lib/supabase.ts`.

---

## [Phase 1 — Replace Supabase Configuration & Purge Hardcoded Secrets] — 2026-10-19

### Completed
- **Eliminated Hardcoded Fallbacks**: Removed `DEFAULT_SUPABASE_URL` and `DEFAULT_SUPABASE_ANON_KEY` from `src/lib/supabase.ts`.
- **Config Validation Function**: Added `validateSupabaseConfig` which validates:
  - HTTPS protocol requirement (`https://*.supabase.co`).
  - Rejection of placeholders (`your-project`, `placeholder-unconfigured`, `your-publishable`).
  - Minimum key length and non-empty values.
- **Canonical Configuration**:
  - `VITE_SUPABASE_URL`: Supabase project URL.
  - `VITE_SUPABASE_PUBLISHABLE_KEY`: Canonical publishable key (with backward compatibility fallback to `VITE_SUPABASE_ANON_KEY`).
- **Safe Non-Throwing Stub**: Safe placeholder initialized only when unconfigured so Vite module load does not throw runtime crashes; `isSupabaseConfigured` evaluates to `false` and surfaces clear setup alerts.
- **Environment Documentation**: Updated `.env.example` with local development, Vercel instructions, and explicit security warnings.
- **Sanitized Historical References**: Removed stale old project URL in `docs/production/reports/T03.md`.
- **Verified Bundle Hygiene**: `npm run build` verified: zero occurrences of legacy project URL or old key in `dist/assets/`.
- **Test Verification**: 87 passing tests across all 14 test suites (`npm test` exit code 0).

---

## [Phase 2 — Rebuild Authentication & Fail-Closed Owner Authorization] — 2026-10-19

### Completed
- **Eliminated Fail-Open Owner Flaw (SEC-02)**:
  - Removed dangerous `isOwner: true` fallback on RPC/table error in `src/context/AuthContext.tsx`.
  - Removed `isOwner: !configured || isOwner` which previously granted ownership to any user when the instance had no enrolled owner.
  - Implemented explicit status states: `'loading' | 'unconfigured' | 'authorized' | 'denied' | 'error'`.
- **Server-Verified Owner Bootstrap**:
  - Implemented `bootstrapOwner()` in `AuthContext.tsx` calling `bootstrap_app_owner()` RPC.
  - Added `src/features/auth/OwnerBootstrapPage.tsx` providing an onboarding screen for the initial owner to claim single-owner authority.
  - Added manual SQL enrollment instructions in the UI for database admins.
- **Fail-Closed Authorization Routing**:
  - Updated `src/App.tsx` (`ProtectedApp`):
    - `unconfigured`: Renders `OwnerBootstrapPage` (no access to financial ledger).
    - `error`: Renders `AuthErrorPage` with retry button.
    - `denied` / non-owner: Strictly renders `AccessDeniedPage`.
    - `authorized` & `isOwner`: Renders `<LedgerProvider><AppContent /></LedgerProvider>`.
- **Password Reset & Recovery Lifecycle**:
  - Added `sendPasswordResetEmail(email)` to `AuthContext.tsx`.
  - Added `updatePassword(newPassword)` to `AuthContext.tsx`.
  - Added "Forgot Password?" tab and request form to `src/features/auth/AuthPage.tsx`.
  - Added `src/features/auth/ResetPasswordModal.tsx` which triggers automatically upon `PASSWORD_RECOVERY` auth state changes.
- **Test Verification**: 91 passing tests across all 14 test suites (`npm test` exit code 0).

---

## [Phases 3 & 4 — Database Migrations, Atomic RPCs, and Repository Isolation] — 2026-10-19

### Completed
- **Transactional Import Batch RPC**:
  - Created `supabase/migrations/20261019000003_batch_import_and_bootstrap.sql`.
  - Added `commit_import_batch` function wrapping batch header insertion, new events, postings, and observation updates inside a single PostgreSQL atomic transaction (`BEGIN...EXCEPTION...ROLLBACK`).
  - Added `bootstrap_app_owner` function guaranteeing single-owner enrollment with atomic locking.
- **SupabaseLedgerRepository RPC Integration**:
  - Updated `src/data/supabaseRepository.ts` to execute `commit_import_batch` through a single atomic RPC call instead of an uncoordinated client loop (resolving SEC-04).
- **Explicit Cloud vs Demo Mode Distinction**:
  - Protected `resetToDemo` in `supabaseRepository.ts` to strictly throw an error in connected cloud mode.
  - Updated `src/features/settings/SettingsPage.tsx` to disable demo reset buttons and display an active Cloud Persistence safeguard badge when connected.
- **Persistence Error Alerting**:
  - Connected `persistenceError` from `LedgerContext.tsx` into `src/components/layout/Shell.tsx` with a prominent warning banner and a "Retry Sync" action.
  - Updated `OfflineBanner.tsx` to communicate true cloud pause semantics rather than falsely claiming cloud records are written to local storage.

---

## [Phase 5 — Financial Correctness, Statement Allocations, and Reconciliation] — 2026-10-19

### Completed
- **Reconciliation Single-Claim Invariant**:
  - Updated `src/domain/reconciliation.ts` to maintain `claimedEventIds`, ensuring each existing ledger event is claimed at most once per import batch. Prevents multiple imported rows from collapsing into a single existing transaction.
- **Merchant Description Distinction**:
  - Added `areDescriptionsCompatible` check in `reconciliation.ts` to ensure that transactions with identical amounts and nearby dates are NOT marked as `EXACT_MATCH` if their merchant descriptions are completely different (e.g., "Pharmacy" vs "Sample cafe"). Flags them as `UNCERTAIN_MATCH` for user review.
- **Extended Planning Horizon Projection**:
  - Enhanced `calculateCashPlanning` in `src/domain/cards.ts` to project all remaining instalments within extended planning horizons (e.g. 60 or 90 days), up to `total_tenure_months - instalments_billed`.
  - Excluded completely settled EMIs from future liability deductions.
- **Test Verification**: Added 4 new regression tests in `src/tests/cards.test.ts` and `src/tests/reconciliation.test.ts` (95 passing tests total).

---

## [Phase 6 — AI Credential Hygiene & Privacy] — 2026-10-19

### Completed
- **Purged Browser Storage Credentials (SEC-03)**:
  - Removed `sessionStorage` credential persistence in `src/features/assistant/AssistantPage.tsx`.
  - Ensured API keys are held exclusively in volatile React component state during developer testing and never written to web storage.
  - Configured default mode to Local Deterministic Engine with zero external network transmission of user financial data.

---

## [Phase 7 & 8 — Test Verification, Build Gates, and Deployment Guide] — 2026-10-19

### Completed
- **100% Test Passing Rate**: All 14 test suites, 95 tests pass synchronously in 1.73s.
- **Production Build Clean**: TypeScript compilation and Vite minification produce clean artifacts with zero code or secret leaks.
- **Deployment & Migration Runbook**:
  - Authored `docs/rebuild/DEPLOYMENT_GUIDE.md` detailing step-by-step instructions for:
    1. Creating the new Supabase project in the owner's account.
    2. Setting local `.env.local` environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
    3. Applying migrations in ordered sequence (`20261018000001`, `20261018000002`, `20261019000003`).
    4. Bootstrapping owner authorization via UI or SQL.
    5. Vercel deployment configuration.
