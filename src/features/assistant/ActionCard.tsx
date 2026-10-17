import React from 'react';
import { ActionProposal } from '../../domain/types';
import { formatRupees } from '../../domain/money';

interface ActionCardProps {
  proposal: ActionProposal;
  onConfirmEntry?: (entry: NonNullable<ActionProposal['payload']['entry']>) => Promise<void>;
  onConfirmRule?: (rule: NonNullable<ActionProposal['payload']['rule']>) => Promise<void>;
  onDismiss?: () => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  proposal,
  onConfirmEntry,
  onConfirmRule,
  onDismiss
}) => {
  const isAccepted = proposal.status === 'accepted';
  const isDismissed = proposal.status === 'dismissed';

  if (proposal.type === 'create_entry' && proposal.payload.entry) {
    const entry = proposal.payload.entry;
    return (
      <div className="mt-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-slate-200">
        <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              Draft Entry Proposal
            </span>
            <span className="text-xs text-slate-400">Requires your approval</span>
          </div>
          {isAccepted && (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              ✓ Added to Ledger
            </span>
          )}
          {isDismissed && (
            <span className="text-xs text-slate-500 font-medium">
              Dismissed
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 my-3 text-sm">
          <div>
            <span className="text-xs text-slate-400 block">Recipient</span>
            <span className="font-semibold text-white">{entry.recipient}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Amount</span>
            <span className="font-bold text-emerald-400">{formatRupees(entry.amount_paise)}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Date</span>
            <span className="text-slate-300">{entry.date}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Category</span>
            <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300">
              {entry.category || 'General'}
            </span>
          </div>
        </div>

        {entry.notes && (
          <div className="text-xs text-slate-400 mb-3 bg-slate-900/60 p-2 rounded">
            <span className="font-medium text-slate-300">Memo: </span>
            {entry.notes}
          </div>
        )}

        {!isAccepted && !isDismissed && (
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-emerald-500/20">
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Dismiss
              </button>
            )}
            {onConfirmEntry && (
              <button
                type="button"
                onClick={() => onConfirmEntry(entry)}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900/50 transition-all flex items-center gap-1.5"
              >
                ✓ Confirm & Add to Ledger
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (proposal.type === 'create_rule' && proposal.payload.rule) {
    const rule = proposal.payload.rule;
    return (
      <div className="mt-3 p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-slate-200">
        <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              Categorisation Rule Proposal
            </span>
            <span className="text-xs text-slate-400">Future Auto-Matching</span>
          </div>
          {isAccepted && (
            <span className="text-xs text-indigo-400 font-medium flex items-center gap-1">
              ✓ Rule Saved
            </span>
          )}
          {isDismissed && (
            <span className="text-xs text-slate-500 font-medium">
              Dismissed
            </span>
          )}
        </div>

        <div className="my-3 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">If merchant contains:</span>
            <span className="font-semibold text-white px-2 py-0.5 rounded bg-slate-800">
              "{rule.recipient_pattern}"
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Auto-assign category:</span>
            <span className="font-semibold text-indigo-300 px-2 py-0.5 rounded bg-indigo-900/50">
              {rule.category}
            </span>
          </div>
        </div>

        {!isAccepted && !isDismissed && (
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-indigo-500/20">
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Dismiss
              </button>
            )}
            {onConfirmRule && (
              <button
                type="button"
                onClick={() => onConfirmRule(rule)}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-900/50 transition-all flex items-center gap-1.5"
              >
                ✓ Save Categorisation Rule
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
};
