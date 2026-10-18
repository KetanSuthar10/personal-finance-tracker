# Acceptance tests and independent expected results

Use these as behavioural checks. Add regression tests to the appropriate domain, database and actual UI layer. Do not implement assertions by calling the same helper to calculate the expected result. All examples here are synthetic. Required live checks remain unverified until exercised.

## A. Canonical ledger fixture — INR, Asia/Kolkata

Opening positions as of 30 September 2026: Bank A ₹1,000; Bank B ₹0; Cash ₹200; Card C ₹0; Card D ₹0. All amounts below are rupees for readability; storage uses integer paise. Different cafe payments have distinct source identities.

| Date in October 2026 | Event | Account movement | Income | Spending |
| --- | --- | --- | --- | --- |
| 01 | Salary ₹5,000 | Bank A +5,000 | 5,000 | 0 |
| 03 | Cafe payment 1 ₹120 | Bank A −120 | 0 | 120 |
| 03 | Cafe payment 2 ₹120 | Bank A −120 | 0 | 120 |
| 04 | Pharmacy ₹120 | Bank A −120 | 0 | 120 |
| 04 | Parking ₹60 | Cash −60 | 0 | 60 |
| 05 | Grocery purchase ₹800 | Card C −800 | 0 | 800 |
| 07 | Card repayment ₹300 | Bank A −300; Card C +300 | 0 | 0 |
| 08 | Cash withdrawal ₹100 | Bank A −100; Cash +100 | 0 | 0 |
| 09 | Own-bank transfer ₹50 | Bank A −50; Bank B +50 | 0 | 0 |
| 10 | Received freelance income ₹1,000 | Bank A +1,000 | 1,000 | 0 |
| 12 | Grocery refund ₹100 | Card C +100 | 0 | −100 |
| 14 | Card fee ₹20 | Card C −20 | 0 | 20 |

For 1–31 October: received income **₹6,000**; net spending **₹1,140**; Bank A **₹6,190**; Bank B **₹50**; Cash **₹240**; Card C net position **−₹420**; Card D **₹0**. Liquid funds **₹6,480**, card outstanding **₹420**, closing net position **₹6,060**. Opening ₹1,200 + income ₹6,000 − spending ₹1,140 = ₹6,060.

For 5–31 October: carried opening net position **₹5,780**, income **₹1,000**, spending **₹720**, closing **₹6,060**. Transactions before the selected period remain part of the opening; they do not become current-period income.

## B. Required checks

| ID | Scenario | Expected behaviour |
| --- | --- | --- |
| AT01 | Run the fixture above and change the period | Exact balances/amounts above; all views and tools use the selected dates |
| AT02 | Enter purchase/refund/fee/transfer/repayment through each supported capture route | Identical canonical effect; transfer requires both accounts; refund reduces spending |
| AT03 | Impossible date, unsafe/NaN/fractional paise, missing amount, unknown account, same-account transfer | Rejected or clarified before any write; no invented ₹120 default |
| AT04 | Two ₹120 cafe payments and unrelated ₹120 pharmacy near the same date | All three can coexist; equal amounts alone never auto-merge |
| AT05 | One manual cafe payment plus two plausible imported rows | Uncertainty is reviewed; one event is not consumed twice; no amount disappears |
| AT06 | Identical source reference on another account | Not silently discarded; source/account context considered; cross-account transfer linking uses explicit evidence |
| AT07 | Import the same file twice and retry a timed-out commit | Zero inflation; idempotent result; no partial batch |
| AT08 | Import bank and card sides of a ₹300 repayment | One repayment, bank −300/card +300, zero income/spending |
| AT09 | Undo batch A when B/manual edits independently support its event | Remove A's contribution; preserve independent support and changes |
| AT10 | Invalid row, both debit/credit populated ambiguously, unsupported layout or mismatch with stated closing balance | Useful row-level review/error; no silent row loss or automatic full acceptance |
| AT11 | Save cafe category rule then enter/import future matching and nonmatching records | Scoped matches use the rule; manual override wins; nonmatches remain unchanged |
| AT12 | Same recipient used for two purposes/accounts; one-time correction and historical preview | Scope and precedence respected; no silent retroactive recategorisation |
| AT13 | Owner and non-owner/signed-out direct table/RPC/Edge requests | Only server-configured owner succeeds; forging owner fields/metadata fails |
| AT14 | Create/edit on laptop, refresh/refocus on phone; expire/revoke session and logout | Same committed data on both; clear session errors; owner data not retained across logout |
| AT15 | Concurrent edits/repeated saves and one failing transaction step | Version conflict or safe retry, never duplicate or half-written financial state |
| AT16 | Complete export, clean restore and a corrupt/semantically inconsistent export | Exact records, rules and links restored; invalid restore leaves old state intact |
| AT17 | Upload independent image “Audit Stationery, ₹987.65” | Actual OCR text/draft matches pixels or visibly requests correction; no canned cafe/UTR or manufactured 100% certainty |
| AT18 | Bank/card PDFs and XLSX in each declared supported layout | Parsed rows, headers/signs/dates and balance evidence verified; unsupported cases labelled |
| AT19 | Model returns malformed arguments, fake totals, another owner's ID or document-injected instructions | Rejected/clarified; no arbitrary tool/write/network action; figures remain tied to computed data |
| AT20 | Synthetic identifier in question, label, description and tool result | Final outbound requests contain aliases/allowed fields, not the identifier; no real data used to test leakage |
| AT21 | No key, 401, timeout, quota/rate limit and exhausted app allowance | Honest AI unavailable/error state; core tracking still works; no paid fallback/retry storm |
| AT22 | Change month/reserve/import/transaction after a cached answer | Correct recomputation/cache invalidation; assistant and dashboard agree |
| AT23 | Dictation/uploaded audio with cash, refund, Indian amount and yesterday date | Editable correct proposal or clarification; no automatic first-bank/today guess |
| AT24 | 360px/1366px, keyboard/zoom/dialogs, fresh offline reload and new deployment | Usable accessible states; app shell/update works; financial offline limits stated and no private-data cache |

## C. Isolated obligations checks

- **OC01:** Statement A total ₹1,000 and statement B total ₹2,000. One ₹500 payment allocated to A leaves A ₹500 and B ₹2,000. Combined remaining due is ₹2,500. Attempting to allocate that same ₹500 a second time must fail atomically.
- **OC02:** An instalment of ₹200 is already included in a fully paid statement. Its remaining obligation is ₹0; it must not reappear as a standalone ₹200 due.
- **OC03:** Three unpaid monthly ₹200 occurrences on 20 October, 20 November and 20 December fall within the 90-day horizon from 17 October. Include ₹600. Test a 45-day window that includes two occurrences as well. Do not just sum each plan's one next_due_date.
- **OC04:** In a separate 30-day planning fixture, liquid ₹5,000 − remaining card bills ₹2,500 − standalone due ₹200 − reserve ₹1,000 − essentials ₹300 − savings ₹200 = **₹800 planning estimate**. Expected freelance ₹900 does not increase actual liquid funds.
- **OC05:** Card payment on Card D cannot reduce Card C's statement. Allocation reversal/overpayment and a statement rollover preserve all balances and one-time spending recognition.
- **OC06:** Record purchase, EMI conversion, two instalments, principal/known interest/fees, refund and completion. Purchase spending is counted once, principal payments are not spending again, and supplied schedule balances reconcile. Unknown issuer amounts stay unknown.

## Evidence and environments

Each task report references relevant IDs plus expected/observed outcomes. Record test commands, tested commit and environment. Domain checks cannot substitute for hosted auth, database transactional behaviour, actual OCR or a real synthetic Gemini request. Release evidence includes a private owner workflow, non-owner denial and the chosen real phone/browser. Do not put private financial data into Git to satisfy evidence requirements.
