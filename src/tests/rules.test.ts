import { describe, it, expect } from 'vitest';
import {
  matchCategoryRule,
  createCategoryRule,
  applyRulesToTransactions
} from '../domain/rules';
import { CategoryRule, FinancialEvent } from '../domain/types';

describe('Category Rules Engine (M5)', () => {
  const sampleRules: CategoryRule[] = [
    {
      id: 'rule_1',
      recipient_pattern: 'Swiggy',
      category: 'Food & Dining',
      created_at: '2026-10-01T00:00:00.000Z',
      match_count: 0
    },
    {
      id: 'rule_2',
      recipient_pattern: 'Swiggy Instamart',
      category: 'Groceries',
      created_at: '2026-10-01T00:00:00.000Z',
      match_count: 0
    },
    {
      id: 'rule_3',
      recipient_pattern: 'Uber',
      category: 'Travel / Commute',
      account_id: 'acc_card_1',
      created_at: '2026-10-01T00:00:00.000Z',
      match_count: 0
    },
    {
      id: 'rule_4',
      recipient_pattern: 'Uber',
      category: 'General Transportation',
      created_at: '2026-10-01T00:00:00.000Z',
      match_count: 0
    }
  ];

  it('matches rules by substring case-insensitively', () => {
    const match = matchCategoryRule('swiggy bangalore in', undefined, sampleRules);
    expect(match).not.toBeNull();
    expect(match?.category).toBe('Food & Dining');
  });

  it('prefers longer, more specific merchant patterns over general ones', () => {
    // "Swiggy Instamart" is longer and more specific than "Swiggy"
    const match = matchCategoryRule('Payment to SWIGGY INSTAMART Bangalore', undefined, sampleRules);
    expect(match).not.toBeNull();
    expect(match?.category).toBe('Groceries');
  });

  it('prefers account-specific rule over global rule for the specified account', () => {
    // When charged to acc_card_1, Uber rule_3 ('Travel / Commute') should win
    const matchCard = matchCategoryRule('Uber India Bangalore', 'acc_card_1', sampleRules);
    expect(matchCard).not.toBeNull();
    expect(matchCard?.category).toBe('Travel / Commute');

    // When charged to another account, Uber rule_4 ('General Transportation') should win
    const matchBank = matchCategoryRule('Uber India Bangalore', 'acc_bank_1', sampleRules);
    expect(matchBank).not.toBeNull();
    expect(matchBank?.category).toBe('General Transportation');
  });

  it('validates rule creation parameters', () => {
    expect(() => createCategoryRule('', 'Food')).toThrow('Recipient pattern cannot be empty');
    expect(() => createCategoryRule('Swiggy', '')).toThrow('Category cannot be empty');

    const created = createCategoryRule('  Starbucks  ', '  Coffee & Cafes  ');
    expect(created.recipient_pattern).toBe('Starbucks');
    expect(created.category).toBe('Coffee & Cafes');
    expect(created.id).toBeDefined();
  });

  it('applies rules to uncategorised transactions without clobbering existing categories', () => {
    const events: FinancialEvent[] = [
      {
        id: 'evt_1',
        date: '2026-10-05',
        type: 'purchase',
        recipient: 'Swiggy Order #123',
        category: null,
        income_paise: 0,
        spending_paise: 35000,
        postings: [{ account_id: 'acc_bank_1', delta_paise: -35000 }]
      },
      {
        id: 'evt_2',
        date: '2026-10-06',
        type: 'purchase',
        recipient: 'Swiggy Lunch',
        category: 'Custom Business Expense', // already manually categorized
        income_paise: 0,
        spending_paise: 50000,
        postings: [{ account_id: 'acc_bank_1', delta_paise: -50000 }]
      }
    ];

    const result = applyRulesToTransactions(events, sampleRules);
    expect(result.updatedCount).toBe(1);
    expect(result.updatedEvents[0].category).toBe('Food & Dining');
    expect(result.updatedEvents[1].category).toBe('Custom Business Expense'); // preserved!
  });
});
