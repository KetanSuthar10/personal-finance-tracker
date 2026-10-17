import { describe, it, expect, beforeEach } from 'vitest';
import { LocalLedgerRepository } from '../data/localRepository';
import { DEMO_FIXTURE } from '../data/demoFixture';

describe('LocalLedgerRepository', () => {
  let repo: LocalLedgerRepository;

  beforeEach(async () => {
    repo = new LocalLedgerRepository();
    await repo.resetToDemo();
  });

  it('initializes with accounts and events from DEMO_FIXTURE', async () => {
    const accounts = await repo.getAccounts();
    expect(accounts.length).toBe(DEMO_FIXTURE.accounts.length);

    const events = await repo.getEvents();
    expect(events.length).toBe(DEMO_FIXTURE.events.length);
  });

  it('adds a new manual event and updates summary correctly', async () => {
    const summaryBefore = await repo.getSummary(DEMO_FIXTURE.period.from, DEMO_FIXTURE.period.through);

    // Add a new ₹500 (50,000 paise) purchase from demo-bank
    const newEvent = await repo.addEvent({
      date: '2026-10-15',
      type: 'purchase',
      recipient: 'Bookstore',
      category: 'Education',
      income_paise: 0,
      spending_paise: 50000,
      postings: [{ account_id: 'demo-bank', delta_paise: -50000 }],
    });

    expect(newEvent.id).toBeDefined();

    const summaryAfter = await repo.getSummary(DEMO_FIXTURE.period.from, DEMO_FIXTURE.period.through);
    expect(summaryAfter.net_spending_paise).toBe(summaryBefore.net_spending_paise + 50000);
    expect(summaryAfter.closing_positions_paise['demo-bank']).toBe(
      summaryBefore.closing_positions_paise['demo-bank'] - 50000
    );
    expect(summaryAfter.closing_net_position_paise).toBe(summaryBefore.closing_net_position_paise - 50000);
  });

  it('resets to demo fixture on resetToDemo()', async () => {
    // Add event
    await repo.addEvent({
      date: '2026-10-16',
      type: 'purchase',
      recipient: 'Temporary',
      category: 'Misc',
      income_paise: 0,
      spending_paise: 10000,
      postings: [{ account_id: 'demo-cash', delta_paise: -10000 }],
    });

    let events = await repo.getEvents();
    expect(events.length).toBe(DEMO_FIXTURE.events.length + 1);

    await repo.resetToDemo();

    events = await repo.getEvents();
    expect(events.length).toBe(DEMO_FIXTURE.events.length);
  });
});
