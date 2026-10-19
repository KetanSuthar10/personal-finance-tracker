# Automated Test & Build Execution Report — Personal Finance Tracker

**Date**: 19 October 2026  
**Auditor**: QA Automation & Security Engineer  
**Baseline Commit**: `7cd6fa9`  
**Current Status**: 100% PASSING (All 14 test suites, 95 tests)  
**Environment**: Windows 11 / Node v24.14.1 / npm 11.11.0  

---

## 1. Post-Rebuild Test Run Summary

Executed: `npm test` (`vitest run`)

| Metric | Baseline | Current Post-Rebuild |
| :--- | :--- | :--- |
| **Test Suites** | 1 failed, 13 passed (14 total) | **14 passed (14 total)** |
| **Total Tests** | 1 failed, 85 passed (86 total) | **95 passed (95 total)** |
| **Duration** | 1.65s | **1.73s** |
| **Exit Code** | 1 (Failing) | **0 (Passing)** |

---

## 2. Test Suites Breakdown

| Test Suite | Tests | Result | Duration | Notes |
| :--- | :---: | :---: | :---: | :--- |
| `src/tests/rules.test.ts` | 5 | **PASS** | 8ms | Category rule pattern matching |
| `src/tests/cards.test.ts` | 7 | **PASS** | 6ms | Includes multi-instalment horizon projection & settled EMI checks |
| `src/tests/ledger.test.ts` | 6 | **PASS** | 6ms | Integer paise arithmetic & balance positions |
| `src/tests/repository.test.ts` | 3 | **PASS** | 19ms | Local repository CRUD and period queries |
| `src/tests/backup.test.ts` | 6 | **PASS** | 24ms | JSON schema, SHA-256 integrity, tamper detection |
| `src/tests/ocr.test.ts` | 7 | **PASS** | 39ms | Receipt text heuristics, fuel/grocery parsing |
| `src/tests/reconciliation.test.ts` | 6 | **PASS** | 27ms | Deduplication, distinct merchant preservation, single-match claims |
| `src/tests/database_auth.test.ts` | 11 | **PASS** | 11ms | Config HTTPS validation, placeholder rejection, secret protection |
| `src/tests/auth_and_sync.test.ts` | 11 | **PASS** | 12ms | Fail-closed owner auth, bootstrap claim, recovery states |
| `src/tests/money.test.ts` | 6 | **PASS** | 22ms | Safe integer limits, paise conversion |
| `src/tests/importer.test.ts` | 3 | **PASS** | 4ms | Bank statement CSV parsing & dialect normalization |
| `src/tests/voice.test.ts` | 5 | **PASS** | 21ms | Natural language voice transaction parser |
| `src/tests/canonical_ledger.test.ts` | 11 | **PASS** | 748ms | Strict validation, date boundary assertions |
| `src/tests/assistant.test.ts` | 8 | **PASS** | 753ms | Deterministic local assistant, grounded draft entry proposals |

---

## 3. Production Build Diagnostics

Executed: `npm run build` (`tsc && vite build`)

- **Exit Code**: 0 (Clean compilation, zero TypeScript errors)
- **Asset Sizes**:
  - `dist/index.html`: 1.39 kB (gzip: 0.71 kB)
  - `dist/assets/index-B0L9VPmk.css`: 50.74 kB (gzip: 8.50 kB)
  - `dist/assets/index-C4cvenoX.js`: 1,032.68 kB (gzip: 278.27 kB)

### Security & Hygiene Verifications on Build Artifacts:
1. **Old Project URL Check**:
   - Query: `mpjjetxtpekrxeyivlkv`
   - Result: **0 matches** across all built files in `dist/`.
2. **Old Hardcoded Anon Key Check**:
   - Query: `sb_publishable_k9lCl5klWC5Xlz4omL6TIQ_g7Jr5Cns`
   - Result: **0 matches** across all built files in `dist/`.
3. **Privileged Keys Check**:
   - Query: `service_role`
   - Result: **0 matches** (no privileged secrets bundled into frontend artifacts).
