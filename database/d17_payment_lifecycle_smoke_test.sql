-- ============================================================
-- d17_payment_lifecycle_smoke_test.sql
-- Purpose:
--   Smoke-check payment audit lifecycle (cooldown helper + approve + revert).
--
-- Usage:
--   1) Run migrations up to 20260227090000_payment_requests_audit.sql.
--   2) Run as privileged role in local Supabase SQL editor / psql.
--   3) Script runs in BEGIN/ROLLBACK and does not persist fixtures.
-- ============================================================

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.profiles';
    END IF;

    IF to_regclass('public.payment_requests') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.payment_requests';
    END IF;

    IF to_regclass('public.payment_requests_audit') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.payment_requests_audit';
    END IF;
END
$$;

-- Fixture profiles
INSERT INTO public.profiles (id, email, is_premium, premium_expires_at)
VALUES
    ('00000000-0000-0000-0000-000000001201', 'd17-lifecycle-student@example.com', FALSE, NULL),
    ('00000000-0000-0000-0000-000000001202', 'd17-lifecycle-admin@example.com', FALSE, NULL)
ON CONFLICT (id) DO UPDATE
SET
    email = EXCLUDED.email,
    is_premium = EXCLUDED.is_premium,
    premium_expires_at = EXCLUDED.premium_expires_at;

-- Fixture admin profile_type when user_profiles exists
DO $$
BEGIN
    IF to_regclass('public.user_profiles') IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, user_id, profile_type, is_default)
        VALUES ('10000000-0000-0000-0000-000000001202', '00000000-0000-0000-0000-000000001202', 'admin', TRUE)
        ON CONFLICT (id) DO UPDATE
        SET
            user_id = EXCLUDED.user_id,
            profile_type = EXCLUDED.profile_type,
            is_default = EXCLUDED.is_default;
    END IF;
END
$$;

DELETE FROM public.payment_requests
WHERE user_id = '00000000-0000-0000-0000-000000001201';

DO $$
DECLARE
    v_request_id UUID;
    v_cooldown_count INTEGER;
    v_approve JSONB;
    v_revert JSONB;
    v_is_premium BOOLEAN;
    v_expires_at TIMESTAMPTZ;
    v_reverted_status TEXT;
    v_approved_audits INTEGER;
    v_reverted_audits INTEGER;
BEGIN
    INSERT INTO public.payment_requests (
        user_id,
        plan_id,
        amount_tnd,
        currency,
        d17_phone
    )
    VALUES (
        '00000000-0000-0000-0000-000000001201',
        'monthly',
        19,
        'TND',
        '+21652460278'
    )
    RETURNING id
    INTO v_request_id;

    SELECT public.payment_requests_recent_pending_count(
        '00000000-0000-0000-0000-000000001201'::UUID,
        10
    )
    INTO v_cooldown_count;

    IF COALESCE(v_cooldown_count, 0) < 1 THEN
        RAISE EXCEPTION 'Expected cooldown helper to report recent pending request.';
    END IF;

    SELECT public.payment_requests_apply_admin_action(
        v_request_id,
        'approve',
        '00000000-0000-0000-0000-000000001202'::UUID,
        'smoke approve'
    )
    INTO v_approve;

    IF COALESCE((v_approve->>'ok')::BOOLEAN, FALSE) IS NOT TRUE THEN
        RAISE EXCEPTION 'Approve RPC failed: %', v_approve::TEXT;
    END IF;

    SELECT
        COALESCE(p.is_premium, FALSE),
        p.premium_expires_at
    INTO
        v_is_premium,
        v_expires_at
    FROM public.profiles p
    WHERE p.id = '00000000-0000-0000-0000-000000001201';

    IF NOT v_is_premium THEN
        RAISE EXCEPTION 'Expected profile.is_premium=true after approval.';
    END IF;

    IF v_expires_at IS NULL OR v_expires_at <= now() THEN
        RAISE EXCEPTION 'Expected premium_expires_at in the future after approval.';
    END IF;

    SELECT public.payment_requests_apply_admin_action(
        v_request_id,
        'revert',
        '00000000-0000-0000-0000-000000001202'::UUID,
        'smoke revert'
    )
    INTO v_revert;

    IF COALESCE((v_revert->>'ok')::BOOLEAN, FALSE) IS NOT TRUE THEN
        RAISE EXCEPTION 'Revert RPC failed: %', v_revert::TEXT;
    END IF;

    SELECT pr.status
    INTO v_reverted_status
    FROM public.payment_requests pr
    WHERE pr.id = v_request_id;

    IF v_reverted_status <> 'reverted' THEN
        RAISE EXCEPTION 'Expected payment request status reverted after undo, got %', v_reverted_status;
    END IF;

    SELECT
        COALESCE(p.is_premium, FALSE),
        p.premium_expires_at
    INTO
        v_is_premium,
        v_expires_at
    FROM public.profiles p
    WHERE p.id = '00000000-0000-0000-0000-000000001201';

    IF v_is_premium THEN
        RAISE EXCEPTION 'Expected profile.is_premium=false after revert.';
    END IF;

    IF v_expires_at IS NOT NULL THEN
        RAISE EXCEPTION 'Expected premium_expires_at NULL after revert.';
    END IF;

    SELECT COUNT(*)
    INTO v_approved_audits
    FROM public.payment_requests_audit a
    WHERE a.payment_request_id = v_request_id
      AND a.action = 'approved';

    SELECT COUNT(*)
    INTO v_reverted_audits
    FROM public.payment_requests_audit a
    WHERE a.payment_request_id = v_request_id
      AND a.action = 'reverted';

    IF v_approved_audits < 1 THEN
        RAISE EXCEPTION 'Expected at least one approved audit row.';
    END IF;

    IF v_reverted_audits < 1 THEN
        RAISE EXCEPTION 'Expected at least one reverted audit row.';
    END IF;

    RAISE NOTICE 'D17 lifecycle smoke test passed. request_id=%', v_request_id;
END
$$;

ROLLBACK;
