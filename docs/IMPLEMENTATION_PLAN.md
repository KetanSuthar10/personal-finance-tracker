# Implementation milestones

Only this documentation starter is delivered. All application milestones below are planned, not completed. Estimate effort after M0; no invented delivery dates.

## M0 — Review and implementation plan (next)

Read the repository, reconcile its scope, record assumptions and create `M1_TASK_PLAN.md`. Confirm local tools/version availability without requesting credentials. Update STATUS. Finish with the concrete M1 plan; app scaffolding begins on the user's instruction. This is the initial planning checkpoint requested for the project, not an approval requirement for every routine edit.

## M1 — Runnable synthetic-data foundation

Scaffold React/TypeScript/Vite with pinned dependencies and lockfile. Build the responsive shell, overview, accounts, transaction list and add/edit form. Put deterministic money/event/posting logic behind a repository contract and load the bundled synthetic fixture. Browser persistence is optional for synthetic demo data only; label it clearly. Provide reset-demo-data and meaningful empty/error states. Keep later features clearly labelled. Update README with exact install/run/check commands.

Done when the app starts locally, fixture totals reconcile, adding/editing an event updates relevant views, transfers/card payments are excluded from spending, and 360px/1366px views are verified. Run type/build checks and meaningful financial tests. Supply actual output/screenshots or a walkthrough, plus the exact command needed to reproduce them.

## M2 — Statement import and reconciliation

Implement a synthetic CSV mapping flow, then a PDF adapter for one identified statement format. Add extraction preview, source/batch provenance, failed-row review, matching and reversible imports. Verify password-protected/scanned PDF behaviour explicitly; unsupported cases must say so. The user's actual banks/cards are not known yet, so do not advertise universal PDF support. Develop against synthetic fixtures and add real layout support only through an appropriate local/private handling route.

Done when importing a batch twice is safe; a manual expense plus matching row remains one expense; genuine repeated purchases remain distinct; import undo preserves independently entered data; and extraction failures are visible. Test bank/card repayment matching and balance discrepancies.

## M3 — Connected storage and authentication

Create reviewed Supabase schema, ownership policies, indexes and server boundaries using current docs. Configure Google sign-in for the chosen owner account and environment. Provide demo and connected repository adapters with honest mode labels. Implement a versioned export and controlled restore. Credentials are entered into local/backend settings rather than pasted into chat or committed.

Done when cross-device updates persist, unauthorised access is denied by database/backend checks, account isolation is tested, sessions and errors are handled, and export/restore reproduces the expected financial state. Any cloud account change must stay within the user-authorised scope and budget.

## M4 — Cards, EMI lifecycle and planning

Add statements, payments and allocations, partial remaining dues, unbilled postings, EMI plans/instalments, conversion handling, known interest/fees, and freshness. Implement a transparent planning horizon and user-defined allocations. Avoid duplicating obligations already in a card bill.

Done when a purchase, conversion, two instalments, partial bill payment, refund, fee and statement rollover reconcile in a documented fixture. Verify card overpayment, payment allocation changes and reversal. Explain unknown issuer calculations without guessing them.

## M5 — Integrated Gemini assistant

First validate current API model/quota and data-policy/budget route. Synthetic development remains possible without live keys. Build an authenticated Gemini adapter, structured schemas, limited owner-scoped tools, category rules, selective context, identifier masking and insight caching. Measure token usage on representative fixtures; impose conservative app-side limits and keep paid fallback disabled.

Done when a real permitted test call succeeds, answers use deterministic totals with supporting records, explicit learning instructions save correctly scoped rules, unknown purposes produce clarification, malicious document text cannot invoke arbitrary tools, and quota failure leaves tracking usable. Never mark live integration complete based only on screenshots of a key.

## M6 — Capture and release polish

Add receipt/payment screenshot OCR, XLSX adapters as needed, uploaded voice-note processing through an appropriate route, and editable dictation/entry previews. Verify installable PWA behaviour and decide what offline data, if any, is retained. Configure free hosting with correct auth redirects, routing, secret separation and production ownership controls.

Done when the selected capture methods are verified on target devices, the primary flows are accessible, production sign-in and private data access are checked, current backups can be restored, and the dashboard states data freshness honestly. Document remaining unsupported formats and device limitations.

## Optional M7 — Chosen n8n workflows

Confirm the subscription is hosted and choose workflows explicitly. Candidate jobs: daily due check, weekly report, selected Drive folder intake and backup. Use scoped authenticated endpoints, idempotency keys, Asia/Kolkata scheduling and minimal execution logging. Keep credentials in n8n's credential store/backend settings. Test notifications against a user-selected channel; do not send or schedule messages without authorisation.

## Session handoff format

Each completed session updates STATUS with: milestone; concrete changes; checks run and outcomes; known limitations; true blockers; independent work completed despite blockers; exact next action. After the first review checkpoint, routine reversible implementation/fixes continue within the authorised milestone. A blocked optional service does not justify pretending an entire milestone is waiting.
