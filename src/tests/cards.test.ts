import { describe, it, expect } from 'vitest';
import {
  calculateCardStatementStatus,
  calculateUnbilledCardActivity,
  calculateEmiInstalmentPaise,
  calculateCashPlanning,
} from '../domain/cards';
import { CardStatement, EmiPlan, CashPlanningConfig, FinancialEvent } from '../domain/types';

describe('cards, statement bills, EMIs, and cash planning', () => {
  const statement: CardStatement = {
    id: 'stmt-001',
    account_id: 'demo-card',
    statement_date: '2026-09-30',
    due_date: '2026-10-20',
    statement_total_paise: 80000, // ₹800.00
    minimum_due_paise: 5000,
    allocated_payments_paise: 0,
    is_settled: false,
  };

  const paymentEvent: FinancialEvent = {
    id: 'pay-001',
    date: '2026-10-07',
    type: 'card_payment',
    recipient: 'Demo credit card',
    category: null,
    income_paise: 0,
    spending_paise: 0,
    postings: [
      { account_id: 'demo-bank', delta_paise: -30000 },
      { account_id: 'demo-card', delta_paise: 30000 }, // ₹300.00 credit
    ],
  };

  it('allocates partial repayments to card statement bill correctly', () => {
    const status = calculateCardStatementStatus(statement, [paymentEvent]);

    // Statement was ₹800, payment was ₹300 -> Remaining due is ₹500
    expect(status.allocated_payments_paise).toBe(30000);
    expect(status.remaining_due_paise).toBe(50000);
    expect(status.is_settled).toBe(false);
  });

  it('marks statement as settled when payments cover statement total', () => {
    const fullPayment: FinancialEvent = {
      ...paymentEvent,
      postings: [
        { account_id: 'demo-bank', delta_paise: -80000 },
        { account_id: 'demo-card', delta_paise: 80000 },
      ],
    };

    const status = calculateCardStatementStatus(statement, [fullPayment]);
    expect(status.remaining_due_paise).toBe(0);
    expect(status.is_settled).toBe(true);
  });

  it('calculates unbilled card postings after statement cutoff date', () => {
    const postStatementEvents: FinancialEvent[] = [
      // Post-statement purchase
      {
        id: 'p-1',
        date: '2026-10-05',
        type: 'purchase',
        recipient: 'Store',
        category: 'Shopping',
        income_paise: 0,
        spending_paise: 80000,
        postings: [{ account_id: 'demo-card', delta_paise: -80000 }],
      },
      // Post-statement refund
      {
        id: 'r-1',
        date: '2026-10-12',
        type: 'refund',
        recipient: 'Store',
        category: 'Shopping',
        income_paise: 0,
        spending_paise: -10000,
        postings: [{ account_id: 'demo-card', delta_paise: 10000 }],
      },
      // Post-statement fee
      {
        id: 'f-1',
        date: '2026-10-14',
        type: 'fee',
        recipient: 'Card Bank',
        category: 'Finance charges',
        income_paise: 0,
        spending_paise: 2000,
        postings: [{ account_id: 'demo-card', delta_paise: -2000 }],
      },
    ];

    const unbilled = calculateUnbilledCardActivity('2026-09-30', postStatementEvents, 'demo-card');

    expect(unbilled.unbilled_spending_paise).toBe(82000); // 80000 + 2000
    expect(unbilled.unbilled_credits_paise).toBe(10000);  // 10000 refund
    expect(unbilled.net_unbilled_paise).toBe(72000);      // 82000 - 10000
  });

  it('calculates standard amortized EMI instalment accurately', () => {
    // ₹30,000 principal at 14% annual interest for 6 months
    const instalment = calculateEmiInstalmentPaise(3000000, 14, 6);
    // Standard formula produces ~₹5,207.24 (520724 paise)
    expect(instalment).toBeGreaterThan(500000);
    expect(instalment).toBeLessThan(530000);

    // 0% interest -> strict division
    const zeroInterestInstalment = calculateEmiInstalmentPaise(3000000, 0, 6);
    expect(zeroInterestInstalment).toBe(500000); // ₹5,000.00
  });

  it('strictly deduplicates EMI instalments that are already billed inside a statement bill', () => {
    const statements: CardStatement[] = [statement]; // stmt-001 has ₹500 remaining due

    const emiPlans: EmiPlan[] = [
      // 1. This EMI is already billed inside stmt-001
      {
        id: 'emi-1',
        merchant: 'Laptop',
        account_id: 'demo-card',
        original_principal_paise: 3000000,
        monthly_instalment_paise: 525000, // ₹5,250.00
        total_tenure_months: 6,
        instalments_billed: 1,
        remaining_principal_paise: 2500000,
        annual_interest_rate_pct: 14,
        start_date: '2026-08-15',
        next_due_date: '2026-10-20',
        billed_in_statement_id: 'stmt-001', // LINKED TO STATEMENT BILL
        status: 'active',
      },
      // 2. Standalone EMI not billed in statement
      {
        id: 'emi-2',
        merchant: 'Phone',
        account_id: 'demo-card',
        original_principal_paise: 1500000,
        monthly_instalment_paise: 260000, // ₹2,600.00
        total_tenure_months: 6,
        instalments_billed: 0,
        remaining_principal_paise: 1500000,
        annual_interest_rate_pct: 12,
        start_date: '2026-10-10',
        next_due_date: '2026-10-25',
        status: 'active',
      },
    ];

    const config: CashPlanningConfig = {
      horizon_days: 30,
      emergency_buffer_paise: 200000, // ₹2,000.00
    };

    const liquidFundsPaise = 672000; // ₹6,720.00

    const planning = calculateCashPlanning(
      liquidFundsPaise,
      statements,
      emiPlans,
      [paymentEvent],
      config,
      '2026-10-18'
    );

    // Card bills due: ₹500.00 (50,000 paise)
    expect(planning.card_bills_due_paise).toBe(50000);

    // Standalone EMIs due: only emi-2 (₹2,600.00 / 260,000 paise)
    expect(planning.standalone_emis_due_paise).toBe(260000);

    // Deduplicated count must be 1 (emi-1 was deduplicated!)
    expect(planning.deduplicated_emis_count).toBe(1);

    // Total upcoming obligations: 50,000 + 260,000 = 310,000 paise (₹3,100.00)
    expect(planning.total_upcoming_obligations_paise).toBe(310000);

    // Planning available = 672,000 - 310,000 - 200,000 = 162,000 paise (₹1,620.00)
    expect(planning.planning_available_paise).toBe(162000);
  });

  it('projects multiple upcoming instalments within extended planning horizon (60 days)', () => {
    const emiPlans: EmiPlan[] = [
      {
        id: 'emi-multimonth',
        merchant: 'Gadget Store',
        account_id: 'demo-card',
        original_principal_paise: 6000000,
        monthly_instalment_paise: 1000000, // ₹10,000.00 / month
        total_tenure_months: 6,
        instalments_billed: 0,
        remaining_principal_paise: 6000000,
        annual_interest_rate_pct: 0,
        start_date: '2026-10-18',
        next_due_date: '2026-10-25', // 1st instalment: Oct 25; 2nd instalment: Nov 25
        status: 'active',
      },
    ];

    const config: CashPlanningConfig = {
      horizon_days: 60, // 60-day horizon captures both Oct 25 and Nov 25
      emergency_buffer_buffer: 0,
      emergency_buffer_paise: 100000,
    } as any;

    const planning = calculateCashPlanning(
      5000000,
      [],
      emiPlans,
      [],
      config,
      '2026-10-18'
    );

    // 2 instalments of ₹10,000.00 = ₹20,000.00 (2,000,000 paise)
    expect(planning.standalone_emis_due_paise).toBe(2000000);
    expect(planning.total_upcoming_obligations_paise).toBe(2000000);
  });

  it('excludes fully settled EMIs from upcoming obligations', () => {
    const settledEmi: EmiPlan = {
      id: 'emi-done',
      merchant: 'Paid Off Appliance',
      account_id: 'demo-card',
      original_principal_paise: 3000000,
      monthly_instalment_paise: 500000,
      total_tenure_months: 6,
      instalments_billed: 6, // All 6 billed
      remaining_principal_paise: 0,
      annual_interest_rate_pct: 12,
      start_date: '2026-04-15',
      next_due_date: '2026-10-20',
      status: 'active',
    };

    const planning = calculateCashPlanning(
      1000000,
      [],
      [settledEmi],
      [],
      { horizon_days: 30, emergency_buffer_paise: 0 },
      '2026-10-18'
    );

    expect(planning.standalone_emis_due_paise).toBe(0);
    expect(planning.total_upcoming_obligations_paise).toBe(0);
  });
});
