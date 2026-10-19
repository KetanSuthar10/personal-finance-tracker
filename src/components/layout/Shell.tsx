import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar, TabId } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Modal } from '../ui/Modal';
import { FileSpreadsheet, CreditCard, Bot, Settings, AlertTriangle, RefreshCw } from 'lucide-react';
import { OfflineBanner } from '../common/OfflineBanner';
import { useLedger } from '../../context/LedgerContext';

export interface ShellProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onOpenAddEntry: () => void;
  onOpenCapture?: () => void;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddEntry,
  onOpenCapture,
  children,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  let persistenceError: string | null = null;
  let clearPersistenceError = () => {};
  let refresh = async () => {};

  try {
    const ledger = useLedger();
    persistenceError = ledger.persistenceError;
    clearPersistenceError = ledger.clearPersistenceError;
    refresh = ledger.refresh;
  } catch {
    // Graceful fallback if Shell rendered outside LedgerProvider
  }

  const moreItems = [
    { id: 'imports' as TabId, label: 'Statements & Imports', icon: FileSpreadsheet, milestone: 'M2' as const },
    { id: 'commitments' as TabId, label: 'Cards & EMIs', icon: CreditCard, milestone: 'M4' as const },
    { id: 'assistant' as TabId, label: 'Gemini Assistant', icon: Bot, milestone: 'M5' as const },
    { id: 'settings' as TabId, label: 'Settings & Sync', icon: Settings, milestone: 'M3' as const },
  ];

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      <OfflineBanner />
      {persistenceError && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2 flex items-center justify-between gap-3 shadow-md z-50 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Persistence Error:</strong> {persistenceError}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => refresh()}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded text-[11px] font-medium transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry Sync
            </button>
            <button
              onClick={clearPersistenceError}
              className="p-1 hover:bg-rose-700/60 rounded text-rose-200 hover:text-white transition-colors"
              title="Dismiss warning"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <Header onOpenAddEntry={onOpenAddEntry} onOpenCapture={onOpenCapture} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentTab={currentTab} onSelectTab={onSelectTab} />

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-8 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      <MobileNav
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        onOpenMore={() => setIsMoreOpen(true)}
      />

      {/* Mobile "More" Drawer */}
      <Modal
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        title="More Sections"
        description="Navigate to specialized financial views and settings"
      >
        <div className="flex flex-col gap-2 pt-2">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setIsMoreOpen(false);
                }}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-indigo-300 bg-indigo-50/70 text-indigo-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-slate-500">
                      {item.id === 'imports'
                        ? 'Statements & Imports'
                        : item.id === 'commitments'
                        ? 'Credit Cards & EMIs'
                        : item.id === 'assistant'
                        ? 'AI Financial Assistant'
                        : 'Preferences & Cloud Sync'}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};
