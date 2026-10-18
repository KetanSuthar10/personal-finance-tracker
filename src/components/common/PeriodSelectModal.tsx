import React, { useState } from 'react';
import { Calendar, Check, AlertCircle } from 'lucide-react';
import { isValidDateString } from '../../domain/dates';

interface PeriodSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPeriod: { from: string; through: string };
  onApplyPeriod: (period: { from: string; through: string }) => void;
}

const PRESETS = [
  {
    label: 'October 2026 (Full Month)',
    description: 'All baseline October events (Salary, Daily expenses, Card payments)',
    from: '2026-10-01',
    through: '2026-10-31',
  },
  {
    label: '5–31 October 2026 (Slice)',
    description: 'AT01 fixture slice carrying earlier postings into opening position',
    from: '2026-10-05',
    through: '2026-10-31',
  },
  {
    label: 'November 2026',
    description: 'Upcoming calendar month',
    from: '2026-11-01',
    through: '2026-11-30',
  },
  {
    label: 'Q4 2026 Horizon (Oct–Dec)',
    description: '3-month forward planning horizon',
    from: '2026-10-01',
    through: '2026-12-31',
  },
];

export const PeriodSelectModal: React.FC<PeriodSelectModalProps> = ({
  isOpen,
  onClose,
  currentPeriod,
  onApplyPeriod,
}) => {
  const [fromDate, setFromDate] = useState(currentPeriod.from);
  const [throughDate, setThroughDate] = useState(currentPeriod.through);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (from: string, through: string) => {
    onApplyPeriod({ from, through });
    onClose();
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidDateString(fromDate)) {
      setError(`Invalid From Date: "${fromDate}". Must be a valid real calendar date.`);
      return;
    }
    if (!isValidDateString(throughDate)) {
      setError(`Invalid Through Date: "${throughDate}". Must be a valid real calendar date.`);
      return;
    }
    if (fromDate > throughDate) {
      setError('From Date must be on or before Through Date.');
      return;
    }

    onApplyPeriod({ from: fromDate, through: throughDate });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Select Accounting Period</h3>
              <p className="text-xs text-slate-500">Asia/Kolkata Calendar convention</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Period Presets
            </label>
            <div className="space-y-1.5">
              {PRESETS.map((preset, idx) => {
                const isSelected =
                  currentPeriod.from === preset.from && currentPeriod.through === preset.through;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset.from, preset.through)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                        <span>{preset.label}</span>
                        <span className="text-[11px] font-mono text-slate-500 font-normal">
                          ({preset.from} to {preset.through})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{preset.description}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Range */}
          <form onSubmit={handleApplyCustom} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <span className="text-xs font-semibold text-slate-700 block">
              Custom Date Range
            </span>

            {error && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">From Date</label>
                <input
                  type="date"
                  required
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Through Date</label>
                <input
                  type="date"
                  required
                  value={throughDate}
                  onChange={(e) => setThroughDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                Apply Custom Range
              </button>
            </div>
          </form>

          {/* Invariant Explanation */}
          <div className="p-3 rounded-xl bg-slate-100 text-[11px] text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800 block">Financial Invariant:</span>
            <p className="leading-relaxed">
              Transactions prior to <strong>From Date</strong> carry forward into the Opening Balance.
              Transactions beyond <strong>Through Date</strong> remain outside the period.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
