import { toPaise } from './money';
import { isValidCalendarDate } from './dates';

export interface RawCsvRow {
  date: string; // Normalised to YYYY-MM-DD
  description: string;
  ref_no?: string;
  debit_paise: number;
  credit_paise: number;
  delta_paise: number; // for bank: credit - debit; for card: credit - debit
}

export interface CsvMappingConfig {
  dateCol: string;
  descCol: string;
  refCol?: string;
  debitCol?: string;
  creditCol?: string;
  amountCol?: string; // If single signed column
}

/**
 * Robust RFC-compliant CSV line parser handling escaped quotes and commas within cells.
 */
export function parseCsvText(csvText: string): string[][] {
  const lines: string[][] = [];
  const cleanText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== '')) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c !== '')) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Normalises date strings into standard YYYY-MM-DD in Asia/Kolkata timezone.
 * Supports: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, D/M/YYYY.
 * Rejects impossible calendar dates (e.g. 31/02/2026).
 */
export function normalizeDate(dateStr: string): string {
  const clean = dateStr.trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (!isValidCalendarDate(year, month, day)) {
      return 'REJECT';
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (!isValidCalendarDate(year, month, day)) {
      return 'REJECT';
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return 'REJECT';
}

/**
 * Auto-detects column mapping headers from first row.
 */
export function detectCsvMapping(headers: string[]): CsvMappingConfig {
  const lower = headers.map((h) => h.toLowerCase().replace(/[\s_\-]+/g, ''));

  const findIndex = (patterns: string[]): string | undefined => {
    for (let i = 0; i < lower.length; i++) {
      if (patterns.some((p) => lower[i].includes(p))) {
        return headers[i];
      }
    }
    return undefined;
  };

  const dateCol = findIndex(['date', 'txndate', 'valuedate']) || headers[0];
  const descCol = findIndex(['narration', 'description', 'particular', 'remark', 'details']) || headers[1];
  const refCol = findIndex(['chq', 'ref', 'cheque', 'reference', 'utr', 'urn']);
  const debitCol = findIndex(['withdrawal', 'debit', 'dr']);
  const creditCol = findIndex(['deposit', 'credit', 'cr']);
  const amountCol = findIndex(['amount', 'txnamt']);

  return {
    dateCol,
    descCol,
    refCol,
    debitCol,
    creditCol,
    amountCol,
  };
}

/**
 * Maps parsed CSV rows to standardized RawCsvRow structures.
 */
export function extractStatementRows(
  csvData: string[][],
  config?: Partial<CsvMappingConfig>
): RawCsvRow[] {
  if (csvData.length < 2) {
    throw new Error('CSV must have a header row and at least one data row.');
  }

  const headers = csvData[0];
  const detected = detectCsvMapping(headers);
  const activeConfig: CsvMappingConfig = {
    ...detected,
    ...config,
  };

  const dateIdx = headers.indexOf(activeConfig.dateCol);
  const descIdx = headers.indexOf(activeConfig.descCol);
  const refIdx = activeConfig.refCol ? headers.indexOf(activeConfig.refCol) : -1;
  const debitIdx = activeConfig.debitCol ? headers.indexOf(activeConfig.debitCol) : -1;
  const creditIdx = activeConfig.creditCol ? headers.indexOf(activeConfig.creditCol) : -1;
  const amountIdx = activeConfig.amountCol ? headers.indexOf(activeConfig.amountCol) : -1;

  if (dateIdx === -1 || descIdx === -1) {
    throw new Error(`Required columns Date ("${activeConfig.dateCol}") or Description ("${activeConfig.descCol}") not found in CSV.`);
  }

  const rows: RawCsvRow[] = [];

  for (let i = 1; i < csvData.length; i++) {
    const row = csvData[i];
    if (row.length <= 1 && (!row[0] || row[0] === '')) continue;

    const rawDate = row[dateIdx];
    const rawDesc = row[descIdx] || 'Unlabelled transaction';
    const refNo = refIdx !== -1 ? row[refIdx] : undefined;

    const date = normalizeDate(rawDate);
    if (date === 'REJECT') {
      throw new Error(`Row ${i}: Invalid calendar date "${rawDate}".`);
    }

    let debitPaise = 0;
    let creditPaise = 0;

    if (debitIdx !== -1 && row[debitIdx] && row[debitIdx].trim() !== '') {
      debitPaise = Math.abs(toPaise(row[debitIdx]));
    }

    if (creditIdx !== -1 && row[creditIdx] && row[creditIdx].trim() !== '') {
      creditPaise = Math.abs(toPaise(row[creditIdx]));
    }

    if (debitIdx === -1 && creditIdx === -1 && amountIdx !== -1 && row[amountIdx]) {
      const amtPaise = toPaise(row[amountIdx]);
      if (amtPaise < 0) {
        debitPaise = Math.abs(amtPaise);
      } else {
        creditPaise = amtPaise;
      }
    }

    rows.push({
      date,
      description: rawDesc,
      ref_no: refNo && refNo.trim() !== '' ? refNo.trim() : undefined,
      debit_paise: debitPaise,
      credit_paise: creditPaise,
      delta_paise: creditPaise - debitPaise,
    });
  }

  return rows;
}
