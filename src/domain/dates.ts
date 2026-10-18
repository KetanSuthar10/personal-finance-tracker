/**
 * Date validation and period calculation utilities.
 * Enforces Asia/Kolkata calendar conventions and strict calendar validation.
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Validates that year, month (1-12), and day (1-31) represent a genuine calendar day.
 * Rejects impossible dates like Feb 31, April 31, or invalid leap year dates.
 */
export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2200) {
    return false;
  }

  // Use UTC to prevent timezone shifts from rolling over impossible days
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

/**
 * Validates a YYYY-MM-DD date string strictly.
 */
export function isValidDateString(dateStr: string): boolean {
  if (typeof dateStr !== 'string') return false;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  return isValidCalendarDate(year, month, day);
}

/**
 * Returns current date in Asia/Kolkata timezone in YYYY-MM-DD format.
 */
export function getTodayKolkata(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: DEFAULT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    // Fallback to ISO string slice if Intl timezone unavailable
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Formats a YYYY-MM-DD date for display (e.g. "18 Oct 2026").
 */
export function formatDateDisplay(dateStr: string): string {
  if (!isValidDateString(dateStr)) return dateStr;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Returns the start and end of a given month in YYYY-MM-DD.
 */
export function getMonthPeriod(year: number, month: number): { from: string; through: string } {
  const m = String(month).padStart(2, '0');
  const from = `${year}-${m}-01`;

  // Last day of month
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const through = `${year}-${m}-${String(lastDay).padStart(2, '0')}`;

  return { from, through };
}
