-- Personal Finance Tracker: Initial Production Schema with Row-Level Security
-- Currency: INR (Integer paise representation)
-- Timezone: Asia/Kolkata
-- Version: 1.0 (Milestone M3)

-- 1. Profiles & User Settings
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    planning_horizon_days INTEGER NOT NULL DEFAULT 30 CHECK (planning_horizon_days > 0),
    emergency_buffer_paise BIGINT NOT NULL DEFAULT 200000 CHECK (emergency_buffer_paise >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Accounts (Bank, Cash, Credit Card)
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'card')),
    opening_date DATE NOT NULL,
    opening_position_paise BIGINT NOT NULL,
    masked_suffix TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id, id)
);

-- 3. Canonical Financial Events
CREATE TABLE IF NOT EXISTS public.financial_events (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'purchase', 'refund', 'card_payment', 'own_transfer', 'fee')),
    recipient TEXT NOT NULL,
    category TEXT,
    income_paise BIGINT NOT NULL DEFAULT 0 CHECK (income_paise >= 0),
    spending_paise BIGINT NOT NULL DEFAULT 0,
    linked_purchase_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id, id)
);

-- 4. Double-Entry Account Postings
CREATE TABLE IF NOT EXISTS public.account_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    delta_paise BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    FOREIGN KEY (user_id, event_id) REFERENCES public.financial_events(user_id, id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, account_id) REFERENCES public.accounts(user_id, id) ON DELETE CASCADE
);

-- 5. Import Batches
CREATE TABLE IF NOT EXISTS public.import_batches (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    account_id TEXT NOT NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    row_count INTEGER NOT NULL CHECK (row_count >= 0),
    created_event_ids TEXT[] NOT NULL DEFAULT '{}',
    merged_event_ids TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'undone')),
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id, account_id) REFERENCES public.accounts(user_id, id) ON DELETE CASCADE
);

-- 6. Source Observations (Provenance)
CREATE TABLE IF NOT EXISTS public.source_observations (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    batch_id TEXT,
    source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'statement_import')),
    raw_description TEXT,
    ref_no TEXT,
    extracted_date DATE,
    extracted_amount_paise BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id, event_id) REFERENCES public.financial_events(user_id, id) ON DELETE CASCADE
);

-- 7. Credit Card Statements
CREATE TABLE IF NOT EXISTS public.card_statements (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    statement_date DATE NOT NULL,
    due_date DATE NOT NULL,
    statement_total_paise BIGINT NOT NULL CHECK (statement_total_paise >= 0),
    minimum_due_paise BIGINT NOT NULL DEFAULT 0 CHECK (minimum_due_paise >= 0),
    allocated_payments_paise BIGINT NOT NULL DEFAULT 0 CHECK (allocated_payments_paise >= 0),
    is_settled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id, account_id) REFERENCES public.accounts(user_id, id) ON DELETE CASCADE
);

-- 8. EMI Plans & Schedules
CREATE TABLE IF NOT EXISTS public.emi_plans (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    purchase_event_id TEXT,
    merchant TEXT NOT NULL,
    original_principal_paise BIGINT NOT NULL CHECK (original_principal_paise > 0),
    monthly_instalment_paise BIGINT NOT NULL CHECK (monthly_instalment_paise > 0),
    total_tenure_months INTEGER NOT NULL CHECK (total_tenure_months > 0),
    instalments_billed INTEGER NOT NULL DEFAULT 0 CHECK (instalments_billed >= 0),
    remaining_principal_paise BIGINT NOT NULL CHECK (remaining_principal_paise >= 0),
    annual_interest_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    start_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    billed_in_statement_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'foreclosed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id, account_id) REFERENCES public.accounts(user_id, id) ON DELETE CASCADE
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_financial_events_user_date ON public.financial_events(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_events_user_category ON public.financial_events(user_id, category);
CREATE INDEX IF NOT EXISTS idx_account_postings_user_acc ON public.account_postings(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_card_statements_user_due ON public.card_statements(user_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_emi_plans_user_status ON public.emi_plans(user_id, status);

-- Enable Row Level Security (RLS) on all financial tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emi_plans ENABLE ROW LEVEL SECURITY;

-- Strict User Ownership Policies (auth.uid() = user_id)
CREATE POLICY "Users can manage their own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own accounts"
    ON public.accounts FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own financial events"
    ON public.financial_events FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own postings"
    ON public.account_postings FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own import batches"
    ON public.import_batches FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own source observations"
    ON public.source_observations FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own card statements"
    ON public.card_statements FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own emi plans"
    ON public.emi_plans FOR ALL
    USING (auth.uid() = user_id);
