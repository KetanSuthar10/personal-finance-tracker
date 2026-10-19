# System Architecture & Data Flow Map — Personal Finance Tracker Rebuild

**Date**: 19 October 2026  
**Auditor**: Full-Stack & Application Security Engineer  

---

## 1. High-Level Component Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER (Vite / React 18 / Tailwind)     │
│                                                                             │
│  ┌────────────────────┐   ┌───────────────────────┐   ┌──────────────────┐  │
│  │   ProtectedApp     │   │      AuthContext      │   │   ThemeContext   │  │
│  │ (Session/OwnerGate)│   │ (Session, RPC status) │   │ (Dark / Light)   │  │
│  └─────────┬──────────┘   └───────────┬───────────┘   └──────────────────┘  │
│            │                          │                                     │
│  ┌─────────▼──────────────────────────▼───────────┐                         │
│  │                  LedgerContext                 │                         │
│  │  (Remote sync, focus revalidation, commands)   │                         │
│  └─────────────────────┬──────────────────────────┘                         │
│                        │                                                    │
│         ┌──────────────┴──────────────┐                                     │
│         ▼                             ▼                                     │
│  ┌──────────────┐           ┌───────────────────┐                           │
│  │ LocalRepo    │           │ SupabaseRepo      │                           │
│  │ (localStorage│           │ (Remote PostgreSQL│                           │
│  │ + Demo Fix)  │           │  + RPC commands)  │                           │
│  └──────────────┘           └─────────┬─────────┘                           │
└───────────────────────────────────────┼─────────────────────────────────────┘
                                        │ HTTPS / WSS
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SUPABASE MANAGED BACKEND                           │
│                                                                             │
│  ┌────────────────────┐   ┌──────────────────────────────────────────────┐  │
│  │    GoTrue Auth     │   │              PostgreSQL 15+                  │  │
│  │ (JWT, Email, OAuth)│   │                                              │  │
│  └─────────┬──────────┘   │  • app_owner_config (Single owner root)      │  │
│            │              │  • accounts (Bank, Cash, Card)               │  │
│            ▼              │  • financial_events (Canonical events)       │  │
│      auth.uid()           │  • account_postings (Double-entry postings)  │  │
│            │              │  • import_batches (Provenance & rollback)    │  │
│            ▼              │  • source_observations (Raw source records)  │  │
│  ┌────────────────────┐   │  • card_statements (Billing cycles)          │  │
│  │  Row Level Security│──►│  • emi_plans (Instalments & tenure)          │  │
│  │ (is_app_owner check│   │  • category_rules (Auto-tagging engine)      │  │
│  └────────────────────┘   │  • idempotency_keys (Replay protection)      │  │
│                           │                                              │  │
│                           │  Stored Procedures:                          │  │
│                           │  • get_current_user_status()                 │  │
│                           │  • is_app_owner(UUID)                        │  │
│                           │  • execute_financial_command(ID, JSONB)      │  │
│                           └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Entry Points & Session Lifecycle

### Current Entry Points:
1. `src/features/auth/AuthPage.tsx`:
   - **Email Sign In**: `supabase.auth.signInWithPassword({ email, password })`
   - **Email Sign Up**: `supabase.auth.signUp({ email, password })`
   - **Google OAuth**: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`
2. `src/context/AuthContext.tsx`:
   - Subscribes to `supabase.auth.onAuthStateChange((event, session) => ...)`
   - Restores session on load via `supabase.auth.getSession()`
   - Checks owner status via `checkOwnerStatus()` calling `supabase.rpc('get_current_user_status')`.
3. `src/App.tsx`:
   - `ProtectedApp`:
     - If `isLoading`: Renders loading shield spinner.
     - If `!user`: Renders `AuthPage`.
     - If `ownerStatus?.ownerConfigured && !ownerStatus?.isOwner`: Renders `AccessDeniedPage`.
     - Otherwise: Renders `LedgerProvider` with full app.

### Identified Auth Flaws:
- Missing password reset / forgot password flow.
- Missing email verification handler and password recovery handler in `onAuthStateChange`.
- Dangerous fallback in `checkOwnerStatus`:
  ```ts
  if (ownerError) {
    const status = { isOwner: true, ownerConfigured: false, userId: user.id };
    setOwnerStatus(status);
    return status;
  }
  const isOwner = configured && ownerRows[0].owner_user_id === user.id;
  const status = { isOwner: !configured || isOwner, ownerConfigured: configured, userId: user.id };
  ```
  If `app_owner_config` is empty or query errors, `isOwner` is set to `true`!

---

## 3. Database Schema & Migration Topology

The database schema is organized across three files in `supabase/`:

### A. Migrations Order:
1. `supabase/migrations/20261018000001_initial_schema.sql`:
   - Creates `profiles`, `accounts`, `financial_events`, `account_postings`, `import_batches`, `source_observations`, `card_statements`, `emi_plans`.
   - Creates foreign keys, basic indexes, and enables RLS with `auth.uid() = user_id`.
2. `supabase/migrations/20261018000002_owner_and_transactional_boundaries.sql`:
   - Creates `app_owner_config` (id=1, owner_user_id, owner_email).
   - Creates `is_app_owner(UUID)` and `get_current_user_status()` RPCs.
   - Creates `category_rules` and `idempotency_keys`.
   - Adds `version` integer column to `accounts` and `financial_events`.
   - Adds finite safe integer constraints (`chk_accounts_safe_paise`, etc. `<= 9007199254740991`).
   - Replaces RLS policies with `auth.uid() = user_id AND public.is_app_owner(auth.uid())`.
   - Creates `execute_financial_command(p_command_id, p_command)` atomic RPC.

### B. Consolidated Schema:
- `supabase/combined_production_schema.sql`:
  - Contains the entire combined DDL of Migrations 1 and 2 in a single idempotent file.
  - Can be run directly in the Supabase SQL Editor on a fresh project.

### C. Tables & Invariants:
| Table | Primary Key | Key Invariants |
| :--- | :--- | :--- |
| `app_owner_config` | `id = 1` | Exactly one row allowed. Revoked from `anon` & `authenticated` writes. |
| `accounts` | `(user_id, id)` | `opening_position_paise` within safe integer range. Types: `'bank'`, `'cash'`, `'card'`. |
| `financial_events` | `(user_id, id)` | Integer paise (`income_paise >= 0`, `spending_paise`). Types: `'purchase'`, `'income'`, `'refund'`, `'card_payment'`, `'own_transfer'`, `'fee'`. |
| `account_postings` | `id (UUID)` | `(user_id, event_id)` FK, `(user_id, account_id)` FK. Double-entry delta. |
| `import_batches` | `(user_id, id)` | Records `created_event_ids` and `merged_event_ids` for safe rollback/undo. |
| `source_observations`| `(user_id, id)` | Raw descriptions and reference numbers tied to events for provenance. |
| `card_statements` | `(user_id, id)` | Tracks `statement_total_paise`, `allocated_payments_paise`, `is_settled`. |
| `emi_plans` | `(user_id, id)` | Remaining principal, tenure, monthly instalment, linked statements. |
| `category_rules` | `(user_id, id)` | Keyword matching for auto-categorization. |
| `idempotency_keys` | `(user_id, key)`| Replay protection for financial command submissions. |

---

## 4. Financial Mutation Data Flow

All financial mutations follow this lifecycle:

```
[UI Entry: AddEntryModal / QuickCapture / Assistant]
                        │
                        ▼
      validateFinancialCommand(cmd, accounts)
     (Checks integer paise, valid date, account types,
      destination account requirements, non-zero amounts)
                        │
                        ▼ (Valid)
           buildPostingsForCommand()
     (Constructs balanced double-entry postings:
      • purchase: account delta = -spending_paise
      • income: account delta = +income_paise
      • transfer: source = -amt, dest = +amt (net zero)
      • card_payment: bank = -amt, card = +amt (net zero)
      • refund: account delta = +amt (spending = -amt))
                        │
                        ▼
        LedgerContext.executeCommand()
                        │
                        ▼
       SupabaseLedgerRepository.addEvent()
                        │
                        ▼
     supabase.rpc('execute_financial_command', {
       p_command_id,
       p_command: payload
     })
                        │
                        ▼
        [PostgreSQL Transaction inside RPC]
     1. Verify auth.uid() == is_app_owner()
     2. Check idempotency_keys (return existing if replay)
     3. Verify accounts belong to owner
     4. Verify posting deltas balance against income/spending
     5. INSERT INTO financial_events
     6. INSERT INTO account_postings
     7. INSERT INTO source_observations (optional)
     8. INSERT INTO idempotency_keys
     9. COMMIT & return JSON
                        │
                        ▼
    LedgerContext re-fetches getAccounts() and getSummary()
```

---

## 5. Capture & AI Assistant Architecture

### A. Quick Capture & Receipt OCR
- `QuickCaptureModal.tsx` provides three intake tabs: Receipt, Voice, and Quick Text.
- `ReceiptCaptureTab.tsx`:
  - Uploaded image files: Safely gated. Informs the user that on-device OCR is scheduled for T09; does NOT fabricate fake data.
  - Synthetic samples: Parses real text strings using `parseReceiptText()` regex heuristics (`ocr.ts`) extracting merchant, amount, date, reference number, and category suggestion.
  - Confirmed entries are converted into standard `validateFinancialCommand()` commands before persistence.

### B. Voice Capture
- `VoiceCaptureTab.tsx`: Uses Web Speech API (`webkitSpeechRecognition`) for local browser transcription.
- `voice.ts`: Normalizes Indian numbers, lakhs, and transaction phrases into structured drafts.
- Draft requires explicit user review before submission.

### C. AI Assistant (`src/domain/gemini.ts` & `src/features/assistant/`)
- Declares read-only and proposal tools: `get_spending_summary`, `get_upcoming_commitments`, `get_account_balances`, `search_transactions`, `propose_entry`, `propose_category_rule`.
- **Architectural Boundary**: Gemini has **zero direct ledger write authority**. All tool calls that mutate state (`propose_entry`, `propose_category_rule`) return an `ActionProposal` displayed in an `ActionCard` in the UI requiring the owner to click "Confirm & Save".
- **Identified Flaw**: Gemini API requests currently originate directly from the browser client with `fetch()`, using a key stored in `sessionStorage`. This must be routed through a server-side proxy or edge function.
