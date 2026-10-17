# Decision log

18 October 2026 | Status reflects the conversation, not completed implementation.

## Confirmed by the owner

| ID | Decision |
| --- | --- |
| D01 | Personal finances only; one owner initially |
| D02 | Phone and laptop access through a web app/PWA |
| D03 | Monthly statements plus daily manual capture |
| D04 | Bank PDF/CSV/XLSX and credit-card PDF inputs; actual layouts to be discovered |
| D05 | Salary plus irregular additional income |
| D06 | Text, form, voice-to-text, recorded notes and receipt/screenshots are desired input methods |
| D07 | Remember scoped recipient/category rules and ask about unfamiliar transactions |
| D08 | Support cards paid fully, partial card payments, and purchase EMIs |
| D09 | Hosted Gemini is the selected AI; no local-model dependency or manual copy/paste workflow |
| D10 | Mask account/card identifiers before external AI processing |
| D11 | Target no new recurring paid subscriptions; no new spend authorised |
| D12 | Antigravity is installed and will be the primary local development environment |
| D13 | Documentation-first project starter; connect to the owner's Git later |

## Proposed implementation defaults

React/TypeScript/Vite, Tailwind/shadcn/ui/Recharts, Supabase database/Auth/Edge Functions, Google login, Cloudflare Pages. INR-only and Asia/Kolkata. Light-first, accessible mobile/desktop design. Synthetic local demo before credentials. n8n optional, outside the core request path. Original-document retention local/transient until a storage preference is chosen. Git repository working name `personal-finance-tracker`, Private visibility.

These are established planning recommendations, not statements that infrastructure is already active. Material changes should be recorded here; ordinary technical choices can be resolved within these defaults.

## Evidence and open items

| Item | Evidence / uncertainty | Earliest milestone affected |
| --- | --- | --- |
| Gemini project | Screenshot showed an existing key on a Free Tier project | M5 |
| Pro access | Screenshot showed Pro recognised for AI Studio chat | Development tool / account setup |
| Successful API calls and quotas | Not verified; get actual project limits and run a permitted test | M5 |
| Developer credits | Public docs list eligible Pro benefits; this account's redemption/eligibility unknown | M5 budget route |
| Prepaid activation | Current docs can require a paid balance before promotional credits; no top-up authorised | M5 real-data route |
| Real-data policy | Unpaid Gemini restrictions remain relevant despite masking; verify appropriate route | M5 |
| Statement layouts | Banks/cards and password/scanned formats not supplied | M2 adapters |
| Owner login | Account allowlist and production domain not selected | M3 |
| n8n | User reports subscription; hosted configuration, quotas and desired jobs unknown | Optional M7 |
| Voice | Phone/browser and transcription privacy route not selected | M6 |
| Notifications | In-app first is a proposal; external channel not chosen | M4/M7 |
| Savings/horizon | Owner's allocation and payday not supplied; use synthetic settings in demo | M4 real use |

None of these external-account items blocks documentation review or synthetic M1 development.

## Change record

- 2026-10-18: Created documentation starter from the agreed discussion. No code scaffold, provider account change, live inference, deployment, workflow or remote repository created.
