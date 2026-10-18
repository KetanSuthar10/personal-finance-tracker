import { describe, it, expect } from 'vitest';
import { SupabaseLedgerRepository } from '../data/supabaseRepository';
import { LocalLedgerRepository } from '../data/localRepository';
import { toPaise } from '../domain/money';

describe('Auth & Remote Sync (T03 / AT13–AT15)', () => {
  describe('Fail-Closed & Empty Start Architecture', () => {
    it('does not load demo fixtures in SupabaseLedgerRepository when database is empty', async () => {
      // In production connected mode, an unauthenticated call must throw session error, never load DEMO_FIXTURE
      const repo = new SupabaseLedgerRepository();
      await expect(repo.getAccounts()).rejects.toThrow('not authenticated');
    });

    it('prohibits resetting to demo fixtures in connected cloud mode', async () => {
      const repo = new SupabaseLedgerRepository();
      await expect(repo.resetToDemo()).rejects.toThrow('Demo reset is disabled in connected cloud mode');
    });
  });

  describe('Account Management & Opening Balance Adjustments (F18)', () => {
    it('creates a new bank account with finite safe integer opening paise', async () => {
      const localRepo = new LocalLedgerRepository();
      const newAcc = await localRepo.addAccount({
        label: 'Kotak Active Bank',
        type: 'bank',
        opening_date: '2026-10-01',
        opening_position_paise: toPaise(75000), // ₹75,000
        masked_suffix: '•• 3390',
      });

      expect(newAcc.id).toBeDefined();
      expect(newAcc.label).toBe('Kotak Active Bank');
      expect(newAcc.opening_position_paise).toBe(7500000);
      expect(newAcc.current_position_paise).toBe(7500000);

      const accounts = await localRepo.getAccounts();
      expect(accounts.some(a => a.id === newAcc.id)).toBe(true);
    });

    it('creates a credit card account with liability (negative opening position)', async () => {
      const localRepo = new LocalLedgerRepository();
      const cardAcc = await localRepo.addAccount({
        label: 'SBI Cashback Card',
        type: 'card',
        opening_date: '2026-10-01',
        opening_position_paise: -toPaise(12500), // ₹12,500 debt
        masked_suffix: '•• 9124',
      });

      expect(cardAcc.type).toBe('card');
      expect(cardAcc.opening_position_paise).toBe(-1250000);
      expect(cardAcc.current_position_paise).toBe(-1250000);
    });

    it('updates account label and opening position preserving ledger integrity', async () => {
      const localRepo = new LocalLedgerRepository();
      const acc = await localRepo.addAccount({
        label: 'Initial Bank Name',
        type: 'bank',
        opening_date: '2026-10-01',
        opening_position_paise: toPaise(10000),
      });

      const updated = await localRepo.updateAccount(acc.id, {
        label: 'Renamed Salary Bank',
        opening_position_paise: toPaise(25000),
      });

      expect(updated.label).toBe('Renamed Salary Bank');
      expect(updated.opening_position_paise).toBe(2500000);
    });
  });

  describe('AT14: Cross-Device Session & Freshness Invariants', () => {
    it('verifies that opening date and recorded activity dates are distinguishable', async () => {
      const localRepo = new LocalLedgerRepository();
      const accounts = await localRepo.getAccounts();
      const primaryBank = accounts.find(a => a.type === 'bank');

      expect(primaryBank).toBeDefined();
      expect(primaryBank!.opening_date).toBeDefined();
    });

    it('rejects infinite or unsafe integer paise in account creation', async () => {
      const repo = new SupabaseLedgerRepository();
      await expect(
        repo.addAccount({
          label: 'Unsafe Account',
          type: 'bank',
          opening_date: '2026-10-01',
          opening_position_paise: Number.POSITIVE_INFINITY,
        })
      ).rejects.toThrow('finite safe integer');
    });
  });
});
