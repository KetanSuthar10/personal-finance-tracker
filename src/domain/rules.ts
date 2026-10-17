import { CategoryRule, FinancialEvent } from './types';

/**
 * Normalizes pattern or recipient string for case-insensitive matching
 */
function normalize(str: string): string {
  return str.trim().toLowerCase();
}

/**
 * Finds the highest-precedence category rule matching a recipient and optional account.
 * Precedence:
 * 1. Specific account matches take precedence over global (no account) matches.
 * 2. Longer recipient pattern matches take precedence over shorter (more specific merchant names).
 */
export function matchCategoryRule(
  recipient: string,
  accountId: string | undefined,
  rules: CategoryRule[]
): CategoryRule | null {
  if (!recipient || !rules || rules.length === 0) return null;

  const normalizedRecipient = normalize(recipient);

  // Filter matching candidates
  const matchingRules = rules.filter(rule => {
    // Check account constraint if rule specifies one
    if (rule.account_id && rule.account_id !== accountId) {
      return false;
    }

    const pattern = normalize(rule.recipient_pattern);
    if (!pattern) return false;

    // Substring match
    return normalizedRecipient.includes(pattern);
  });

  if (matchingRules.length === 0) return null;

  // Sort by precedence
  matchingRules.sort((a, b) => {
    // 1. Account-specific first
    const aHasAccount = a.account_id ? 1 : 0;
    const bHasAccount = b.account_id ? 1 : 0;
    if (aHasAccount !== bHasAccount) {
      return bHasAccount - aHasAccount;
    }

    // 2. Longer pattern first (e.g. "Swiggy Instamart" over "Swiggy")
    return b.recipient_pattern.length - a.recipient_pattern.length;
  });

  return matchingRules[0];
}

/**
 * Creates a new CategoryRule object with a unique ID and timestamp.
 */
export function createCategoryRule(
  recipientPattern: string,
  category: string,
  accountId?: string
): CategoryRule {
  const cleanPattern = recipientPattern.trim();
  const cleanCategory = category.trim();

  if (!cleanPattern) {
    throw new Error('Recipient pattern cannot be empty');
  }
  if (!cleanCategory) {
    throw new Error('Category cannot be empty');
  }

  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipient_pattern: cleanPattern,
    category: cleanCategory,
    account_id: accountId || undefined,
    created_at: new Date().toISOString(),
    match_count: 0
  };
}

/**
 * Pure function: applies category rules to an array of financial events.
 * Only categorizes events where category is null, undefined, or empty (does not overwrite user-customized categories unless explicitly requested).
 */
export function applyRulesToTransactions(
  events: FinancialEvent[],
  rules: CategoryRule[],
  options: { overwriteExisting?: boolean } = {}
): { updatedCount: number; updatedEvents: FinancialEvent[] } {
  let updatedCount = 0;

  const updatedEvents = events.map(event => {
    // If category already exists and overwrite is not enabled, skip
    if (event.category && !options.overwriteExisting) {
      return event;
    }

    // Extract primary account ID from first posting if available
    const primaryAccountId = event.postings && event.postings.length > 0 ? event.postings[0].account_id : undefined;

    const matchedRule = matchCategoryRule(event.recipient, primaryAccountId, rules);
    if (matchedRule && matchedRule.category !== event.category) {
      updatedCount++;
      return {
        ...event,
        category: matchedRule.category
      };
    }

    return event;
  });

  return { updatedCount, updatedEvents };
}
