# Official integration references

Checked 18 October 2026. These links guide implementation; recheck current provider docs, installed SDK versions, project limits and deprecations at the integration task. Project configuration has not been verified by reading documentation.

| Topic | Reference |
| --- | --- |
| Google sign-in with Supabase | https://supabase.com/docs/guides/auth/social-login/auth-google |
| RLS, grants and policy tests | https://supabase.com/docs/guides/database/postgres/row-level-security |
| Authenticated Edge Functions | https://supabase.com/docs/guides/functions/auth |
| Supabase changes | https://supabase.com/changelog.md |
| Gemini terms/data handling | https://ai.google.dev/gemini-api/terms |
| Gemini API billing | https://ai.google.dev/gemini-api/docs/billing |
| Gemini supported model/deprecation checks | https://ai.google.dev/gemini-api/docs/deprecations |

Google OAuth uses configured application origins and the Supabase-provided callback. Identity scopes do not imply Drive access. RLS controls row access alongside grants; backend requests still need authenticated owner checks. Explicit new-row checks improve policy clarity; do not misdiagnose PostgreSQL's implicit USING-as-check behaviour as an observed vulnerability.

Gemini's current unpaid-service data terms are unsuitable for submitting sensitive personal records. Paid-service API handling depends on the API project's active billing association, not a browser Pro badge. Verify the chosen route and any permitted allowance before real-data inference. Do not turn this into an automatic purchase or activation step.

The changelog Markdown URL was not readable through the research renderer during preparation; the implementation agent should fetch it with its normal documentation tooling. No provider/SDK version or current free-tier capacity is hardcoded in this pack.
