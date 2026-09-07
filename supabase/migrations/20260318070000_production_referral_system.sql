-- ============================================================
-- Migration: Production Server-Authoritative Referral System
-- Date: 2026-03-18
-- Purpose:
--   1) Create referral_codes table with stable, unique server-generated codes.
--   2) Create referrals table for immutable, non-self, single-attribution tracking.
--   3) Create referral_rewards & referral_reward_claims tables for milestone progress and idempotent claiming.
--   4) Add cryptographic collision-safe code generation function.
--   5) Add transactional triggers for qualification and milestone lifecycle.
--   6) Harden auth.users trigger to safely capture signup referral attribution.
--   7) Provide secure RPCs:
--        - validate_referral_code (anon + authenticated)
--        - get_or_create_my_referral_code (authenticated)
--        - get_referral_dashboard (authenticated)
--        - attribute_referral (authenticated)
--        - claim_referral_reward (authenticated)
--   8) Enforce canonical RLS policies (read-only for owners, writes via security-definer RPCs).
--   9) Backfill referral codes for existing student profiles.
-- ============================================================

BEGIN;

-- 1. Create referral_codes Table
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_referral_codes_code UNIQUE (code),
    CONSTRAINT uq_referral_codes_owner UNIQUE (owner_user_id),
    CONSTRAINT ck_referral_codes_format CHECK (code ~ '^MOP-[A-Z0-9]{8}$')
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes (code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_owner ON public.referral_codes (owner_user_id);

-- 2. Create referrals Table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referral_code_id UUID REFERENCES public.referral_codes(id) ON DELETE SET NULL,
    referral_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'invalidated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    qualified_at TIMESTAMPTZ,
    invalidated_at TIMESTAMPTZ,
    invalidation_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT uq_referrals_referred_user UNIQUE (referred_user_id),
    CONSTRAINT ck_referrals_no_self_referral CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status ON public.referrals (referrer_user_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals (referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals (referral_code);

-- 3. Create referral_rewards Table
CREATE TABLE IF NOT EXISTS public.referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    milestone_type TEXT NOT NULL DEFAULT 'invite_3_premium_7d',
    required_qualifying_referrals INT NOT NULL DEFAULT 3,
    reward_type TEXT NOT NULL DEFAULT 'premium_days',
    reward_days INT NOT NULL DEFAULT 7,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'eligible', 'claimed')),
    eligible_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_referral_rewards_user_milestone UNIQUE (user_id, milestone_type)
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON public.referral_rewards (user_id);

-- 4. Create referral_reward_claims Table
CREATE TABLE IF NOT EXISTS public.referral_reward_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_id UUID NOT NULL REFERENCES public.referral_rewards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    milestone_type TEXT NOT NULL,
    reward_days INT NOT NULL DEFAULT 7,
    previous_premium_expires_at TIMESTAMPTZ,
    new_premium_expires_at TIMESTAMPTZ NOT NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT uq_referral_reward_claims_reward UNIQUE (reward_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_reward_claims_user ON public.referral_reward_claims (user_id);

-- 5. Helper Function: Cryptographically Safe Unique Referral Code Generator
CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
    v_attempts INT := 0;
BEGIN
    LOOP
        v_attempts := v_attempts + 1;
        IF v_attempts > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique referral code after 100 attempts';
        END IF;

        -- Extract 8 alphanumeric characters from gen_random_uuid()
        v_code := 'MOP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

        SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = v_code) INTO v_exists;
        IF NOT v_exists THEN
            RETURN v_code;
        END IF;
    END LOOP;
END;
$$;

-- 6. Trigger Function: Update Milestone Eligibility When Referrals Qualify
CREATE OR REPLACE FUNCTION public.handle_referral_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referrer_id UUID;
    v_qualified_count INT;
    v_reward_id UUID;
    v_reward_status TEXT;
BEGIN
    v_referrer_id := NEW.referrer_user_id;

    -- Count total qualified referrals for this referrer
    SELECT count(*)
    INTO v_qualified_count
    FROM public.referrals
    WHERE referrer_user_id = v_referrer_id AND status = 'qualified';

    -- Check standard 3-invite milestone
    SELECT id, status INTO v_reward_id, v_reward_status
    FROM public.referral_rewards
    WHERE user_id = v_referrer_id AND milestone_type = 'invite_3_premium_7d';

    IF v_reward_id IS NULL THEN
        INSERT INTO public.referral_rewards (
            user_id,
            milestone_type,
            required_qualifying_referrals,
            reward_type,
            reward_days,
            status,
            eligible_at
        ) VALUES (
            v_referrer_id,
            'invite_3_premium_7d',
            3,
            'premium_days',
            7,
            CASE WHEN v_qualified_count >= 3 THEN 'eligible' ELSE 'in_progress' END,
            CASE WHEN v_qualified_count >= 3 THEN now() ELSE NULL END
        );
    ELSE
        IF v_reward_status = 'in_progress' AND v_qualified_count >= 3 THEN
            UPDATE public.referral_rewards
            SET status = 'eligible',
                eligible_at = now(),
                updated_at = now()
            WHERE id = v_reward_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_status_change ON public.referrals;
CREATE TRIGGER trg_referral_status_change
    AFTER INSERT OR UPDATE OF status ON public.referrals
    FOR EACH ROW
    WHEN (NEW.status = 'qualified')
    EXECUTE FUNCTION public.handle_referral_status_change();

-- 7. Trigger Function: Qualify Pending Referrals on Email Confirmation
CREATE OR REPLACE FUNCTION public.handle_auth_user_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL) THEN
        UPDATE public.referrals
        SET status = 'qualified',
            qualified_at = now()
        WHERE referred_user_id = NEW.id AND status = 'pending';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_users_email_confirmed ON auth.users;
CREATE TRIGGER trg_auth_users_email_confirmed
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_user_email_confirmed();

-- 8. Updated User Provisioning Function to Safely Integrate Referral Attribution
CREATE OR REPLACE FUNCTION public.matchop_handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    _meta jsonb;
    _type text;
    _name text;
    _website text;
    _sector text;
    _university text;
    _major text;
    _up_id uuid;
BEGIN
    _meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    _type := COALESCE(_meta->>'type', 'student');
    
    -- Normalize user type
    IF _type NOT IN ('student', 'company', 'admin') THEN
        _type := 'student';
    END IF;

    _name := COALESCE(
        _meta->>'name',
        _meta->>'display_name',
        _meta->>'company_name',
        split_part(COALESCE(NEW.email, 'User'), '@', 1)
    );
    IF _name IS NULL OR btrim(_name) = '' THEN
        _name := CASE WHEN _type = 'company' THEN 'Company' ELSE 'Student' END;
    END IF;

    _website := _meta->>'website';
    _sector := COALESCE(_meta->>'sector', _meta->>'industry');
    _university := _meta->>'university';
    _major := _meta->>'major';

    -- A) Upsert public.profiles
    BEGIN
        INSERT INTO public.profiles (id, email, type, name)
        VALUES (NEW.id, COALESCE(NEW.email, ''), _type, _name)
        ON CONFLICT (id) DO UPDATE
        SET email = COALESCE(EXCLUDED.email, public.profiles.email),
            type = COALESCE(public.profiles.type, EXCLUDED.type),
            name = COALESCE(public.profiles.name, EXCLUDED.name),
            updated_at = now();
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'matchop_handle_auth_user_created: failed to upsert profiles for %: %', NEW.id, SQLERRM;
    END;

    -- B) Upsert public.user_profiles
    BEGIN
        IF to_regclass('public.user_profiles') IS NOT NULL THEN
            INSERT INTO public.user_profiles (id, user_id, profile_type, is_default)
            VALUES (NEW.id, NEW.id, _type, TRUE)
            ON CONFLICT (id) DO UPDATE
            SET profile_type = COALESCE(public.user_profiles.profile_type, EXCLUDED.profile_type);

            -- Link active_profile_id on profiles
            UPDATE public.profiles
            SET active_profile_id = NEW.id
            WHERE id = NEW.id AND active_profile_id IS NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'matchop_handle_auth_user_created: failed to upsert user_profiles for %: %', NEW.id, SQLERRM;
    END;

    -- C) Provision role-specific table row
    IF _type = 'student' THEN
        BEGIN
            IF to_regclass('public.students') IS NOT NULL THEN
                INSERT INTO public.students (id, display_name, location, skills)
                VALUES (NEW.id, _name, '', '{}'::text[])
                ON CONFLICT (id) DO UPDATE
                SET display_name = COALESCE(public.students.display_name, EXCLUDED.display_name);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'matchop_handle_auth_user_created: failed to upsert students for %: %', NEW.id, SQLERRM;
        END;
    ELSIF _type = 'company' THEN
        BEGIN
            IF to_regclass('public.companies') IS NOT NULL THEN
                INSERT INTO public.companies (id, company_name, industry, website, description)
                VALUES (NEW.id, _name, COALESCE(_sector, ''), _website, '')
                ON CONFLICT (id) DO UPDATE
                SET company_name = COALESCE(public.companies.company_name, EXCLUDED.company_name),
                    industry = COALESCE(public.companies.industry, EXCLUDED.industry),
                    website = COALESCE(public.companies.website, EXCLUDED.website);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'matchop_handle_auth_user_created: failed to upsert companies for %: %', NEW.id, SQLERRM;
        END;
    END IF;

    -- D) Provision personal referral code for students
    IF _type = 'student' THEN
        BEGIN
            IF to_regclass('public.referral_codes') IS NOT NULL THEN
                INSERT INTO public.referral_codes (owner_user_id, code)
                VALUES (NEW.id, public.generate_unique_referral_code())
                ON CONFLICT (owner_user_id) DO NOTHING;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'matchop_handle_auth_user_created: failed to create referral code for %: %', NEW.id, SQLERRM;
        END;
    END IF;

    -- E) Safely process inbound referral attribution from signup metadata
    IF _meta->>'referral_code' IS NOT NULL AND btrim(_meta->>'referral_code') <> '' THEN
        BEGIN
            DECLARE
                v_clean_code TEXT;
                v_ref_code_id UUID;
                v_ref_owner_id UUID;
                v_ref_is_active BOOLEAN;
                v_is_qualified BOOLEAN;
            BEGIN
                v_clean_code := upper(btrim(_meta->>'referral_code'));
                SELECT id, owner_user_id, is_active
                INTO v_ref_code_id, v_ref_owner_id, v_ref_is_active
                FROM public.referral_codes
                WHERE code = v_clean_code;

                IF v_ref_owner_id IS NOT NULL AND v_ref_owner_id <> NEW.id AND v_ref_is_active = TRUE THEN
                    v_is_qualified := (_type = 'student' AND (NEW.email_confirmed_at IS NOT NULL OR NEW.confirmed_at IS NOT NULL));

                    INSERT INTO public.referrals (
                        referrer_user_id,
                        referred_user_id,
                        referral_code_id,
                        referral_code,
                        status,
                        qualified_at,
                        metadata
                    ) VALUES (
                        v_ref_owner_id,
                        NEW.id,
                        v_ref_code_id,
                        v_clean_code,
                        CASE WHEN v_is_qualified THEN 'qualified' ELSE 'pending' END,
                        CASE WHEN v_is_qualified THEN now() ELSE NULL END,
                        jsonb_build_object('source', 'auth_metadata', 'signup_type', _type)
                    )
                    ON CONFLICT (referred_user_id) DO NOTHING;
                END IF;
            END;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'matchop_handle_auth_user_created: failed to attribute referral for %: %', NEW.id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$fn$;

-- Reattach trigger
DROP TRIGGER IF EXISTS trg_auth_users_handle_user_created ON auth.users;
CREATE TRIGGER trg_auth_users_handle_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.matchop_handle_auth_user_created();

-- 9. RPC: Validate Referral Code (Safe for Public / Anonymous UX)
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_code TEXT;
    v_exists BOOLEAN;
BEGIN
    v_clean_code := upper(btrim(COALESCE(p_code, '')));
    IF v_clean_code !~ '^MOP-[A-Z0-9]{8}$' THEN
        RETURN jsonb_build_object('valid', false);
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM public.referral_codes
        WHERE code = v_clean_code AND is_active = TRUE
    ) INTO v_exists;

    RETURN jsonb_build_object('valid', v_exists);
END;
$$;

-- 10. RPC: Get or Create My Referral Code (Authenticated)
CREATE OR REPLACE FUNCTION public.get_or_create_my_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_code TEXT;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501';
    END IF;

    SELECT code INTO v_code
    FROM public.referral_codes
    WHERE owner_user_id = v_uid;

    IF v_code IS NULL THEN
        v_code := public.generate_unique_referral_code();
        INSERT INTO public.referral_codes (owner_user_id, code)
        VALUES (v_uid, v_code)
        ON CONFLICT (owner_user_id) DO UPDATE
        SET updated_at = now()
        RETURNING code INTO v_code;
    END IF;

    RETURN v_code;
END;
$$;

-- 11. RPC: Get Referral Dashboard (Authenticated)
CREATE OR REPLACE FUNCTION public.get_referral_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_code TEXT;
    v_total_referrals INT;
    v_qualifying_referrals INT;
    v_pending_referrals INT;
    v_reward RECORD;
    v_profile RECORD;
    v_milestone_status TEXT := 'in_progress';
    v_is_eligible BOOLEAN := FALSE;
    v_is_claimed BOOLEAN := FALSE;
    v_claimed_at TIMESTAMPTZ := NULL;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501';
    END IF;

    -- Ensure owner referral code exists
    v_code := public.get_or_create_my_referral_code();

    -- Count referrals
    SELECT
        count(*),
        count(*) FILTER (WHERE status = 'qualified'),
        count(*) FILTER (WHERE status = 'pending')
    INTO
        v_total_referrals,
        v_qualifying_referrals,
        v_pending_referrals
    FROM public.referrals
    WHERE referrer_user_id = v_uid;

    -- Reward milestone row
    SELECT * INTO v_reward
    FROM public.referral_rewards
    WHERE user_id = v_uid AND milestone_type = 'invite_3_premium_7d';

    IF v_reward.id IS NOT NULL THEN
        v_milestone_status := v_reward.status;
        v_claimed_at := v_reward.claimed_at;
        v_is_claimed := (v_reward.status = 'claimed');
        v_is_eligible := (v_reward.status = 'eligible' OR (v_reward.status = 'in_progress' AND v_qualifying_referrals >= 3));
    ELSE
        IF v_qualifying_referrals >= 3 THEN
            v_milestone_status := 'eligible';
            v_is_eligible := TRUE;
        END IF;
    END IF;

    -- Current profile premium state
    SELECT is_premium, premium_expires_at INTO v_profile
    FROM public.profiles
    WHERE id = v_uid;

    RETURN jsonb_build_object(
        'ok', true,
        'referral_code', v_code,
        'total_referrals', COALESCE(v_total_referrals, 0),
        'qualifying_referrals', COALESCE(v_qualifying_referrals, 0),
        'pending_referrals', COALESCE(v_pending_referrals, 0),
        'required_referrals', 3,
        'reward_days', 7,
        'milestone_status', v_milestone_status,
        'is_eligible', v_is_eligible,
        'is_claimed', v_is_claimed,
        'claimed_at', v_claimed_at,
        'premium', jsonb_build_object(
            'is_premium', COALESCE(v_profile.is_premium, false),
            'premium_expires_at', v_profile.premium_expires_at
        )
    );
END;
$$;

-- 12. RPC: Attribute Referral (Authenticated)
CREATE OR REPLACE FUNCTION public.attribute_referral(p_referral_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_clean_code TEXT;
    v_ref_code RECORD;
    v_existing RECORD;
    v_user_type TEXT;
    v_is_qualified BOOLEAN := FALSE;
    v_status TEXT;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'UNAUTHORIZED', 'message', 'Authentication required');
    END IF;

    v_clean_code := upper(btrim(COALESCE(p_referral_code, '')));
    IF v_clean_code !~ '^MOP-[A-Z0-9]{8}$' THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'INVALID_REFERRAL_CODE', 'message', 'Invalid referral code format');
    END IF;

    -- Check if user is already attributed (strictly single-attribution)
    SELECT * INTO v_existing
    FROM public.referrals
    WHERE referred_user_id = v_uid;

    IF v_existing.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'ok', true,
            'already_attributed', true,
            'status', v_existing.status,
            'referral_code', v_existing.referral_code
        );
    END IF;

    -- Look up referral code
    SELECT * INTO v_ref_code
    FROM public.referral_codes
    WHERE code = v_clean_code AND is_active = TRUE;

    IF v_ref_code.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'INVALID_REFERRAL_CODE', 'message', 'Referral code not found or inactive');
    END IF;

    -- Self-referral prevention
    IF v_ref_code.owner_user_id = v_uid THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'SELF_REFERRAL', 'message', 'You cannot use your own referral code');
    END IF;

    -- Check profile type
    SELECT type INTO v_user_type FROM public.profiles WHERE id = v_uid;
    -- Authenticated students qualify immediately
    v_is_qualified := (COALESCE(v_user_type, 'student') = 'student');
    v_status := CASE WHEN v_is_qualified THEN 'qualified' ELSE 'pending' END;

    INSERT INTO public.referrals (
        referrer_user_id,
        referred_user_id,
        referral_code_id,
        referral_code,
        status,
        qualified_at,
        metadata
    ) VALUES (
        v_ref_code.owner_user_id,
        v_uid,
        v_ref_code.id,
        v_clean_code,
        v_status,
        CASE WHEN v_is_qualified THEN now() ELSE NULL END,
        jsonb_build_object('source', 'attribute_referral_rpc')
    )
    ON CONFLICT (referred_user_id) DO NOTHING;

    RETURN jsonb_build_object(
        'ok', true,
        'already_attributed', false,
        'status', v_status,
        'referral_code', v_clean_code
    );
END;
$$;

-- 13. RPC: Claim Referral Reward (Authenticated, Idempotent, Concurrency-Safe)
CREATE OR REPLACE FUNCTION public.claim_referral_reward(p_milestone_type TEXT DEFAULT 'invite_3_premium_7d')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_reward RECORD;
    v_qualified_count INT;
    v_now TIMESTAMPTZ := now();
    v_reward_days INT := 7;
    v_profile RECORD;
    v_new_expires TIMESTAMPTZ;
    v_reward_id UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'UNAUTHORIZED', 'message', 'Authentication required');
    END IF;

    -- Lock the reward row if it exists
    SELECT * INTO v_reward
    FROM public.referral_rewards
    WHERE user_id = v_uid AND milestone_type = p_milestone_type
    FOR UPDATE;

    -- Check if already claimed (idempotency check)
    IF v_reward.id IS NOT NULL AND v_reward.status = 'claimed' THEN
        SELECT is_premium, premium_expires_at INTO v_profile FROM public.profiles WHERE id = v_uid;
        RETURN jsonb_build_object(
            'ok', true,
            'already_claimed', true,
            'status', 'claimed',
            'message', 'Reward has already been claimed',
            'reward_days', v_reward.reward_days,
            'premium_expires_at', v_profile.premium_expires_at,
            'is_premium', v_profile.is_premium
        );
    END IF;

    -- Check qualifying referrals count directly
    SELECT count(*)
    INTO v_qualified_count
    FROM public.referrals
    WHERE referrer_user_id = v_uid AND status = 'qualified';

    IF v_qualified_count < 3 THEN
        RETURN jsonb_build_object(
            'ok', false,
            'error_code', 'NOT_ELIGIBLE',
            'message', 'You need at least 3 qualifying referrals to claim this reward',
            'required', 3,
            'current', v_qualified_count
        );
    END IF;

    -- Upsert/Ensure reward record exists
    IF v_reward.id IS NULL THEN
        INSERT INTO public.referral_rewards (
            user_id,
            milestone_type,
            required_qualifying_referrals,
            reward_type,
            reward_days,
            status,
            eligible_at
        ) VALUES (
            v_uid,
            p_milestone_type,
            3,
            'premium_days',
            v_reward_days,
            'eligible',
            v_now
        )
        RETURNING id INTO v_reward_id;
    ELSE
        v_reward_id := v_reward.id;
        v_reward_days := COALESCE(v_reward.reward_days, 7);
    END IF;

    -- Lock profile record to calculate premium extension safely
    SELECT is_premium, premium_expires_at
    INTO v_profile
    FROM public.profiles
    WHERE id = v_uid
    FOR UPDATE;

    IF v_profile.premium_expires_at IS NOT NULL AND v_profile.premium_expires_at > v_now THEN
        v_new_expires := v_profile.premium_expires_at + (v_reward_days || ' days')::interval;
    ELSE
        v_new_expires := v_now + (v_reward_days || ' days')::interval;
    END IF;

    -- 1. Update profiles table
    UPDATE public.profiles
    SET is_premium = TRUE,
        premium_expires_at = v_new_expires,
        updated_at = v_now
    WHERE id = v_uid;

    -- 2. Update referral_rewards status
    UPDATE public.referral_rewards
    SET status = 'claimed',
        claimed_at = v_now,
        updated_at = v_now
    WHERE id = v_reward_id;

    -- 3. Insert audit log in referral_reward_claims (Unique constraint guarantees single claim)
    INSERT INTO public.referral_reward_claims (
        reward_id,
        user_id,
        milestone_type,
        reward_days,
        previous_premium_expires_at,
        new_premium_expires_at,
        claimed_at,
        metadata
    ) VALUES (
        v_reward_id,
        v_uid,
        p_milestone_type,
        v_reward_days,
        v_profile.premium_expires_at,
        v_new_expires,
        v_now,
        jsonb_build_object('source', 'claim_referral_reward')
    );

    -- 4. Optional admin audit logs insertion if table exists
    BEGIN
        IF to_regclass('public.admin_audit_logs') IS NOT NULL THEN
            INSERT INTO public.admin_audit_logs (
                user_id, action, target_type, target_id, details
            ) VALUES (
                v_uid,
                'referral_reward_claimed',
                'referral_reward',
                v_reward_id,
                jsonb_build_object(
                    'milestone', p_milestone_type,
                    'reward_days', v_reward_days,
                    'previous_expires', v_profile.premium_expires_at,
                    'new_expires', v_new_expires
                )
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'ok', true,
        'already_claimed', false,
        'status', 'claimed',
        'reward_days', v_reward_days,
        'premium_expires_at', v_new_expires,
        'is_premium', true
    );
END;
$$;

-- 14. Enable Row Level Security
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_reward_claims ENABLE ROW LEVEL SECURITY;

-- 15. Revoke direct anon/authenticated table manipulation
REVOKE ALL ON TABLE public.referral_codes FROM anon, public;
REVOKE ALL ON TABLE public.referrals FROM anon, public;
REVOKE ALL ON TABLE public.referral_rewards FROM anon, public;
REVOKE ALL ON TABLE public.referral_reward_claims FROM anon, public;

GRANT SELECT ON TABLE public.referral_codes TO authenticated;
GRANT SELECT ON TABLE public.referrals TO authenticated;
GRANT SELECT ON TABLE public.referral_rewards TO authenticated;
GRANT SELECT ON TABLE public.referral_reward_claims TO authenticated;

-- 16. Canonical RLS Policies
DROP POLICY IF EXISTS referral_codes_owner_select ON public.referral_codes;
CREATE POLICY referral_codes_owner_select
    ON public.referral_codes
    FOR SELECT TO authenticated
    USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS referrals_referrer_select ON public.referrals;
CREATE POLICY referrals_referrer_select
    ON public.referrals
    FOR SELECT TO authenticated
    USING (referrer_user_id = auth.uid());

DROP POLICY IF EXISTS referrals_referred_select ON public.referrals;
CREATE POLICY referrals_referred_select
    ON public.referrals
    FOR SELECT TO authenticated
    USING (referred_user_id = auth.uid());

DROP POLICY IF EXISTS referral_rewards_user_select ON public.referral_rewards;
CREATE POLICY referral_rewards_user_select
    ON public.referral_rewards
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS referral_reward_claims_user_select ON public.referral_reward_claims;
CREATE POLICY referral_reward_claims_user_select
    ON public.referral_reward_claims
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- 17. Grant RPC Execution
GRANT EXECUTE ON FUNCTION public.validate_referral_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_my_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.attribute_referral(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral_reward(TEXT) TO authenticated;

-- 18. Backfill Referral Codes for Existing Student Profiles
DO $$
DECLARE
    r RECORD;
    v_new_code TEXT;
BEGIN
    FOR r IN
        SELECT p.id
        FROM public.profiles p
        WHERE p.type = 'student'
          AND NOT EXISTS (
              SELECT 1 FROM public.referral_codes rc WHERE rc.owner_user_id = p.id
          )
    LOOP
        v_new_code := public.generate_unique_referral_code();
        INSERT INTO public.referral_codes (owner_user_id, code)
        VALUES (r.id, v_new_code)
        ON CONFLICT (owner_user_id) DO NOTHING;
    END LOOP;
END;
$$;

COMMIT;
