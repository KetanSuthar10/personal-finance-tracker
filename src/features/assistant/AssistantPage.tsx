import React, { useState, useRef, useEffect } from 'react';
import { useLedger } from '../../context/LedgerContext';
import { AssistantMessage, ActionProposal, EventType } from '../../domain/types';
import { queryAssistant } from '../../domain/gemini';
import { ActionCard } from './ActionCard';
import { ToolAuditBadge } from './ToolAuditBadge';
import { RulesManagerModal } from './RulesManagerModal';
import { AssistantConfigModal } from './AssistantConfigModal';

const INITIAL_WELCOME_MESSAGE: AssistantMessage = {
  id: 'welcome',
  sender: 'assistant',
  text: `👋 Hello! I'm your **personal financial assistant**.

I can answer questions about your money with **strictly verified figures** and help you maintain your ledger:
• **"How much did I spend this month?"** — verified income vs net spending summary
• **"What bills and EMIs are due?"** — deduplicated 30-day cash commitments
• **"How much liquid cash do I have?"** — balances across bank & cash wallets
• **"Record ₹250 at Cafe from HDFC"** — draft a new transaction for your approval
• **"Remember Swiggy as Food & Dining"** — teach a categorisation rule for future imports

All arithmetic is executed by verified ledger code, and personal identifiers are masked. How can I help you today?`,
  timestamp: new Date().toISOString(),
  is_mock: true
};

const SUGGESTED_QUERIES = [
  '📊 Spending summary for October',
  '💳 What bills and EMIs are due in next 30 days?',
  '💰 How much liquid cash do I have?',
  '🔍 How much did I spend at Cafe?',
  '☕ Record ₹180 at Blue Tokai from HDFC',
  '🏷️ Remember Swiggy as Food & Dining'
];

export const AssistantPage: React.FC = () => {
  const {
    accounts,
    events,
    statements,
    emiPlans,
    categoryRules,
    executeCommand,
    addCategoryRule,
    deleteCategoryRule
  } = useLedger();

  const [messages, setMessages] = useState<AssistantMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Configuration state
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return sessionStorage.getItem('pft_gemini_key') || '';
    } catch {
      return '';
    }
  });
  const [model, setModel] = useState<string>('gemini-1.5-flash');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    try {
      sessionStorage.setItem('pft_gemini_key', key);
    } catch {
      // Ignore
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isThinking) return;

    const userMsg: AssistantMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const response = await queryAssistant(
        text,
        { accounts, events, statements, emis: emiPlans },
        { apiKey: apiKey || undefined, model }
      );
      setMessages(prev => [...prev, response]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Error Processing Request**: ${err.message || 'An unexpected error occurred.'}. Core tracking remains available.`,
          timestamp: new Date().toISOString(),
          is_mock: true
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Action proposal confirmations
  const handleConfirmEntry = async (msgId: string, entryData: NonNullable<ActionProposal['payload']['entry']>) => {
    const account = accounts.find(a => a.id === entryData.account_id) || accounts[0];

    await executeCommand({
      date: entryData.date,
      type: entryData.type as EventType,
      amount_paise: entryData.amount_paise,
      account_id: account.id,
      recipient: entryData.recipient,
      category: entryData.category || null,
      notes: entryData.notes ? `[AI Entry] ${entryData.notes}` : '[AI Entry]'
    });

    // Mark proposal accepted
    setMessages(prev =>
      prev.map(m => {
        if (m.id === msgId && m.action_proposal) {
          return {
            ...m,
            action_proposal: {
              ...m.action_proposal,
              status: 'accepted'
            }
          };
        }
        return m;
      })
    );
  };

  const handleConfirmRule = async (msgId: string, ruleData: NonNullable<ActionProposal['payload']['rule']>) => {
    await addCategoryRule({
      recipient_pattern: ruleData.recipient_pattern,
      category: ruleData.category,
      account_id: ruleData.account_id
    });

    // Mark proposal accepted
    setMessages(prev =>
      prev.map(m => {
        if (m.id === msgId && m.action_proposal) {
          return {
            ...m,
            action_proposal: {
              ...m.action_proposal,
              status: 'accepted'
            }
          };
        }
        return m;
      })
    );
  };

  const handleDismissProposal = (msgId: string) => {
    setMessages(prev =>
      prev.map(m => {
        if (m.id === msgId && m.action_proposal) {
          return {
            ...m,
            action_proposal: {
              ...m.action_proposal,
              status: 'dismissed'
            }
          };
        }
        return m;
      })
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto px-4 py-2">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>✨</span> Gemini Financial Assistant
          </h1>
          <p className="text-xs text-slate-400">
            Deterministic arithmetic · Identifier privacy masking · Explicit rule learning
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Active Mode Pill */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            {apiKey ? (
              <>
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="text-indigo-400 font-medium">Prototype Key (Preview)</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span className="text-amber-400 font-medium">Local Engine (Offline)</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsRulesOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>🏷️</span> Rules ({categoryRules.length})
          </button>

          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 border border-indigo-500/30 transition-colors flex items-center gap-1.5"
          >
            <span>⚙️</span> Config
          </button>
        </div>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="mt-2 py-1.5 px-3 rounded-lg bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="text-emerald-400">🛡️ Invariant:</span>
          <span>Numbers derive from verified ledger code. Account and card identifiers are masked before AI dispatch.</span>
        </div>
        <span className="text-slate-500 hidden sm:inline">AC11 & AC12 compliant</span>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto my-3 pr-2 space-y-4">
        {messages.map(msg => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-md ${
                  isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                    : 'bg-slate-900/90 border border-slate-800/90 text-slate-200 rounded-tl-none'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between gap-4 mb-1 text-[11px] opacity-75">
                  <span className="font-semibold">
                    {isUser ? 'You' : msg.is_mock ? 'Assistant (Local Deterministic)' : 'Assistant (Gemini)'}
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Message Text */}
                <div className="whitespace-pre-wrap leading-relaxed font-sans text-[13px] sm:text-sm">
                  {msg.text}
                </div>

                {/* Tool Calls Execution Proof */}
                {msg.tool_calls && msg.tool_calls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">
                      Deterministic Execution Proof:
                    </div>
                    {msg.tool_calls.map((tc, idx) => (
                      <ToolAuditBadge key={idx} toolCall={tc} />
                    ))}
                  </div>
                )}

                {/* Interactive Action Proposal Card */}
                {msg.action_proposal && (
                  <ActionCard
                    proposal={msg.action_proposal}
                    onConfirmEntry={entry => handleConfirmEntry(msg.id, entry)}
                    onConfirmRule={rule => handleConfirmRule(msg.id, rule)}
                    onDismiss={() => handleDismissProposal(msg.id)}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isThinking && (
          <div className="flex items-start space-x-2">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-slate-400 flex items-center space-x-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-xs">Computing deterministic figures & querying assistant...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Query Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 mb-2 no-scrollbar">
        <span className="text-[11px] text-slate-500 whitespace-nowrap">Suggested:</span>
        {SUGGESTED_QUERIES.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(q)}
            className="px-2.5 py-1 text-xs rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 whitespace-nowrap transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or enter transaction (e.g. 'What is due before salary?' or 'Record ₹150 for coffee')..."
          disabled={isThinking}
          className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-4 pr-24 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
        />
        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={!input.trim() || isThinking}
          className="absolute right-2 px-4 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition-all shadow-md shadow-indigo-900/40"
        >
          {isThinking ? 'Thinking...' : 'Send ➔'}
        </button>
      </div>

      {/* Modals */}
      <RulesManagerModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        rules={categoryRules}
        onAddRule={async rule => {
          await addCategoryRule(rule);
        }}
        onDeleteRule={async id => {
          await deleteCategoryRule(id);
        }}
      />

      <AssistantConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        model={model}
        onSaveModel={setModel}
      />
    </div>
  );
};
