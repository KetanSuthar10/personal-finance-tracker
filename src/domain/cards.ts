import { CardStatement, EmiPlan, CashPlanningConfig, CashPlanningSummary, FinancialEvent } from './types';

/**
 * Computes remaining due on a card statement bill taking into account recorded repayments.
 */
export function calculateCardStatementStatus(
  statement: CardStatement,
  allEvents: FinancialEvent[]
): {
  remaining_due_paise: number;
  allocated_payments_paise: number;
  is_settled: boolean;
} {
  // Find card payment events after statement_date that credit this card account
  let allocated = statement.allocated_payments_paise;

  const cardPayments = allEvents.filter(
    (e) =>
      e.type === 'card_payment' &&
      e.date >= statement.statement_date &&
      e.postings.some((p) => p.account_id === statement.account_id && p.delta_paise > 0)
  );

  const totalPayments = cardPayments.reduce((sum, e) => {
    const cardPosting = e.postings.find((p) => p.account_id === statement.account_id && p.delta_paise > 0);
    return sum + (cardPosting?.delta_paise || 0);
  }, 0);

  allocated = Math.max(allocated, totalPayments);
  const remaining = Math.max(0, statement.statement_total_paise - allocated);
  const is_settled = remaining === 0;

  return {
    remaining_due_paise: remaining,
    allocated_payments_paise: allocated,
    is_settled,
  };
}

/**
 * Computes unbilled transactions posted to the card account since the statement cutoff date.
 */
export function calculateUnbilledCardActivity(
  statementDate: string,
  allEvents: FinancialEvent[],
  cardAccountId: string
): {
  unbilled_spending_paise: number;
  unbilled_credits_paise: number;
  net_unbilled_paise: number;
} {
  let unbilled_spending_paise = 0;
  let unbilled_credits_paise = 0;

  for (const event of allEvents) {
    if (event.date > statementDate) {
      const posting = event.postings.find((p) => p.account_id === cardAccountId);
      if (posting) {
        if (posting.delta_paise < 0) {
          // New purchases or fees increase borrowing
          unbilled_spending_paise += Math.abs(posting.delta_paise);
        } else if (posting.delta_paise > 0) {
          // Refunds or payments increase net position
          unbilled_credits_paise += posting.delta_paise;
        }
      }
    }
  }

  return {
    unbilled_spending_paise,
    unbilled_credits_paise,
    net_unbilled_paise: unbilled_spending_paise - unbilled_credits_paise,
  };
}

/**
 * Deterministic cash planning calculation with strict EMI deduplication against card bills.
 * Invariant: If an EMI instalment is included in a card statement bill, it must NEVER be deducted again.
 */
export function calculateCashPlanning(
  liquidFundsPaise: number,
  statements: CardStatement[],
  emiPlans: EmiPlan[],
  allEvents: FinancialEvent[],
  config: CashPlanningConfig,
  asOfDate: string
): CashPlanningSummary {
  const asOfTime = new Date(asOfDate).getTime();
  const horizonTime = asOfTime + config.horizon_days * 24 * 60 * 60 * 1000;
  const horizonDateStr = new Date(horizonTime).toISOString().slice(0, 10);

  let card_bills_due_paise = 0;
  const billedStatementIds = new Set<string>();

  // 1. Sum active card statement bills due within horizon
  for (const stmt of statements) {
    if (stmt.due_date <= horizonDateStr) {
      const status = calculateCardStatementStatus(stmt, allEvents);
      if (!status.is_settled) {
        card_bills_due_paise += status.remaining_due_paise;
        billedStatementIds.add(stmt.id);
      }
    }
  }

  // 2. Sum upcoming EMI instalments due within horizon, DEDUPLICATING against billed statements
  // Generates all unpaid instalments within requested planning horizon up to remaining tenure
  let standalone_emis_due_paise = 0;
  let deduplicated_emis_count = 0;

  for (const emi of emiPlans) {
    if (emi.status !== 'active') continue;

    const remainingInstalments = emi.total_tenure_months - emi.instalments_billed;
    if (remainingInstalments <= 0) continue;

    let instalmentCount = 0;
    const dueDate = new Date(emi.next_due_date);

    while (instalmentCount < remainingInstalments) {
      const dueDateStr = dueDate.toISOString().slice(0, 10);
      if (dueDateStr > horizonDateStr) break;

      // Only the first upcoming instalment might be billed in the statement
      if (instalmentCount === 0 && emi.billed_in_statement_id && billedStatementIds.has(emi.billed_in_statement_id)) {
        deduplicated_emis_count++;
      } else {
        standalone_emis_due_paise += emi.monthly_instalment_paise;
      }

      // Advance by 1 month for subsequent instalments
      dueDate.setMonth(dueDate.getMonth() + 1);
      instalmentCount++;
    }
  }

  const total_upcoming_obligations_paise = card_bills_due_paise + standalone_emis_due_paise;
  const planning_available_paise =
    liquidFundsPaise - total_upcoming_obligations_paise - config.emergency_buffer_paise;

  return {
    liquid_funds_paise: liquidFundsPaise,
    card_bills_due_paise,
    standalone_emis_due_paise,
    deduplicated_emis_count,
    total_upcoming_obligations_paise,
    emergency_buffer_paise: config.emergency_buffer_paise,
    planning_available_paise,
  };
}

/**
 * Standard financial EMI calculation formula:
 * E = P * r * (1 + r)^n / ((1 + r)^n - 1)
 */
export function calculateEmiInstalmentPaise(
  principalPaise: number,
  annualInterestRatePct: number,
  tenureMonths: number
): number {
  if (annualInterestRatePct <= 0 || tenureMonths <= 1) {
    return Math.round(principalPaise / tenureMonths);
  }

  const monthlyRate = annualInterestRatePct / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const instalment = (principalPaise * monthlyRate * factor) / (factor - 1);

  return Math.round(instalment);
}
