import { describe, it, expect } from 'vitest';
import { toPaise, toRupees, formatRupees, isValidPaise } from '../domain/money';

describe('money domain calculations', () => {
  it('converts decimal rupee strings to integer paise without float errors', () => {
    expect(toPaise('120')).toBe(12000);
    expect(toPaise('120.5')).toBe(12050);
    expect(toPaise('120.50')).toBe(12050);
    expect(toPaise('0.01')).toBe(1);
    expect(toPaise('0.00')).toBe(0);
    expect(toPaise('1,200.50')).toBe(120050);
    expect(toPaise('5000')).toBe(500000);
  });

  it('handles number inputs safely', () => {
    expect(toPaise(120.5)).toBe(12050);
    expect(toPaise(0.01)).toBe(1);
    expect(toPaise(100)).toBe(10000);
  });

  it('rejects invalid or non-numeric strings', () => {
    expect(() => toPaise('abc')).toThrow();
    expect(() => toPaise('12.345')).toThrow(); // More than 2 decimal places
    expect(() => toPaise('12.3.4')).toThrow();
  });

  it('converts paise to rupees accurately', () => {
    expect(toRupees(12050)).toBe(120.5);
    expect(toRupees(1)).toBe(0.01);
    expect(toRupees(0)).toBe(0);
  });

  it('formats rupees with standard en-IN symbol and grouping', () => {
    const formatted = formatRupees(648000);
    expect(formatted).toContain('6,480.00');

    const formattedSmall = formatRupees(12000);
    expect(formattedSmall).toContain('120.00');

    const formattedNegative = formatRupees(-42000);
    expect(formattedNegative).toContain('-₹420.00');
  });

  it('validates safe integer paise', () => {
    expect(isValidPaise(10000)).toBe(true);
    expect(isValidPaise(0)).toBe(true);
    expect(isValidPaise(12.5)).toBe(false);
    expect(isValidPaise(NaN)).toBe(false);
    expect(isValidPaise('100')).toBe(false);
  });
});
