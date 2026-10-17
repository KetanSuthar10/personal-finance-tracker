import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Account, FinancialEvent, PeriodSummary, ImportBatch } from '../domain/types';
import { LocalLedgerRepository } from '../data/localRepository';
import { DEMO_FIXTURE } from '../data/demoFixture';

interface LedgerContextType {
  accounts: Account[];
  events: FinancialEvent[];
  batches: ImportBatch[];
  summary: PeriodSummary | null;
  period: { from: string; through: string };
  setPeriod: (period: { from: string; through: string }) => void;
  isLoading: boolean;
  addEvent: (eventData: Omit<FinancialEvent, 'id'>) => Promise<FinancialEvent>;
  updateEvent: (id: string, updates: Partial<FinancialEvent>) => Promise<FinancialEvent>;
  deleteEvent: (id: string) => Promise<boolean>;
  commitImportBatch: (batch: ImportBatch, newEvents: FinancialEvent[], updatedEvents: FinancialEvent[]) => Promise<void>;
  undoImportBatch: (batchId: string) => Promise<boolean>;
  resetToDemo: () => Promise<void>;
  refresh: () => Promise<void>;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repository = useMemo(() => new LocalLedgerRepository(), []);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [period, setPeriod] = useState<{ from: string; through: string }>({
    from: DEMO_FIXTURE.period.from,
    through: DEMO_FIXTURE.period.through,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [accs, evts, sum, bts] = await Promise.all([
        repository.getAccounts(),
        repository.getEvents(),
        repository.getSummary(period.from, period.through),
        repository.getImportBatches(),
      ]);
      setAccounts(accs);
      setEvents(evts);
      setSummary(sum);
      setBatches(bts);
    } finally {
      setIsLoading(false);
    }
  }, [repository, period.from, period.through]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addEvent = async (eventData: Omit<FinancialEvent, 'id'>) => {
    const created = await repository.addEvent(eventData);
    await loadData();
    return created;
  };

  const updateEvent = async (id: string, updates: Partial<FinancialEvent>) => {
    const updated = await repository.updateEvent(id, updates);
    await loadData();
    return updated;
  };

  const deleteEvent = async (id: string) => {
    const deleted = await repository.deleteEvent(id);
    await loadData();
    return deleted;
  };

  const commitImportBatch = async (
    batch: ImportBatch,
    newEvents: FinancialEvent[],
    updatedEvents: FinancialEvent[]
  ) => {
    await repository.commitImportBatch(batch, newEvents, updatedEvents);
    await loadData();
  };

  const undoImportBatch = async (batchId: string) => {
    const success = await repository.undoImportBatch(batchId);
    if (success) {
      await loadData();
    }
    return success;
  };

  const resetToDemo = async () => {
    setIsLoading(true);
    await repository.resetToDemo();
    setPeriod({
      from: DEMO_FIXTURE.period.from,
      through: DEMO_FIXTURE.period.through,
    });
    await loadData();
  };

  return (
    <LedgerContext.Provider
      value={{
        accounts,
        events,
        batches,
        summary,
        period,
        setPeriod,
        isLoading,
        addEvent,
        updateEvent,
        deleteEvent,
        commitImportBatch,
        undoImportBatch,
        resetToDemo,
        refresh: loadData,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

export function useLedger(): LedgerContextType {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
}
