import { Account, FinancialEvent, PeriodSummary } from '../domain/types';
import { calculatePeriodSummary } from '../domain/ledger';
import { DEMO_FIXTURE } from './demoFixture';
import { LedgerRepository } from './repository';

const STORAGE_KEY_ACCOUNTS = 'pft_accounts_v1';
const STORAGE_KEY_EVENTS = 'pft_events_v1';

export class LocalLedgerRepository implements LedgerRepository {
  private accounts: Account[];
  private events: FinancialEvent[];

  constructor() {
    this.accounts = this.loadAccounts();
    this.events = this.loadEvents();
  }

  private loadAccounts(): Account[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        if (raw) {
          return JSON.parse(raw);
        }
      }
    } catch {
      // Fallback
    }
    return [...DEMO_FIXTURE.accounts];
  }

  private loadEvents(): FinancialEvent[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY_EVENTS);
        if (raw) {
          return JSON.parse(raw);
        }
      }
    } catch {
      // Fallback
    }
    return [...DEMO_FIXTURE.events];
  }

  private persist() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(this.accounts));
        window.localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(this.events));
      }
    } catch {
      // Ignore quota errors in private browsing
    }
  }

  async getAccounts(): Promise<Account[]> {
    return [...this.accounts];
  }

  async getEvents(options?: { fromDate?: string; throughDate?: string }): Promise<FinancialEvent[]> {
    let result = [...this.events];
    if (options?.fromDate) {
      result = result.filter(e => e.date >= options.fromDate!);
    }
    if (options?.throughDate) {
      result = result.filter(e => e.date <= options.throughDate!);
    }
    // Sort descending by date, then id
    return result.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }

  async getEventById(id: string): Promise<FinancialEvent | null> {
    return this.events.find(e => e.id === id) || null;
  }

  async addEvent(eventData: Omit<FinancialEvent, 'id'>): Promise<FinancialEvent> {
    const id = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newEvent: FinancialEvent = { ...eventData, id };
    this.events.push(newEvent);
    this.persist();
    return newEvent;
  }

  async updateEvent(id: string, updates: Partial<FinancialEvent>): Promise<FinancialEvent> {
    const index = this.events.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error(`Event with id ${id} not found`);
    }
    const updated = { ...this.events[index], ...updates };
    this.events[index] = updated;
    this.persist();
    return updated;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const initialLen = this.events.length;
    this.events = this.events.filter(e => e.id !== id);
    if (this.events.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  async getSummary(fromDate: string, throughDate: string): Promise<PeriodSummary> {
    return calculatePeriodSummary(this.accounts, this.events, fromDate, throughDate);
  }

  async resetToDemo(): Promise<void> {
    this.accounts = JSON.parse(JSON.stringify(DEMO_FIXTURE.accounts));
    this.events = JSON.parse(JSON.stringify(DEMO_FIXTURE.events));
    this.persist();
  }
}
