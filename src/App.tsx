import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LedgerProvider, useLedger } from './context/LedgerContext';
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
import { AuthPage } from './features/auth/AuthPage';
import { AccessDeniedPage } from './features/auth/AccessDeniedPage';
import { Loader2, ShieldCheck } from 'lucide-react';

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
          onNavigateToAccounts={() => setCurrentTab('accounts')}
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

export const ProtectedApp: React.FC = () => {
  const { user, isLoading, ownerStatus } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-2">
          <ShieldCheck className="w-6 h-6 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          <span className="text-sm font-medium text-slate-300">Checking persistent session...</span>
        </div>
      </div>
    );
  }

  // Not signed in: render AuthPage
  if (!user) {
    return <AuthPage />;
  }

  // Signed in, but not the authorized owner (acceptance test AT13)
  if (ownerStatus?.ownerConfigured && !ownerStatus?.isOwner) {
    return <AccessDeniedPage />;
  }

  // Authorized owner: render the full application
  return (
    <LedgerProvider>
      <AppContent />
    </LedgerProvider>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProtectedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
