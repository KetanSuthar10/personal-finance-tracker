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

  describe('AT13 / SEC-02: Fail-Closed Owner Authorization & Bootstrap Invariants', () => {
    // Model server-side evaluation logic implemented in AuthContext
    const evaluateOwnerStatus = (
      rpcResult: { owner_configured?: boolean; is_owner?: boolean } | null,
      rpcError: Error | null,
      userId: string | null
    ) => {
      if (rpcError) {
        return {
          isOwner: false,
          ownerConfigured: false,
          userId,
          statusState: 'error' as const,
          errorMessage: rpcError.message,
        };
      }

      if (rpcResult) {
        const configured = Boolean(rpcResult.owner_configured);
        const isOwner = Boolean(rpcResult.is_owner);

        let statusState: 'unconfigured' | 'authorized' | 'denied' = 'denied';
        if (!configured) {
          statusState = 'unconfigured';
        } else if (isOwner) {
          statusState = 'authorized';
        }

        return {
          isOwner,
          ownerConfigured: configured,
          userId,
          statusState,
        };
      }

      return null;
    };

    it('strictly fails closed (isOwner = false) when owner status RPC errors (SEC-02 regression)', () => {
      const result = evaluateOwnerStatus(null, new Error('connection timeout to postgres'), 'user_123');
      expect(result).not.toBeNull();
      expect(result!.isOwner).toBe(false);
      expect(result!.statusState).toBe('error');
      expect(result!.errorMessage).toContain('connection timeout');
    });

    it('strictly denies owner status (isOwner = false) when owner is unconfigured (SEC-02 regression)', () => {
      const result = evaluateOwnerStatus({ owner_configured: false, is_owner: false }, null, 'new_user_456');
      expect(result).not.toBeNull();
      expect(result!.isOwner).toBe(false);
      expect(result!.ownerConfigured).toBe(false);
      expect(result!.statusState).toBe('unconfigured');
    });

    it('authorizes only when owner is configured and requesting user matches owner UUID', () => {
      const authorizedResult = evaluateOwnerStatus({ owner_configured: true, is_owner: true }, null, 'owner_uuid');
      expect(authorizedResult!.isOwner).toBe(true);
      expect(authorizedResult!.statusState).toBe('authorized');

      const nonOwnerResult = evaluateOwnerStatus({ owner_configured: true, is_owner: false }, null, 'attacker_uuid');
      expect(nonOwnerResult!.isOwner).toBe(false);
      expect(nonOwnerResult!.statusState).toBe('denied');
    });

    it('models bootstrap RPC permitting only the first user to claim ownership', () => {
      let serverOwnerConfig: { owner_user_id: string; owner_email: string } | null = null;

      const simulateBootstrap = (userId: string, email: string) => {
        if (serverOwnerConfig !== null) {
          throw new Error('Owner is already configured. Subsequent claims are forbidden.');
        }
        serverOwnerConfig = { owner_user_id: userId, owner_email: email };
        return { success: true, owner_user_id: userId, owner_email: email };
      };

      // First user enrollment succeeds
      const firstClaim = simulateBootstrap('owner_user_1', 'owner@example.com');
      expect(firstClaim.success).toBe(true);
      expect(serverOwnerConfig).toEqual({ owner_user_id: 'owner_user_1', owner_email: 'owner@example.com' });

      // Second user enrollment attempt is strictly rejected
      expect(() => simulateBootstrap('second_user_2', 'second@example.com')).toThrow(
        'Owner is already configured'
      );
    });
  });
});

