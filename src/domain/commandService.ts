import { Account, FinancialEvent, EventType, SourceObservation } from './types';
import { buildEventPostings } from './ledger';
import { isValidDateString } from './dates';

/**
 * Validated Financial Command Contract.
 * Every financial entry across all entry routes (modal form, quick text,
 * voice review, receipt draft, assistant confirmation) MUST route through this service.
 */
export interface CreateFinancialEntryCommand {
  type: EventType;
  amount_paise: number;
  date: string; // YYYY-MM-DD in Asia/Kolkata
  account_id: string; // primary account
  destination_account_id?: string; // required for own_transfer and card_payment
  recipient: string;
  category?: string | null;
  notes?: string;
  linked_purchase_id?: string;
  source_observations?: SourceObservation[];
}

export interface CommandValidationResult {
  isValid: boolean;
  errors: string[];
  builtEvent?: Omit<FinancialEvent, 'id'>;
}

/**
 * Strictly validates financial commands and returns canonical event structure.
 * Enforces financial invariants:
 * - Positive safe integer paise
 * - Valid real calendar dates (rejects impossible dates like Feb 31)
 * - Required destination accounts for transfers and card repayments
 * - Distinct source and destination accounts
 * - No guess defaults for missing critical fields
 */
export function validateFinancialCommand(
  cmd: CreateFinancialEntryCommand,
  accounts: Account[]
): CommandValidationResult {
  const errors: string[] = [];

  // 1. Amount validation
  if (
    typeof cmd.amount_paise !== 'number' ||
    !Number.isFinite(cmd.amount_paise) ||
    !Number.isSafeInteger(cmd.amount_paise)
  ) {
    errors.push('Amount must be a finite safe integer paise.');
  } else if (cmd.amount_paise <= 0) {
    errors.push('Amount must be strictly positive.');
  } else if (cmd.amount_paise > 100_00_00_00_000) {
    errors.push('Amount exceeds maximum allowed limit (100 Crore).');
  }

  // 2. Date validation
  if (!cmd.date || typeof cmd.date !== 'string') {
    errors.push('Date is required.');
  } else if (!isValidDateString(cmd.date)) {
    errors.push(`Invalid or impossible calendar date: "${cmd.date}". Must be a real date formatted as YYYY-MM-DD.`);
  }

  // 3. Type validation
  const validTypes: EventType[] = ['purchase', 'income', 'refund', 'fee', 'own_transfer', 'card_payment'];
  if (!validTypes.includes(cmd.type)) {
    errors.push(`Invalid event type: "${cmd.type}". Must be one of ${validTypes.join(', ')}.`);
  }

  // 4. Primary account validation
  if (!cmd.account_id || typeof cmd.account_id !== 'string') {
    errors.push('Primary account ID is required.');
  } else if (accounts.length > 0) {
    const primaryAccount = accounts.find((a) => a.id === cmd.account_id);
    if (!primaryAccount) {
      errors.push(`Unknown primary account: "${cmd.account_id}".`);
    } else if (cmd.type === 'income' && primaryAccount.type === 'card') {
      errors.push('Credit card cannot be the primary deposit account for earned income. Select bank or cash.');
    }
  }

  // 5. Destination account validation (for transfers and card repayments)
  if (cmd.type === 'own_transfer' || cmd.type === 'card_payment') {
    if (!cmd.destination_account_id || typeof cmd.destination_account_id !== 'string') {
      errors.push(
        `Destination account is required for ${cmd.type === 'own_transfer' ? 'own transfers' : 'credit card repayments'}.`
      );
    } else if (cmd.destination_account_id === cmd.account_id) {
      errors.push('Source and destination accounts must be distinct.');
    } else if (accounts.length > 0) {
      const destAccount = accounts.find((a) => a.id === cmd.destination_account_id);
      if (!destAccount) {
        errors.push(`Unknown destination account: "${cmd.destination_account_id}".`);
      } else if (cmd.type === 'card_payment' && destAccount.type !== 'card') {
        errors.push('Destination account for credit card repayment must be a credit card account.');
      }
    }
  }

  // 6. Recipient validation
  if (!cmd.recipient || typeof cmd.recipient !== 'string' || cmd.recipient.trim().length === 0) {
    errors.push('Recipient / merchant name is required.');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Build canonical postings through domain ledger service
  const postingsSpec = buildEventPostings(
    cmd.type,
    cmd.amount_paise,
    cmd.account_id,
    cmd.destination_account_id
  );

  const builtEvent: Omit<FinancialEvent, 'id'> = {
    date: cmd.date.trim(),
    type: cmd.type,
    recipient: cmd.recipient.trim(),
    category: cmd.category ? cmd.category.trim() : null,
    income_paise: postingsSpec.income_paise,
    spending_paise: postingsSpec.spending_paise,
    postings: postingsSpec.postings,
    linked_purchase_id: cmd.linked_purchase_id,
    notes: cmd.notes ? cmd.notes.trim() : undefined,
    source_observations: cmd.source_observations,
  };

  return {
    isValid: true,
    errors: [],
    builtEvent,
  };
}
