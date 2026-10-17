# Milestone 3 (M3) Implementation Task Plan

Status: Approved planning document for M3 execution  
Target: Production Supabase PostgreSQL Schema with RLS, Versioned Data Export & Clean Restore, and Live Settings Screen.

---

## 1. Objectives & Scope Boundary

### Included in M3
- **Production PostgreSQL Schema & Row-Level Security (`supabase/migrations/20261018000001_initial_schema.sql`)**:
  - Full relational schema covering all entities from `docs/DATA_MODEL.md` (`profiles`, `accounts`, `financial_events`, `account_postings`, `import_batches`, `source_observations`, `card_statements`, `emi_plans`).
  - Integer paise columns with check constraints for safe financial math.
  - Strict composite user-ownership checks and Foreign Key integrity.
  - Row-Level Security (RLS) policies on all tables enforcing `auth.uid() = user_id`.
  - Indexes on `(user_id, date)`, `(user_id, account_id)`, and `(user_id, category)`.
- **Versioned Data Export & Restore Engine (`src/domain/backup.ts`)**:
  - Versioned JSON payload (`schema_version: 1`, `exported_at`, `checksum`, `currency: 'INR'`).
  - Complete serialization of accounts, events, postings, batches, statements, EMIs, and planning preferences.
  - Atomic restore with strict schema verification, referential integrity validation, and mathematical invariant checks.
- **Live Settings UI (`src/features/settings/SettingsPage.tsx`)**:
  - Replaces placeholder with live **Settings & Storage** screen.
  - Downloadable JSON backup generator (`personal-finance-backup-YYYY-MM-DD.json`).
  - Safe restore file upload with validation preview (record counts & date bounds).
  - Storage mode status (Browser Local Demo vs Connected Supabase).
- **Automated Vitest Test Suite (`src/tests/backup.test.ts`)**:
  - Export completeness and format verification.
  - Round-trip export-restore verification.
  - Corrupted/tampered payload rejection tests.

---

## 2. Backup Payload Specification

```typescript
export interface BackupPayload {
  schema_version: 1;
  app_version: string;
  exported_at: string; // ISO 8601
  currency: 'INR';
  timezone: 'Asia/Kolkata';
  checksum: string;
  data: {
    accounts: Account[];
    events: FinancialEvent[];
    batches: ImportBatch[];
    statements: CardStatement[];
    emiPlans: EmiPlan[];
    planningConfig: CashPlanningConfig;
  };
}
```
