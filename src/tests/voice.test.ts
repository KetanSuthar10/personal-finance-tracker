import { describe, it, expect } from 'vitest';
import {
  wordsToNumber,
  parseVoiceTranscript,
  SAMPLE_VOICE_TRANSCRIPTS
} from '../domain/voice';

describe('Voice & Dictation Capture Engine (M6)', () => {
  it('converts spoken English number words to numbers', () => {
    expect(wordsToNumber('two hundred and fifty')).toBe(250);
    expect(wordsToNumber('one thousand five hundred')).toBe(1500);
    expect(wordsToNumber('seventy five thousand')).toBe(75000);
    expect(wordsToNumber('twenty five')).toBe(25);
    expect(wordsToNumber('180')).toBe(180);
    expect(wordsToNumber('random non number text')).toBeNull();
  });

  it('parses coffee purchase spoken sentence correctly', () => {
    const text = SAMPLE_VOICE_TRANSCRIPTS[0]; // 'Paid 180 rupees for coffee at Blue Tokai via HDFC'
    const parsed = parseVoiceTranscript(text);

    expect(parsed.type).toBe('purchase');
    expect(parsed.amount_paise).toBe(18000); // Rs 180.00
    expect(parsed.recipient).toContain('Blue Tokai');
    expect(parsed.category).toBe('Food & Dining');
    expect(parsed.account_hint).toBe('hdfc');
  });

  it('parses word-based amounts in spoken phrases', () => {
    const text = SAMPLE_VOICE_TRANSCRIPTS[1]; // 'Spent four hundred and fifty on dinner at Mainland China'
    const parsed = parseVoiceTranscript(text);

    expect(parsed.type).toBe('purchase');
    expect(parsed.amount_paise).toBe(45000); // Rs 450.00
    expect(parsed.recipient).toContain('Mainland China');
    expect(parsed.category).toBe('Food & Dining');
  });

  it('parses received salary and freelance income accurately', () => {
    const text = SAMPLE_VOICE_TRANSCRIPTS[2]; // 'Received freelance income 25000 from Acme Designs in HDFC'
    const parsed = parseVoiceTranscript(text);

    expect(parsed.type).toBe('income');
    expect(parsed.amount_paise).toBe(2500000); // Rs 25,000.00
    expect(parsed.recipient).toContain('Acme Designs');
    expect(parsed.account_hint).toBe('hdfc');
  });

  it('parses concise shorthand like "120 cafe, UPI"', () => {
    const text = '120 cafe, UPI';
    const parsed = parseVoiceTranscript(text);

    expect(parsed.amount_paise).toBe(12000);
    expect(parsed.recipient?.toLowerCase()).toContain('cafe');
  });
});
