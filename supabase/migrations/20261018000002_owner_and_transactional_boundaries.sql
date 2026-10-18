-- Personal Finance Tracker: Migration 20261018000002
-- Task: T02 Database & Owner Boundaries
-- Features:
-- 1. Trusted server-side owner configuration (app_owner_config)
-- 2. Owner authorization helper (is_app_owner) and status RPC
-- 3. Idempotency keys and versioning for safe concurrency (AT15)
-- 4. Category rules table
-- 5. Safe integer checks and constraints (paise <= Number.MAX_SAFE_INTEGER)
-- 6. Atomic transactional command execution RPC (execute_financial_command)
-- 7. Hardened RLS policies enforcing auth.uid() = user_id AND is_app_owner(auth.uid()) (AT13)

-- 1. App Owner Configuration Table
CREATE TABLE IF NOT EXISTS public.app_owner_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    owner_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Ensure public/anon/authenticated cannot insert, update, or delete owner configuration
REVOKE ALL ON public.app_owner_config FROM anon, authenticated;
GRANT SELECT ON public.app_owner_config TO authenticated;

ALTER TABLE public.app_owner_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read owner config" ON public.app_owner_config;
CREATE POLICY "Authenticated users can read owner config"
    ON public.app_owner_config FOR SELECT
    TO authenticated
    USING (true);

-- 2. Helper function to check if a user is the server-configured owner
CREATE OR REPLACE FUNCTION public.is_app_owner(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    -- If no owner is configured yet, nobody is authorized for financial writes
    SELECT EXISTS (
        SELECT 1 FROM public.app_owner_config
        WHERE owner_user_id = check_user_id
    );
$$;

-- 3. RPC to get current user authorization status
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

-- 4. Category Rules Table
CREATE TABLE IF NOT EXISTS public.category_rules (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_pattern TEXT NOT NULL,
    category TEXT NOT NULL,
    match_count INTEGER NOT NULL DEFAULT 0 CHECK (match_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id, id)
);

ALTER TABLE public.category_rules ENABLE ROW LEVEL SECURITY;

-- 5. Idempotency Keys Table
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    key TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    command_type TEXT NOT NULL,
    result_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id, key)
);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- 6. Add versioning columns to accounts and financial_events if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'financial_events' AND column_name = 'version'
    ) THEN
        ALTER TABLE public.financial_events ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'version'
    ) THEN
        ALTER TABLE public.accounts ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1);
    END IF;
END $$;

-- 7. Add finite safe integer constraints (Number.MAX_SAFE_INTEGER = 9007199254740991)
DO $$
BEGIN
    ALTER TABLE public.accounts 
        DROP CONSTRAINT IF EXISTS chk_accounts_safe_paise;
    ALTER TABLE public.accounts 
        ADD CONSTRAINT chk_accounts_safe_paise 
        CHECK (opening_position_paise >= -9007199254740991 AND opening_position_paise <= 9007199254740991);

    ALTER TABLE public.financial_events 
        DROP CONSTRAINT IF EXISTS chk_events_safe_paise;
    ALTER TABLE public.financial_events 
        ADD CONSTRAINT chk_events_safe_paise 
        CHECK (
            income_paise >= 0 AND income_paise <= 9007199254740991 AND
            spending_paise >= -9007199254740991 AND spending_paise <= 9007199254740991
        );

    ALTER TABLE public.account_postings 
        DROP CONSTRAINT IF EXISTS chk_postings_safe_paise;
    ALTER TABLE public.account_postings 
        ADD CONSTRAINT chk_postings_safe_paise 
        CHECK (delta_paise >= -9007199254740991 AND delta_paise <= 9007199254740991);
END $$;

-- 8. Hardened RLS Policies: auth.uid() = user_id AND is_app_owner(auth.uid())
-- This ensures only the single server-configured owner can access finance tables (AT13).

-- Profiles
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
CREATE POLICY "Owner can manage profile"
    ON public.profiles FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

-- Accounts
DROP POLICY IF EXISTS "Users can manage their own accounts" ON public.accounts;
CREATE POLICY "Owner can manage accounts"
    ON public.accounts FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

-- Financial Events
DROP POLICY IF EXISTS "Users can manage their own financial events" ON public.financial_events;
CREATE POLICY "Owner can manage financial events"
    ON public.financial_events FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

-- Account Postings
DROP POLICY IF EXISTS "Users can manage their own postings" ON public.account_postings;
CREATE POLICY "Owner can manage postings"
    ON public.account_postings FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

-- Import Batches
DROP POLICY IF EXISTS "Users can manage their own import batches" ON public.import_batches;
CREATE POLICY "Owner can manage import batches"
    ON public.import_batches FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

-- Source Observations
DROP POLICY IF EXISTS "Users can manage their own source observations" ON public.source_observations;
CREATE POLICY "Owner can manage source observations"
    ON public.source_observations FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

-- Card Statements
DROP POLICY IF EXISTS "Users can manage their own card statements" ON public.card_statements;
CREATE POLICY "Owner can manage card statements"
    ON public.card_statements FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

-- EMI Plans
DROP POLICY IF EXISTS "Users can manage their own emi plans" ON public.emi_plans;
CREATE POLICY "Owner can manage emi plans"
    ON public.emi_plans FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

-- Category Rules
DROP POLICY IF EXISTS "Owner can manage category rules" ON public.category_rules;
CREATE POLICY "Owner can manage category rules"
    ON public.category_rules FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

-- Idempotency Keys
DROP POLICY IF EXISTS "Owner can manage idempotency keys" ON public.idempotency_keys;
CREATE POLICY "Owner can manage idempotency keys"
    ON public.idempotency_keys FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_app_owner(auth.uid()))
    WITH CHECK (auth.uid() = user_id AND public.is_app_owner(auth.uid()));

-- 9. Transactional Financial Command Boundary RPC (AT13, AT15)
-- Performs atomic validation and persistence of financial events, postings, and provenance.
-- Rolls back completely if any accounting or ownership constraint fails.
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
