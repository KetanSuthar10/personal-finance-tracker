import { Account, FinancialEvent, PeriodSummary } from './types';

/**
 * Calculates the current net position in integer paise for each account as of throughDate.
 * Convention:
 * - Bank / Cash: positive = asset
 * - Credit Card: negative = liability owed
 */
export function calculateAccountPositions(
  accounts: Account[],
  events: FinancialEvent[],
  throughDate?: string
): Record<string, number> {
  const positions: Record<string, number> = {};

  // Initialize with opening positions
  for (const account of accounts) {
    positions[account.id] = account.opening_position_paise;
  }

  // Apply postings on or before throughDate
  for (const event of events) {
    if (throughDate && event.date > throughDate) {
      continue;
    }
    for (const posting of event.postings) {
      if (positions[posting.account_id] !== undefined) {
        positions[posting.account_id] += posting.delta_paise;
      }
    }
  }

  return positions;
}

/**
 * Computes deterministic period totals and invariants.
 * Reconciles with demo-transactions.json specification.
 */
export function calculatePeriodSummary(
  accounts: Account[],
  events: FinancialEvent[],
  fromDate: string,
  throughDate: string
): PeriodSummary {
  // 1. Opening net position carries forward initial account opening balances
  // and all transactions occurring strictly before fromDate.
  const opening_positions_paise: Record<string, number> = {};
  for (const account of accounts) {
    opening_positions_paise[account.id] = account.opening_position_paise;
  }

  for (const event of events) {
    if (event.date < fromDate) {
      for (const posting of event.postings) {
        if (opening_positions_paise[posting.account_id] !== undefined) {
          opening_positions_paise[posting.account_id] += posting.delta_paise;
        }
      }
    }
  }

  let opening_net_position_paise = 0;
  for (const account of accounts) {
    opening_net_position_paise += opening_positions_paise[account.id] ?? 0;
  }

  // 2. Filter events for the period
  const periodEvents = events.filter(
    (e) => e.date >= fromDate && e.date <= throughDate
  );

  let received_income_paise = 0;
  let net_spending_paise = 0;
  const category_breakdown: Record<string, number> = {};

  for (const event of periodEvents) {
    // Derived strictly from event type and semantic amounts
    received_income_paise += event.income_paise;
    net_spending_paise += event.spending_paise;

    if (event.category && event.spending_paise !== 0) {
      category_breakdown[event.category] =
        (category_breakdown[event.category] || 0) + event.spending_paise;
    }
  }

  // 3. Closing positions as of throughDate
  const closing_positions_paise = calculateAccountPositions(
    accounts,
    events,
    throughDate
  );

  // 4. Liquid funds = bank + cash asset balances
  let liquid_funds_paise = 0;
  let card_outstanding_paise = 0;
  let closing_net_position_paise = 0;

  for (const account of accounts) {
    const pos = closing_positions_paise[account.id] ?? 0;
    closing_net_position_paise += pos;

    if (account.type === 'bank' || account.type === 'cash') {
      liquid_funds_paise += pos;
    } else if (account.type === 'card') {
      // Net position for card is negative when money is owed.
      // Card outstanding is presented as a positive magnitude.
      if (pos < 0) {
        card_outstanding_paise += Math.abs(pos);
      }
    }
  }

  return {
    from: fromDate,
    through: throughDate,
    received_income_paise,
    net_spending_paise,
    liquid_funds_paise,
    card_outstanding_paise,
    opening_net_position_paise,
    closing_net_position_paise,
    closing_positions_paise,
    category_breakdown,
  };
}

/**
 * Creates canonical postings for a given user event input.
 */
export function buildEventPostings(
  type: FinancialEvent['type'],
  amountPaise: number,
  primaryAccountId: string,
  destinationAccountId?: string
): { income_paise: number; spending_paise: number; postings: { account_id: string; delta_paise: number }[] } {
  switch (type) {
    case 'income':
      return {
        income_paise: amountPaise,
        spending_paise: 0,
        postings: [{ account_id: primaryAccountId, delta_paise: amountPaise }],
      };

    case 'purchase':
    case 'fee':
      return {
        income_paise: 0,
        spending_paise: amountPaise,
        postings: [{ account_id: primaryAccountId, delta_paise: -amountPaise }],
      };

    case 'refund':
      return {
        income_paise: 0,
        spending_paise: -amountPaise, // negative spending reduces spending
        postings: [{ account_id: primaryAccountId, delta_paise: amountPaise }],
      };

    case 'own_transfer':
      if (!destinationAccountId) {
        throw new Error('Destination account required for own transfer');
      }
      return {
        income_paise: 0,
        spending_paise: 0,
        postings: [
          { account_id: primaryAccountId, delta_paise: -amountPaise },
          { account_id: destinationAccountId, delta_paise: amountPaise },
        ],
      };

    case 'card_payment':
      if (!destinationAccountId) {
        throw new Error('Card account required for credit card repayment');
      }
      return {
        income_paise: 0,
        spending_paise: 0,
        postings: [
          { account_id: primaryAccountId, delta_paise: -amountPaise }, // Bank decreases
          { account_id: destinationAccountId, delta_paise: amountPaise }, // Card liability reduces (positive delta)
        ],
      };

    default:
      throw new Error(`Unhandled event type: ${type}`);
  }
}
