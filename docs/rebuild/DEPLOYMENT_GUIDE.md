# Owner Deployment & Supabase Setup Runbook — Personal Finance Tracker

**Date**: 19 October 2026  
**Audience**: Application Owner & Administrator  

This guide provides the exact, secure procedure for provisioning a new Supabase project, executing migrations, bootstrapping single-owner authority, and deploying to Vercel.

---

## 1. Create a New Supabase Project

1. Log into your personal [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Fill in the project details:
   - **Name**: `personal-finance-tracker` (or your preferred name)
   - **Database Password**: Generate and securely store a strong password.
   - **Region**: Select a region close to your usage (e.g. `South Asia (Mumbai)` for India).
   - **Pricing Plan**: Free tier is sufficient for personal finance tracking.
4. Click **Create new project** and wait ~2 minutes for provisioning to finish.

---

## 2. Obtain Frontend API Credentials

1. In your Supabase Dashboard, navigate to **Project Settings** (gear icon) ➔ **API**.
2. Locate the following values under **Project API keys**:
   - **Project URL**: (e.g., `https://abcdefghijklmnopqrst.supabase.co`)
   - **Project API Key (anon / public)**: (e.g., `sb_publishable_...` or JWT anon key)
3. **DO NOT copy the `service_role` key** or expose it in frontend files.

---

## 3. Configure Local Environment Variables

1. In your local repository root, create a file named `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Populate `.env.local` with your real project values:
   ```ini
   # Required Frontend Credentials
   VITE_SUPABASE_URL=https://your-new-project-id.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_actual_key_here

   # Mode: cloud (persists to Supabase)
   VITE_DATA_MODE=cloud
   ```
3. Verify that `.env.local` is ignored by Git:
   ```bash
   git status
   ```
   (Verify `.env.local` does NOT appear as an untracked file).

---

## 4. Apply Database Migrations

You have two equivalent options to apply the schema:

### Option A: 1-Click Supabase SQL Editor (Recommended)
1. In your Supabase Dashboard, click **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Open `supabase/combined_production_schema.sql` in your local project, copy its entire contents, and paste into the SQL Editor.
4. Click **Run** (Ctrl + Enter).
5. Verify output: `Success. No rows returned`.

### Option B: Supabase CLI Migrations
If using the Supabase CLI:
```bash
supabase link --project-ref your-new-project-id
supabase db push
```

---

## 5. Configure Authentication Providers

### A. Email Authentication
1. Go to **Authentication** ➔ **Providers** ➔ **Email**.
2. Ensure **Enable Email provider** is toggled **ON**.
3. Recommended for personal use: If you want immediate access without email delivery delays, toggle **Confirm email** to **OFF** (or leave ON if you have custom SMTP configured).

### B. Google OAuth (Optional)
1. In the Google Cloud Console, create an OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Authorized redirect URIs: `https://your-new-project-id.supabase.co/auth/v1/callback`
2. In Supabase Dashboard:
   - Go to **Authentication** ➔ **Providers** ➔ **Google**.
   - Toggle **Enable Google Provider** to **ON**.
   - Paste your **Client ID** and **Client Secret**.
   - Save changes.
3. Under **Authentication** ➔ **URL Configuration**:
   - Set **Site URL** to your production URL (or `http://localhost:5173` during local development).
   - Add `http://localhost:5173` and your Vercel domain to **Redirect URLs**.

---

## 6. Secure Owner Bootstrap (First Sign-in)

The database enforces bank-grade single-owner isolation (AT13). To bootstrap your instance:

1. Start the app locally:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:5173`.
3. Sign in or register with your email (or Google).
4. Because no owner is enrolled yet, the app automatically presents the **Instance Owner Enrollment** screen (`OwnerBootstrapPage`).
5. Click **"Enroll as Instance Owner"**.
   - This executes the secure `bootstrap_app_owner()` RPC.
   - Your `auth.uid()` and email are permanently locked in `app_owner_config`.
   - Any subsequent registration or sign-in attempt by anyone else will immediately be rejected and redirected to `AccessDeniedPage`.

*(Alternative manual bootstrap)*:
You can also enroll directly in the Supabase SQL Editor:
```sql
INSERT INTO public.app_owner_config (id, owner_user_id, owner_email)
VALUES (1, 'YOUR-USER-UUID-HERE', 'your-email@example.com');
```

---

## 7. Deploy to Vercel

1. Push your repository to your GitHub account:
   ```bash
   git push origin main
   ```
2. In the [Vercel Dashboard](https://vercel.com):
   - Click **Add New** ➔ **Project**.
   - Import `personal-finance-tracker`.
   - Framework Preset: **Vite**.
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: `https://your-new-project-id.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: `sb_publishable_your_key_here`
   - `VITE_DATA_MODE`: `cloud`
4. Click **Deploy**.
5. Once deployed, add your Vercel deployment URL (e.g. `https://your-app.vercel.app`) to your Supabase Dashboard under **Authentication ➔ URL Configuration ➔ Redirect URLs**.

---

## 8. Post-Deployment Verification Checklist

- [x] No references to the decommissioned project (`mpjjetxtpekrxeyivlkv`) exist in frontend build assets.
- [x] Unauthenticated users are routed to `AuthPage`.
- [x] Authorized owner can access accounts and ledger transactions.
- [x] Non-owner sign-ins are blocked and routed to `AccessDeniedPage`.
- [x] Password reset requests dispatch reset email link.
- [x] All financial operations use integer paise math without floating-point drift.
- [x] Session persists across page refreshes and browser restarts.
