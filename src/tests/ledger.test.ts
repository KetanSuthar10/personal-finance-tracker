import { describe, it, expect } from 'vitest';
import { calculatePeriodSummary, buildEventPostings } from '../domain/ledger';
import { DEMO_FIXTURE } from '../data/demoFixture';

describe('ledger accounting invariants and demo fixture reconciliation', () => {
  it('reconciles demo-transactions.json exactly to documented expected figures', () => {
    const summary = calculatePeriodSummary(
      DEMO_FIXTURE.accounts,
      DEMO_FIXTURE.events,
      DEMO_FIXTURE.period.from,
      DEMO_FIXTURE.period.through
    );

    // Exact matches with fixture expected block
    expect(summary.received_income_paise).toBe(DEMO_FIXTURE.expected.received_income_paise); // 600,000 paise (₹6,000.00)
    expect(summary.net_spending_paise).toBe(DEMO_FIXTURE.expected.net_spending_paise); // 90,000 paise (₹900.00)
    expect(summary.liquid_funds_paise).toBe(DEMO_FIXTURE.expected.liquid_funds_paise); // 672,000 paise (₹6,720.00)
    expect(summary.card_outstanding_paise).toBe(DEMO_FIXTURE.expected.card_outstanding_paise); // 42,000 paise (₹420.00)
    expect(summary.opening_net_position_paise).toBe(DEMO_FIXTURE.expected.opening_net_position_paise); // 120,000 paise (₹1,200.00)
    expect(summary.closing_net_position_paise).toBe(DEMO_FIXTURE.expected.closing_net_position_paise); // 630,000 paise (₹6,300.00)

    // Account closing positions
    expect(summary.closing_positions_paise['demo-bank']).toBe(648000); // ₹6,480.00
    expect(summary.closing_positions_paise['demo-cash']).toBe(24000);  // ₹240.00
    expect(summary.closing_positions_paise['demo-card']).toBe(-42000); // -₹420.00
  });

  it('guarantees fundamental accounting invariant: Opening + Income - Spending = Closing Net Position', () => {
    const summary = calculatePeriodSummary(
      DEMO_FIXTURE.accounts,
      DEMO_FIXTURE.events,
      DEMO_FIXTURE.period.from,
      DEMO_FIXTURE.period.through
    );

    const calculatedClosing =
      summary.opening_net_position_paise + summary.received_income_paise - summary.net_spending_paise;
    expect(calculatedClosing).toBe(summary.closing_net_position_paise);
  });

  it('guarantees that sum of individual account closing positions equals closing net position', () => {
    const summary = calculatePeriodSummary(
      DEMO_FIXTURE.accounts,
      DEMO_FIXTURE.events,
      DEMO_FIXTURE.period.from,
      DEMO_FIXTURE.period.through
    );

    const sumOfAccounts = Object.values(summary.closing_positions_paise).reduce((a, b) => a + b, 0);
    expect(sumOfAccounts).toBe(summary.closing_net_position_paise);
  });

  it('verifies own-account transfer creates zero income and zero spending', () => {
    const postings = buildEventPostings('own_transfer', 50000, 'demo-bank', 'demo-cash');
    expect(postings.income_paise).toBe(0);
    expect(postings.spending_paise).toBe(0);
    expect(postings.postings).toEqual([
      { account_id: 'demo-bank', delta_paise: -50000 },
      { account_id: 'demo-cash', delta_paise: 50000 },
    ]);
  });

  it('verifies credit card repayment creates zero income and zero spending while reducing liability', () => {
    const postings = buildEventPostings('card_payment', 30000, 'demo-bank', 'demo-card');
    expect(postings.income_paise).toBe(0);
    expect(postings.spending_paise).toBe(0);
    expect(postings.postings).toEqual([
      { account_id: 'demo-bank', delta_paise: -30000 },
      { account_id: 'demo-card', delta_paise: 30000 }, // Reduces card liability (positive delta)
    ]);
  });

  it('verifies merchant refund decreases spending and increases account position', () => {
    const postings = buildEventPostings('refund', 10000, 'demo-card');
    expect(postings.income_paise).toBe(0);
    expect(postings.spending_paise).toBe(-10000); // Negative spending
    expect(postings.postings).toEqual([
      { account_id: 'demo-card', delta_paise: 10000 },
    ]);
  });
});
