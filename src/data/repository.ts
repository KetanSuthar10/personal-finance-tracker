import {
  Account,
  FinancialEvent,
  PeriodSummary,
  ImportBatch,
  CardStatement,
  EmiPlan,
  CashPlanningConfig,
} from '../domain/types';

export interface LedgerRepository {
  getAccounts(): Promise<Account[]>;
  getEvents(options?: { fromDate?: string; throughDate?: string }): Promise<FinancialEvent[]>;
  getEventById(id: string): Promise<FinancialEvent | null>;
  addEvent(event: Omit<FinancialEvent, 'id'>): Promise<FinancialEvent>;
  updateEvent(id: string, updates: Partial<FinancialEvent>): Promise<FinancialEvent>;
  deleteEvent(id: string): Promise<boolean>;
  getSummary(fromDate: string, throughDate: string): Promise<PeriodSummary>;
  getImportBatches(): Promise<ImportBatch[]>;
  commitImportBatch(batch: ImportBatch, newEvents: FinancialEvent[], updatedEvents: FinancialEvent[]): Promise<void>;
  undoImportBatch(batchId: string): Promise<boolean>;

  // Card Statements & EMIs (M4)
  getCardStatements(): Promise<CardStatement[]>;
  addCardStatement(stmt: Omit<CardStatement, 'id'>): Promise<CardStatement>;
  getEmiPlans(): Promise<EmiPlan[]>;
  addEmiPlan(emi: Omit<EmiPlan, 'id'>): Promise<EmiPlan>;
  getPlanningConfig(): Promise<CashPlanningConfig>;
  updatePlanningConfig(config: Partial<CashPlanningConfig>): Promise<CashPlanningConfig>;

  // Backup & Restore (M3)
  exportBackup(): Promise<string>;
  restoreBackup(jsonString: string): Promise<{ success: boolean; eventCount: number; accountCount: number }>;

  resetToDemo(): Promise<void>;
}
