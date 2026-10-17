import { describe, it, expect } from 'vitest';
import {
  maskFinancialPayload,
  executeAssistantTool,
  ToolExecutionContext
} from '../domain/assistant';
import { queryAssistant } from '../domain/gemini';
import { DEMO_FIXTURE, DEMO_STATEMENTS, DEMO_EMIS } from '../data/demoFixture';

describe('Assistant Domain & Tools (M5)', () => {
  const context: ToolExecutionContext = {
    accounts: DEMO_FIXTURE.accounts,
    events: DEMO_FIXTURE.events,
    statements: DEMO_STATEMENTS,
    emis: DEMO_EMIS
  };

  it('masks sensitive account numbers, cards, and phone numbers in payloads', () => {
    const rawPayload = {
      card: '4111 2222 3333 4444',
      bankAcc: '501002345678912',
      pan: 'ABCDE1234F',
      phone: '9876543210',
      safeText: 'Groceries at Supermarket'
    };

    const masked = maskFinancialPayload(rawPayload);
    expect(masked.card).toBe('[CARD_MASKED]');
    expect(masked.bankAcc).toBe('[ACCOUNT_NUM_MASKED]');
    expect(masked.pan).toBe('[TAX_ID_MASKED]');
    expect(masked.phone).toBe('[PHONE_MASKED]');
    expect(masked.safeText).toBe('Groceries at Supermarket');
  });

  it('executes get_period_summary with exact safe integer paise arithmetic', () => {
    const result = executeAssistantTool(
      'get_period_summary',
      { start_date: '2026-10-01', end_date: '2026-10-31' },
      context
    );

    expect(result.execution.name).toBe('get_period_summary');
    expect(result.execution.result).toBeDefined();

    // Must match DEMO_FIXTURE expected totals exactly!
    expect(result.execution.result?.received_income_paise).toBe(DEMO_FIXTURE.expected.received_income_paise);
    expect(result.execution.result?.net_spending_paise).toBe(DEMO_FIXTURE.expected.net_spending_paise);
    expect(result.execution.result?.liquid_funds_paise).toBe(DEMO_FIXTURE.expected.liquid_funds_paise);
    expect(result.execution.result?.card_outstanding_paise).toBe(DEMO_FIXTURE.expected.card_outstanding_paise);
  });

  it('executes get_account_balances returning closing balances', () => {
    const result = executeAssistantTool('get_account_balances', {}, context);
    expect(result.execution.name).toBe('get_account_balances');
    expect(result.execution.result?.total_liquid_paise).toBe(DEMO_FIXTURE.expected.liquid_funds_paise);
    expect(result.execution.result?.total_card_outstanding_paise).toBe(DEMO_FIXTURE.expected.card_outstanding_paise);
  });

  it('executes get_upcoming_commitments with EMI deduplication', () => {
    const result = executeAssistantTool(
      'get_upcoming_commitments',
      { horizon_days: 30 },
      context
    );
    expect(result.execution.name).toBe('get_upcoming_commitments');
    expect(result.execution.result?.total_upcoming_obligations_paise).toBeGreaterThan(0);
    // Verified deduplication count
    expect(result.execution.result?.deduplicated_emis_count).toBeGreaterThanOrEqual(1);
  });

  it('executes propose_entry returning draft proposal without mutating context', () => {
    const initialEventsCount = context.events.length;
    const result = executeAssistantTool(
      'propose_entry',
      {
        type: 'purchase',
        amount_paise: 15000,
        date: '2026-10-18',
        account_id: 'acc_bank_1',
        recipient: 'Blue Tokai',
        category: 'Food & Dining'
      },
      context
    );

    expect(result.proposal).toBeDefined();
    expect(result.proposal?.type).toBe('create_entry');
    expect(result.proposal?.payload.entry?.recipient).toBe('Blue Tokai');
    expect(result.proposal?.payload.entry?.amount_paise).toBe(15000);
    // Invariant: does not silently append to context
    expect(context.events.length).toBe(initialEventsCount);
  });

  it('executes save_category_rule returning rule proposal without mutating context', () => {
    const result = executeAssistantTool(
      'save_category_rule',
      {
        recipient_pattern: 'Blue Tokai',
        category: 'Food & Dining'
      },
      context
    );

    expect(result.proposal).toBeDefined();
    expect(result.proposal?.type).toBe('create_rule');
    expect(result.proposal?.payload.rule?.recipient_pattern).toBe('Blue Tokai');
  });

  it('queries assistant in local deterministic mode returning grounded answers', async () => {
    const answer = await queryAssistant(
      'How much did I spend this month?',
      context,
      { apiKey: undefined }
    );

    expect(answer.sender).toBe('assistant');
    expect(answer.is_mock).toBe(true);
    expect(answer.tool_calls).toBeDefined();
    expect(answer.tool_calls?.[0].name).toBe('get_period_summary');
    // Verifies answer mentions net spending
    expect(answer.text).toContain('₹');
  });

  it('proposes draft entry when user enters transaction via chat', async () => {
    const answer = await queryAssistant(
      'Record 180 cafe from HDFC',
      context,
      { apiKey: undefined }
    );

    expect(answer.action_proposal).toBeDefined();
    expect(answer.action_proposal?.type).toBe('create_entry');
    expect(answer.action_proposal?.payload.entry?.amount_paise).toBe(18000);
  });
});
