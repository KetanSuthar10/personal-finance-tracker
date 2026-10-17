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
} from '../domain/types';
import { LocalLedgerRepository } from '../data/localRepository';
import { DEMO_FIXTURE } from '../data/demoFixture';
import { calculateCashPlanning } from '../domain/cards';

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
  addEvent: (eventData: Omit<FinancialEvent, 'id'>) => Promise<FinancialEvent>;
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
  const repository = useMemo(() => new LocalLedgerRepository(), []);
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
  const [period, setPeriod] = useState<{ from: string; through: string }>({
    from: DEMO_FIXTURE.period.from,
    through: DEMO_FIXTURE.period.through,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
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
    } finally {
      setIsLoading(false);
    }
  }, [repository, period.from, period.through]);

  useEffect(() => {
    loadData();
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

  const addEmiPlan = async (emi: Omit<EmiPlan, 'id'>) => {
    const created = await repository.addEmiPlan(emi);
    await loadData();
    return created;
  };

  const updatePlanningConfig = async (config: Partial<CashPlanningConfig>) => {
    await repository.updatePlanningConfig(config);
    await loadData();
  };

  const addCategoryRule = async (rule: Omit<CategoryRule, 'id' | 'created_at' | 'match_count'>) => {
    const created = await repository.addCategoryRule(rule);
    await loadData();
    return created;
  };

  const deleteCategoryRule = async (id: string) => {
    const deleted = await repository.deleteCategoryRule(id);
    if (deleted) {
      await loadData();
    }
    return deleted;
  };

  const exportBackup = async () => {
    return repository.exportBackup();
  };

  const restoreBackup = async (jsonString: string) => {
    const res = await repository.restoreBackup(jsonString);
    await loadData();
    return res;
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
        statements,
        emiPlans,
        categoryRules,
        planningConfig,
        planningSummary,
        summary,
        period,
        setPeriod,
        isLoading,
        addEvent,
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
