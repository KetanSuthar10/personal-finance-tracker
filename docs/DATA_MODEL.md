# Data model and accounting conventions

Status: conceptual specification, not executable SQL. Final schema/migrations are M3 work.

## Shared fields and conventions

Every owner entity has an opaque `id`, `user_id`, `created_at`, and `updated_at` where meaningful. Record versions/updated timestamps support conflict detection. Persist INR as integer paise. Dates from statements are preserved as supplied plus normalised dates; timestamps use UTC and views default to Asia/Kolkata. Store transaction/posting/statement dates separately when available. Do not guess a missing year or ambiguous day/month silently.

Use a signed **net-position** convention for postings: asset increases are positive; asset decreases negative; liability increases negative; liability reductions positive. Card display translates a negative net position into positive outstanding and distinguishes a positive overpayment. Opening balances use the same convention and are excluded from period income/spending.

## Entities

| Entity | Important fields / purpose |
| --- | --- |
| profiles/settings | Owner timezone, currency, defaults, payday/horizon, forecast allocations |
| accounts | Label, type bank/cash/card/EMI-liability, opening date/position, optional masked display suffix, last verified as-of |
| categories | Label, income/expense applicability, optional parent; editable catalogue |
| counterparties | Stable internal identity and display alias; several normalised source descriptions can map to one counterparty |
| categorisation_rules | Owner, counterparty/description/account constraints, target category, precedence, active flag, explicit scope and provenance |
| financial_events | Economic event type, event date, recipient/category, amount, status, notes, linked purchase/refund/transfer/EMI and manual overrides |
| account_postings | Event/account references, signed delta in paise, posting date, reconciliation status; represent account balance movement |
| import_batches | Account, file fingerprint, parser/version, date range, review state, counts and undo state |
| source_observations | Batch/row or manual capture, external reference/fingerprint, extracted fields, optional normalised description; links to canonical event/posting |
| match_candidates | Observation/event proposals, confidence/reasons, accepted/rejected/manual decision |
| card_statements | Card, period, statement total, due date, closing position evidence, source batch; issuer facts distinguished from computed values |
| payment_allocations | Actual payment event allocated to statement/obligation; supports partial payments and avoids counting one payment twice |
| emi_plans | Original purchase, lender/card, original and remaining principal evidence, term, schedule convention, status and conversion references |
| obligations | Card bill, EMI instalment or recurring commitment; due amount/date, billed-in-statement link, settled amount/status, projection-only flag |
| expected_income | Expected amount/date/source/status; links to actual receipt rather than double-adding income |
| change_log | Subject, actor/source, safe before/after changes and reason; avoids secrets/full documents |
| insight_cache | Owner/period/context fingerprint, model metadata, validated explanation and generation time |

This is a logical model: combine entities only when their semantics remain clear. Do not create every table just to display M1 fixtures.

## Required relationships and ownership

An event has one or more postings and one or more source observations. Many source observations can describe one event. One batch has many observations; cancelling a batch removes or detaches its contributions, not manually entered data belonging to another source. Refunds link to original purchases when known. A card payment event links bank and card postings; its allocation reduces a statement obligation. An EMI instalment can be included in one card statement, and that link prevents double-reserving funds in forecasts.

Every cross-entity foreign key must preserve ownership: do not allow a user's event to reference another user's account/rule/statement. Enforce with database constraints/policies and backend validation. User-editable profile metadata is not an authorisation source. Add indexes for owner/date, account/posting date, category/date, counterparty, batch fingerprint and external source reference as justified by actual queries.

## Core examples

Bank cafe payment of INR 120: bank posting -12000; one spending event +12000 for reporting.

Card purchase of INR 800: card posting -80000; one spending event +80000. Card repayment of INR 300: bank -30000 and card +30000; no spending or income. Both rows in a bank and card import link to the same repayment, not two repayments.

Own bank-to-cash transfer of INR 100: bank -10000 and cash +10000; no spending or income. A merchant refund of INR 100: appropriate account posting +10000 and linked spending reduction -10000, not salary. A fee of INR 20 increases spending and reduces net position by 2000.

EMI conversion requires issuer-layout-specific handling: retain original purchase recognition, reclassify liability where needed, and link future principal/charges to the schedule. A conversion credit is not necessarily a refund; a statement instalment is not necessarily a new purchase. If the importer cannot reconcile the issuer's conversion rows, send them to review rather than forcing a simple category rule. Validate this lifecycle before enabling real EMI totals.

## Matching rules

Prefer provider references scoped to owner/account/source; then file/batch hashes and stable row fingerprints. Use amount/date/description/account proximity to propose matches, not as a universal unique constraint. Repeated same-amount cafe payments may be legitimate. Manual-versus-import, bank-versus-card repayment, refunds, and pending-versus-posted entries have different match logic. Pending entries do not silently affect settled totals twice. Preserve decisions and provenance.

Owner category overrides outrank automatic suggestions. A rule's match identifies a purpose only within its explicit constraints. Preserve original counterparty aliases locally; identifiers sent to Gemini should be masked or replaced with stable internal aliases as appropriate.

## Balance reconciliation

Computed account position = opening position + accepted postings after the opening cutoff. Compare with statement position at the same date/cutoff and account convention. Show discrepancy and missing-date evidence. Do not adjust an account silently to make a dashboard balance. A manual adjustment is a separately identified reconciliation event and is not ordinary income/spending.

## Forecast deduplication

Forecast only unsettled obligations in an explicit horizon. Deduct a card bill once; exclude its already-included EMI instalments from additional deductions. Link payment allocations and remove settled portions. Retain unbilled future commitments separately. Expected freelance income is excluded from conservative available-money estimates until received; an optional scenario can include it with a visible label.

## Synthetic fixture checks

The bundled [demo-transactions.json](../fixtures/demo-transactions.json) uses this net-position convention. Expected closing positions: bank INR 6,480; cash INR 240; card INR -420 (display outstanding INR 420). Received income INR 6,000; net spending INR 900; liquid funds INR 6,720; net position across all accounts INR 6,300. Opening net position INR 1,200 + income INR 6,000 - spending INR 900 = closing INR 6,300.

## Export and deletion

Version exports and preserve IDs/relationships, money convention, timezone, source provenance and rules. Restore validates schema, ownership, checksums/counts and reconciliation before committing. Never export API secrets. Define whether original documents are included separately. Deletion and undo must not leave orphan payment allocations, false settled obligations or unsupported balance changes.
