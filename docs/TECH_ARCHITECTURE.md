# Technical architecture

Status: proposed implementation architecture; no infrastructure provisioned.

## Stack

| Layer | Proposed choice | Boundary |
| --- | --- | --- |
| Client | React, TypeScript, Vite | Responsive SPA; installable PWA later |
| Design | Tailwind, shadcn/ui, Recharts | Accessible components and readable chart alternatives |
| Validation | Shared TypeScript schemas, e.g. Zod | Validate imports, form input and AI tool arguments |
| Data | Supabase PostgreSQL | Persistent shared financial source of truth |
| Auth | Supabase Google OAuth | Owner account initially; RLS plus backend ownership |
| API | Supabase Edge Functions | Authentication, queries/tools, Gemini calls and secrets |
| Extraction | PDF.js, a CSV parser, an XLSX parser, Tesseract.js | Browser-local extraction where feasible; bank-specific adapters |
| AI | Gemini API behind an adapter | Configurable model; deterministic domain code supplies figures |
| Hosting | Cloudflare Pages Free | Frontend/static assets; verify SPA routing |
| Background jobs | Optional existing n8n subscription | Scheduled notifications, selected Drive intake and backups later |

Check and pin actual library versions when scaffolding. No package/runtime version is implied by this starter. Use a currently supported Node LTS compatible with the chosen Vite release; record exact versions and run commands in README at M1 completion.

## Suggested modules after scaffolding

- `src/app/`: routing, app providers and shell.
- `src/features/`: overview, transactions, accounts, imports, commitments, assistant, settings.
- `src/domain/`: pure money, event/posting, categorisation, reconciliation and projection functions.
- `src/data/`: repository interfaces and explicit demo/Supabase implementations.
- `src/lib/`: shared validation, dates and formatting.
- `supabase/functions/`: authenticated backend endpoints and Gemini adapter when activated.
- `supabase/migrations/`: reviewed schema changes when M3 begins.
- `tests/`: meaningful domain, import and connected-boundary verification.

Folders above do not exist yet. Avoid creating empty architecture layers that deliver no milestone value.

## Data flows

Manual entry -> validated event + postings -> repository -> deterministic dashboard queries. Demo mode uses synthetic records through the same domain/repository contracts; connected mode uses owner-scoped database records.

Import -> browser extraction -> source rows + normalised candidates -> account/date/amount checks -> match/review -> canonical events + postings -> import receipt. File parsing is not automatic financial correctness. Preserve unsupported/uncertain rows. Scanned PDFs require page rendering before OCR; Tesseract does not directly understand PDF transactions. Heavy OCR stays off small serverless request paths unless profiling justifies another design.

AI request -> authenticated backend -> appropriate owner-scoped tools -> identifier masking/context selection -> Gemini -> schema-validated result -> answer/action UI. Provider responses and imported text are untrusted. Tool names and arguments come from an allowlist; the model cannot run arbitrary SQL, shell commands or unrestricted URLs. It cannot select a different user's data.

## Gemini strategy

Chosen provider: Gemini, explicitly selected by the owner. Initially evaluate a supported Flash-Lite model using synthetic tasks; reserve more capable included models for demonstrated needs. Exact model IDs and quotas must be verified at integration time and be configurable server-side. The development model in Antigravity is separate from app inference.

The API supplies inference, not durable memory. Save category rules, transaction history and preferences in PostgreSQL. Useful tools include get_period_summary, search_transactions, get_upcoming_commitments, propose_entry and save_explicit_category_rule. Scope tool results by user, dates and row limits. Validate mutations and display their impact; preserve a clear edit/undo history.

Keep token usage bounded: deterministic matching first; selective relevant records; aggregate numeric summaries; short structured outputs; explicit tool-call/output limits; cache explanation by input/version fingerprint. Invalidate on relevant edits/imports. Record model/token/latency metadata without logging financial prompts. Enforce a conservative application allowance and stop AI requests on exhaustion. Provider billing controls are not necessarily instantaneous hard caps. No paid or alternate-provider fallback is authorised.

## Real-data activation gate

Observed evidence: screenshots showed Pro recognition inside AI Studio and an API key for a Free Tier project. No successful API call, quota, redeemed credit or paid-service entitlement has been verified. Google AI Pro developer credits may offset charges only after eligibility/activation, and prepaid setups can require an initial purchase. Do not promise zero upfront spend or enable billing as part of routine coding.

Unpaid Gemini terms restrict sensitive/personal submissions. Masking account numbers alone does not establish that a personal finance history is permissible. Real-data inference requires a verified appropriate route (typically billing-enabled paid-service terms) and explicit budget authorisation if any new spending is necessary. Synthetic app work and core tracking remain independent. Do not send real statement PDFs/screenshots to a free extraction/vision service to bypass this gate.

For voice capture, start with editable device dictation. Uploaded audio cannot be reliably masked before transcription by simply removing fields afterward; select its processing route explicitly at that milestone. Do not claim browser speech recognition is universally offline/private.

## Storage/auth/privacy

Use user ownership on all financial entities; RLS on exposed tables, composite ownership constraints and authenticated backend endpoints. Never expose service-role secrets. Owner allowlisting must be enforced server-side in addition to RLS, not only by hiding pages. Google sign-in alone does not grant Drive permission.

Store parsed canonical records and necessary provenance. Default original-document retention is local/transient until the owner chooses otherwise. Optional retained files use private storage and authenticated access, with explicit delete/export semantics. Do not place financial uploads in the public static hosting directory. Do not log full descriptions containing identifiers, file passwords or audio by default.

PWA caching should cache app assets; financial response/offline caching needs an explicit retention/session design. Do not claim full offline financial sync merely by adding a service worker. Provide optimistic UI only with rollback and clear sync failure states. Export/restore is required because free database tiers may lack automatic backups.

## n8n role

n8n is not a dependency for dashboard rendering, manual entry, imports, login or chat. If the user's hosted subscription is confirmed and a workflow is chosen, it can call scoped authenticated app endpoints for due checks, a weekly summary, Drive intake or backup. Use job IDs/idempotency to prevent duplicate messages/imports. Set Asia/Kolkata explicitly for schedules. Avoid storing raw records in workflow execution logs; configure appropriate retention. No workflows or messages are scheduled by this starter.

## Deployment and reliability

Prototype local dev first; connected staging uses synthetic data before owner data. Verify auth redirects, RLS, SPA routes and backend secrets. Google OAuth production configuration must match the chosen domain. Core features should survive provider quota errors. Surface import/match failures and freshness gaps. Keep a tested export/restore path, bounded processing, and basic non-sensitive error monitoring within free limits.
