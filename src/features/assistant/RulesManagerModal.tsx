import React, { useState } from 'react';
import { CategoryRule } from '../../domain/types';

interface RulesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: CategoryRule[];
  onAddRule: (rule: { recipient_pattern: string; category: string; account_id?: string }) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
}

export const RulesManagerModal: React.FC<RulesManagerModalProps> = ({
  isOpen,
  onClose,
  rules,
  onAddRule,
  onDeleteRule
}) => {
  const [pattern, setPattern] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern.trim() || !category.trim()) {
      setError('Please enter both a merchant pattern and a category.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onAddRule({
        recipient_pattern: pattern.trim(),
        category: category.trim()
      });
      setPattern('');
      setCategory('');
    } catch (err: any) {
      setError(err.message || 'Failed to save rule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🏷️</span> Categorisation Rules & Learning
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Rules automatically categorize future statement imports and daily entries.
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

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Add New Rule Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Add New Mapping Rule
            </h4>

            {error && (
              <div className="text-xs text-rose-400 bg-rose-950/30 p-2 rounded border border-rose-500/20">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Merchant Pattern (contains)</label>
                <input
                  type="text"
                  placeholder="e.g. Swiggy, Netflix, Uber"
                  value={pattern}
                  onChange={e => setPattern(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Category to Assign</label>
                <input
                  type="text"
                  placeholder="e.g. Food & Dining, Travel"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting || !pattern.trim() || !category.trim()}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all"
              >
                {isSubmitting ? 'Saving...' : '+ Add Rule'}
              </button>
            </div>
          </form>

          {/* Active Rules List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Rules ({rules.length})
              </h4>
              <span className="text-[11px] text-slate-500">Longer patterns match first</span>
            </div>

            {rules.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                No custom categorisation rules saved yet.
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between text-sm hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-400 text-xs">Contains:</span>
                        <span className="font-semibold text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 font-mono text-xs">
                          "{rule.recipient_pattern}"
                        </span>
                      </div>
                      <span className="text-slate-600">→</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/20 text-xs font-medium">
                        {rule.category}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteRule(rule.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors text-xs"
                      title="Delete rule"
                    >
                      Delete ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
