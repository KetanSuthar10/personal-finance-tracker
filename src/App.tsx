import React, { useState } from 'react';
import { LedgerProvider } from './context/LedgerContext';
import { Shell } from './components/layout/Shell';
import { TabId } from './components/layout/Sidebar';
import { OverviewPage } from './features/overview/OverviewPage';
import { AccountsPage } from './features/accounts/AccountsPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import { AddEntryModal } from './features/entry/AddEntryModal';
import { ImportsPage } from './features/imports/ImportsPage';
import { CommitmentsPlaceholder } from './features/placeholders/CommitmentsPlaceholder';
import { AssistantPlaceholder } from './features/placeholders/AssistantPlaceholder';
import { SettingsPlaceholder } from './features/placeholders/SettingsPlaceholder';
import { FinancialEvent } from './domain/types';

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabId>('overview');
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
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
      {currentTab === 'commitments' && <CommitmentsPlaceholder />}
      {currentTab === 'assistant' && <AssistantPlaceholder />}
      {currentTab === 'settings' && <SettingsPlaceholder />}

      <AddEntryModal
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
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
