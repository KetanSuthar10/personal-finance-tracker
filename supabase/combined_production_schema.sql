-- ============================================================================
-- Personal Finance Tracker: Complete Production Schema & Owner Security
-- Combines: 20261018000001_initial_schema + 20261018000002_owner_and_transactional_boundaries + 20261019000003_batch_import_and_bootstrap + 20261019000004_harden_owner_bootstrap
-- Currency: INR (Integer paise representation)
-- Timezone: Asia/Kolkata
-- ============================================================================

-- 1. App Owner Configuration Table (Server-Controlled Authority)
CREATE TABLE IF NOT EXISTS public.app_owner_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    owner_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Deny client modifications to app_owner_config
REVOKE ALL ON public.app_owner_config FROM anon, authenticated;
GRANT SELECT ON public.app_owner_config TO authenticated;
ALTER TABLE public.app_owner_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read owner config" ON public.app_owner_config;
CREATE POLICY "Authenticated users can read owner config"
    ON public.app_owner_config FOR SELECT
    TO authenticated
    USING (true);

-- 2. Owner Authorization Helper
CREATE OR REPLACE FUNCTION public.is_app_owner(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.app_owner_config
        WHERE owner_user_id = check_user_id
    );
$$;

-- 3. Owner Status RPC
CREATE OR REPLACE FUNCTION public.get_current_user_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_owner_uid UUID;
    v_is_owner BOOLEAN;
BEGIN
    SELECT owner_user_id INTO v_owner_uid FROM public.app_owner_config WHERE id = 1;
    v_is_owner := (v_uid IS NOT NULL AND v_owner_uid IS NOT NULL AND v_uid = v_owner_uid);
    RETURN jsonb_build_object(
        'user_id', v_uid,
        'owner_configured', (v_owner_uid IS NOT NULL),
        'is_owner', v_is_owner
    );
END;
$$;

-- 4. Profiles & User Settings
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

-- 5. Accounts (Bank, Cash, Credit Card)
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'card')),
    opening_date DATE NOT NULL,
    opening_position_paise BIGINT NOT NULL CHECK (opening_position_paise >= -9007199254740991 AND opening_position_paise <= 9007199254740991),
    masked_suffix TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id, id)
);

-- 6. Canonical Financial Events
CREATE TABLE IF NOT EXISTS public.financial_events (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'purchase', 'refund', 'card_payment', 'own_transfer', 'fee')),
    recipient TEXT NOT NULL,
    category TEXT,
    income_paise BIGINT NOT NULL DEFAULT 0 CHECK (income_paise >= 0 AND income_paise <= 9007199254740991),
    spending_paise BIGINT NOT NULL DEFAULT 0 CHECK (spending_paise >= -9007199254740991 AND spending_paise <= 9007199254740991),
    linked_purchase_id TEXT,
    notes TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id, id)
);

-- 7. Double-Entry Account Postings
CREATE TABLE IF NOT EXISTS public.account_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    delta_paise BIGINT NOT NULL CHECK (delta_paise >= -9007199254740991 AND delta_paise <= 9007199254740991),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    FOREIGN KEY (user_id, event_id) REFERENCES public.financial_events(user_id, id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, account_id) REFERENCES public.accounts(user_id, id) ON DELETE CASCADE
);

-- 8. Import Batches
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

-- 9. Source Observations (Provenance)
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

-- 10. Credit Card Statements
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

-- 11. EMI Plans & Schedules
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

-- 12. Category Rules Table
CREATE TABLE IF NOT EXISTS public.category_rules (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_pattern TEXT NOT NULL,
    category TEXT NOT NULL,
    match_count INTEGER NOT NULL DEFAULT 0 CHECK (match_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id, id)
);

-- 13. Idempotency Keys Table
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    key TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    command_type TEXT NOT NULL,
    result_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id, key)
);

-- 14. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_financial_events_user_date ON public.financial_events(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_events_user_category ON public.financial_events(user_id, category);
CREATE INDEX IF NOT EXISTS idx_account_postings_user_acc ON public.account_postings(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_card_statements_user_due ON public.card_statements(user_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_emi_plans_user_status ON public.emi_plans(user_id, status);

-- 15. Enable Row Level Security (RLS) on ALL tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emi_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- 16. Hardened Owner-Only RLS Policies (AT13)
CREATE POLICY "Owner can manage profile"
    ON public.profiles FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

CREATE POLICY "Owner can manage accounts"
    ON public.accounts FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

CREATE POLICY "Owner can manage financial events"
    ON public.financial_events FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

CREATE POLICY "Owner can manage postings"
    ON public.account_postings FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

CREATE POLICY "Owner can manage import batches"
    ON public.import_batches FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

CREATE POLICY "Owner can manage source observations"
    ON public.source_observations FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

CREATE POLICY "Owner can manage card statements"
    ON public.card_statements FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

CREATE POLICY "Owner can manage emi plans"
    ON public.emi_plans FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

CREATE POLICY "Owner can manage category rules"
    ON public.category_rules FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

CREATE POLICY "Owner can manage idempotency keys"
    ON public.idempotency_keys FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

-- 17. Atomic Transactional Command RPC (AT13, AT15)
CREATE OR REPLACE FUNCTION public.execute_financial_command(
    p_command_id TEXT,
    p_command JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_type TEXT;
    v_date DATE;
    v_recipient TEXT;
    v_income_paise BIGINT;
    v_spending_paise BIGINT;
    v_category TEXT;
    v_notes TEXT;
    v_postings JSONB;
    v_source JSONB;
    v_posting RECORD;
    v_acc_count INTEGER;
    v_total_delta BIGINT := 0;
    v_existing_event_id TEXT;
    v_result JSONB;
BEGIN
    -- 1. Access Control: Must be authenticated and the authorized owner
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    IF NOT public.is_app_owner(v_user_id) THEN
        RAISE EXCEPTION 'Access denied: not authorized owner' USING ERRCODE = '42501';
    END IF;

    -- 2. Idempotency Check: Repeated command returns existing result (AT15)
    SELECT result_id INTO v_existing_event_id
    FROM public.idempotency_keys
    WHERE user_id = v_user_id AND key = p_command_id;

    IF v_existing_event_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'id', e.id,
            'date', e.date,
            'type', e.type,
            'recipient', e.recipient,
            'income_paise', e.income_paise,
            'spending_paise', e.spending_paise,
            'category', e.category,
            'notes', e.notes,
            'idempotent', true
        ) INTO v_result
        FROM public.financial_events e
        WHERE e.user_id = v_user_id AND e.id = v_existing_event_id;
        RETURN v_result;
    END IF;

    -- 3. Parse and Validate Command Arguments
    v_type := p_command->>'type';
    IF v_type NOT IN ('purchase', 'income', 'refund', 'fee', 'own_transfer', 'card_payment') THEN
        RAISE EXCEPTION 'Invalid financial command type: %', v_type;
    END IF;

    v_date := (p_command->>'date')::DATE;
    IF v_date IS NULL THEN
        RAISE EXCEPTION 'Event date is required';
    END IF;

    v_recipient := TRIM(COALESCE(p_command->>'recipient', ''));
    IF v_recipient = '' THEN
        RAISE EXCEPTION 'Recipient/description is required';
    END IF;

    v_income_paise := COALESCE((p_command->>'income_paise')::BIGINT, 0);
    v_spending_paise := COALESCE((p_command->>'spending_paise')::BIGINT, 0);
    v_category := NULLIF(TRIM(COALESCE(p_command->>'category', '')), '');
    v_notes := NULLIF(TRIM(COALESCE(p_command->>'notes', '')), '');
    v_postings := p_command->'postings';
    v_source := p_command->'source';

    -- Finite safe integer validation
    IF v_income_paise < 0 OR v_income_paise > 9007199254740991 THEN
        RAISE EXCEPTION 'income_paise out of safe integer range: %', v_income_paise;
    END IF;
    IF v_spending_paise < -9007199254740991 OR v_spending_paise > 9007199254740991 THEN
        RAISE EXCEPTION 'spending_paise out of safe integer range: %', v_spending_paise;
    END IF;

    -- 4. Postings and Accounting Invariants Validation
    IF v_postings IS NULL OR jsonb_array_length(v_postings) = 0 THEN
        RAISE EXCEPTION 'At least one account posting is required';
    END IF;

    IF v_type IN ('own_transfer', 'card_payment') AND jsonb_array_length(v_postings) < 2 THEN
        RAISE EXCEPTION 'Transfers and card repayments require at least two account postings';
    END IF;

    -- Check accounts belong to this owner and calculate sum of deltas
    FOR v_posting IN SELECT * FROM jsonb_to_recordset(v_postings) AS (account_id TEXT, delta_paise BIGINT)
    LOOP
        SELECT COUNT(*) INTO v_acc_count 
        FROM public.accounts 
        WHERE user_id = v_user_id AND id = v_posting.account_id;

        IF v_acc_count = 0 THEN
            RAISE EXCEPTION 'Account % does not exist or does not belong to owner', v_posting.account_id;
        END IF;

        v_total_delta := v_total_delta + v_posting.delta_paise;
    END LOOP;

    -- Validate accounting totals
    IF v_type IN ('own_transfer', 'card_payment') AND v_total_delta <> 0 THEN
        RAISE EXCEPTION 'Transfer postings must be net zero, got %', v_total_delta;
    ELSIF v_type IN ('purchase', 'fee') AND v_total_delta <> -v_spending_paise THEN
        RAISE EXCEPTION 'Purchase postings delta sum (%) must equal -spending_paise (%)', v_total_delta, -v_spending_paise;
    ELSIF v_type = 'income' AND v_total_delta <> v_income_paise THEN
        RAISE EXCEPTION 'Income postings delta sum (%) must equal income_paise (%)', v_total_delta, v_income_paise;
    ELSIF v_type = 'refund' AND v_total_delta <> -v_spending_paise THEN
        RAISE EXCEPTION 'Refund postings delta sum (%) must equal -spending_paise (%)', v_total_delta, -v_spending_paise;
    END IF;

    -- 5. Atomically Persist Event
    INSERT INTO public.financial_events (
        id, user_id, date, type, recipient, category, income_paise, spending_paise, notes, version
    ) VALUES (
        p_command_id, v_user_id, v_date, v_type, v_recipient, v_category, v_income_paise, v_spending_paise, v_notes, 1
    );

    -- 6. Atomically Persist Account Postings
    FOR v_posting IN SELECT * FROM jsonb_to_recordset(v_postings) AS (account_id TEXT, delta_paise BIGINT)
    LOOP
        INSERT INTO public.account_postings (
            user_id, event_id, account_id, delta_paise
        ) VALUES (
            v_user_id, p_command_id, v_posting.account_id, v_posting.delta_paise
        );
    END LOOP;

    -- 7. Atomically Persist Source Observation if provided
    IF v_source IS NOT NULL AND (v_source->>'source_type') IS NOT NULL THEN
        INSERT INTO public.source_observations (
            id, user_id, event_id, source_type, raw_description, ref_no, extracted_date, extracted_amount_paise
        ) VALUES (
            COALESCE(v_source->>'id', 'src_' || p_command_id),
            v_user_id,
            p_command_id,
            v_source->>'source_type',
            v_source->>'raw_description',
            v_source->>'ref_no',
            (v_source->>'extracted_date')::DATE,
            (v_source->>'extracted_amount_paise')::BIGINT
        );
    END IF;

    -- 8. Record Idempotency Key
    INSERT INTO public.idempotency_keys (
        key, user_id, command_type, result_id
    ) VALUES (
        p_command_id, v_user_id, v_type, p_command_id
    );

    -- 9. Return Authoritative Result
    RETURN jsonb_build_object(
        'id', p_command_id,
        'date', v_date,
        'type', v_type,
        'recipient', v_recipient,
        'income_paise', v_income_paise,
        'spending_paise', v_spending_paise,
        'category', v_category,
        'notes', v_notes,
        'idempotent', false
    );
END;
$$;

-- 10. Owner Bootstrap Function (Hardened for Concurrency)
CREATE OR REPLACE FUNCTION public.bootstrap_app_owner()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_email TEXT;
    v_existing_count INTEGER;
    v_rows_affected INTEGER;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required to bootstrap owner' USING ERRCODE = '42501';
    END IF;

    -- Look up email from auth.users
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

    -- Acquire row-level lock on singleton row if it already exists to serialize concurrent requests
    PERFORM 1 FROM public.app_owner_config WHERE id = 1 FOR UPDATE;

    -- Check if an owner is already enrolled
    SELECT COUNT(*) INTO v_existing_count 
    FROM public.app_owner_config 
    WHERE id = 1 AND owner_user_id IS NOT NULL;

    IF v_existing_count > 0 THEN
        RAISE EXCEPTION 'Owner is already configured. Subsequent claims are forbidden.' USING ERRCODE = '42501';
    END IF;

    -- Enroll the authenticated user as the sole authorized owner
    INSERT INTO public.app_owner_config (id, owner_user_id, owner_email, updated_at)
    VALUES (1, v_uid, v_email, timezone('utc', now()))
    ON CONFLICT (id) DO UPDATE SET
        owner_user_id = EXCLUDED.owner_user_id,
        owner_email = EXCLUDED.owner_email,
        updated_at = timezone('utc', now())
    WHERE public.app_owner_config.owner_user_id IS NULL;

    -- Verify that an actual row was inserted or updated
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected = 0 THEN
        RAISE EXCEPTION 'Owner is already configured by a concurrent request. Subsequent claims are forbidden.' USING ERRCODE = '42501';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'owner_user_id', v_uid,
        'owner_email', v_email
    );
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_app_owner() FROM anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_app_owner() TO authenticated;

-- 11. Transactional Import Batch Commit RPC
CREATE OR REPLACE FUNCTION public.commit_import_batch(
    p_batch JSONB,
    p_new_events JSONB,
    p_updated_events JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_evt RECORD;
    v_posting RECORD;
    v_batch_id TEXT;
    v_filename TEXT;
    v_account_id TEXT;
    v_row_count INTEGER;
    v_created_ids TEXT[] := '{}';
    v_merged_ids TEXT[] := '{}';
BEGIN
    IF v_user_id IS NULL OR NOT public.is_app_owner(v_user_id) THEN
        RAISE EXCEPTION 'Access denied: not authorized owner' USING ERRCODE = '42501';
    END IF;

    v_batch_id := p_batch->>'id';
    v_filename := p_batch->>'filename';
    v_account_id := p_batch->>'account_id';
    v_row_count := COALESCE((p_batch->>'row_count')::INTEGER, 0);

    FOR v_evt IN SELECT * FROM jsonb_to_recordset(p_new_events) AS (
        id TEXT,
        date DATE,
        type TEXT,
        recipient TEXT,
        category TEXT,
        income_paise BIGINT,
        spending_paise BIGINT,
        notes TEXT,
        postings JSONB,
        source JSONB
    )
    LOOP
        INSERT INTO public.financial_events (
            id, user_id, date, type, recipient, category, income_paise, spending_paise, notes, version
        ) VALUES (
            v_evt.id, v_user_id, v_evt.date, v_evt.type, v_evt.recipient, v_evt.category,
            COALESCE(v_evt.income_paise, 0), COALESCE(v_evt.spending_paise, 0), v_evt.notes, 1
        );

        IF v_evt.postings IS NOT NULL THEN
            FOR v_posting IN SELECT * FROM jsonb_to_recordset(v_evt.postings) AS (account_id TEXT, delta_paise BIGINT)
            LOOP
                INSERT INTO public.account_postings (user_id, event_id, account_id, delta_paise)
                VALUES (v_user_id, v_evt.id, v_posting.account_id, v_posting.delta_paise);
            END LOOP;
        END IF;

        IF v_evt.source IS NOT NULL THEN
            INSERT INTO public.source_observations (
                id, user_id, event_id, batch_id, source_type, raw_description, ref_no, extracted_date, extracted_amount_paise
            ) VALUES (
                COALESCE(v_evt.source->>'id', 'src_' || v_evt.id),
                v_user_id,
                v_evt.id,
                v_batch_id,
                COALESCE(v_evt.source->>'source_type', 'statement_import'),
                v_evt.source->>'raw_description',
                v_evt.source->>'ref_no',
                (v_evt.source->>'extracted_date')::DATE,
                (v_evt.source->>'extracted_amount_paise')::BIGINT
            );
        END IF;

        v_created_ids := array_append(v_created_ids, v_evt.id);
    END LOOP;

    FOR v_evt IN SELECT * FROM jsonb_to_recordset(p_updated_events) AS (
        id TEXT,
        notes TEXT,
        category TEXT
    )
    LOOP
        UPDATE public.financial_events
        SET notes = COALESCE(v_evt.notes, notes),
            category = COALESCE(v_evt.category, category),
            updated_at = timezone('utc', now())
        WHERE user_id = v_user_id AND id = v_evt.id;

        v_merged_ids := array_append(v_merged_ids, v_evt.id);
    END LOOP;

    INSERT INTO public.import_batches (
        id, user_id, filename, account_id, imported_at, row_count, created_event_ids, merged_event_ids, status
    ) VALUES (
        v_batch_id, v_user_id, v_filename, v_account_id, timezone('utc', now()),
        v_row_count, v_created_ids, v_merged_ids, 'active'
    );

    RETURN jsonb_build_object(
        'success', true,
        'batch_id', v_batch_id,
        'created_count', array_length(v_created_ids, 1),
        'merged_count', array_length(v_merged_ids, 1)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.commit_import_batch(JSONB, JSONB, JSONB) TO authenticated;

