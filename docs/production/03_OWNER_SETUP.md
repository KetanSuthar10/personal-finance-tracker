# Owner setup at the relevant task

You do not need to share your Google password, OTP, refresh token or API secret in a chat. Antigravity should write and check the code first, give the exact setup step, and verify the live result after you configure the provider. No new paid plan or billing activation is authorised by this pack.

## Before T00–T01

- Open your existing Git repository in Antigravity.
- Add this pack as described in `START_HERE.md`.
- Keep existing local changes. No account information is required for baseline/domain repairs.

## At T02–T03: Supabase and Google

- Reuse an appropriate existing Supabase project or create a project within the provider's available free allowance after checking its current plan settings. Record region/project reference privately. Do not upgrade or add a payment method as a workaround.
- Choose the one Google account that will own this app. A second non-owner test identity can verify denial without receiving financial access.
- Use the current Supabase Google-provider guide. Configure a Google Cloud Web OAuth client with only the normal identity/profile/email scopes; no Drive/Gmail scope is required.
- Copy the Supabase callback URL from its provider dashboard into Google's authorised redirect configuration. Add the exact app origin to the OAuth configuration. Configure Supabase's site URL and the actual app callback route for the existing Vercel domain and chosen development environment. Do not guess project IDs, broad wildcard preview redirects or callback paths.
- Enter the Google OAuth client ID/secret in Supabase's provider configuration. The secret does not belong in the React app.
- Put the project URL and publishable key into the frontend environment using the exact names documented by the implementation, initially `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The publishable key is intended for clients; RLS and grants remain mandatory.
- After the selected account's verified sign-in establishes its Supabase UUID, set that UUID through trusted server/admin setup as the owner. New users cannot write or claim this configuration. Confirm the selected owner has access and all others do not.
- Apply reviewed migrations to an isolated test environment first. Use current CLI documentation/help and record migration results. Do not apply destructive production changes without a protected backup and the necessary owner decision.

**Needed evidence:** login/callback, refresh, logout, owner create/read/update, direct unauthorised table/RPC/Edge requests denied, and a record visible on the other device after refocus/refresh. Do not expose tokens in the evidence.

## Before T04/T08: statement layouts

- Identify one bank and one credit-card statement layout first. No actual bank-account number is needed for development.
- Prefer a redacted structural sample or a synthetic equivalent that preserves headers, columns, sign conventions, multi-page layout and dates.
- If a private real file is required to validate the actual adapter, keep it in a local ignored directory on your machine. Do not commit it, attach it to a public issue, or send it to an external model by default.
- Tell the agent whether the file is text PDF, scanned PDF, password-protected PDF, CSV or XLSX. Enter a PDF password only into the local unlock flow and do not save it.
- A layout not yet supplied stays unsupported or unverified. General-purpose extraction is not proof of a correct bank adapter.

## At T06: commitments and planning

Enter statement dates/totals/due dates and lender-provided EMI schedules privately through the app. Choose the planning horizon, reserve, essentials and savings allocation. Unknown interest, fees and expected income dates must stay explicit unknowns. A developer's placeholder schedule must not become your obligation.

## At T10: Gemini

- Inspect the actual API project in AI Studio/Google Cloud: currently available model, quota, billing/data-handling state and any existing credit eligibility. A consumer subscription is not evidence of those project settings.
- Enter `GEMINI_API_KEY` only in backend secrets. Set the supported model and usage allowance on the backend. Never use `VITE_GEMINI_API_KEY` or paste a key into the app's normal UI.
- Run a synthetic live test first. Record provider model/access/usage/error behaviour without recording the key or financial prompt.
- Before real finance prompts, verify an appropriate provider data route and the precise owner-approved usage/spend allowance. Current unpaid-service terms prohibit submitting sensitive/confidential/personal information; masking identifiers is not an automatic exemption.
- If activating the required route needs new spending, do not activate it under the current zero-new-spend constraint. Leave AI unavailable with a clear setup state, and continue independently usable finance features. Do not claim full release until mandatory AI activation/verification is resolved or the owner explicitly changes release scope.

## At T11–T12

Choose the phone/browser combination, grant microphone permission only when you use dictation, and verify voice handling on that device. Configure the existing Vercel environment/SPA routes and the approved callback URLs. Review the concrete release candidate before publishing when the current task does not already authorise deployment.

No Drive, n8n or messaging credentials are needed for this core build. Those integrations require a selected future workflow.
