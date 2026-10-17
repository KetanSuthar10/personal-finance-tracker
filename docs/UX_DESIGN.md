# UX and design direction

Status: proposed design defaults for M0 review. Visuals are not implemented yet.

## Principles

Make the first screen answer: What came in? What went out? What is due? How current is this information? Use plain financial language and readable INR formatting. Keep the interface calm: neutral background, one primary accent, clear hierarchy, restrained charts. Category colours supplement labels. Light-first theme is a proposed default; dark mode is optional later.

## Navigation and layout

Desktop: persistent left navigation, content header with period selector, account filter and Add entry action. Phone: compact header, bottom navigation for Overview, Transactions, Commitments, and More. Assistant and Add entry have clear reachable actions; do not crowd the bottom bar with every feature. Content reflows; page-wide horizontal scrolling is unacceptable.

Primary destinations: Overview; Transactions; Accounts; Cards & EMIs/Commitments; Imports & Review; Assistant; Settings. In M1, unavailable destinations are labelled as upcoming rather than appearing functional. Keep user-facing screens free of database table names, API jargon, and token settings except in an advanced integration/settings view.

## Overview

Header: selected month, data-as-of note, account selection. Cards: Received income, Spending, Liquid funds, Upcoming commitments. Put the planning estimate below them with an expandable explanation; never mix credit limit with liquid cash. An unobtrusive review badge shows uncertain/new payments.

Desktop main area: spending by category and a time trend; next to or below them, upcoming payments and recent transactions. Phone: cards in a readable grid, then upcoming payments, category list/chart and recent entries. Charts must have text equivalents and useful empty states. The user should reach the supporting transaction list from every summary.

## Transactions

Search recipient/description, filter by date/account/category/type/review status. Show date, recipient, category, account/method, amount and source/review badge. On phone use stacked rows rather than tiny desktop columns. A detail drawer exposes editable fields, original source observations, matched imports, financial role, rule used and change history.

Bulk categorisation must preview the selected scope. Provide explicit controls: apply to selected entries; save future rule; optionally preview matching historical entries. Do not automatically convert a one-off correction into a universal recipient rule.

## Add entry

Text and form modes share one entry drawer/sheet. Text examples: `120 cafe UPI today`, `60 parking cash`. Dictation fills the same editable text field. Parsed preview includes amount, date, type, account, recipient, category and confidence/unknown fields. Use the owner's configured defaults when unambiguous. The form always remains usable without Gemini.

Distinguish income, expense, refund, own transfer, and card payment. A transfer/card payment asks for source and destination. Money amounts must be validated in paise; do not silently change a spoken amount. Saved entries appear in recent activity with a correction route.

## Imports and review

Steps: select account/file; extract/map; preview; resolve critical problems; commit; show import receipt. Extraction preview includes row counts, duplicates/candidates, unknown categories, unsupported rows and date/balance checks. Each unsupported format reports what failed and offers a mapping/manual route. Never display a fake success because a file was selected.

Review queue groups by problem: new recipient, uncertain category, possible duplicate, account mismatch and extraction error. Batch review is supported where one explanation applies to several rows. Each accepted change can be traced to a rule or explicit decision. Show the impact of undoing an import before applying it.

## Cards and EMIs

Card view: statement period, statement total, remaining statement due, due date, payments recorded, unbilled activity, recorded outstanding, and freshness. EMI panel: merchant/purchase, principal, scheduled instalment, next due date, instalments remaining, recorded fees/interest and uncertainties. A credit-card EMI already in a bill must not also appear as an extra upcoming payment.

Partially paid bills show remaining statement amount rather than disappearing. Distinguish estimates from issuer facts. Do not promise that paying a calculated amount prevents all interest.

## Assistant

Assistant opens as a panel on desktop and full-screen route on phone. Suggested questions use available records. Answers show period, source freshness, supporting totals/links and relevant assumptions. Show a compact action preview for changes to records or rules. Read-only questions do not require confirmations. Saving an instruction such as `remember this merchant as cafe` can use the explicit instruction as authorisation; make the stored scope visible and editable.

When Gemini is unavailable, show a useful retry state and keep the rest of the app active. Sample responses must say Demo and must not pretend to be a live integration. No decorative chat that cannot inspect real app data.

## Settings

Account labels, payday/horizon, savings allocation/minimum balance, category/rule editor, privacy/original file retention, export/restore, integration status and notification choices. Advanced AI status may show configured provider/model, remaining app allowance and last success; never show stored secrets.

## QA states

Cover empty account, no selected-period transactions, negative balances, overpaid card, partial repayment, malformed import, unsupported PDF, ambiguous recipient, pending income, stale statement, offline/expired session, failed sync, AI quota exceeded, and export/restore error. Use labels and icons in addition to colour. Preserve user input after recoverable errors.

## Scope boundary

Exact pixel wireframes, final palette, component inventory and interactive visuals are M0/M1 design work. These documents define behaviour without claiming a completed UI. Receipt extraction and uploaded voice notes follow the input milestones; phone keyboard dictation can be used earlier subject to device capabilities and data-processing choices.
