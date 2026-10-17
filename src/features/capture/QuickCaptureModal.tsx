import React, { useState } from 'react';
import { Account, EventType } from '../../domain/types';
import { ReceiptCaptureTab } from './ReceiptCaptureTab';
import { VoiceCaptureTab } from './VoiceCaptureTab';
import { parseVoiceTranscript } from '../../domain/voice';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onAddEvent: (eventData: {
    date: string;
    type: EventType;
    recipient: string;
    category: string | null;
    income_paise: number;
    spending_paise: number;
    postings: { account_id: string; delta_paise: number }[];
    notes?: string;
  }) => Promise<any>;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onAddEvent
}) => {
  const [activeTab, setActiveTab] = useState<'receipt' | 'voice' | 'quickText'>('receipt');
  const [quickTextInput, setQuickTextInput] = useState('');
  const [quickTextError, setQuickTextError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveStandardEntry = async (entry: {
    type: EventType;
    amount_paise: number;
    date: string;
    account_id: string;
    recipient: string;
    category: string;
    notes?: string;
  }) => {
    const isSpending = entry.type === 'purchase' || entry.type === 'fee';
    const isIncome = entry.type === 'income';

    await onAddEvent({
      date: entry.date,
      type: entry.type,
      recipient: entry.recipient,
      category: entry.category || null,
      income_paise: isIncome ? entry.amount_paise : 0,
      spending_paise: isSpending ? entry.amount_paise : 0,
      postings: [
        {
          account_id: entry.account_id,
          delta_paise: isSpending ? -entry.amount_paise : entry.amount_paise
        }
      ],
      notes: entry.notes
    });
  };

  const handleQuickTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTextInput.trim()) return;

    try {
      const parsed = parseVoiceTranscript(quickTextInput.trim());
      if (!parsed.amount_paise) {
        setQuickTextError('Could not find an amount in your input. Try "120 cafe, UPI" or "₹250 coffee".');
        return;
      }

      const account = accounts.find(a => a.type === 'bank') || accounts[0];
      await handleSaveStandardEntry({
        type: parsed.type,
        amount_paise: parsed.amount_paise,
        date: parsed.date,
        account_id: account.id,
        recipient: parsed.recipient || 'Quick Entry',
        category: parsed.category,
        notes: `[Quick Entry] ${quickTextInput.trim()}`
      });

      setQuickTextInput('');
      onClose();
    } catch (err: any) {
      setQuickTextError(err.message || 'Error parsing text');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚡</span> Multi-Mode Daily Capture
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              OCR screenshot extraction, audio voice notes, and rapid text input
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={() => setActiveTab('receipt')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'receipt'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📸</span> Screenshot & Receipt OCR
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'voice'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🎙️</span> Voice & Audio Notes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quickText')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'quickText'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚡</span> Fast Text Entry
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {activeTab === 'receipt' && (
            <ReceiptCaptureTab
              accounts={accounts}
              onSaveEntry={handleSaveStandardEntry}
              onClose={onClose}
            />
          )}

          {activeTab === 'voice' && (
            <VoiceCaptureTab
              accounts={accounts}
              onSaveEntry={handleSaveStandardEntry}
              onClose={onClose}
            />
          )}

          {activeTab === 'quickText' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="font-semibold text-indigo-400 block">Fast Natural Input</span>
                <p className="text-slate-400">
                  Type a quick shorthand like <code className="bg-slate-900 px-1 py-0.5 rounded text-white">120 cafe, UPI</code> or <code className="bg-slate-900 px-1 py-0.5 rounded text-white">Spent 450 on groceries at Blinkit</code>.
                </p>
              </div>

              {quickTextError && (
                <div className="text-xs text-rose-400 bg-rose-950/30 p-2.5 rounded-lg border border-rose-500/20">
                  {quickTextError}
                </div>
              )}

              <form onSubmit={handleQuickTextSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="e.g. 120 cafe, UPI"
                  value={quickTextInput}
                  onChange={e => {
                    setQuickTextInput(e.target.value);
                    setQuickTextError(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
                  autoFocus
                />

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!quickTextInput.trim()}
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-md shadow-indigo-900/40 transition-all"
                  >
                    ✓ Parse & Add to Ledger
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
