# Milestone 2 (M2) Implementation Task Plan

Status: Approved planning document for M2 execution  
Target: Statement Import and Daily Reconciliation engine with synthetic CSV fixtures, extraction preview, review queue, deduplication, and undoable batches.

---

## 1. Objectives & Scope Boundary

### Included in M2
- **Synthetic Statement Fixtures**:
  - `fixtures/synthetic-bank-statement.csv`: 8 rows containing salary, cafe payment (matches manual entry), grocery payment, parking, cash withdrawal, and a new client payment.
  - `fixtures/synthetic-card-statement.csv`: 5 rows containing grocery purchase, card repayment, grocery refund, card annual fee, and a new electronics purchase.
- **Domain Parsing & Mapping (`src/domain/importer.ts`)**:
  - Robust client-side CSV parser supporting quoted text, commas in numbers, date parsing (`DD/MM/YYYY`, `YYYY-MM-DD`, `DD-MM-YYYY`), and signed or dual debit/credit columns.
  - Predefined bank format presets (Generic Bank CSV, HDFC format preset, ICICI format preset, SBI format preset).
- **Matching & Reconciliation Engine (`src/domain/reconciliation.ts`)**:
  - Match classification:
    - `EXACT_MATCH`: same account, amount in paise, date proximity (±3 days) $\rightarrow$ links statement observation to existing manual event without inflating totals.
    - `NEW_RECORD`: genuine new economic event $\rightarrow$ creates canonical event with batch observation.
    - `UNCERTAIN_MATCH`: same amount, different day or multiple candidate events $\rightarrow$ queued for user review.
    - `DUPLICATE_IMPORT`: already imported in an active batch $\rightarrow$ skipped automatically.
- **Reversible Batch Provenance (`src/domain/types.ts`)**:
  - `ImportBatch`: tracks `id`, `filename`, `account_id`, `created_at`, `row_count`, `created_event_ids`, `merged_event_ids`, `status`.
  - Batch undo removes created events and detaches observations from merged events without deleting manual data.
- **Interactive UI (`src/features/imports/`)**:
  - Upload screen with one-click synthetic sample loaders.
  - Extraction preview showing row counts, date bounds, net amount, and match breakdown.
  - Review queue for resolving uncertain items before committing.
  - Import history table with live "Undo Import" action.
- **Automated Vitest Test Suite (`src/tests/importer.test.ts` & `src/tests/reconciliation.test.ts`)**:
  - Re-import safety check (zero duplicate inflation).
  - Manual + import merging check.
  - Batch undo integrity check.

### Boundary for Later Milestones
- Native scanned PDF OCR and password-unlocking remain scoped for full release polish (M6).
- Cloud storage of uploaded files is deferred to connected mode (M3).
