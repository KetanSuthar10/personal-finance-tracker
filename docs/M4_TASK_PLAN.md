# Milestone 4 (M4) Implementation Task Plan

Status: Approved planning document for M4 execution  
Target: Credit card billing cycles, partial repayment allocations, EMI lifecycle schedules, and deduplicated cash planning horizon.

---

## 1. Objectives & Scope Boundary

### Included in M4
- **Card Statement Tracking & Payment Allocation (`src/domain/cards.ts`)**:
  - Model card statements with statement date, due date, statement total, minimum due, and source batch link.
  - Payment allocation engine: allocates bank-to-card repayments to statements.
  - Transparent calculation of:
    - Billed statement balance (paise)
    - Payments allocated (paise)
    - Remaining statement due (paise)
    - Unbilled transactions posted after statement cutoff (paise)
    - Total recorded card outstanding (remaining due + unbilled)
    - Overpayment detection (+ position on card)
- **EMI Lifecycle & Schedule Engine**:
  - `EmiPlan` entity linking original purchase event to lender, original principal, term (months), interest rate, monthly instalment, and remaining principal.
  - Distinct separation of purchase recognition, scheduled principal/interest, and actual repayment. Converting a purchase into an EMI does not create duplicate spending.
- **Deduplicated Cash Planning Horizon**:
  - Configurable planning horizon (15 days, 30 days, or next salary).
  - Deduplication invariant: If an EMI instalment is included in a card statement bill, it must **never** be deducted a second time as a standalone upcoming obligation.
  - Planning Formula:
    $$\text{Planning Available} = \text{Liquid Funds} - \sum \text{Remaining Unpaid Statement Bills} - \sum \text{Unbilled Standalone Commitments} - \text{Savings/Reserve Allocation}$$
- **Interactive UI (`src/features/commitments/CommitmentsPage.tsx`)**:
  - Live **Cards & EMIs** screen replacing placeholder.
  - Visual bill card with due date urgency, partial payment allocation, and unbilled charges.
  - EMI plans manager with tenure progress bars and "Convert Purchase to EMI" workflow.
  - Transparent cash planning breakdown widget with deduplication indicator.
- **Automated Vitest Test Suite (`src/tests/cards.test.ts`)**:
  - Partial payment allocation and remaining due tests.
  - EMI schedule, purchase link, and non-duplication tests.
  - Cash planning deduplication invariant tests.

---

## 2. Mathematical & Accounting Rules

1. **Card Outstanding Equation**:
   $$\text{Recorded Card Outstanding} = \text{Remaining Statement Due} + \text{Unbilled Purchases/Fees} - \text{Unbilled Credits/Refunds}$$
2. **Partial Repayment Allocation**:
   $$\text{Remaining Due} = \max(0, \text{Statement Total} - \sum \text{Allocated Repayments})$$
3. **Planning Horizon Deduplication Rule**:
   $$\text{Obligations in Horizon} = \sum_{\text{bills}} \text{Remaining Due} + \sum_{\text{standalone EMIs}} \text{Instalment (if not billed in any statement bill)}$$
