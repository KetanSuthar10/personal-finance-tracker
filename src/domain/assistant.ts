import {
  Account,
  FinancialEvent,
  CardStatement,
  EmiPlan,
  EventType,
  ToolCallExecution,
  ActionProposal
} from './types';
import { calculatePeriodSummary, calculateAccountPositions } from './ledger';
import { calculateCashPlanning } from './cards';
import { formatRupees } from './money';

/**
 * Masks sensitive account numbers, card suffixes, and personal identifiers
 * before payload is passed to external AI requests.
 */
export function maskFinancialPayload<T>(payload: T): T {
  const jsonStr = JSON.stringify(payload);

  // Replace 12-16 digit card numbers
  let masked = jsonStr.replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, '[CARD_MASKED]');
  // Replace PAN / Tax ID patterns (5 letters, 4 digits, 1 letter)
  masked = masked.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/gi, '[TAX_ID_MASKED]');
  // Replace Indian phone numbers (10 digits starting with 6-9, or +91/0 prefix)
  masked = masked.replace(/(?:\+91|0)?[6-9]\d{9}\b/g, '[PHONE_MASKED]');
  // Replace 11-18 digit bank account numbers
  masked = masked.replace(/\b\d{11,18}\b/g, '[ACCOUNT_NUM_MASKED]');

  return JSON.parse(masked);
}

/**
 * Gemini-compatible Function Declarations
 */
export const ASSISTANT_TOOL_DECLARATIONS = [
  {
    name: 'get_period_summary',
    description: 'Get verified deterministic financial totals (income, spending, liquid funds, category breakdown) for a date range.',
    parameters: {
      type: 'OBJECT',
      properties: {
        start_date: { type: 'STRING', description: 'Start date in YYYY-MM-DD format (Asia/Kolkata)' },
        end_date: { type: 'STRING', description: 'End date in YYYY-MM-DD format (Asia/Kolkata)' }
      }
    }
  },
  {
    name: 'get_account_balances',
    description: 'Get closing balances and freshness across all liquid bank accounts, cash wallets, and credit cards.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'search_transactions',
    description: 'Find financial transactions by recipient, category, account, or date range.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Text to search in recipient or notes' },
        category: { type: 'STRING', description: 'Filter by category name' },
        start_date: { type: 'STRING', description: 'Filter on or after YYYY-MM-DD' },
        end_date: { type: 'STRING', description: 'Filter on or before YYYY-MM-DD' },
        account_id: { type: 'STRING', description: 'Filter by account ID' },
        limit: { type: 'INTEGER', description: 'Max records to return (default 10)' }
      }
    }
  },
  {
    name: 'get_upcoming_commitments',
    description: 'Get verified upcoming obligations (credit card statement bills and amortized EMI instalments) within a day horizon, deduplicated against statement bills.',
    parameters: {
      type: 'OBJECT',
      properties: {
        horizon_days: { type: 'INTEGER', description: 'Number of days to project forward (default 30)' }
      }
    }
  },
  {
    name: 'propose_entry',
    description: 'Propose a draft financial transaction (e.g. coffee, groceries, salary) for user confirmation. Does NOT mutate data silently.',
    parameters: {
      type: 'OBJECT',
      properties: {
        type: { type: 'STRING', enum: ['purchase', 'income', 'refund', 'card_payment', 'own_transfer', 'fee'], description: 'Transaction type' },
        amount_paise: { type: 'INTEGER', description: 'Amount in integer paise (e.g. 15000 for Rs 150.00)' },
        date: { type: 'STRING', description: 'Date in YYYY-MM-DD format' },
        account_id: { type: 'STRING', description: 'Account ID to post to' },
        recipient: { type: 'STRING', description: 'Recipient or merchant name' },
        category: { type: 'STRING', description: 'Category name (e.g. Food & Dining, Utilities)' },
        notes: { type: 'STRING', description: 'Optional memo or description' }
      },
      required: ['type', 'amount_paise', 'date', 'account_id', 'recipient']
    }
  },
  {
    name: 'save_category_rule',
    description: 'Propose a category mapping rule to remember future purchases for a merchant. Requires user confirmation.',
    parameters: {
      type: 'OBJECT',
      properties: {
        recipient_pattern: { type: 'STRING', description: 'Merchant pattern to match (e.g. "Swiggy", "Starbucks")' },
        category: { type: 'STRING', description: 'Category to assign (e.g. "Food & Dining")' },
        account_id: { type: 'STRING', description: 'Optional account restriction' }
      },
      required: ['recipient_pattern', 'category']
    }
  }
];

export interface ToolExecutionContext {
  accounts: Account[];
  events: FinancialEvent[];
  statements: CardStatement[];
  emis: EmiPlan[];
}

/**
 * Deterministically executes a tool call using verified ledger functions.
 * Returns structured result and supporting record counts.
 */
export function executeAssistantTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): { execution: ToolCallExecution; proposal?: ActionProposal } {
  const { accounts, events, statements, emis } = context;

  switch (toolName) {
    case 'get_period_summary': {
      const startDate = args.start_date || '2026-10-01';
      const endDate = args.end_date || '2026-10-31';

      const summary = calculatePeriodSummary(accounts, events, startDate, endDate);
      const supportingCount = events.filter(e => e.date >= startDate && e.date <= endDate).length;

      return {
        execution: {
          name: toolName,
          arguments: args,
          supporting_record_count: supportingCount,
          result: {
            from: summary.from,
            through: summary.through,
            received_income_paise: summary.received_income_paise,
            received_income_formatted: formatRupees(summary.received_income_paise),
            net_spending_paise: summary.net_spending_paise,
            net_spending_formatted: formatRupees(summary.net_spending_paise),
            liquid_funds_paise: summary.liquid_funds_paise,
            liquid_funds_formatted: formatRupees(summary.liquid_funds_paise),
            card_outstanding_paise: summary.card_outstanding_paise,
            card_outstanding_formatted: formatRupees(summary.card_outstanding_paise),
            category_breakdown: summary.category_breakdown
          }
        }
      };
    }

    case 'get_account_balances': {
      const positions = calculateAccountPositions(accounts, events);
      let liquidPaise = 0;
      let cardPaise = 0;

      for (const acc of accounts) {
        const pos = positions[acc.id] ?? 0;
        if (acc.type === 'bank' || acc.type === 'cash') {
          liquidPaise += pos;
        } else if (acc.type === 'card' && pos < 0) {
          cardPaise += Math.abs(pos);
        }
      }

      const accountSummaries = accounts.map(acc => ({
        id: acc.id,
        label: acc.label,
        type: acc.type,
        masked_suffix: acc.masked_suffix,
        balance_paise: positions[acc.id] || 0,
        balance_formatted: formatRupees(positions[acc.id] || 0)
      }));

      return {
        execution: {
          name: toolName,
          arguments: args,
          supporting_record_count: accounts.length,
          result: {
            accounts: accountSummaries,
            total_liquid_paise: liquidPaise,
            total_liquid_formatted: formatRupees(liquidPaise),
            total_card_outstanding_paise: cardPaise,
            total_card_outstanding_formatted: formatRupees(cardPaise)
          }
        }
      };
    }

    case 'search_transactions': {
      const query = (args.query || '').trim().toLowerCase();
      const category = (args.category || '').trim().toLowerCase();
      const accountId = args.account_id;
      const startDate = args.start_date;
      const endDate = args.end_date;
      const limit = Math.min(args.limit || 10, 50);

      const matched = events.filter(e => {
        if (query && !e.recipient.toLowerCase().includes(query) && !(e.notes || '').toLowerCase().includes(query)) {
          return false;
        }
        if (category && (e.category || '').toLowerCase() !== category) {
          return false;
        }
        if (accountId && !e.postings.some(p => p.account_id === accountId)) {
          return false;
        }
        if (startDate && e.date < startDate) return false;
        if (endDate && e.date > endDate) return false;
        return true;
      });

      const totalMatchingPaise = matched.reduce((sum, e) => sum + e.spending_paise, 0);

      return {
        execution: {
          name: toolName,
          arguments: args,
          supporting_record_count: matched.length,
          result: {
            match_count: matched.length,
            total_spending_paise: totalMatchingPaise,
            total_spending_formatted: formatRupees(totalMatchingPaise),
            transactions: matched.slice(0, limit).map(e => ({
              id: e.id,
              date: e.date,
              recipient: e.recipient,
              category: e.category,
              type: e.type,
              spending_paise: e.spending_paise,
              spending_formatted: formatRupees(e.spending_paise),
              income_paise: e.income_paise,
              income_formatted: formatRupees(e.income_paise)
            }))
          }
        }
      };
    }

    case 'get_upcoming_commitments': {
      const horizonDays = args.horizon_days || 30;
      const periodSummary = calculatePeriodSummary(accounts, events, '2026-10-01', '2026-10-31');
      const summary = calculateCashPlanning(
        periodSummary.liquid_funds_paise,
        statements,
        emis,
        events,
        {
          horizon_days: horizonDays,
          emergency_buffer_paise: 0
        },
        '2026-10-31'
      );

      return {
        execution: {
          name: toolName,
          arguments: args,
          supporting_record_count: statements.length + emis.length,
          result: {
            horizon_days: horizonDays,
            liquid_funds_paise: summary.liquid_funds_paise,
            liquid_funds_formatted: formatRupees(summary.liquid_funds_paise),
            card_bills_due_paise: summary.card_bills_due_paise,
            card_bills_due_formatted: formatRupees(summary.card_bills_due_paise),
            standalone_emis_due_paise: summary.standalone_emis_due_paise,
            standalone_emis_due_formatted: formatRupees(summary.standalone_emis_due_paise),
            deduplicated_emis_count: summary.deduplicated_emis_count,
            total_upcoming_obligations_paise: summary.total_upcoming_obligations_paise,
            total_upcoming_obligations_formatted: formatRupees(summary.total_upcoming_obligations_paise),
            planning_available_paise: summary.planning_available_paise,
            planning_available_formatted: formatRupees(summary.planning_available_paise)
          }
        }
      };
    }

    case 'propose_entry': {
      const targetAccount = accounts.find(a => a.id === args.account_id) || accounts[0];
      const proposal: ActionProposal = {
        type: 'create_entry',
        status: 'pending',
        payload: {
          entry: {
            type: (args.type as EventType) || 'purchase',
            amount_paise: args.amount_paise,
            date: args.date || new Date().toISOString().split('T')[0],
            account_id: targetAccount.id,
            recipient: args.recipient,
            category: args.category || 'Uncategorised',
            notes: args.notes
          }
        }
      };

      return {
        execution: {
          name: toolName,
          arguments: args,
          supporting_record_count: 1,
          result: {
            status: 'draft_created',
            proposed_entry: proposal.payload.entry
          }
        },
        proposal
      };
    }

    case 'save_category_rule': {
      const proposal: ActionProposal = {
        type: 'create_rule',
        status: 'pending',
        payload: {
          rule: {
            recipient_pattern: args.recipient_pattern,
            category: args.category,
            account_id: args.account_id
          }
        }
      };

      return {
        execution: {
          name: toolName,
          arguments: args,
          supporting_record_count: 1,
          result: {
            status: 'rule_proposed',
            proposed_rule: proposal.payload.rule
          }
        },
        proposal
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
