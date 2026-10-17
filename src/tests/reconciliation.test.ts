import { describe, it, expect } from 'vitest';
import { reconcileImportCandidates, applyImportBatch } from '../domain/reconciliation';
import { DEMO_FIXTURE } from '../data/demoFixture';
import { RawCsvRow } from '../domain/importer';
import { LocalLedgerRepository } from '../data/localRepository';

describe('statement reconciliation and deduplication', () => {
  const bankAccount = DEMO_FIXTURE.accounts[0]; // demo-bank
  const existingEvents = [...DEMO_FIXTURE.events];

  const sampleRows: RawCsvRow[] = [
    // 1. Matches existing cafe manual entry (2026-10-03, 12,000 paise debit)
    {
      date: '2026-10-03',
      description: 'POS 4128 SAMPLE CAFE NEW DELHI',
      ref_no: 'TXN44810',
      debit_paise: 12000,
      credit_paise: 0,
      delta_paise: -12000,
    },
    // 2. Fresh new transaction (2026-10-15, 3,500 paise debit)
    {
      date: '2026-10-15',
      description: 'BILLPAY BSES RAJDHANI POWER LTD',
      ref_no: 'BP10294',
      debit_paise: 3500,
      credit_paise: 0,
      delta_paise: -3500,
    },
  ];

  it('classifies matching existing manual entry as EXACT_MATCH and fresh entry as NEW_RECORD', () => {
    const candidates = reconcileImportCandidates(bankAccount, existingEvents, sampleRows);
    expect(candidates.length).toBe(2);

    // Row 1: matches existing cafe entry
    expect(candidates[0].match_status).toBe('EXACT_MATCH');
    expect(candidates[0].matched_event_id).toBe('cafe');

    // Row 2: new utility bill
    expect(candidates[1].match_status).toBe('NEW_RECORD');
  });

  it('merges manual entry without duplicate expense inflation and creates new event with batch provenance', () => {
    const candidates = reconcileImportCandidates(bankAccount, existingEvents, sampleRows);
    const result = applyImportBatch(
      'test-batch-1',
      'statement.csv',
      bankAccount,
      DEMO_FIXTURE.accounts[1],
      candidates,
      existingEvents
    );

    // Only 1 new event is created (the utility bill); cafe is merged
    expect(result.newEvents.length).toBe(1);
    expect(result.newEvents[0].recipient).toBe('BILLPAY BSES RAJDHANI POWER LTD');

    // Exactly 1 event updated (cafe)
    expect(result.updatedEvents.length).toBe(1);
    expect(result.updatedEvents[0].id).toBe('cafe');
    expect(result.updatedEvents[0].source_observations?.length).toBe(1);
    expect(result.updatedEvents[0].source_observations?.[0].ref_no).toBe('TXN44810');
  });

  it('prevents duplicate expense inflation on repeated file imports (DUPLICATE_IMPORT)', () => {
    const candidatesFirstPass = reconcileImportCandidates(bankAccount, existingEvents, sampleRows);
    const resultFirstPass = applyImportBatch(
      'batch-101',
      'statement.csv',
      bankAccount,
      DEMO_FIXTURE.accounts[1],
      candidatesFirstPass,
      existingEvents
    );

    // Combined ledger after first import
    const updatedLedger = [
      ...existingEvents.filter(e => e.id !== 'cafe'),
      ...resultFirstPass.updatedEvents,
      ...resultFirstPass.newEvents,
    ];

    // Second import of identical file
    const candidatesSecondPass = reconcileImportCandidates(bankAccount, updatedLedger, sampleRows);

    // Both rows must now be flagged as DUPLICATE_IMPORT
    expect(candidatesSecondPass[0].match_status).toBe('DUPLICATE_IMPORT');
    expect(candidatesSecondPass[1].match_status).toBe('DUPLICATE_IMPORT');

    const resultSecondPass = applyImportBatch(
      'batch-102',
      'statement.csv',
      bankAccount,
      DEMO_FIXTURE.accounts[1],
      candidatesSecondPass,
      updatedLedger
    );

    // 0 new events, 0 updated events
    expect(resultSecondPass.newEvents.length).toBe(0);
    expect(resultSecondPass.updatedEvents.length).toBe(0);
  });

  it('reversibly rolls back imported batch without deleting manual transactions', async () => {
    const repo = new LocalLedgerRepository();
    await repo.resetToDemo();

    const candidates = reconcileImportCandidates(bankAccount, DEMO_FIXTURE.events, sampleRows);
    const result = applyImportBatch(
      'rollback-batch-1',
      'statement.csv',
      bankAccount,
      DEMO_FIXTURE.accounts[1],
      candidates,
      DEMO_FIXTURE.events
    );

    await repo.commitImportBatch(result.batch, result.newEvents, result.updatedEvents);

    let eventsAfterImport = await repo.getEvents();
    expect(eventsAfterImport.length).toBe(DEMO_FIXTURE.events.length + 1); // 1 new event added

    // Now undo the batch
    const undoSuccess = await repo.undoImportBatch('rollback-batch-1');
    expect(undoSuccess).toBe(true);

    let eventsAfterUndo = await repo.getEvents();
    // Length is back to initial fixture length
    expect(eventsAfterUndo.length).toBe(DEMO_FIXTURE.events.length);

    // Manual cafe transaction still exists!
    const cafeEvent = await repo.getEventById('cafe');
    expect(cafeEvent).toBeDefined();
    // And batch observation was removed from cafe
    expect(cafeEvent?.source_observations?.length).toBe(0);
  });
});
