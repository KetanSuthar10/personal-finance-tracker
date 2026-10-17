# M5 Task Plan — Integrated Gemini Assistant & Categorisation Rules

**Milestone:** M5  
**Focus:** Grounded AI financial assistant with bounded tool calling, strict deterministic arithmetic, account identifier masking, categorisation rule learning, and quota/outage resilience.  
**Requirement Source:** [docs/PRD.md](file:///c:/Users/Suthar/Documents/personal-finance-tracker/docs/PRD.md#L43-L58), [docs/IMPLEMENTATION_PLAN.md](file:///c:/Users/Suthar/Documents/personal-finance-tracker/docs/IMPLEMENTATION_PLAN.md#L33-L38), [AGENTS.md](file:///c:/Users/Suthar/Documents/personal-finance-tracker/AGENTS.md).

---

## 1. Objectives & Financial Invariants

1. **Arithmetic Authority Separation**:
   - Gemini / AI is strictly an explanatory and suggestion layer.
   - Totals, liquid balances, card outstandings, and commitments are derived *exclusively* by deterministic TypeScript domain functions in integer paise (`calculatePeriodSummary`, `calculateAccountBalances`, `calculateCashPlanningHorizon`).
   - Gemini cannot invent or hallucinate financial figures.
2. **Identifier & Data Privacy Masking**:
   - Mask sensitive account numbers, card suffixes, and PII (`HDFC Bank *1234` $\rightarrow$ `HDFC Bank [Account A]`, etc.) before passing to external AI requests.
   - Clear banner stating privacy status and model route.
3. **Explicit Learning & Categorisation Rules (AC06)**:
   - Learn recipient/merchant categories from explicit user rules (e.g. `recipient_pattern: "Swiggy"`, `category: "Food & Dining"`).
   - Apply rules deterministically to new entries and statement imports.
   - Distinguish local transaction corrections from future rules.
4. **Bounded Owner-Scoped Tools**:
   - `get_period_summary`: Computes received income, spending, and refunds for a date window.
   - `get_account_balances`: Returns asset liquid funds, liability balances, and freshness.
   - `search_transactions`: Queries transaction records with criteria (keyword, category, min/max paise, date range).
   - `get_upcoming_commitments`: Queries deduplicated bills and EMI instalments in a day horizon.
   - `propose_entry`: Proposes a draft transaction for explicit user confirmation (does NOT execute mutation silently).
   - `save_category_rule`: Proposes or saves an explicit categorisation rule for future entries.
5. **Action Review & Safety**:
   - Untrusted documents and inputs cannot execute arbitrary state mutations.
   - Any financial modification (adding an entry, creating a rule) renders an interactive Action Card in the chat requiring explicit user approval.
6. **Dual-Mode Adapter (Synthetic/Local Engine + Live Gemini)**:
   - High-fidelity deterministic local engine works seamlessly without any API key or network access for synthetic evaluation.
   - Optional live Google Gemini API (`gemini-1.5-flash` or `gemini-2.0-flash`) support when user enters a session key in Settings/Assistant configuration.
   - Quota failure or network errors fail gracefully with helpful messaging, leaving core tracking, imports, and charts fully functional (AC12).

---

## 2. File & Component Structure

### New Domain & Service Modules:
- `src/domain/rules.ts`:
  - `CategoryRule` interface and matching engine (`matchCategoryRule`, `applyRulesToTransactions`).
- `src/domain/assistant.ts`:
  - Tool definitions and deterministic executor functions.
  - Identifier masker (`maskFinancialPayload`).
  - Tool result formatters with supporting record references.
- `src/domain/gemini.ts`:
  - Gemini API client caller (with function calling declarations).
  - Deterministic fallback mock handler when no API key is provided.
  - Token and usage tracking utilities.

### UI & Feature Components (`src/features/assistant/`):
- `AssistantPage.tsx`: Main responsive conversational assistant interface.
- `ChatHistory.tsx`: Message thread with user questions, assistant responses, and tool call audit badges.
- `ActionCard.tsx`: Interactive draft proposal cards (Entry draft with "Add to Ledger" button; Rule proposal with "Save Rule" button).
- `SuggestedQueries.tsx`: Quick query chips for common questions and actions.
- `AssistantConfigModal.tsx`: Privacy disclosure, identifier masking status, model selection, and optional API key configuration.

### Tests:
- `src/tests/rules.test.ts`:
  - Exact match, case-insensitive match, precedence, and rule isolation.
- `src/tests/assistant.test.ts`:
  - Bounded tool execution returns exact integer paise math.
  - Sensitive account identifier masking.
  - Action draft generation without silent mutation.
  - Outage and quota error graceful handling.

---

## 3. Verification & Acceptance Criteria
- Unit tests pass with 100% success (`rules.test.ts` and `assistant.test.ts`).
- Production build succeeds (`npm run build`).
- Chat interface reflows smoothly on mobile (360px) and laptop (1366px).
- Verification of AC06, AC11, AC12.
