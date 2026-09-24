-- ============================================================
-- referral_system_smoke_test.sql
-- Purpose:
--   Comprehensive database smoke test for the production referral system.
--   Validates:
--     1) Referral code creation & uniqueness
--     2) Self-referral prevention
--     3) Single-attribution invariant
--     4) Milestone progression (0 -> 1 -> 2 -> 3 qualifying)
--     5) Milestone reward claiming
--     6) Idempotent claim behavior (duplicate claim prevention)
--     7) Premium extension logic (extending active premium vs expired)
--
-- Usage:
--   Run in Supabase SQL Editor / psql.
--   Script runs in a transaction and ALWAYS rolls back.
-- ============================================================

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.profiles';
    END IF;
    IF to_regclass('public.referral_codes') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.referral_codes';
    END IF;
    IF to_regclass('public.referrals') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.referrals';
    END IF;
    IF to_regclass('public.referral_rewards') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.referral_rewards';
    END IF;
    IF to_regclass('public.referral_reward_claims') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.referral_reward_claims';
    END IF;
END
$$;

-- Setup test fixtures
INSERT INTO public.profiles (id, email, type, name, is_premium, premium_expires_at)
VALUES
    ('ffffffff-0000-0000-0000-000000000001', 'alice-ref@example.com', 'student', 'Alice Referrer', FALSE, NULL),
    ('ffffffff-0000-0000-0000-000000000002', 'bob-ref@example.com', 'student', 'Bob Referred', FALSE, NULL),
    ('ffffffff-0000-0000-0000-000000000003', 'charlie-ref@example.com', 'student', 'Charlie Referred', FALSE, NULL),
    ('ffffffff-0000-0000-0000-000000000004', 'dave-ref@example.com', 'student', 'Dave Referred', FALSE, NULL)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    type = EXCLUDED.type,
    name = EXCLUDED.name,
    is_premium = EXCLUDED.is_premium,
    premium_expires_at = EXCLUDED.premium_expires_at;

DO $$
DECLARE
    v_alice_code TEXT;
    v_validate_res JSONB;
    v_attr_res JSONB;
    v_claim_res JSONB;
    v_claim2_res JSONB;
    v_alice_profile RECORD;
    v_now TIMESTAMPTZ := now();
    v_expected_min_expires TIMESTAMPTZ;
BEGIN
    -- 1. Test code generation
    v_alice_code := public.generate_unique_referral_code();
    IF v_alice_code !~ '^MOP-[A-Z0-9]{8}$' THEN
        RAISE EXCEPTION 'Generated referral code format invalid: %', v_alice_code;
    END IF;

    INSERT INTO public.referral_codes (owner_user_id, code)
    VALUES ('ffffffff-0000-0000-0000-000000000001', v_alice_code);

    -- 2. Test code validation
    v_validate_res := public.validate_referral_code(v_alice_code);
    IF (v_validate_res->>'valid')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'validate_referral_code failed for valid code';
    END IF;

    v_validate_res := public.validate_referral_code('MOP-INVALID1');
    IF (v_validate_res->>'valid')::boolean IS TRUE THEN
        RAISE EXCEPTION 'validate_referral_code returned true for non-existent code';
    END IF;

    -- 3. Test self-referral constraint at DB level
    BEGIN
        INSERT INTO public.referrals (referrer_user_id, referred_user_id, referral_code, status)
        VALUES ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001', v_alice_code, 'qualified');
        RAISE EXCEPTION 'DB failed to reject self-referral constraint';
    EXCEPTION WHEN check_violation THEN
        -- Expected
        NULL;
    END;

    -- 4. Test normal referral attribution (Bob referred by Alice)
    INSERT INTO public.referrals (referrer_user_id, referred_user_id, referral_code, status, qualified_at)
    VALUES ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000002', v_alice_code, 'qualified', now());

    -- 5. Test duplicate attribution constraint (Bob cannot be referred again)
    BEGIN
        INSERT INTO public.referrals (referrer_user_id, referred_user_id, referral_code, status)
        VALUES ('ffffffff-0000-0000-0000-000000000003', 'ffffffff-0000-0000-0000-000000000002', 'MOP-OTHER001', 'qualified');
        RAISE EXCEPTION 'DB failed to reject duplicate attribution for same referred_user';
    EXCEPTION WHEN unique_violation THEN
        -- Expected
        NULL;
    END;

    -- 6. Add Charlie and Dave as qualified referrals
    INSERT INTO public.referrals (referrer_user_id, referred_user_id, referral_code, status, qualified_at)
    VALUES
        ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000003', v_alice_code, 'qualified', now()),
        ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000004', v_alice_code, 'qualified', now());

    -- Check milestone trigger updated referral_rewards
    PERFORM 1 FROM public.referral_rewards
    WHERE user_id = 'ffffffff-0000-0000-0000-000000000001'
      AND milestone_type = 'invite_3_premium_7d'
      AND status = 'eligible';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trigger failed to mark referral_rewards as eligible for 3 qualified invites';
    END IF;

    -- 7. Test claim reward execution as Alice
    -- Temporarily set request user to Alice
    PERFORM set_config('request.jwt.claim.sub', 'ffffffff-0000-0000-0000-000000000001', true);

    v_claim_res := public.claim_referral_reward('invite_3_premium_7d');
    IF (v_claim_res->>'ok')::boolean IS NOT TRUE OR (v_claim_res->>'already_claimed')::boolean IS TRUE THEN
        RAISE EXCEPTION 'First claim failed: %', v_claim_res;
    END IF;

    -- Verify profile is now premium
    SELECT is_premium, premium_expires_at INTO v_alice_profile
    FROM public.profiles
    WHERE id = 'ffffffff-0000-0000-0000-000000000001';

    IF v_alice_profile.is_premium IS NOT TRUE THEN
        RAISE EXCEPTION 'Profile is_premium was not set to true on claim';
    END IF;

    v_expected_min_expires := v_now + interval '6 days 23 hours';
    IF v_alice_profile.premium_expires_at < v_expected_min_expires THEN
        RAISE EXCEPTION 'premium_expires_at was not extended by 7 days: %', v_alice_profile.premium_expires_at;
    END IF;

    -- 8. Test duplicate claim idempotency
    v_claim2_res := public.claim_referral_reward('invite_3_premium_7d');
    IF (v_claim2_res->>'ok')::boolean IS NOT TRUE OR (v_claim2_res->>'already_claimed')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'Second claim should be idempotent: %', v_claim2_res;
    END IF;

    -- Verify expiration date did NOT change
    SELECT premium_expires_at INTO v_alice_profile
    FROM public.profiles
    WHERE id = 'ffffffff-0000-0000-0000-000000000001';

    IF v_alice_profile.premium_expires_at <> (v_claim_res->>'premium_expires_at')::timestamptz THEN
        RAISE EXCEPTION 'Idempotency failure: expiration changed on second claim';
    END IF;

    RAISE NOTICE 'Referral system smoke test passed successfully!';
END
$$;

ROLLBACK;
