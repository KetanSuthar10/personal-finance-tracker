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

## Production master plan decisions (T00 transition)

| ID | Decision | Reference |
| --- | --- | --- |
| D14 | Transition from initial prototype/milestone sequence to the Production Transition Pack (`docs/production/00_MASTER_PLAN.md`). M0–M6 status retired as prototype-only; verified production tasks are tracked in `docs/production/STATUS.md`. | [00_MASTER_PLAN.md](production/00_MASTER_PLAN.md) |
| D15 | Hosting: Retain existing Vercel deployment; supersedes earlier Cloudflare Pages recommendation to avoid unnecessary infrastructure migrations. | [00_MASTER_PLAN.md §2](production/00_MASTER_PLAN.md) |
| D16 | Production state: Production starts empty with zero seeded fixture data. Fails closed when unconfigured or unauthenticated; synthetic fixtures are strictly isolated to tests and dev mode. | [00_MASTER_PLAN.md §1](production/00_MASTER_PLAN.md) |
| D17 | Gemini architecture: Backend Edge Function proxy with server-side API key, rate limiting, and strict outbound masking. Browser-entered keys and simulated client-side OCR are gated as prototype previews. | [00_MASTER_PLAN.md §7](production/00_MASTER_PLAN.md) |
| D18 | Access control: Single-owner Google OAuth backed by Supabase Auth, PostgreSQL RLS policies, and server-configured owner UUID verification. | [00_MASTER_PLAN.md §6](production/00_MASTER_PLAN.md) |
| D19 | Financial writes: Transactional PostgreSQL RPCs enforcing event/posting balance invariants and idempotency at the database boundary. | [00_MASTER_PLAN.md §3](production/00_MASTER_PLAN.md) |

## Implementation defaults

React/TypeScript/Vite, Tailwind CSS, Recharts, Supabase PostgreSQL/Auth/Edge Functions, Google OAuth, Vercel hosting. INR-only (integer paise) and Asia/Kolkata timezone. Responsive mobile/desktop layout. Local synthetic fixtures for testing only.

## Evidence and open items

| Item | Evidence / uncertainty | Earliest task affected |
| --- | --- | --- |
| Supabase project & migrations | Unverified; project URL and keys needed in T02 | T02 |
| Google OAuth client | Unverified; Google Cloud Console credentials needed in T02 | T02 |
| Gemini project quota / route | Unverified; zero-spend verification needed in T10 | T10 |
| Statement layouts | Bank/card real PDF/CSV samples not yet supplied | T04 / T08 |
| Real browser OCR | Client image-to-text OCR engine needed for AT17 | T09 |

## Change record

- 2026-10-18: Created documentation starter from agreed requirements.
- 2026-10-18: Executed T00 baseline reconciliation. Formally adopted Production Transition Pack (`docs/production/00_MASTER_PLAN.md`), merged `AGENTS_UPDATE_INSTRUCTIONS.md` into `AGENTS.md`, aligned hosting on Vercel, gated prototype OCR/Gemini paths, and established production evidence ledger.
