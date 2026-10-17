import React, { useState } from 'react';

interface AssistantConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  model: string;
  onSaveModel: (model: string) => void;
}

export const AssistantConfigModal: React.FC<AssistantConfigModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  model,
  onSaveModel
}) => {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [selectedModel, setSelectedModel] = useState(model);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(keyInput.trim());
    onSaveModel(selectedModel);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleClearKey = () => {
    setKeyInput('');
    onSaveApiKey('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚙️</span> Gemini Assistant & Privacy Config
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Control API connection, model choice, and privacy masking
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
        <div className="p-5 space-y-4 text-sm">
          {/* Privacy & Invariant Notice */}
          <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200/90 space-y-1.5">
            <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
              <span>🛡️</span> Data Privacy & Arithmetic Integrity Guarantees
            </div>
            <p className="text-[11px] leading-relaxed text-indigo-200/80">
              1. <strong>Identifier Masking</strong>: Bank account numbers, card suffixes, and tax IDs are masked before any network request.
            </p>
            <p className="text-[11px] leading-relaxed text-indigo-200/80">
              2. <strong>Arithmetic Authority</strong>: Gemini is strictly an explanatory layer. All numbers, sums, and commitments are derived by verified deterministic ledger code.
            </p>
            <p className="text-[11px] leading-relaxed text-indigo-200/80">
              3. <strong>Prototype Isolation</strong>: Without an API key, the app runs entirely in high-fidelity local deterministic mode with 0 network calls.
            </p>
          </div>

          {/* Model selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Gemini Model
            </label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended - Fast & Function Calling)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Preview)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (In-depth Analysis)</option>
            </select>
          </div>

          {/* API Key input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Gemini API Key (Optional)
              </label>
              {keyInput && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  Clear Key
                </button>
              )}
            </div>
            <input
              type="password"
              placeholder="Leave empty for Local Deterministic Mode"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Keys are stored only in volatile session memory. Never paste production credentials in public fixtures.
            </p>
          </div>

          {/* Active status indicator */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Current Mode:</span>
            {keyInput ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected Live Gemini ({selectedModel})
              </span>
            ) : (
              <span className="text-amber-400 font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Local Deterministic Engine (Offline / Synthetic)
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs text-emerald-400">
            {savedSuccess ? '✓ Settings saved!' : ''}
          </span>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-900/30"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
