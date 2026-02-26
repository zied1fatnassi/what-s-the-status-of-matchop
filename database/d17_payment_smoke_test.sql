-- ============================================================
-- d17_payment_smoke_test.sql
-- Purpose:
--   Smoke-check payment_requests constraints and premium approval update.
--
-- Usage:
--   1) Run migration 20260226120000_d17_payments.sql first.
--   2) Run this script as a privileged role in local Supabase SQL editor / psql.
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
END
$$;

-- Fixture users
INSERT INTO public.profiles (id, email, is_premium, premium_expires_at)
VALUES
    ('00000000-0000-0000-0000-000000001101', 'd17-smoke-student@example.com', FALSE, NULL),
    ('00000000-0000-0000-0000-000000001102', 'd17-smoke-admin@example.com', FALSE, NULL)
ON CONFLICT (id) DO UPDATE
SET
    email = EXCLUDED.email,
    is_premium = EXCLUDED.is_premium,
    premium_expires_at = EXCLUDED.premium_expires_at;

DELETE FROM public.payment_requests
WHERE user_id = '00000000-0000-0000-0000-000000001101';

DO $$
DECLARE
    created_request_id UUID;
    created_reference TEXT;
    duplicate_blocked BOOLEAN := FALSE;
    is_premium_now BOOLEAN := FALSE;
    premium_expires TIMESTAMPTZ;
BEGIN
    INSERT INTO public.payment_requests (
        user_id,
        plan_id,
        amount_tnd
    )
    VALUES (
        '00000000-0000-0000-0000-000000001101',
        'monthly',
        19
    )
    RETURNING id, reference
    INTO created_request_id, created_reference;

    IF created_reference IS NULL OR created_reference NOT LIKE 'MOP-%' THEN
        RAISE EXCEPTION 'Reference was not generated correctly: %', created_reference;
    END IF;

    BEGIN
        INSERT INTO public.payment_requests (
            user_id,
            plan_id,
            amount_tnd
        )
        VALUES (
            '00000000-0000-0000-0000-000000001101',
            'yearly',
            149
        );
    EXCEPTION
        WHEN unique_violation THEN
            duplicate_blocked := TRUE;
    END;

    IF NOT duplicate_blocked THEN
        RAISE EXCEPTION 'Expected one-pending-per-user constraint to block second pending insert.';
    END IF;

    UPDATE public.payment_requests
    SET
        status = 'approved',
        reviewed_by = '00000000-0000-0000-0000-000000001102',
        reviewed_at = now(),
        admin_note = 'smoke approved'
    WHERE id = created_request_id;

    UPDATE public.profiles
    SET
        is_premium = TRUE,
        premium_expires_at = now() + interval '30 days'
    WHERE id = '00000000-0000-0000-0000-000000001101';

    SELECT
        COALESCE(p.is_premium, FALSE),
        p.premium_expires_at
    INTO
        is_premium_now,
        premium_expires
    FROM public.profiles p
    WHERE p.id = '00000000-0000-0000-0000-000000001101';

    IF NOT is_premium_now THEN
        RAISE EXCEPTION 'Expected profile.is_premium=true after approval update.';
    END IF;

    IF premium_expires IS NULL OR premium_expires <= now() THEN
        RAISE EXCEPTION 'Expected premium_expires_at to be in the future after approval update.';
    END IF;

    RAISE NOTICE 'D17 payment smoke test passed. request_id=%, reference=%', created_request_id, created_reference;
END
$$;

ROLLBACK;
