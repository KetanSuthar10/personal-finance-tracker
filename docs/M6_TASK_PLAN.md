# M6 Task Plan — Multi-Mode Capture, Receipt OCR & PWA Release Polish

**Milestone:** M6  
**Focus:** Payment screenshot & receipt OCR capture, voice-to-text dictation & voice-note intake, editable capture previews, PWA installability, and release polish.  
**Requirement Source:** [docs/PRD.md](file:///c:/Users/Suthar/Documents/personal-finance-tracker/docs/PRD.md#L16-L30), [docs/IMPLEMENTATION_PLAN.md](file:///c:/Users/Suthar/Documents/personal-finance-tracker/docs/IMPLEMENTATION_PLAN.md#L39-L44), [AGENTS.md](file:///c:/Users/Suthar/Documents/personal-finance-tracker/AGENTS.md).

---

## 1. Objectives & Invariants

1. **Client-Side Privacy for Media & Receipts**:
   - Image and audio files remain strictly client-side. No sensitive screenshots or voice recordings are uploaded to unverified external cloud endpoints.
   - Extracted metadata is sanitized before any downstream processing.
2. **Deterministic Extraction & Editable Uncertainty**:
   - Optical Character Recognition (OCR) and voice transcription extract candidate values: amount (paise), merchant/recipient, transaction date, and payment ref.
   - All extracted drafts are presented in an editable confirmation modal. The user can adjust any field before it is committed to the ledger.
3. **Unified Daily Capture Drawer / Modal**:
   - Integrates:
     - 📸 **Receipt & Payment Screenshot Capture** (file upload, drag-and-drop, clipboard paste).
     - 🎙️ **Voice Dictation & Audio Notes** (live Web Speech API microphone dictation + recorded audio note file upload).
     - ✍️ **Fast Natural Language Quick Entry** (e.g. `120 cafe, UPI`).
4. **PWA Installability & Offline Resilience**:
   - `manifest.webmanifest` with modern PWA configuration.
   - Service worker script with cache-first asset strategy.
   - Online/Offline status indicator in the shell.
5. **Data Freshness Distinction (AC09)**:
   - Clear UI tags distinguishing verified statement balances from recent unverified manual entries.

---

## 2. File & Component Structure

### New Domain Modules:
- `src/domain/ocr.ts`:
  - Heuristic parser and regex extractors for Indian payment receipt texts (UPI GPay, PhonePe, Paytm, POS charge slips).
  - Extract: amount in integer paise, date (`YYYY-MM-DD`), merchant name, UTR / Ref number.
- `src/domain/voice.ts`:
  - Speech text parser: parses spoken Indian English queries into structured amounts, dates, and accounts (e.g. `"Paid 350 for dinner at Mainland China using HDFC"`).
  - Web Speech API wrapper with fallback for browsers without SpeechRecognition.

### UI Components (`src/features/capture/`):
- `QuickCaptureModal.tsx`: Multi-tab capture dialog (Screenshot OCR, Voice Dictation, Fast Text).
- `ReceiptCaptureTab.tsx`: Image uploader, thumbnail preview, extracted text display, and candidate field reviewer.
- `VoiceCaptureTab.tsx`: Microphone record button with visual audio pulse, transcript box, and parsed draft preview.
- `CaptureDraftReview.tsx`: Common editable review component ensuring user signs off on parsed amounts before committing.

### Static / PWA Files:
- `public/manifest.webmanifest`: Progressive Web App manifest.
- `public/sw.js`: Service worker for offline asset caching.
- `src/components/common/OfflineBanner.tsx`: Non-intrusive offline status toast.

### Tests:
- `src/tests/ocr.test.ts`: Test parsing of UPI payment screenshots (Google Pay, PhonePe, Paytm) and store bills.
- `src/tests/voice.test.ts`: Test parsing of spoken phrases with currency, dates, and merchants.

---

## 3. Verification & Acceptance Criteria
- Unit tests pass with 100% success (`npm test`).
- Production build succeeds cleanly (`npm run build`).
- Responsive layout verified at 360px and 1366px.
- Verified capture of receipt screenshot and voice dictation into valid ledger events.
