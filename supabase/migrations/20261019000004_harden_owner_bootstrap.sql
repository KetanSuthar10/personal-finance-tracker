-- ============================================================================
-- Personal Finance Tracker: Migration 20261019000004
-- Harden Owner Bootstrap Concurrency & Race-Condition Protection
-- ============================================================================

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
