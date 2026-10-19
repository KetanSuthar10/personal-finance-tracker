# Baseline Audit Report — Personal Finance Tracker Rebuild

**Date**: 19 October 2026  
**Auditor**: Senior Full-Stack & Application Security Engineer (Phase 0 Audit)  
**Repository Branch**: `main`  
**Latest Baseline Commit**: `7cd6fa9` (`feat(ui): add dark mode toggle and improve Google OAuth error guidance`)  
**Node Version**: `v24.14.1`  
**npm Version**: `11.11.0`  

---

## 1. Executive Summary

A comprehensive Phase 0 audit of the entire repository was conducted before any code modifications. The repository contains a well-structured domain core with integer paise accounting, pure double-entry calculation models, and a modular React frontend. However, the audit uncovered **critical security vulnerabilities, architectural fallbacks, and hardcoded legacy credentials** that compromise data isolation and production safety.

### Key Audit Findings:
1. **Hardcoded Legacy Supabase Credentials**: `src/lib/supabase.ts` contained hardcoded fallback values for an old project (`https://mpjjetxtpekrxeyivlkv.supabase.co` and publishable key `sb_publishable_k9lCl5klWC5Xlz4omL6TIQ_g7Jr5Cns`). When `tsc && vite build` was run, these values were compiled directly into the production distribution bundle (`dist/assets/index-CMAyy9jC.js`).
2. **Critical Fail-Open Owner Authorization Flaw**: In `src/context/AuthContext.tsx` (lines 52–61), if the `get_current_user_status` RPC fails or the `app_owner_config` table cannot be queried, the code explicitly returns `{ isOwner: true, ownerConfigured: false }`. Furthermore, if `owner_configured` is false, `isOwner` evaluates to `true`. In `src/App.tsx`, non-owner rejection is gated on `ownerStatus?.ownerConfigured && !ownerStatus?.isOwner`. As a result, **any unconfigured database state or RPC error completely bypasses owner authorization and grants arbitrary authenticated users full owner access to the application.**
3. **Exposed AI Secrets in Browser**: In `src/features/assistant/AssistantPage.tsx` and `src/domain/gemini.ts`, Gemini API keys are accepted in the UI, stored in `sessionStorage` (`pft_gemini_key`), and transmitted directly to `generativelanguage.googleapis.com` from the browser client rather than via an authenticated backend proxy or Supabase Edge Function.
4. **Non-Atomic Batch Persistence**: In `src/data/supabaseRepository.ts`, `commitImportBatch` iterates over events one-by-one calling `addEvent` without a database transaction boundary. A network interruption or constraint violation midway leaves the database partially updated with orphaned events.
5. **Silent Fallback Contamination**: When Supabase is not configured or an auth error occurs, `LedgerContext.tsx` falls back to `LocalLedgerRepository`, which immediately seeds `DEMO_FIXTURE` synthetic data into browser `localStorage`, risking confusing demo data with real cloud data.
6. **Incomplete Auth Workflows**: No password reset, password recovery email, or password update flows are implemented in `src/features/auth/AuthPage.tsx` or `src/context/AuthContext.tsx`.

---

## 2. Codebase Inventory & Source Structure

| Directory / File | Lines of Code (approx.) | Purpose |
| :--- | :--- | :--- |
| `src/domain/` (14 files) | ~2,500 | Pure domain logic: integer paise arithmetic (`money.ts`), command service (`commandService.ts`), dates (`dates.ts`), ledger calculations (`ledger.ts`), cards/EMIs (`cards.ts`), rules (`rules.ts`), OCR parsing (`ocr.ts`), voice parsing (`voice.ts`), backup schemas (`backup.ts`), AI declarations (`assistant.ts`, `gemini.ts`). |
| `src/data/` (4 files) | ~1,600 | Data repositories: `repository.ts` (interface), `localRepository.ts` (localStorage + demo fixture), `supabaseRepository.ts` (PostgreSQL client repository), `demoFixture.ts` (synthetic data). |
| `src/context/` (3 files) | ~800 | React contexts: `AuthContext.tsx` (Supabase session & owner status), `LedgerContext.tsx` (sync & command dispatcher), `ThemeContext.tsx` (light/dark mode). |
| `src/features/` (11 modules) | ~4,200 | Feature UI screens and modals: Overview, Accounts, Transactions, Add Entry Modal, Quick Capture, Imports, Commitments, Assistant, Settings, Auth, Access Denied. |
| `src/components/` (layout & ui) | ~1,200 | Reusable atomic UI elements (Buttons, Cards, Modals, Badges, Shell, Sidebar, Header). |
| `src/lib/` (2 files) | ~60 | Utilities: `supabase.ts` (Supabase client init), `utils.ts` (`cn` helper). |
| `src/tests/` (14 test files) | ~2,800 | 14 test suites covering domain math, ledger logic, reconciliation, cards, rules, OCR, voice, auth, and database boundaries. |
| `supabase/` | ~1,000 | Database schemas and migrations: `combined_production_schema.sql`, `20261018000001_initial_schema.sql`, `20261018000002_owner_and_transactional_boundaries.sql`. |

---

## 3. Environment & Runtime Diagnostics

Command diagnostics were executed in the workspace on 19 October 2026:

### A. Dependency Installation (`npm install`)
- Executed: `npm install`
- Result: **Success (Exit code 0)**.
- Installed 214 packages. Recharts warning noted (`recharts@2.15.4` deprecation notice).

### B. TypeScript Compilation & Production Build (`npm run build`)
- Executed: `npm run build` (`tsc && vite build`)
- Result: **Success (Exit code 0)**.
  - Zero TypeScript compiler errors.
  - Dist bundle generated: `dist/index.html` (1.39 kB), `dist/assets/index-_Dong_Rm.css` (49.78 kB), `dist/assets/index-CMAyy9jC.js` (1,015.79 kB).
  - **Critical Bundle Leak Detected**: Searching `dist/assets/*.js` for `mpjjetxtpekrxeyivlkv` matched. The hardcoded Supabase project URL and anon key were confirmed baked into client JavaScript assets.

### C. Automated Test Suite (`npm test`)
- Executed: `vitest run`
- Result: **Failed (Exit code 1)**.
  - Total test suites: 14 suites.
  - Passing suites: 13 suites.
  - Failing suite: 1 suite (`src/tests/database_auth.test.ts`).
  - Total tests: 86 tests (85 passed, 1 failed).
  - Failing test:
    ```
    FAIL src/tests/database_auth.test.ts > Database & Auth Security Boundaries (T02 / AT13 & AT15) > Supabase Client & Environment Configuration > exposes only public/anon key and never contains a service_role secret in client code
    AssertionError: expected undefined to be defined
     ❯ src/tests/database_auth.test.ts:16:23
         14| // In Vite/React frontend, service-role keys must never be exposed or requested
         15| const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
         16| expect(anonKey).toBeDefined();
    ```
  - **Root Cause**: The test directly checks `import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`. In the test environment, neither environment variable was configured, whereas `src/lib/supabase.ts` masked this absence by falling back to a hardcoded string.

---

## 4. Documentation Claims vs. Actual Source Code Reality

| Area | Documentation Claim (`docs/STATUS.md`, `reports/T02.md`, `reports/T03.md`) | Source Code Reality | Discrepancy & Risk |
| :--- | :--- | :--- | :--- |
| **Supabase Configuration** | "Client configured from environment variables; fails closed if unconfigured." | `src/lib/supabase.ts` hardcoded fallback URL and anon key for `mpjjetxtpekrxeyivlkv.supabase.co`. | **High**: Client never failed closed; it quietly pointed to an old remote project even with an empty `.env`. |
| **Owner Authorization (AT13)** | "Fails closed. Non-owner sign-ins cannot access or view financial events." | `AuthContext.tsx` lines 52–61 assigns `isOwner: true` if the owner RPC fails, table is unread, or no owner is configured in `app_owner_config`. | **Critical**: An attacker signing into a freshly migrated or erroring database is granted owner rights. |
| **Atomic Financial Writes (AT15)** | "All financial writes execute through atomic RPC `execute_financial_command`." | Single entries use the RPC, but `commitImportBatch` in `SupabaseLedgerRepository` loops through `addEvent` without a batch transaction boundary. | **Medium**: Partial imports leave corrupted ledger state if interrupted. |
| **AI Secret Isolation** | "Production target accesses Gemini through Edge Function with server secrets." | `AssistantPage.tsx` accepts raw API keys in the browser, persists to `sessionStorage`, and calls Google API directly via client `fetch`. | **High**: Exposes API keys to client-side XSS and browser memory extraction. |
| **Receipt OCR** | "Live OCR scheduled for T09; simulated extraction gated to prevent fabrication." | `ReceiptCaptureTab.tsx` properly shows a safety notice on file upload and only parses synthetic samples. | **Verified Truthful**: Matches documentation claim. |

---

## 5. Untested Requirements

The following requirements from `docs/PRD.md` and the master prompt currently lack automated test coverage:
1. **Password Reset Flow**: Requesting a password reset email, handling `PASSWORD_RECOVERY` auth state, updating password.
2. **Session Expiry & Token Refresh Failure**: Handling expired refresh tokens without crashing or showing corrupted state.
3. **Batch Import Atomicity & Rollback**: Verifying that a failure during import batch persistence cleanly rolls back all created events and postings.
4. **Cross-Owner Read/Write RLS (Live)**: Automated test asserting that an authenticated non-owner JWT receives HTTP 403 / zero rows on direct REST queries to `accounts`, `financial_events`, and `account_postings`.
5. **Offline/Disconnect Transition**: Verifying that losing internet connection in cloud mode alerts the user without switching silently to `LocalLedgerRepository` with demo data.
6. **Gemini Proxy Authorization**: Verifying that unauthorized or unauthenticated requests to the AI backend proxy are rejected.
