import { toPaise, formatRupees } from './money';
import { suggestCategoryForMerchant } from './ocr';
import { EventType } from './types';

export interface ParsedVoiceEntry {
  rawTranscript: string;
  type: EventType;
  amount_paise: number | null;
  amount_formatted: string | null;
  recipient: string | null;
  date: string;
  category: string;
  account_hint: string | null;
  confidence_score: number;
}

/**
 * Converts basic Indian English spoken words for numbers to numeric digits
 * e.g. "two hundred and fifty" -> 250, "one thousand five hundred" -> 1500
 */
export function wordsToNumber(phrase: string): number | null {
  const p = phrase.toLowerCase().trim();

  // If already contains digits, extract them
  const numMatch = p.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/);
  if (numMatch) {
    const val = parseFloat(numMatch[1]);
    return isNaN(val) ? null : val;
  }

  const smalls: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90
  };

  const words = p.replace(/\band\b/g, '').split(/\s+/);
  let total = 0;
  let current = 0;
  let foundNumber = false;

  for (const w of words) {
    if (smalls[w] !== undefined) {
      current += smalls[w];
      foundNumber = true;
    } else if (w === 'hundred') {
      current = current === 0 ? 100 : current * 100;
      foundNumber = true;
    } else if (w === 'thousand') {
      current = current === 0 ? 1000 : current * 1000;
      total += current;
      current = 0;
      foundNumber = true;
    } else if (w === 'lakh' || w === 'lac') {
      current = current === 0 ? 100000 : current * 100000;
      total += current;
      current = 0;
      foundNumber = true;
    }
  }

  total += current;
  return foundNumber ? total : null;
}

/**
 * Parses natural spoken sentences into structured transaction fields
 */
export function parseVoiceTranscript(transcript: string): ParsedVoiceEntry {
  const t = transcript.trim();
  const lower = t.toLowerCase();

  // 1. Detect Event Type
  let type: EventType = 'purchase';
  if (lower.includes('received') || lower.includes('salary') || lower.includes('income') || lower.includes('earned') || lower.includes('credited')) {
    type = 'income';
  } else if (lower.includes('refund')) {
    type = 'refund';
  } else if (lower.includes('card payment') || lower.includes('paid credit card') || lower.includes('repaid card')) {
    type = 'card_payment';
  } else if (lower.includes('transfer') || lower.includes('moved to')) {
    type = 'own_transfer';
  }

  // 2. Extract Amount
  let amountPaise: number | null = null;
  // Look for numeric amounts like "120", "₹ 250", "340.50"
  const amountMatch = lower.match(/(?:₹|rs\.?|inr|rupees)?\s*(\d+(?:\.\d{1,2})?)\s*(?:rupees|rs)?/);
  if (amountMatch && amountMatch[1]) {
    const amt = parseFloat(amountMatch[1]);
    if (!isNaN(amt)) {
      amountPaise = toPaise(amt);
    }
  }

  // Fallback to word-based numbers if no digits
  if (!amountPaise) {
    const wordAmt = wordsToNumber(lower);
    if (wordAmt !== null && wordAmt > 0) {
      amountPaise = toPaise(wordAmt);
    }
  }

  // 3. Extract Recipient / Merchant
  let recipient: string | null = null;
  const atMatch = t.match(/(?:at|to|from|for)\s+([A-Za-z0-9 &.,'-]{2,35})/i);
  if (atMatch && atMatch[1]) {
    recipient = atMatch[1].split(/\s+(?:using|via|from|with|on|in|rs|rupees)\b/i)[0].trim();
  }

  if (!recipient) {
    // If text is short like "120 cafe, upi", grab text after amount
    const parts = t.split(/[,]+/);
    if (parts.length > 0) {
      recipient = parts[0].replace(/\d+|₹|rs\.?|inr|paid|spent/gi, '').trim();
    }
  }

  if (!recipient || recipient.length === 0) {
    recipient = type === 'income' ? 'Client / Employer' : 'General Merchant';
  }

  // 4. Account Hint (e.g. HDFC, ICICI, SBI, Cash, Card)
  let accountHint: string | null = null;
  if (lower.includes('hdfc')) accountHint = 'hdfc';
  else if (lower.includes('icici')) accountHint = 'icici';
  else if (lower.includes('sbi')) accountHint = 'sbi';
  else if (lower.includes('cash') || lower.includes('wallet')) accountHint = 'cash';
  else if (lower.includes('card')) accountHint = 'card';

  // 5. Category suggestion
  let category = suggestCategoryForMerchant(recipient);
  if (category === 'General') {
    if (lower.includes('dinner') || lower.includes('lunch') || lower.includes('breakfast') || lower.includes('food') || lower.includes('coffee') || lower.includes('cafe') || lower.includes('meal')) {
      category = 'Food & Dining';
    } else if (lower.includes('travel') || lower.includes('ride') || lower.includes('cab') || lower.includes('fuel')) {
      category = 'Transportation';
    } else if (lower.includes('salary') || lower.includes('freelance') || lower.includes('dividend')) {
      category = 'Income';
    }
  }

  // 6. Confidence Score
  let confidence = 0.4;
  if (amountPaise !== null) confidence += 0.35;
  if (recipient && recipient !== 'General Merchant') confidence += 0.25;

  return {
    rawTranscript: t,
    type,
    amount_paise: amountPaise,
    amount_formatted: amountPaise !== null ? formatRupees(amountPaise) : null,
    recipient,
    date: new Date().toISOString().split('T')[0],
    category,
    account_hint: accountHint,
    confidence_score: Math.min(1.0, confidence)
  };
}

/**
 * Realistic spoken samples for testing audio / dictation capture
 */
export const SAMPLE_VOICE_TRANSCRIPTS = [
  'Paid 180 rupees for coffee at Blue Tokai via HDFC',
  'Spent four hundred and fifty on dinner at Mainland China',
  'Received freelance income 25000 from Acme Designs in HDFC',
  'Spent 320 at Swiggy Instamart for milk and groceries',
  '120 cafe, UPI'
];

/**
 * Browser Speech Recognition Helper
 */
export class SpeechRecognitionService {
  private recognition: any = null;
  public isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-IN';
        this.isSupported = true;
      }
    }
  }

  start(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (err: any) => void,
    onEnd: () => void
  ) {
    if (!this.recognition) {
      onError(new Error('Speech recognition is not supported in this browser.'));
      return;
    }

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      onResult(final || interim, Boolean(final));
    };

    this.recognition.onerror = (event: any) => {
      onError(event.error);
    };

    this.recognition.onend = () => {
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      // Already started
    }
  }

  stop() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
      }
    }
  }
}
