import { Account, FinancialEvent, PeriodSummary, ImportBatch } from '../domain/types';

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
  resetToDemo(): Promise<void>;
}
