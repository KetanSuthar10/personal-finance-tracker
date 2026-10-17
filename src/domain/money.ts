/**
 * Pure monetary conversion and formatting utilities for INR integer paise.
 * Invariant: 1 INR = 100 paise.
 * All financial internal calculations MUST be performed with integer paise.
 */

export function toPaise(input: string | number): number {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      throw new Error(`Invalid non-finite number: ${input}`);
    }
    return Math.round(input * 100);
  }

  const clean = input.trim().replace(/,/g, '');
  if (!clean || clean === '') {
    return 0;
  }

  // Regex to match optional sign, digits, and optional decimal point with up to 2 decimal places
  const match = clean.match(/^([+-]?\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new Error(`Invalid currency amount format: "${input}"`);
  }

  const sign = match[1].startsWith('-') ? -1 : 1;
  const absWholeStr = match[1].replace(/^[+-]/, '');
  const whole = parseInt(absWholeStr, 10);
  const fracStr = match[2] ? match[2].padEnd(2, '0') : '00';
  const frac = parseInt(fracStr, 10);

  const totalPaise = sign * (whole * 100 + frac);
  if (!Number.isSafeInteger(totalPaise)) {
    throw new Error(`Amount exceeds safe integer range: ${input}`);
  }

  return totalPaise;
}

export function toRupees(paise: number): number {
  if (!Number.isSafeInteger(paise)) {
    throw new Error(`Invalid safe integer paise: ${paise}`);
  }
  return paise / 100;
}

export function formatRupees(
  paise: number,
  options: {
    showSign?: boolean;
    hideDecimals?: boolean;
    compact?: boolean;
  } = {}
): string {
  if (!Number.isFinite(paise)) {
    return '₹0.00';
  }

  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: options.hideDecimals ? 0 : 2,
    maximumFractionDigits: options.hideDecimals ? 0 : 2,
  });

  const formatted = formatter.format(rupees);

  if (paise < 0) {
    return options.showSign ? `-${formatted}` : `-${formatted}`;
  } else if (paise > 0 && options.showSign) {
    return `+${formatted}`;
  }

  return formatted;
}

export function isValidPaise(val: unknown): val is number {
  return typeof val === 'number' && Number.isSafeInteger(val);
}
