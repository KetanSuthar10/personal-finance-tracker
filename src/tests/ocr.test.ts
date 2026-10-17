import { describe, it, expect } from 'vitest';
import {
  parseReceiptText,
  normalizeReceiptDate,
  suggestCategoryForMerchant,
  SAMPLE_RECEIPT_FIXTURES
} from '../domain/ocr';

describe('Receipt & Payment Screenshot OCR Engine (M6)', () => {
  it('normalizes various date formats accurately to YYYY-MM-DD', () => {
    expect(normalizeReceiptDate('2026-10-18')).toBe('2026-10-18');
    expect(normalizeReceiptDate('18/10/2026')).toBe('2026-10-18');
    expect(normalizeReceiptDate('18-10-2026')).toBe('2026-10-18');
    expect(normalizeReceiptDate('18 Oct 2026')).toBe('2026-10-18');
    expect(normalizeReceiptDate('5 January 2026')).toBe('2026-01-05');
  });

  it('suggests appropriate category based on merchant name', () => {
    expect(suggestCategoryForMerchant('Blue Tokai Coffee')).toBe('Food & Dining');
    expect(suggestCategoryForMerchant('Swiggy Instamart')).toBe('Food & Dining');
    expect(suggestCategoryForMerchant('Uber India')).toBe('Transportation');
    expect(suggestCategoryForMerchant('Indian Oil Fuel Station')).toBe('Transportation');
    expect(suggestCategoryForMerchant('Nature Basket Supermarket')).toBe('Groceries');
    expect(suggestCategoryForMerchant('Netflix Subscription')).toBe('Entertainment');
    expect(suggestCategoryForMerchant('Apollo Pharmacy')).toBe('Health & Medical');
  });

  it('parses Google Pay UPI screenshot text correctly', () => {
    const fixture = SAMPLE_RECEIPT_FIXTURES[0]; // GPay Blue Tokai
    const parsed = parseReceiptText(fixture.text);

    expect(parsed.amount_paise).toBe(24000); // Rs 240.00
    expect(parsed.recipient).toContain('Blue Tokai');
    expect(parsed.date).toBe('2026-10-18');
    expect(parsed.ref_no).toBe('429184918291');
    expect(parsed.category_suggestion).toBe('Food & Dining');
    expect(parsed.confidence_score).toBeGreaterThanOrEqual(0.7);
  });

  it('parses PhonePe food order screenshot text correctly', () => {
    const fixture = SAMPLE_RECEIPT_FIXTURES[1]; // PhonePe Swiggy
    const parsed = parseReceiptText(fixture.text);

    expect(parsed.amount_paise).toBe(48550); // Rs 485.50
    expect(parsed.recipient).toContain('Swiggy');
    expect(parsed.date).toBe('2026-10-17');
    expect(parsed.ref_no).toBe('429104928172');
    expect(parsed.category_suggestion).toBe('Food & Dining');
  });

  it('parses Paytm fuel payment receipt text correctly', () => {
    const fixture = SAMPLE_RECEIPT_FIXTURES[2]; // Paytm Petrol Pump
    const parsed = parseReceiptText(fixture.text);

    expect(parsed.amount_paise).toBe(150000); // Rs 1,500.00
    expect(parsed.recipient).toContain('Indian Oil Petrol Pump');
    expect(parsed.date).toBe('2026-10-16');
    expect(parsed.ref_no).toBe('429019284719');
    expect(parsed.category_suggestion).toBe('Transportation');
  });

  it('parses paper POS store bill text correctly', () => {
    const fixture = SAMPLE_RECEIPT_FIXTURES[3]; // Nature Basket POS
    const parsed = parseReceiptText(fixture.text);

    expect(parsed.amount_paise).toBe(65000); // Rs 650.00
    expect(parsed.recipient).toBe('NATURE BASKET RETAIL LTD');
    expect(parsed.date).toBe('2026-10-15');
    expect(parsed.category_suggestion).toBe('Groceries');
  });

  it('handles empty or gibberish text gracefully', () => {
    const parsedEmpty = parseReceiptText('');
    expect(parsedEmpty.amount_paise).toBeNull();
    expect(parsedEmpty.confidence_score).toBe(0);

    const parsedGibberish = parseReceiptText('hello world random noise');
    expect(parsedGibberish.amount_paise).toBeNull();
  });
});
