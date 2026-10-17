import { describe, it, expect } from 'vitest';
import { createBackup, validateAndParseBackup, BackupData } from '../domain/backup';
import { LocalLedgerRepository } from '../data/localRepository';
import { DEMO_FIXTURE, DEMO_STATEMENTS, DEMO_EMIS, DEMO_PLANNING_CONFIG } from '../data/demoFixture';

describe('backup and restore domain engine', () => {
  const sampleData: BackupData = {
    accounts: DEMO_FIXTURE.accounts,
    events: DEMO_FIXTURE.events,
    batches: [],
    statements: DEMO_STATEMENTS,
    emiPlans: DEMO_EMIS,
    planningConfig: DEMO_PLANNING_CONFIG,
  };

  it('creates a compliant schema v1 backup payload with deterministic checksum', () => {
    const backup = createBackup(sampleData);

    expect(backup.schema_version).toBe(1);
    expect(backup.currency).toBe('INR');
    expect(backup.timezone).toBe('Asia/Kolkata');
    expect(backup.app_version).toBe('0.1.0');
    expect(backup.checksum).toBeDefined();
    expect(backup.data.accounts.length).toBe(3);
    expect(backup.data.events.length).toBe(9);
    expect(backup.data.statements.length).toBe(1);
    expect(backup.data.emiPlans.length).toBe(2);
  });

  it('validates and parses a valid backup JSON string', () => {
    const backup = createBackup(sampleData);
    const jsonStr = JSON.stringify(backup);

    const validation = validateAndParseBackup(jsonStr);
    expect(validation.isValid).toBe(true);
    expect(validation.payload).toBeDefined();
    expect(validation.payload?.data.events.length).toBe(9);
  });

  it('detects tampering or corrupted files via checksum mismatch', () => {
    const backup = createBackup(sampleData);

    // Tamper with data without updating checksum
    const tampered = JSON.parse(JSON.stringify(backup));
    tampered.data.events[0].recipient = 'Hacked Employer';

    const validation = validateAndParseBackup(JSON.stringify(tampered));
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain('checksum mismatch');
  });

  it('rejects unsupported schema version or currency', () => {
    const backup = createBackup(sampleData);

    const wrongVersion = { ...backup, schema_version: 99 };
    expect(validateAndParseBackup(JSON.stringify(wrongVersion)).isValid).toBe(false);

    const wrongCurrency = { ...backup, currency: 'USD' };
    expect(validateAndParseBackup(JSON.stringify(wrongCurrency)).isValid).toBe(false);
  });

  it('rejects backup with broken referential integrity (postings to unknown accounts)', () => {
    const corruptedData: BackupData = {
      ...sampleData,
      events: [
        {
          id: 'bad-evt',
          date: '2026-10-01',
          type: 'purchase',
          recipient: 'Ghost Store',
          category: 'Shopping',
          income_paise: 0,
          spending_paise: 5000,
          postings: [{ account_id: 'non-existent-bank-id', delta_paise: -5000 }],
        },
      ],
    };

    const backup = createBackup(corruptedData);
    const validation = validateAndParseBackup(JSON.stringify(backup));
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain('Referential integrity error');
  });

  it('performs end-to-end round-trip export and restore in repository', async () => {
    const repo = new LocalLedgerRepository();
    await repo.resetToDemo();

    // 1. Export repository state
    const exportedJson = await repo.exportBackup();
    expect(exportedJson).toBeDefined();

    // 2. Add an event to mutate state
    await repo.addEvent({
      date: '2026-10-17',
      type: 'purchase',
      recipient: 'Coffee Shop',
      category: 'Dining',
      income_paise: 0,
      spending_paise: 25000,
      postings: [{ account_id: 'demo-cash', delta_paise: -25000 }],
    });

    let eventsAfterAdd = await repo.getEvents();
    expect(eventsAfterAdd.length).toBe(DEMO_FIXTURE.events.length + 1);

    // 3. Restore from the exported JSON
    const restoreResult = await repo.restoreBackup(exportedJson);
    expect(restoreResult.success).toBe(true);

    // 4. State is cleanly reinstated to the exact point of export
    let eventsAfterRestore = await repo.getEvents();
    expect(eventsAfterRestore.length).toBe(DEMO_FIXTURE.events.length);
  });
});
