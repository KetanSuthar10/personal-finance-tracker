import React, { useState } from 'react';
import { LedgerProvider } from './context/LedgerContext';
import { Shell } from './components/layout/Shell';
import { TabId } from './components/layout/Sidebar';
import { OverviewPage } from './features/overview/OverviewPage';
import { AccountsPage } from './features/accounts/AccountsPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import { AddEntryModal } from './features/entry/AddEntryModal';
import { ImportsPage } from './features/imports/ImportsPage';
import { CommitmentsPage } from './features/commitments/CommitmentsPage';
import { AssistantPage } from './features/assistant/AssistantPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { FinancialEvent } from './domain/types';

import { QuickCaptureModal } from './features/capture/QuickCaptureModal';
import { useLedger } from './context/LedgerContext';

export const AppContent: React.FC = () => {
  const { accounts, addEvent } = useLedger();
  const [currentTab, setCurrentTab] = useState<TabId>('overview');
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<FinancialEvent | null>(null);

  const handleSelectEvent = (event: FinancialEvent | null) => {
    setSelectedEvent(event);
  };

  const handleNavigateToTransactions = () => {
    setCurrentTab('transactions');
  };

  return (
    <Shell
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      onOpenAddEntry={() => setIsAddEntryOpen(true)}
      onOpenCapture={() => setIsCaptureOpen(true)}
    >
      {currentTab === 'overview' && (
        <OverviewPage
          onNavigateToTransactions={handleNavigateToTransactions}
          onSelectEvent={handleSelectEvent}
        />
      )}

      {currentTab === 'accounts' && <AccountsPage />}

      {currentTab === 'transactions' && (
        <TransactionsPage
          onOpenAddEntry={() => setIsAddEntryOpen(true)}
          selectedEvent={selectedEvent}
          onSelectEvent={handleSelectEvent}
        />
      )}

      {currentTab === 'imports' && <ImportsPage />}
      {currentTab === 'commitments' && <CommitmentsPage />}
      {currentTab === 'assistant' && <AssistantPage />}
      {currentTab === 'settings' && <SettingsPage />}

      <AddEntryModal
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
      />

      <QuickCaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        accounts={accounts}
        onAddEvent={addEvent}
      />
    </Shell>
  );
};

export function App() {
  return (
    <LedgerProvider>
      <AppContent />
    </LedgerProvider>
  );
}

export default App;
