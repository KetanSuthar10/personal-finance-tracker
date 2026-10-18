import {
  AssistantMessage,
  ToolCallExecution,
  ActionProposal
} from './types';
import {
  ASSISTANT_TOOL_DECLARATIONS,
  executeAssistantTool,
  maskFinancialPayload,
  ToolExecutionContext
} from './assistant';
import { toPaise } from './money';

export interface AssistantOptions {
  apiKey?: string;
  model?: string;
}

/**
 * Extracts amount in rupees from text like "120", "Rs 250", "₹500.50"
 */
function extractAmountRupees(text: string): number | null {
  const match = text.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}

/**
 * High-fidelity deterministic local engine for synthetic/offline evaluation
 */
function handleLocalEngineQuery(
  userQuery: string,
  context: ToolExecutionContext
): {
  reply: string;
  toolCalls: ToolCallExecution[];
  actionProposal?: ActionProposal;
} {
  const q = userQuery.toLowerCase().trim();
  const toolCalls: ToolCallExecution[] = [];
  let actionProposal: ActionProposal | undefined;

  // 1. Propose entry intent (e.g. "record 120 cafe", "spent 250 at starbucks", "add expense")
  if (
    q.startsWith('record ') ||
    q.startsWith('add ') ||
    q.startsWith('spent ') ||
    q.includes('add expense')
  ) {
    const amtRupees = extractAmountRupees(q);
    if (!amtRupees || amtRupees <= 0) {
      return {
        reply: "Could you please specify the amount for this transaction? For example: 'Record ₹180 at Blue Tokai from HDFC'.",
        toolCalls: []
      };
    }
    const amtPaise = toPaise(amtRupees);

    // Extract recipient
    let recipient = 'Cafe';
    if (q.includes('at ')) {
      recipient = userQuery.split(/at /i)[1].split(/ for| from| on| via/i)[0].trim();
    } else if (q.includes('for ')) {
      recipient = userQuery.split(/for /i)[1].split(/ from| at| on| via/i)[0].trim();
    } else if (q.includes('cafe')) {
      recipient = 'Cafe';
    }

    // Default account: bank asset
    const account = context.accounts.find(a => a.type === 'bank') || context.accounts[0];

    const result = executeAssistantTool(
      'propose_entry',
      {
        type: 'purchase',
        amount_paise: amtPaise,
        date: new Date().toISOString().split('T')[0],
        account_id: account.id,
        recipient: recipient || 'Merchant',
        category: q.includes('coffee') || q.includes('cafe') || q.includes('food') ? 'Food & Dining' : 'General',
        notes: userQuery
      },
      context
    );

    toolCalls.push(result.execution);
    actionProposal = result.proposal;

    const proposedRecipient = actionProposal?.payload.entry?.recipient || recipient;

    return {
      reply: `I've prepared a draft entry for **${proposedRecipient}** of **₹${(amtPaise / 100).toFixed(2)}** posting to **${account.label}**. Please review and confirm below:`,
      toolCalls,
      actionProposal
    };
  }

  // 2. Rule learning intent (e.g. "remember swiggy as food", "set rule: uber is transportation")
  if (
    q.startsWith('remember ') ||
    q.startsWith('set rule') ||
    q.startsWith('categorize ') ||
    q.includes(' as food') ||
    q.includes(' as transportation')
  ) {
    let merchant = 'Swiggy';
    let category = 'Food & Dining';

    if (q.includes('remember ')) {
      const parts = userQuery.substring(9).split(/ as | is /i);
      if (parts.length >= 2) {
        merchant = parts[0].trim();
        category = parts[1].trim();
      }
    } else if (q.includes('categorize ')) {
      const parts = userQuery.substring(11).split(/ as | under /i);
      if (parts.length >= 2) {
        merchant = parts[0].trim();
        category = parts[1].trim();
      }
    }

    const result = executeAssistantTool(
      'save_category_rule',
      {
        recipient_pattern: merchant,
        category: category
      },
      context
    );

    toolCalls.push(result.execution);
    actionProposal = result.proposal;

    return {
      reply: `I've created a rule proposal to automatically categorise future purchases containing "**${merchant}**" under **${category}**. Please confirm to save this rule:`,
      toolCalls,
      actionProposal
    };
  }

  // 3. Upcoming commitments / bills / EMIs intent
  if (
    q.includes('due') ||
    q.includes('bill') ||
    q.includes('emi') ||
    q.includes('commitment') ||
    q.includes('obligation')
  ) {
    const result = executeAssistantTool('get_upcoming_commitments', { horizon_days: 30 }, context);
    toolCalls.push(result.execution);

    const res = result.execution.result as any;
    return {
      reply: `In the next 30 days, your verified total obligations are **${res.total_upcoming_obligations_formatted}** (comprising **${res.card_bills_due_formatted}** in credit card statement bills and **${res.standalone_emis_due_formatted}** in amortized EMI instalments). Note: ${res.deduplicated_emis_count} EMI instalments already included in card bills were deduplicated to prevent double-counting. Your available planning liquidity is **${res.planning_available_formatted}**.`,
      toolCalls
    };
  }

  // 4. Liquid funds / balances intent
  if (
    q.includes('balance') ||
    q.includes('liquid') ||
    q.includes('cash') ||
    q.includes('account') ||
    q.includes('money do i have')
  ) {
    const result = executeAssistantTool('get_account_balances', {}, context);
    toolCalls.push(result.execution);

    const res = result.execution.result as any;
    const accList = (res.accounts as any[])
      .map(a => `• **${a.label}**: ${a.balance_formatted}`)
      .join('\n');

    return {
      reply: `Your total liquid asset funds stand at **${res.total_liquid_formatted}**, with outstanding credit liabilities of **${res.total_card_outstanding_formatted}**.\n\nAccount Breakdown:\n${accList}`,
      toolCalls
    };
  }

  // 5. Search specific merchant / category (e.g. "how much did i spend on swiggy/cafe/food")
  if (
    q.includes('spend on ') ||
    q.includes('spent on ') ||
    q.includes('spend at ') ||
    q.includes('spent at ') ||
    q.includes('find ') ||
    q.includes('search ')
  ) {
    const queryTerm = q
      .replace(/(?:how much did i spend (?:on|at)|spent (?:on|at)|find|search)\s+/i, '')
      .replace(/[?.]/g, '')
      .trim();

    const result = executeAssistantTool(
      'search_transactions',
      { query: queryTerm },
      context
    );
    toolCalls.push(result.execution);

    const res = result.execution.result as any;
    if (res.match_count === 0) {
      return {
        reply: `I searched your transactions for "${queryTerm}" and found 0 matching records.`,
        toolCalls
      };
    }

    const txSample = (res.transactions as any[])
      .slice(0, 3)
      .map(t => `• ${t.date}: ${t.recipient} (${t.spending_formatted})`)
      .join('\n');

    return {
      reply: `Found **${res.match_count}** transactions matching "${queryTerm}" totaling **${res.total_spending_formatted}**.\n\nRecent records:\n${txSample}`,
      toolCalls
    };
  }

  // 6. Default: Period summary (spending / income)
  if (
    q.includes('spending') ||
    q.includes('income') ||
    q.includes('summary') ||
    q.includes('month') ||
    q.includes('overview')
  ) {
    let startDate = '2026-10-01';
    let endDate = '2026-10-31';
    let monthLabel = 'October 2026';

    const qLower = q.toLowerCase();
    if (qLower.includes('november') || qLower.includes('nov')) {
      startDate = '2026-11-01';
      endDate = '2026-11-30';
      monthLabel = 'November 2026';
    } else if (qLower.includes('december') || qLower.includes('dec')) {
      startDate = '2026-12-01';
      endDate = '2026-12-31';
      monthLabel = 'December 2026';
    } else if (qLower.includes('september') || qLower.includes('sep')) {
      startDate = '2026-09-01';
      endDate = '2026-09-30';
      monthLabel = 'September 2026';
    }

    const result = executeAssistantTool('get_period_summary', { start_date: startDate, end_date: endDate }, context);
    toolCalls.push(result.execution);

    const res = result.execution.result as any;
    return {
      reply: `For ${monthLabel}, your received income was **${res.received_income_formatted}** and net verified spending was **${res.net_spending_formatted}**. Outstanding card balance is **${res.card_outstanding_formatted}**, leaving liquid asset funds of **${res.liquid_funds_formatted}**.`,
      toolCalls
    };
  }

  // Clarification fallback
  return {
    reply: `I can help you review your finances with verified figures:
• Ask about **spending summary** or **income this month**
• Check **upcoming bills and EMIs** (deduplicated against statement bills)
• Inquire about **liquid cash & account balances**
• Search spending by merchant or category (e.g., *"How much did I spend at Cafe?"*)
• Propose a transaction (e.g., *"Record ₹180 at Starbucks from HDFC"*)
• Teach a categorisation rule (e.g., *"Remember Swiggy as Food & Dining"*)\n\nWhat would you like to inspect?`,
    toolCalls: []
  };
}

/**
 * Main Assistant Query Dispatcher
 */
export async function queryAssistant(
  userQuery: string,
  context: ToolExecutionContext,
  options: AssistantOptions = {}
): Promise<AssistantMessage> {
  const timestamp = new Date().toISOString();
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // If no API key is provided, use the high-fidelity local deterministic engine
  if (!options.apiKey) {
    // Artificial small delay for natural conversational feel
    await new Promise(res => setTimeout(res, 350));

    const localResult = handleLocalEngineQuery(userQuery, context);

    return {
      id: messageId,
      sender: 'assistant',
      text: localResult.reply,
      timestamp,
      tool_calls: localResult.toolCalls,
      action_proposal: localResult.actionProposal,
      token_estimate: Math.round((userQuery.length + localResult.reply.length) / 4) + 120,
      is_mock: true
    };
  }

  // Live Gemini API path
  const model = options.model || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${options.apiKey}`;

  // Prepare system prompt and masked context
  const systemInstruction = {
    parts: [
      {
        text: `You are the personal financial assistant for an INR personal finance tracker.
CRITICAL INVARIANTS:
1. ARITHMETIC AUTHORITY: You MUST NOT invent, guess, or calculate numbers. You must call provided tools to obtain deterministic financial figures.
2. CITATION: Present figures in Indian Rupees (₹) exactly as returned by tools.
3. ACTIONS: If the user asks to record an expense or set a category rule, call the appropriate propose tool so the user can confirm it. Never claim a record was written without proposing it.`
      }
    ]
  };

  // Mask payload to prevent leaking PII to network
  const maskedContext = maskFinancialPayload({
    accountCount: context.accounts.length,
    eventsCount: context.events.length,
    statementsCount: context.statements.length
  });

  const requestBody = {
    system_instruction: systemInstruction,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `[Context: ${JSON.stringify(maskedContext)}]\nUser Question: ${userQuery}`
          }
        ]
      }
    ],
    tools: [
      {
        function_declarations: ASSISTANT_TOOL_DECLARATIONS
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || response.statusText;

      // Handle Quota error gracefully (AC12)
      if (response.status === 429 || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        return {
          id: messageId,
          sender: 'assistant',
          text: `⚠️ **Gemini API Quota Exhausted**: The live API limit has been reached for your current key. Falling back to the deterministic local engine:\n\n${handleLocalEngineQuery(userQuery, context).reply}`,
          timestamp,
          is_mock: true
        };
      }

      // Other API errors
      return {
        id: messageId,
        sender: 'assistant',
        text: `⚠️ **Gemini API Error (${response.status})**: ${errMsg}. Tracking and charts remain fully operational. Falling back to local deterministic response:\n\n${handleLocalEngineQuery(userQuery, context).reply}`,
        timestamp,
        is_mock: true
      };
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const content = candidate?.content;

    const toolCallsExecuted: ToolCallExecution[] = [];
    let actionProposal: ActionProposal | undefined;

    // Check for function calls
    const functionCalls = content?.parts?.filter((p: any) => p.functionCall);

    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        const { name, args } = call.functionCall;
        const result = executeAssistantTool(name, args, context);
        toolCallsExecuted.push(result.execution);
        if (result.proposal) {
          actionProposal = result.proposal;
        }
      }

      // Second turn with tool results
      const toolTurnBody = {
        system_instruction: systemInstruction,
        contents: [
          {
            role: 'user',
            parts: [{ text: userQuery }]
          },
          content,
          {
            role: 'function',
            parts: toolCallsExecuted.map(tc => ({
              functionResponse: {
                name: tc.name,
                response: tc.result
              }
            }))
          }
        ]
      };

      const secondRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolTurnBody)
      });

      if (secondRes.ok) {
        const secondData = await secondRes.json();
        const secondText = secondData.candidates?.[0]?.content?.parts?.[0]?.text;
        return {
          id: messageId,
          sender: 'assistant',
          text: secondText || 'Tool executed successfully.',
          timestamp,
          tool_calls: toolCallsExecuted,
          action_proposal: actionProposal,
          token_estimate: secondData.usageMetadata?.totalTokenCount || 450,
          is_mock: false
        };
      }
    }

    const textPart = content?.parts?.find((p: any) => p.text)?.text;

    return {
      id: messageId,
      sender: 'assistant',
      text: textPart || 'I processed your request using deterministic records.',
      timestamp,
      tool_calls: toolCallsExecuted,
      action_proposal: actionProposal,
      token_estimate: data.usageMetadata?.totalTokenCount || 200,
      is_mock: false
    };
  } catch (err: any) {
    // Network failure / offline handling (AC12)
    const localFallback = handleLocalEngineQuery(userQuery, context);
    return {
      id: messageId,
      sender: 'assistant',
      text: `⚠️ **Network / API Unavailable**: Unable to connect to Google Gemini API (${err.message}). Showing verified response using local engine:\n\n${localFallback.reply}`,
      timestamp,
      tool_calls: localFallback.toolCalls,
      action_proposal: localFallback.actionProposal,
      is_mock: true
    };
  }
}
