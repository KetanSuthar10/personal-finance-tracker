import { toPaise, formatRupees } from './money';

export interface ExtractedReceiptData {
  rawText: string;
  amount_paise: number | null;
  amount_formatted: string | null;
  recipient: string | null;
  date: string | null;
  ref_no: string | null;
  category_suggestion: string | null;
  confidence_score: number;
}

/**
 * Normalizes dates like "18 Oct 2026", "18/10/2026", "2026-10-18" into YYYY-MM-DD
 */
export function normalizeReceiptDate(dateStr: string): string | null {
  const clean = dateStr.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  // DD Mon YYYY (e.g. "18 Oct 2026", "18 October 2026")
  const textMonthMatch = clean.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (textMonthMatch) {
    const day = textMonthMatch[1].padStart(2, '0');
    const monthName = textMonthMatch[2].slice(0, 3).toLowerCase();
    const year = textMonthMatch[3];

    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };

    const month = months[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Suggests a category based on recognized merchant keywords
 */
export function suggestCategoryForMerchant(merchant: string): string {
  const m = merchant.toLowerCase();
  if (m.includes('cafe') || m.includes('coffee') || m.includes('starbucks') || m.includes('swiggy') || m.includes('zomato') || m.includes('restaurant') || m.includes('kitchen') || m.includes('bakery')) {
    return 'Food & Dining';
  }
  if (m.includes('uber') || m.includes('ola') || m.includes('metro') || m.includes('fuel') || m.includes('petrol') || m.includes('bpcl') || m.includes('hpcl') || m.includes('ioc')) {
    return 'Transportation';
  }
  if (m.includes('supermarket') || m.includes('mart') || m.includes('grocer') || m.includes('blinkit') || m.includes('zepto') || m.includes('instamart') || m.includes('spencer') || m.includes('basket')) {
    return 'Groceries';
  }
  if (m.includes('netflix') || m.includes('spotify') || m.includes('prime') || m.includes('hotstar') || m.includes('cinema') || m.includes('pvr') || m.includes('inox')) {
    return 'Entertainment';
  }
  if (m.includes('pharmacy') || m.includes('med') || m.includes('apollo') || m.includes('hospital') || m.includes('clinic')) {
    return 'Health & Medical';
  }
  if (m.includes('airtel') || m.includes('jio') || m.includes('bescom') || m.includes('electricity') || m.includes('water') || m.includes('broadband')) {
    return 'Utilities';
  }
  return 'General';
}

/**
 * Extracts structured financial fields from OCR text of Indian payment apps & bills
 */
export function parseReceiptText(text: string): ExtractedReceiptData {
  if (!text || text.trim().length === 0) {
    return {
      rawText: '',
      amount_paise: null,
      amount_formatted: null,
      recipient: null,
      date: null,
      ref_no: null,
      category_suggestion: null,
      confidence_score: 0
    };
  }

  let amountPaise: number | null = null;
  let recipient: string | null = null;
  let date: string | null = null;
  let refNo: string | null = null;
  let confidencePoints = 0;

  // 1. Amount Extraction
  // Prioritize explicit Total / Paid keywords over individual line item amounts
  const amountPatterns = [
    /(?:total amount paid|total paid|total amount|grand total|bill amount|final amount|total)\s*[:=]?\s*(?:₹|inr|rs\.?)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:paid to|paid successfully to|paid)\s*[:=]?\s*(?:₹|inr|rs\.?)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:₹|inr|rs\.?)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleanNumStr = match[1].replace(/,/g, '');
      const parsedNum = parseFloat(cleanNumStr);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        amountPaise = toPaise(parsedNum);
        confidencePoints += 35;
        break;
      }
    }
  }

  // 2. Recipient / Merchant Extraction
  // Look for "Paid to X", "To: X", "Merchant: X", "Payment to X"
  const recipientPatterns = [
    /(?:paid to|payment to|to:)\s+([A-Za-z0-9 &.,'-]{3,40})/i,
    /(?:merchant|store|biller name)\s*[:=]?\s*([A-Za-z0-9 &.,'-]{3,40})/i,
    /paid successfully to\s+([A-Za-z0-9 &.,'-]{3,40})/i
  ];

  for (const pattern of recipientPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].split(/\n|UPI|ID|on |at |using/i)[0].trim();
      if (candidate.length >= 3) {
        recipient = candidate;
        confidencePoints += 30;
        break;
      }
    }
  }

  // Fallback recipient from top line if not explicitly matched
  if (!recipient) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    for (const line of lines) {
      if (!/(?:paid|success|transaction|receipt|bill|upi|google|phonepe|paytm)/i.test(line)) {
        recipient = line.slice(0, 35);
        confidencePoints += 15;
        break;
      }
    }
  }

  // 3. Date Extraction
  const datePatterns = [
    /\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/,
    /\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/,
    /\b(\d{4}-\d{2}-\d{2})\b/
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const normalized = normalizeReceiptDate(match[1]);
      if (normalized) {
        date = normalized;
        confidencePoints += 20;
        break;
      }
    }
  }

  if (!date) {
    // Default to today if no date found
    date = new Date().toISOString().split('T')[0];
  }

  // 4. Ref / UTR number extraction
  const refPatterns = [
    /(?:upi\s*(?:ref|transaction|txn)\s*(?:id|no)?)\s*[:=]?\s*([A-Za-z0-9]{8,24})/i,
    /(?:utr|rrn)\s*[:=]?\s*([0-9]{10,16})/i,
    /(?:google\s*transaction\s*id)\s*[:=]?\s*([A-Za-z0-9_-]{10,28})/i
  ];

  for (const pattern of refPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      refNo = match[1].trim();
      confidencePoints += 15;
      break;
    }
  }

  const categorySuggestion = recipient ? suggestCategoryForMerchant(recipient) : 'General';
  const confidenceScore = Math.min(1.0, confidencePoints / 100);

  return {
    rawText: text,
    amount_paise: amountPaise,
    amount_formatted: amountPaise !== null ? formatRupees(amountPaise) : null,
    recipient: recipient || 'Unknown Merchant',
    date,
    ref_no: refNo,
    category_suggestion: categorySuggestion,
    confidence_score: confidenceScore
  };
}

/**
 * Pre-packaged realistic sample payment screenshot texts for 1-click synthetic evaluation
 */
export const SAMPLE_RECEIPT_FIXTURES = [
  {
    name: 'Google Pay — Blue Tokai Coffee',
    type: 'UPI Screenshot',
    text: `Google Pay
Paid to Blue Tokai Coffee Roasters
₹240.00
Completed • 18 Oct 2026, 09:42 am
UPI transaction ID: 429184918291
To: bluetokai@hdfcbank
From: Suthar (HDFC Bank ...1234)
Google transaction ID: CICAgKCOh5fnXA`
  },
  {
    name: 'PhonePe — Swiggy Food Delivery',
    type: 'Food Delivery',
    text: `PhonePe
Payment to Swiggy
₹485.50
Transaction Successful
Date: 17 Oct 2026 at 8:15 PM
UTR: 429104928172
Debited from: HDFC Bank **1234`
  },
  {
    name: 'Paytm — Indian Oil Fuel Station',
    type: 'Fuel Receipt',
    text: `Paytm
Paid successfully to Indian Oil Petrol Pump
₹1,500.00
16 Oct 2026, 11:20 AM
UPI Ref No: 429019284719
Order ID: PYTM_9182918`
  },
  {
    name: 'Retail Store POS Bill — Nature Basket',
    type: 'Paper POS Bill',
    text: `NATURE BASKET RETAIL LTD
Store #104, Indiranagar, Bangalore
Date: 15/10/2026   Time: 18:45
TAX INVOICE
Item 1: Organic Almonds    ₹420.00
Item 2: Sourdough Bread    ₹160.00
Item 3: Fresh Milk 1L      ₹70.00
---------------------------------
TOTAL AMOUNT PAID: ₹650.00
Paid via Credit Card: **** 5678
Auth Code: 019284`
  }
];
