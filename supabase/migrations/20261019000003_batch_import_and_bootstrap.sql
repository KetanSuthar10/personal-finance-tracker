-- Personal Finance Tracker: Migration 20261019000003
-- Features:
-- 1. Server-controlled owner bootstrap RPC (bootstrap_app_owner)
-- 2. Transactional batch import commitment RPC (commit_import_batch)

-- 1. Owner Bootstrap Function
-- Allows the first authenticated user to claim single-owner authority.
-- Strictly blocked once an owner is already registered.
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
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required to bootstrap owner' USING ERRCODE = '42501';
    END IF;

    -- Look up email from auth.users
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

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

    RETURN jsonb_build_object(
        'success', true,
        'owner_user_id', v_uid,
        'owner_email', v_email
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_app_owner() TO authenticated;

-- 2. Transactional Import Batch Commit RPC
-- Persists batch record, events, postings, and source observations in a single atomic transaction.
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
    -- Verify caller is authenticated owner
    IF v_user_id IS NULL OR NOT public.is_app_owner(v_user_id) THEN
        RAISE EXCEPTION 'Access denied: not authorized owner' USING ERRCODE = '42501';
    END IF;

    v_batch_id := p_batch->>'id';
    v_filename := p_batch->>'filename';
    v_account_id := p_batch->>'account_id';
    v_row_count := COALESCE((p_batch->>'row_count')::INTEGER, 0);

    -- Insert new events and their postings
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

    -- Update existing merged events if any
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

    -- Insert import batch record
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
