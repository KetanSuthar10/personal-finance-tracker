import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Account,
  FinancialEvent,
  PeriodSummary,
  ImportBatch,
  CardStatement,
  EmiPlan,
  CashPlanningConfig,
  CashPlanningSummary,
  CategoryRule,
  CreateAccountData,
} from '../domain/types';
import { LocalLedgerRepository } from '../data/localRepository';
import { SupabaseLedgerRepository } from '../data/supabaseRepository';
import { DEMO_FIXTURE } from '../data/demoFixture';
import { calculateCashPlanning } from '../domain/cards';
import { CreateFinancialEntryCommand, validateFinancialCommand } from '../domain/commandService';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { getMonthPeriod } from '../domain/dates';

interface LedgerContextType {
  accounts: Account[];
  events: FinancialEvent[];
  batches: ImportBatch[];
  statements: CardStatement[];
  emiPlans: EmiPlan[];
  categoryRules: CategoryRule[];
  planningConfig: CashPlanningConfig;
  planningSummary: CashPlanningSummary | null;
  summary: PeriodSummary | null;
  period: { from: string; through: string };
  setPeriod: (period: { from: string; through: string }) => void;
  isLoading: boolean;
  persistenceError: string | null;
  clearPersistenceError: () => void;
  addAccount: (accountData: CreateAccountData) => Promise<Account>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<Account>;
  addEvent: (eventData: Omit<FinancialEvent, 'id'>) => Promise<FinancialEvent>;
  executeCommand: (cmd: CreateFinancialEntryCommand) => Promise<FinancialEvent>;
  updateEvent: (id: string, updates: Partial<FinancialEvent>) => Promise<FinancialEvent>;
  deleteEvent: (id: string) => Promise<boolean>;
  commitImportBatch: (batch: ImportBatch, newEvents: FinancialEvent[], updatedEvents: FinancialEvent[]) => Promise<void>;
  undoImportBatch: (batchId: string) => Promise<boolean>;
  addEmiPlan: (emi: Omit<EmiPlan, 'id'>) => Promise<EmiPlan>;
  updatePlanningConfig: (config: Partial<CashPlanningConfig>) => Promise<void>;
  addCategoryRule: (rule: Omit<CategoryRule, 'id' | 'created_at' | 'match_count'>) => Promise<CategoryRule>;
  deleteCategoryRule: (id: string) => Promise<boolean>;
  exportBackup: () => Promise<string>;
  restoreBackup: (jsonString: string) => Promise<{ success: boolean; eventCount: number; accountCount: number }>;
  resetToDemo: () => Promise<void>;
  refresh: () => Promise<void>;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  // Use SupabaseLedgerRepository for authenticated connected mode; fallback to LocalLedgerRepository only for test/offline
  const repository = useMemo(() => {
    if (user && isSupabaseConfigured) {
      return new SupabaseLedgerRepository();
    }
    return new LocalLedgerRepository();
  }, [user]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [statements, setStatements] = useState<CardStatement[]>([]);
  const [emiPlans, setEmiPlans] = useState<EmiPlan[]>([]);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [planningConfig, setPlanningConfig] = useState<CashPlanningConfig>({
    horizon_days: 30,
    emergency_buffer_paise: 200000,
  });
  const [summary, setSummary] = useState<PeriodSummary | null>(null);

  const initialPeriod = useMemo(() => {
    if (user && isSupabaseConfigured) {
      const now = new Date();
      return getMonthPeriod(now.getFullYear(), now.getMonth() + 1);
    }
    return {
      from: DEMO_FIXTURE.period.from,
      through: DEMO_FIXTURE.period.through,
    };
  }, [user]);

  const [period, setPeriod] = useState<{ from: string; through: string }>(initialPeriod);
  const [isLoading, setIsLoading] = useState(true);

  const clearPersistenceError = () => setPersistenceError(null);

  const loadData = useCallback(async () => {
    try {
      setPersistenceError(null);
      const [accs, evts, sum, bts, stmts, emis, planCfg, rules] = await Promise.all([
        repository.getAccounts(),
        repository.getEvents(),
        repository.getSummary(period.from, period.through),
        repository.getImportBatches(),
        repository.getCardStatements(),
        repository.getEmiPlans(),
        repository.getPlanningConfig(),
        repository.getCategoryRules(),
      ]);
      setAccounts(accs);
      setEvents(evts);
      setSummary(sum);
      setBatches(bts);
      setStatements(stmts);
      setEmiPlans(emis);
      setPlanningConfig(planCfg);
      setCategoryRules(rules);
    } catch (err: any) {
      console.error('Ledger data load error:', err);
      setPersistenceError(err.message || 'Failed to load ledger data');
    } finally {
      setIsLoading(false);
    }
  }, [repository, period.from, period.through]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cross-device sync on window focus (AT14)
  useEffect(() => {
    const handleFocus = () => {
      loadData();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [loadData]);

  const planningSummary = useMemo(() => {
    if (!summary) return null;
    return calculateCashPlanning(
      summary.liquid_funds_paise,
      statements,
      emiPlans,
      events,
      planningConfig,
      period.through
    );
  }, [summary, statements, emiPlans, events, planningConfig, period.through]);

  const addAccount = async (accountData: CreateAccountData) => {
    try {
      setPersistenceError(null);
      const created = await repository.addAccount(accountData);
      await loadData();
      return created;
    } catch (err: any) {
      setPersistenceError(err.message || 'Failed to create account');
      throw err;
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      setPersistenceError(null);
      const updated = await repository.updateAccount(id, updates);
      await loadData();
      return updated;
    } catch (err: any) {
      setPersistenceError(err.message || 'Failed to update account');
      throw err;
    }
  };

  const executeCommand = async (cmd: CreateFinancialEntryCommand) => {
    try {
      setPersistenceError(null);
      const result = validateFinancialCommand(cmd, accounts);
      if (!result.isValid || !result.builtEvent) {
        throw new Error(result.errors.join(' '));
      }
      const created = await repository.addEvent(result.builtEvent);
      await loadData();
      return created;
    } catch (err: any) {
      setPersistenceError(err.message || 'Failed to execute financial command');
      throw err;
    }
  };

  const addEvent = async (eventData: Omit<FinancialEvent, 'id'>) => {
    try {
      setPersistenceError(null);
      if (!Number.isSafeInteger(eventData.income_paise) || !Number.isSafeInteger(eventData.spending_paise)) {
        throw new Error('Income and spending paise must be finite safe integers.');
      }
      const created = await repository.addEvent(eventData);
      await loadData();
      return created;
    } catch (err: any) {
      setPersistenceError(err.message || 'Failed to add event');
      throw err;
    }
  };

  const updateEvent = async (id: string, updates: Partial<FinancialEvent>) => {
    try {
      setPersistenceError(null);
      const updated = await repository.updateEvent(id, updates);
      await loadData();
      return updated;
    } catch (err: any) {
      setPersistenceError(err.message || 'Failed to update event');
      throw err;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      setPersistenceError(null);
      const deleted = await repository.deleteEvent(id);
      await loadData();
      return deleted;
    } catch (err: any) {
      setPersistenceError(err.message || 'Failed to delete event');
      throw err;
    }
  };

  const commitImportBatch = async (
    batch: ImportBatch,
    newEvents: FinancialEvent[],
    updatedEvents: FinancialEvent[]
  ) => {
    try {
      setPersistenceError(null);
      await repository.commitImportBatch(batch, newEvents, updatedEvents);
      await loadData();
    } catch (err: any) {
      setPersistenceError(err.message || 'Failed to commit import batch');
      throw err;
    }
  };

  const undoImportBatch = async (batchId: string) => {
    try {
      setPersistenceError(null);
      const success = await repository.undoImportBatch(batchId);
      await loadData();
      return success;
    } catch (err: any) {
      setPersistenceError(err.message || 'Failed to undo import batch');
      throw err;
    }
  };

  const addEmiPlan = async (emi: Omit<EmiPlan, 'id'>) => {
    try {
      setPersistenceError(null);
      const created = await repository.addEmiPlan(emi);
      await loadData();
      return created;
    } catch (err: any) {
      setPersistenceError(err.message || 'Failed to add EMI plan');
      throw err;
    }
  };

  const updatePlanningConfig = async (config: Partial<CashPlanningConfig>) => {
    try {
      setPersistenceError(null);
      const updated = await repository.updatePlanningConfig(config);
      setPlanningConfig(updated);
      await loadData();
    } catch (err: any) {
      setPersistenceError(err.message || 'Failed to update planning config');
      throw err;
    }
  };

  const addCategoryRule = async (rule: Omit<CategoryRule, 'id' | 'created_at' | 'match_count'>) => {
    try {
      setPersistenceError(null);
      const created = await repository.addCategoryRule(rule);
      await loadData();
      return created;
    } catch (err: any) {
      setPersistenceError(err.message || 'Failed to add category rule');
      throw err;
    }
  };

  const deleteCategoryRule = async (id: string) => {
    try {
      setPersistenceError(null);
      const deleted = await repository.deleteCategoryRule(id);
      await loadData();
      return deleted;
    } catch (err: any) {
      setPersistenceError(err.message || 'Failed to delete category rule');
      throw err;
    }
  };

  const exportBackup = async () => {
    return repository.exportBackup();
  };

  const restoreBackup = async (jsonString: string) => {
    try {
      setPersistenceError(null);
      const res = await repository.restoreBackup(jsonString);
      await loadData();
      return res;
    } catch (err: any) {
      setPersistenceError(err.message || 'Failed to restore backup');
      throw err;
    }
  };

  const resetToDemo = async () => {
    try {
      setPersistenceError(null);
      await repository.resetToDemo();
      await loadData();
    } catch (err: any) {
      setPersistenceError(err.message || 'Failed to reset state');
      throw err;
    }
  };

  const refresh = async () => {
    await loadData();
  };

  return (
    <LedgerContext.Provider
      value={{
        accounts,
        events,
        batches,
        statements,
        emiPlans,
        categoryRules,
        planningConfig,
        planningSummary,
        summary,
        period,
        setPeriod,
        isLoading,
        persistenceError,
        clearPersistenceError,
        addAccount,
        updateAccount,
        addEvent,
        executeCommand,
        updateEvent,
        deleteEvent,
        commitImportBatch,
        undoImportBatch,
        addEmiPlan,
        updatePlanningConfig,
        addCategoryRule,
        deleteCategoryRule,
        exportBackup,
        restoreBackup,
        resetToDemo,
        refresh,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

export const useLedger = (): LedgerContextType => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
};
