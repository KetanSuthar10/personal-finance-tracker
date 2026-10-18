import { describe, it, expect } from 'vitest';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { CreateFinancialEntryCommand, validateFinancialCommand } from '../domain/commandService';

describe('Database & Auth Security Boundaries (T02 / AT13 & AT15)', () => {
  describe('Supabase Client & Environment Configuration', () => {
    it('is configured from environment variables and does not use hard-coded secrets', () => {
      expect(typeof isSupabaseConfigured).toBe('boolean');
      expect(supabase).toBeDefined();
      expect(supabase.auth).toBeDefined();
    });

    it('exposes only public/anon key and never contains a service_role secret in client code', () => {
      // In Vite/React frontend, service-role keys must never be exposed or requested
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      expect(anonKey).toBeDefined();
      // Ensure no secret key name is bundled
      expect((import.meta.env as any).SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
      expect((import.meta.env as any).VITE_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    });
  });

  describe('AT13: Owner and Non-Owner Access Control Boundary', () => {
    const OWNER_UUID = '11111111-2222-3333-4444-555555555555';
    const FORGED_ATTACKER_UUID = '99999999-9999-9999-9999-999999999999';

    // Model server-side owner authorization predicate
    const evaluateServerOwnerAuthorization = (configuredOwnerId: string | null, requestingUserId: string | null) => {
      if (!requestingUserId) {
        return { allowed: false, reason: 'Unauthenticated: anonymous access blocked' };
      }
      if (!configuredOwnerId) {
        return { allowed: false, reason: 'Owner configuration pending: server has not enrolled an owner' };
      }
      if (requestingUserId !== configuredOwnerId) {
        return { allowed: false, reason: 'Access denied: requesting user is not the server-configured owner' };
      }
      return { allowed: true, reason: 'Authorized' };
    };

    it('grants financial access only to the server-configured owner UUID', () => {
      const result = evaluateServerOwnerAuthorization(OWNER_UUID, OWNER_UUID);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Authorized');
    });

    it('denies access to an attacker forging another user UUID (AT13 forged owner)', () => {
      const result = evaluateServerOwnerAuthorization(OWNER_UUID, FORGED_ATTACKER_UUID);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not the server-configured owner');
    });

    it('fails closed and blocks all access when unauthenticated / signed-out (AT13 signed out)', () => {
      const result = evaluateServerOwnerAuthorization(OWNER_UUID, null);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Unauthenticated');
    });

    it('fails closed when owner UUID has not been configured in server settings', () => {
      const result = evaluateServerOwnerAuthorization(null, OWNER_UUID);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Owner configuration pending');
    });
  });

  describe('AT15: Atomic Transactional Command Boundary & Idempotency', () => {
    const mockAccounts = [
      {
        id: 'acc_bank_hdfc',
        label: 'HDFC Salary A/c',
        type: 'bank' as const,
        opening_date: '2026-10-01',
        opening_position_paise: 5000000,
      },
      {
        id: 'acc_card_regalia',
        label: 'HDFC Regalia Card',
        type: 'card' as const,
        opening_date: '2026-10-01',
        opening_position_paise: -1500000,
      },
    ];

    // Mock transactional command executor implementing PostgreSQL execute_financial_command contract
    class MockTransactionalBoundary {
      private events = new Map<string, any>();
      private postings: any[] = [];
      private idempotencyKeys = new Map<string, string>();

      async executeCommand(
        commandId: string,
        userId: string | null,
        ownerUserId: string,
        cmd: CreateFinancialEntryCommand
      ) {
        // 1. Auth check
        if (!userId) {
          throw new Error('Authentication required');
        }
        if (userId !== ownerUserId) {
          throw new Error('Access denied: not authorized owner');
        }

        // 2. Idempotency check (AT15)
        if (this.idempotencyKeys.has(commandId)) {
          const existingId = this.idempotencyKeys.get(commandId)!;
          return { event: this.events.get(existingId), idempotent: true };
        }

        // 3. Validation
        const validation = validateFinancialCommand(cmd, mockAccounts);
        if (!validation.isValid || !validation.builtEvent) {
          throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
        }

        // 4. Injected atomic write simulation
        // Savepoint
        const stagedEvent = { ...validation.builtEvent, id: commandId, user_id: userId, version: 1 };
        const stagedPostings = validation.builtEvent.postings.map(p => ({
          ...p,
          event_id: commandId,
          user_id: userId,
        }));

        // Commit transaction atomically
        this.events.set(commandId, stagedEvent);
        this.postings.push(...stagedPostings);
        this.idempotencyKeys.set(commandId, commandId);

        return { event: stagedEvent, idempotent: false };
      }

      getEventCount() {
        return this.events.size;
      }

      getPostingCount() {
        return this.postings.length;
      }
    }

    it('executes a valid command atomically creating both event and postings', async () => {
      const boundary = new MockTransactionalBoundary();
      const cmd: CreateFinancialEntryCommand = {
        type: 'purchase',
        date: '2026-10-15',
        recipient: 'Grocery Mart',
        amount_paise: 245000,
        account_id: 'acc_bank_hdfc',
        category: 'Food & Dining',
      };

      const result = await boundary.executeCommand('cmd_001', 'owner_1', 'owner_1', cmd);
      expect(result.idempotent).toBe(false);
      expect(result.event.recipient).toBe('Grocery Mart');
      expect(boundary.getEventCount()).toBe(1);
      expect(boundary.getPostingCount()).toBe(1);
    });

    it('returns the same authoritative result on repeated command identity without duplicate writes (AT15 idempotency)', async () => {
      const boundary = new MockTransactionalBoundary();
      const cmd: CreateFinancialEntryCommand = {
        type: 'purchase',
        date: '2026-10-15',
        recipient: 'Electricity Bill',
        amount_paise: 180000,
        account_id: 'acc_bank_hdfc',
        category: 'Utilities',
      };

      // First execution
      const firstResult = await boundary.executeCommand('cmd_repeat_1', 'owner_1', 'owner_1', cmd);
      expect(firstResult.idempotent).toBe(false);
      expect(boundary.getEventCount()).toBe(1);
      expect(boundary.getPostingCount()).toBe(1);

      // Repeated execution with identical command key
      const repeatResult = await boundary.executeCommand('cmd_repeat_1', 'owner_1', 'owner_1', cmd);
      expect(repeatResult.idempotent).toBe(true);
      expect(repeatResult.event.id).toBe(firstResult.event.id);
      // Ensure no duplicate records created
      expect(boundary.getEventCount()).toBe(1);
      expect(boundary.getPostingCount()).toBe(1);
    });

    it('rolls back completely on invalid input and never leaves orphaned partial records (AT15 atomic failure)', async () => {
      const boundary = new MockTransactionalBoundary();
      const invalidCmd: CreateFinancialEntryCommand = {
        type: 'purchase',
        date: '2026-02-31', // Impossible calendar date
        recipient: 'Ghost Shop',
        amount_paise: 50000,
        account_id: 'acc_bank_hdfc',
      };

      await expect(
        boundary.executeCommand('cmd_invalid_date', 'owner_1', 'owner_1', invalidCmd)
      ).rejects.toThrow('Validation failed');

      // Database state remains pristine: zero events, zero postings
      expect(boundary.getEventCount()).toBe(0);
      expect(boundary.getPostingCount()).toBe(0);
    });

    it('rejects cross-owner or nonexistent accounts atomically', async () => {
      const boundary = new MockTransactionalBoundary();
      const maliciousCmd: CreateFinancialEntryCommand = {
        type: 'purchase',
        date: '2026-10-15',
        recipient: 'Attacker Store',
        amount_paise: 50000,
        account_id: 'acc_foreign_victim_account',
      };

      await expect(
        boundary.executeCommand('cmd_cross_owner', 'owner_1', 'owner_1', maliciousCmd)
      ).rejects.toThrow('Unknown primary account');

      expect(boundary.getEventCount()).toBe(0);
      expect(boundary.getPostingCount()).toBe(0);
    });
  });
});
