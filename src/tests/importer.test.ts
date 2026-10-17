import { describe, it, expect } from 'vitest';
import { parseCsvText, normalizeDate, extractStatementRows } from '../domain/importer';

describe('importer CSV parsing and normalization', () => {
  it('parses CSV with quoted strings and embedded commas', () => {
    const csv = `Date,Description,Amount\n01/10/2026,"CAFE, DELUXE BRANCH",120.00\n02/10/2026,NORMAL PURCHASE,50.00`;
    const rows = parseCsvText(csv);
    expect(rows.length).toBe(3);
    expect(rows[1][1]).toBe('CAFE, DELUXE BRANCH');
    expect(rows[2][1]).toBe('NORMAL PURCHASE');
  });

  it('normalizes various date formats to YYYY-MM-DD', () => {
    expect(normalizeDate('01/10/2026')).toBe('2026-10-01');
    expect(normalizeDate('5/9/2026')).toBe('2026-09-05');
    expect(normalizeDate('15-10-2026')).toBe('2026-10-15');
    expect(normalizeDate('2026-10-01')).toBe('2026-10-01');
  });

  it('extracts rows and computes integer paise debits and credits', () => {
    const csv = [
      ['Date', 'Narration', 'Withdrawal_Debit', 'Deposit_Credit'],
      ['01/10/2026', 'SALARY CORP', '', '5000.00'],
      ['03/10/2026', 'SAMPLE CAFE', '120.00', ''],
    ];

    const extracted = extractStatementRows(csv);
    expect(extracted.length).toBe(2);

    expect(extracted[0].credit_paise).toBe(500000);
    expect(extracted[0].debit_paise).toBe(0);
    expect(extracted[0].delta_paise).toBe(500000);

    expect(extracted[1].credit_paise).toBe(0);
    expect(extracted[1].debit_paise).toBe(12000);
    expect(extracted[1].delta_paise).toBe(-12000);
  });
});
