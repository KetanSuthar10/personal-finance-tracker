import { describe, it, expect } from 'vitest';
import { Account, FinancialEvent } from '../domain/types';
import { calculatePeriodSummary } from '../domain/ledger';
import { validateFinancialCommand, CreateFinancialEntryCommand } from '../domain/commandService';
import { normalizeDate } from '../domain/importer';
import { queryAssistant } from '../domain/gemini';

describe('Canonical Ledger & Date Correctness (T01 / AT01–AT03)', () => {
  // Accounts for AT01 fixture:
  // Opening as of 30 Sept 2026: Bank A ₹1000, Bank B ₹0, Cash ₹200, Card C ₹0, Card D ₹0
  const accounts: Account[] = [
    {
      id: 'bank-a',
      label: 'Bank A',
      type: 'bank',
      opening_position_paise: 100000,
      opening_date: '2026-09-30',
    },
    {
      id: 'bank-b',
      label: 'Bank B',
      type: 'bank',
      opening_position_paise: 0,
      opening_date: '2026-09-30',
    },
    {
      id: 'cash',
      label: 'Cash',
      type: 'cash',
      opening_position_paise: 20000,
      opening_date: '2026-09-30',
    },
    {
      id: 'card-c',
      label: 'Card C',
      type: 'card',
      opening_position_paise: 0,
      opening_date: '2026-09-30',
    },
    {
      id: 'card-d',
      label: 'Card D',
      type: 'card',
      opening_position_paise: 0,
      opening_date: '2026-09-30',
    },
  ];

  // Helper to build canonical event through command service
  const createEvent = (cmd: CreateFinancialEntryCommand, id: string): FinancialEvent => {
    const result = validateFinancialCommand(cmd, accounts);
    if (!result.isValid || !result.builtEvent) {
      throw new Error(`Command validation failed: ${result.errors.join('; ')}`);
    }
    return { ...result.builtEvent, id };
  };

  const canonicalEvents: FinancialEvent[] = [
    // 01: Salary ₹5,000 (Bank A +5,000)
    createEvent(
      {
        type: 'income',
        amount_paise: 500000,
        date: '2026-10-01',
        account_id: 'bank-a',
        recipient: 'Employer Payroll',
        category: 'Salary',
      },
      'evt-01'
    ),
    // 03: Cafe payment 1 ₹120 (Bank A −120)
    createEvent(
      {
        type: 'purchase',
        amount_paise: 12000,
        date: '2026-10-03',
        account_id: 'bank-a',
        recipient: 'Cafe 1',
        category: 'Dining',
      },
      'evt-02'
    ),
    // 03: Cafe payment 2 ₹120 (Bank A −120) - distinct source identity
    createEvent(
      {
        type: 'purchase',
        amount_paise: 12000,
        date: '2026-10-03',
        account_id: 'bank-a',
        recipient: 'Cafe 2',
        category: 'Dining',
      },
      'evt-03'
    ),
    // 04: Pharmacy ₹120 (Bank A −120)
    createEvent(
      {
        type: 'purchase',
        amount_paise: 12000,
        date: '2026-10-04',
        account_id: 'bank-a',
        recipient: 'Pharmacy',
        category: 'Health',
      },
      'evt-04'
    ),
    // 04: Parking ₹60 (Cash −60)
    createEvent(
      {
        type: 'purchase',
        amount_paise: 6000,
        date: '2026-10-04',
        account_id: 'cash',
        recipient: 'Parking',
        category: 'Transport',
      },
      'evt-05'
    ),
    // 05: Grocery purchase ₹800 (Card C −800)
    createEvent(
      {
        type: 'purchase',
        amount_paise: 80000,
        date: '2026-10-05',
        account_id: 'card-c',
        recipient: 'Supermarket',
        category: 'Groceries',
      },
      'evt-06'
    ),
    // 07: Card repayment ₹300 (Bank A −300; Card C +300)
    createEvent(
      {
        type: 'card_payment',
        amount_paise: 30000,
        date: '2026-10-07',
        account_id: 'bank-a',
        destination_account_id: 'card-c',
        recipient: 'Card C Repayment',
      },
      'evt-07'
    ),
    // 08: Cash withdrawal ₹100 (Bank A −100; Cash +100)
    createEvent(
      {
        type: 'own_transfer',
        amount_paise: 10000,
        date: '2026-10-08',
        account_id: 'bank-a',
        destination_account_id: 'cash',
        recipient: 'ATM Cash Withdrawal',
      },
      'evt-08'
    ),
    // 09: Own-bank transfer ₹50 (Bank A −50; Bank B +50)
    createEvent(
      {
        type: 'own_transfer',
        amount_paise: 5000,
        date: '2026-10-09',
        account_id: 'bank-a',
        destination_account_id: 'bank-b',
        recipient: 'Bank Transfer to Bank B',
      },
      'evt-09'
    ),
    // 10: Received freelance income ₹1,000 (Bank A +1,000)
    createEvent(
      {
        type: 'income',
        amount_paise: 100000,
        date: '2026-10-10',
        account_id: 'bank-a',
        recipient: 'Freelance Client',
        category: 'Freelance',
      },
      'evt-10'
    ),
    // 12: Grocery refund ₹100 (Card C +100)
    createEvent(
      {
        type: 'refund',
        amount_paise: 10000,
        date: '2026-10-12',
        account_id: 'card-c',
        recipient: 'Supermarket Refund',
        category: 'Groceries',
      },
      'evt-11'
    ),
    // 14: Card fee ₹20 (Card C −20)
    createEvent(
      {
        type: 'fee',
        amount_paise: 2000,
        date: '2026-10-14',
        account_id: 'card-c',
        recipient: 'Card Annual Fee',
        category: 'Finance Charges',
      },
      'evt-12'
    ),
  ];

  describe('AT01: Canonical Ledger Fixture & Period Slicing', () => {
    it('calculates exact figures for full month (1–31 October 2026)', () => {
      const summary = calculatePeriodSummary(accounts, canonicalEvents, '2026-10-01', '2026-10-31');

      // Income: Salary ₹5,000 + Freelance ₹1,000 = ₹6,000 (600,000 paise)
      expect(summary.received_income_paise).toBe(600000);

      // Spending: Cafe 1 (120) + Cafe 2 (120) + Pharmacy (120) + Parking (60) + Grocery (800) - Refund (100) + Fee (20) = ₹1,140 (114,000 paise)
      expect(summary.net_spending_paise).toBe(114000);

      // Closing Account Positions:
      // Bank A: 1000 + 5000 - 120 - 120 - 120 - 300 - 100 - 50 + 1000 = ₹6,190 (619,000 paise)
      // Bank B: 0 + 50 = ₹50 (5,000 paise)
      // Cash: 200 - 60 + 100 = ₹240 (24,000 paise)
      // Card C: 0 - 800 + 300 + 100 - 20 = -₹420 (-42,000 paise)
      // Card D: 0
      const positions = summary.closing_positions_paise;
      expect(positions['bank-a']).toBe(619000);
      expect(positions['bank-b']).toBe(5000);
      expect(positions['cash']).toBe(24000);
      expect(positions['card-c']).toBe(-42000);
      expect(positions['card-d']).toBe(0);

      // Liquid funds: Bank A + Bank B + Cash = 6,190 + 50 + 240 = ₹6,480 (648,000 paise)
      expect(summary.liquid_funds_paise).toBe(648000);

      // Card outstanding: ₹420 (42,000 paise)
      expect(summary.card_outstanding_paise).toBe(42000);

      // Net position: 6,480 - 420 = ₹6,060 (606,000 paise)
      expect(summary.closing_net_position_paise).toBe(606000);

      // Fundamental invariant: Opening (1,200) + Income (6,000) - Spending (1,140) = Closing (6,060)
      expect(summary.opening_net_position_paise).toBe(120000);
      expect(
        summary.opening_net_position_paise + summary.received_income_paise - summary.net_spending_paise
      ).toBe(summary.closing_net_position_paise);
    });

    it('calculates carried period opening correctly for slice (5–31 October 2026)', () => {
      const summary = calculatePeriodSummary(accounts, canonicalEvents, '2026-10-05', '2026-10-31');

      // Prior to 5 October:
      // Oct 1 Salary +5000 (Bank A: 6000)
      // Oct 3 Cafe 1 -120 (Bank A: 5880)
      // Oct 3 Cafe 2 -120 (Bank A: 5760)
      // Oct 4 Pharmacy -120 (Bank A: 5640)
      // Oct 4 Parking -60 (Cash: 140)
      // Carried Opening: Bank A (5640) + Bank B (0) + Cash (140) + Card C (0) + Card D (0) = ₹5,780 (578,000 paise)
      expect(summary.opening_net_position_paise).toBe(578000);

      // Income in 5–31 Oct: Freelance ₹1,000 only
      expect(summary.received_income_paise).toBe(100000);

      // Spending in 5–31 Oct: Grocery (800) - Refund (100) + Fee (20) = ₹720 (72,000 paise)
      expect(summary.net_spending_paise).toBe(72000);

      // Closing position remains ₹6,060 (606,000 paise)
      expect(summary.closing_net_position_paise).toBe(606000);

      // Carried Opening (5,780) + Period Income (1,000) - Period Spending (720) = Closing (6,060)
      expect(
        summary.opening_net_position_paise + summary.received_income_paise - summary.net_spending_paise
      ).toBe(summary.closing_net_position_paise);
    });
  });

  describe('AT02: Universal Command Semantics Across Entry Routes', () => {
    it('creates identical canonical postings for purchases, fees, refunds, and repayments', () => {
      // 1. Purchase
      const purchaseCmd: CreateFinancialEntryCommand = {
        type: 'purchase',
        amount_paise: 80000,
        date: '2026-10-05',
        account_id: 'card-c',
        recipient: 'Store',
      };
      const purchaseRes = validateFinancialCommand(purchaseCmd, accounts);
      expect(purchaseRes.isValid).toBe(true);
      expect(purchaseRes.builtEvent?.spending_paise).toBe(80000);
      expect(purchaseRes.builtEvent?.postings).toEqual([{ account_id: 'card-c', delta_paise: -80000 }]);

      // 2. Refund (reduces spending)
      const refundCmd: CreateFinancialEntryCommand = {
        type: 'refund',
        amount_paise: 10000,
        date: '2026-10-12',
        account_id: 'card-c',
        recipient: 'Store Refund',
      };
      const refundRes = validateFinancialCommand(refundCmd, accounts);
      expect(refundRes.isValid).toBe(true);
      expect(refundRes.builtEvent?.income_paise).toBe(0);
      expect(refundRes.builtEvent?.spending_paise).toBe(-10000); // negative spending
      expect(refundRes.builtEvent?.postings).toEqual([{ account_id: 'card-c', delta_paise: 10000 }]);

      // 3. Card Repayment (paired postings: bank -300, card +300)
      const repayCmd: CreateFinancialEntryCommand = {
        type: 'card_payment',
        amount_paise: 30000,
        date: '2026-10-07',
        account_id: 'bank-a',
        destination_account_id: 'card-c',
        recipient: 'Card Repayment',
      };
      const repayRes = validateFinancialCommand(repayCmd, accounts);
      expect(repayRes.isValid).toBe(true);
      expect(repayRes.builtEvent?.income_paise).toBe(0);
      expect(repayRes.builtEvent?.spending_paise).toBe(0);
      expect(repayRes.builtEvent?.postings).toEqual([
        { account_id: 'bank-a', delta_paise: -30000 },
        { account_id: 'card-c', delta_paise: 30000 },
      ]);
    });
  });

  describe('AT03: Strict Validation and Rejection of Invalid Inputs', () => {
    it('rejects impossible calendar dates like 2026-02-31', () => {
      const cmd: CreateFinancialEntryCommand = {
        type: 'purchase',
        amount_paise: 12000,
        date: '2026-02-31', // Feb 31 does not exist
        account_id: 'bank-a',
        recipient: 'Cafe',
      };
      const res = validateFinancialCommand(cmd, accounts);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('Invalid or impossible calendar date'))).toBe(true);
    });

    it('rejects impossible dates in importer normalizeDate returning REJECT', () => {
      expect(normalizeDate('31/02/2026')).toBe('REJECT');
      expect(normalizeDate('29/02/2025')).toBe('REJECT'); // 2025 is not a leap year
    });

    it('rejects zero or negative amounts', () => {
      const zeroCmd: CreateFinancialEntryCommand = {
        type: 'purchase',
        amount_paise: 0,
        date: '2026-10-05',
        account_id: 'bank-a',
        recipient: 'Cafe',
      };
      expect(validateFinancialCommand(zeroCmd, accounts).isValid).toBe(false);

      const negCmd: CreateFinancialEntryCommand = {
        type: 'purchase',
        amount_paise: -5000,
        date: '2026-10-05',
        account_id: 'bank-a',
        recipient: 'Cafe',
      };
      expect(validateFinancialCommand(negCmd, accounts).isValid).toBe(false);
    });

    it('rejects non-safe integer amounts', () => {
      const unsafeCmd: CreateFinancialEntryCommand = {
        type: 'purchase',
        amount_paise: 1e20,
        date: '2026-10-05',
        account_id: 'bank-a',
        recipient: 'Cafe',
      };
      expect(validateFinancialCommand(unsafeCmd, accounts).isValid).toBe(false);
    });

    it('rejects transfer with identical source and destination accounts', () => {
      const cmd: CreateFinancialEntryCommand = {
        type: 'own_transfer',
        amount_paise: 5000,
        date: '2026-10-09',
        account_id: 'bank-a',
        destination_account_id: 'bank-a', // same account
        recipient: 'Self Transfer',
      };
      const res = validateFinancialCommand(cmd, accounts);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('Source and destination accounts must be distinct'))).toBe(true);
    });

    it('rejects transfer with missing destination account', () => {
      const cmd: CreateFinancialEntryCommand = {
        type: 'own_transfer',
        amount_paise: 5000,
        date: '2026-10-09',
        account_id: 'bank-a',
        recipient: 'Self Transfer',
      };
      const res = validateFinancialCommand(cmd, accounts);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('Destination account is required'))).toBe(true);
    });

    it('requires amount clarification in assistant without inventing a ₹120 default', async () => {
      const context = {
        accounts,
        events: canonicalEvents,
        statements: [],
        emis: [],
      };
      const reply = await queryAssistant('record a coffee', context, {});
      expect(reply.action_proposal?.payload.entry?.amount_paise ?? null).toBeNull();
      expect(reply.text).toContain('specify the amount');
    });

    it('queries correct November period in assistant when November is requested', async () => {
      const context = {
        accounts,
        events: canonicalEvents,
        statements: [],
        emis: [],
      };
      const reply = await queryAssistant('Spending summary for November 2026', context, {});
      expect(reply.tool_calls?.[0]?.result?.from).toBe('2026-11-01');
      expect(reply.tool_calls?.[0]?.result?.through).toBe('2026-11-30');
    });
  });
});
