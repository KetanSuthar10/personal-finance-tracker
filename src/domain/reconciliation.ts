import { FinancialEvent, ImportRowCandidate, EventType, Account, ImportBatch } from './types';
import { RawCsvRow } from './importer';
import { buildEventPostings } from './ledger';

/**
 * Common merchant to category inference rules.
 */
export function inferCategoryAndType(
  description: string,
  _debitPaise: number,
  creditPaise: number,
  accountType: Account['type']
): { type: EventType; category: string | null; recipient: string } {
  const descUpper = description.toUpperCase();

  // Clean recipient name from bank jargon
  let recipient = description
    .replace(/^(POS|UPI|NEFT|ACH|ATM|BP|CR|DR|BILLPAY)[\s\/\-]+/i, '')
    .replace(/(NEW DELHI|MUMBAI|BANGALORE|BENGALURU|INDIA|HYDERABAD|DELHI|PUN).*$/i, '')
    .trim();

  if (recipient.length < 3) {
    recipient = description.trim();
  }

  // 1. Credit Card logic
  if (accountType === 'card') {
    if (creditPaise > 0) {
      if (descUpper.includes('REFUND')) {
        return { type: 'refund', category: 'Groceries', recipient };
      }
      return { type: 'card_payment', category: null, recipient: 'Card Repayment' };
    }
    if (descUpper.includes('FEE') || descUpper.includes('CHARGE') || descUpper.includes('INTEREST')) {
      return { type: 'fee', category: 'Finance charges', recipient };
    }
    if (descUpper.includes('GROCERY') || descUpper.includes('SUPERMARKET') || descUpper.includes('MART')) {
      return { type: 'purchase', category: 'Groceries', recipient };
    }
    return { type: 'purchase', category: 'Shopping', recipient };
  }

  // 2. Bank account logic
  if (creditPaise > 0) {
    if (descUpper.includes('REFUND') || descUpper.includes('REVERSAL')) {
      return { type: 'refund', category: 'General', recipient };
    }
    if (descUpper.includes('SALARY') || descUpper.includes('PAYROLL')) {
      return { type: 'income', category: 'Salary', recipient };
    }
    return { type: 'income', category: 'Additional income', recipient };
  }

  // Bank Debits
  if (descUpper.includes('AUTOPAY') && descUpper.includes('CARD')) {
    return { type: 'card_payment', category: null, recipient: 'Credit Card Repayment' };
  }
  if (descUpper.includes('ATM') || descUpper.includes('CASH WDL')) {
    return { type: 'own_transfer', category: null, recipient: 'Cash wallet' };
  }
  if (descUpper.includes('CAFE') || descUpper.includes('COFFEE') || descUpper.includes('DINING')) {
    return { type: 'purchase', category: 'Dining', recipient };
  }
  if (descUpper.includes('PARKING') || descUpper.includes('TOLL') || descUpper.includes('METRO')) {
    return { type: 'purchase', category: 'Transport', recipient };
  }
  if (descUpper.includes('BSES') || descUpper.includes('POWER') || descUpper.includes('ELECTRIC') || descUpper.includes('BILLPAY')) {
    return { type: 'purchase', category: 'Utilities', recipient };
  }

  return { type: 'purchase', category: 'General', recipient };
}

/**
 * Checks whether an imported description and an existing event recipient are plausibly the same merchant.
 * Prevents accidental merging of distinct purchases based solely on equal amounts and dates.
 */
function areDescriptionsCompatible(importedDesc: string, existingRecipient: string): boolean {
  const norm1 = importedDesc.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ');
  const norm2 = existingRecipient.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ');

  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  const stopWords = new Set(['THE', 'AND', 'FOR', 'WITH', 'NEW', 'DELHI', 'INDIA', 'POS', 'UPI', 'NEFT', 'SAMPLE']);
  const words1 = norm1.split(/\s+/).filter((w) => w.length >= 3 && !stopWords.has(w));
  const words2 = norm2.split(/\s+/).filter((w) => w.length >= 3 && !stopWords.has(w));

  return words1.some((w) => words2.includes(w));
}

/**
 * Evaluates raw imported rows against existing ledger events to identify duplicates,
 * matches with manual daily entries, and genuine new records.
 */
export function reconcileImportCandidates(
  account: Account,
  existingEvents: FinancialEvent[],
  rawRows: RawCsvRow[]
): ImportRowCandidate[] {
  const candidates: ImportRowCandidate[] = [];
  const claimedEventIds = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const inferred = inferCategoryAndType(
      row.description,
      row.debit_paise,
      row.credit_paise,
      account.type
    );

    // Expected delta for this account
    // In net-position convention:
    // Assets: credit is +delta, debit is -delta
    // Liabilities: debit (borrowing) is -delta, credit (repayment/refund) is +delta
    const expectedDeltaPaise = row.credit_paise > 0 ? row.credit_paise : -row.debit_paise;

    // Check if this exact row was already imported in a previous batch
    const alreadyImported = existingEvents.some((e) =>
      e.source_observations?.some(
        (obs) =>
          (row.ref_no && obs.ref_no === row.ref_no) ||
          (obs.extracted_date === row.date &&
            obs.extracted_amount_paise === Math.abs(expectedDeltaPaise) &&
            obs.raw_description === row.description)
      )
    );

    if (alreadyImported) {
      candidates.push({
        row_index: i,
        date: row.date,
        description: row.description,
        ref_no: row.ref_no,
        debit_paise: row.debit_paise,
        credit_paise: row.credit_paise,
        delta_paise: expectedDeltaPaise,
        inferred_type: inferred.type,
        inferred_category: inferred.category,
        match_status: 'DUPLICATE_IMPORT',
        confidence_reason: 'Exact row fingerprint or reference number already in active ledger',
      });
      continue;
    }

    // Look for matching existing events (e.g. manual daily entries)
    // Filter out events already claimed by an earlier row in this import batch
    const potentialMatches = existingEvents.filter((e) => {
      if (claimedEventIds.has(e.id)) return false;
      const posting = e.postings.find((p) => p.account_id === account.id);
      if (!posting) return false;
      return posting.delta_paise === expectedDeltaPaise;
    });

    // Sub-filter for date proximity (±3 days)
    const rowDateObj = new Date(row.date).getTime();
    const closeMatches = potentialMatches.filter((e) => {
      const eDateObj = new Date(e.date).getTime();
      const diffDays = Math.abs((eDateObj - rowDateObj) / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    });

    if (closeMatches.length === 1) {
      const matched = closeMatches[0];
      const isCompatible = areDescriptionsCompatible(row.description, matched.recipient);

      if (isCompatible) {
        candidates.push({
          row_index: i,
          date: row.date,
          description: row.description,
          ref_no: row.ref_no,
          debit_paise: row.debit_paise,
          credit_paise: row.credit_paise,
          delta_paise: expectedDeltaPaise,
          inferred_type: matched.type,
          inferred_category: matched.category,
          match_status: 'EXACT_MATCH',
          matched_event_id: matched.id,
          confidence_reason: `Reconciles with existing manual entry "${matched.recipient}" (${matched.date})`,
        });
        claimedEventIds.add(matched.id);
      } else {
        // Discrepancy in merchant descriptions: place in review queue rather than silently merging
        candidates.push({
          row_index: i,
          date: row.date,
          description: row.description,
          ref_no: row.ref_no,
          debit_paise: row.debit_paise,
          credit_paise: row.credit_paise,
          delta_paise: expectedDeltaPaise,
          inferred_type: inferred.type,
          inferred_category: inferred.category,
          match_status: 'UNCERTAIN_MATCH',
          confidence_reason: `Identical amount within 3 days of "${matched.recipient}", but merchant description differs; flagged for review to prevent accidental merge`,
        });
      }
    } else if (closeMatches.length > 1) {
      candidates.push({
        row_index: i,
        date: row.date,
        description: row.description,
        ref_no: row.ref_no,
        debit_paise: row.debit_paise,
        credit_paise: row.credit_paise,
        delta_paise: expectedDeltaPaise,
        inferred_type: inferred.type,
        inferred_category: inferred.category,
        match_status: 'UNCERTAIN_MATCH',
        confidence_reason: `Found ${closeMatches.length} existing transactions with identical amount within 3 days`,
      });
    } else {
      candidates.push({
        row_index: i,
        date: row.date,
        description: row.description,
        ref_no: row.ref_no,
        debit_paise: row.debit_paise,
        credit_paise: row.credit_paise,
        delta_paise: expectedDeltaPaise,
        inferred_type: inferred.type,
        inferred_category: inferred.category,
        match_status: 'NEW_RECORD',
        confidence_reason: 'No prior matching transactions found',
      });
    }
  }

  return candidates;
}

/**
 * Commits verified candidates into canonical ledger events, updates merged events,
 * and records batch provenance.
 */
export function applyImportBatch(
  batchId: string,
  filename: string,
  account: Account,
  destinationAccountForTransfers: Account | undefined,
  candidates: ImportRowCandidate[],
  existingEvents: FinancialEvent[]
): {
  newEvents: FinancialEvent[];
  updatedEvents: FinancialEvent[];
  batch: ImportBatch;
} {
  const newEvents: FinancialEvent[] = [];
  const updatedEventsMap = new Map<string, FinancialEvent>();
  const createdEventIds: string[] = [];
  const mergedEventIds: string[] = [];

  for (const c of candidates) {
    if (c.match_status === 'DUPLICATE_IMPORT') {
      continue; // Skip already recorded rows
    }

    const observation = {
      id: `obs-${batchId}-${c.row_index}`,
      source_type: 'statement_import' as const,
      batch_id: batchId,
      raw_description: c.description,
      ref_no: c.ref_no,
      extracted_date: c.date,
      extracted_amount_paise: Math.abs(c.delta_paise),
    };

    if (c.match_status === 'EXACT_MATCH' && c.matched_event_id) {
      const existing = updatedEventsMap.get(c.matched_event_id) || existingEvents.find((e) => e.id === c.matched_event_id);
      if (existing) {
        const obsList = existing.source_observations ? [...existing.source_observations] : [];
        obsList.push(observation);

        const updated: FinancialEvent = {
          ...existing,
          source_observations: obsList,
        };
        updatedEventsMap.set(existing.id, updated);
        mergedEventIds.push(existing.id);
        continue;
      }
    }

    // Otherwise create a new event
    const eventId = `evt-imp-${batchId}-${c.row_index}`;
    const amountPaise = Math.abs(c.delta_paise);

    // Repayment direction: Bank (asset decrease) -> Card (liability reduction)
    let primaryId = account.id;
    let destId = destinationAccountForTransfers?.id;

    if (c.inferred_type === 'card_payment' && account.type === 'card') {
      primaryId = destinationAccountForTransfers?.id || 'demo-bank';
      destId = account.id;
    }

    const postingsSpec = buildEventPostings(
      c.inferred_type,
      amountPaise,
      primaryId,
      destId
    );

    const newEvt: FinancialEvent = {
      id: eventId,
      date: c.date,
      type: c.inferred_type,
      recipient: c.description,
      category: c.inferred_category,
      income_paise: postingsSpec.income_paise,
      spending_paise: postingsSpec.spending_paise,
      postings: postingsSpec.postings,
      source_observations: [observation],
    };

    newEvents.push(newEvt);
    createdEventIds.push(eventId);
  }

  const batch: ImportBatch = {
    id: batchId,
    filename,
    account_id: account.id,
    imported_at: new Date().toISOString(),
    row_count: candidates.length,
    created_event_ids: createdEventIds,
    merged_event_ids: mergedEventIds,
    status: 'active',
  };

  return {
    newEvents,
    updatedEvents: Array.from(updatedEventsMap.values()),
    batch,
  };
}
