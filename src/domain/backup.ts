import { Account, FinancialEvent, ImportBatch, CardStatement, EmiPlan, CashPlanningConfig } from './types';

export interface BackupData {
  accounts: Account[];
  events: FinancialEvent[];
  batches: ImportBatch[];
  statements: CardStatement[];
  emiPlans: EmiPlan[];
  planningConfig: CashPlanningConfig;
}

export interface BackupPayload {
  schema_version: 1;
  app_version: string;
  exported_at: string;
  currency: 'INR';
  timezone: 'Asia/Kolkata';
  checksum: string;
  data: BackupData;
}

/**
 * FNV-1a 32-bit hashing algorithm for deterministic checksum calculation.
 */
export function computeChecksum(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Packages all ledger state into a versioned JSON backup payload.
 */
export function createBackup(data: BackupData): BackupPayload {
  const serializedData = JSON.stringify(data);
  const checksum = computeChecksum(serializedData);

  return {
    schema_version: 1,
    app_version: '0.1.0',
    exported_at: new Date().toISOString(),
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    checksum,
    data,
  };
}

/**
 * Validates, checks integrity, and parses a backup JSON string.
 */
export function validateAndParseBackup(jsonStr: string): {
  isValid: boolean;
  payload?: BackupPayload;
  error?: string;
} {
  try {
    const raw = JSON.parse(jsonStr);

    if (!raw || typeof raw !== 'object') {
      return { isValid: false, error: 'Backup is not a valid JSON object.' };
    }

    if (raw.schema_version !== 1) {
      return {
        isValid: false,
        error: `Unsupported backup schema version: ${raw.schema_version}. Expected version 1.`,
      };
    }

    if (raw.currency !== 'INR') {
      return {
        isValid: false,
        error: `Unsupported backup currency: "${raw.currency}". Expected "INR".`,
      };
    }

    if (!raw.data || typeof raw.data !== 'object') {
      return { isValid: false, error: 'Missing or malformed data payload in backup.' };
    }

    const { accounts, events } = raw.data;

    if (!Array.isArray(accounts) || !Array.isArray(events)) {
      return { isValid: false, error: 'Missing accounts or events arrays in backup payload.' };
    }

    // Checksum verification
    const expectedChecksum = raw.checksum;
    const computed = computeChecksum(JSON.stringify(raw.data));
    if (expectedChecksum !== computed) {
      return {
        isValid: false,
        error: `Integrity check failed: checksum mismatch (expected ${expectedChecksum}, computed ${computed}). File may be corrupted or modified.`,
      };
    }

    // Referential integrity check:
    const accountIds = new Set(accounts.map((a: Account) => a.id));

    for (const evt of events) {
      if (!evt.id || !evt.date || !Array.isArray(evt.postings)) {
        return { isValid: false, error: `Invalid event record structure in backup (id: ${evt.id}).` };
      }
      for (const posting of evt.postings) {
        if (!accountIds.has(posting.account_id)) {
          return {
            isValid: false,
            error: `Referential integrity error: posting references unknown account "${posting.account_id}" in event "${evt.id}".`,
          };
        }
        if (!Number.isSafeInteger(posting.delta_paise)) {
          return {
            isValid: false,
            error: `Monetary precision error: posting delta is not a safe integer in event "${evt.id}".`,
          };
        }
      }
    }

    return {
      isValid: true,
      payload: raw as BackupPayload,
    };
  } catch (err: unknown) {
    return {
      isValid: false,
      error: err instanceof Error ? err.message : 'Failed to parse backup JSON string.',
    };
  }
}
