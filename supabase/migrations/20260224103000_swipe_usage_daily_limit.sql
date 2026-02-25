-- ============================================================
-- Migration: Standard daily swipe limit enforcement
-- Date: 2026-02-24
-- Purpose:
--   1) Add swipe_usage table for per-day swipe counters.
--   2) Enforce daily limits for standard users, unlimited for premium.
--   3) Expose RPCs for usage status + swipe recording.
--   4) Enforce at DB layer (trigger) for all insert paths.
-- ============================================================

DO $swipe_usage_daily_limit$
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN
        RAISE NOTICE 'Skipping swipe_usage daily limit migration because public.profiles does not exist yet.';
        RETURN;
    END IF;

CREATE TABLE IF NOT EXISTS public.swipe_usage (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    usage_day DATE NOT NULL,
    swipe_count INTEGER NOT NULL DEFAULT 0 CHECK (swipe_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, usage_day)
);

CREATE INDEX IF NOT EXISTS idx_swipe_usage_day
    ON public.swipe_usage (usage_day DESC);

CREATE OR REPLACE FUNCTION public.matchop_can_access_profile_id(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    can_access BOOLEAN := FALSE;
BEGIN
    IF p_profile_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF auth.role() = 'service_role' THEN
        RETURN TRUE;
    END IF;

    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    IF auth.uid() = p_profile_id THEN
        RETURN TRUE;
    END IF;

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
        BEGIN
            SELECT EXISTS (
                SELECT 1
                FROM public.user_profiles up
                WHERE up.user_id = auth.uid()
                  AND up.id = p_profile_id
            )
            INTO can_access;
        EXCEPTION
            WHEN undefined_column THEN
                can_access := FALSE;
        END;
    END IF;

    RETURN COALESCE(can_access, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.matchop_profile_has_active_premium(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    has_premium BOOLEAN := FALSE;
    account_user_id UUID := p_profile_id;
BEGIN
    IF p_profile_id IS NULL OR to_regclass('public.profiles') IS NULL THEN
        RETURN FALSE;
    END IF;

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
        BEGIN
            SELECT up.user_id
            INTO account_user_id
            FROM public.user_profiles up
            WHERE up.id = p_profile_id
            LIMIT 1;
        EXCEPTION
            WHEN undefined_column THEN
                account_user_id := p_profile_id;
        END;
    END IF;

    account_user_id := COALESCE(account_user_id, p_profile_id);

    BEGIN
        SELECT EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = account_user_id
              AND COALESCE(p.is_premium, FALSE) = TRUE
              AND (p.premium_expires_at IS NULL OR p.premium_expires_at > now())
        )
        INTO has_premium;
    EXCEPTION
        WHEN undefined_column THEN
            has_premium := FALSE;
    END;

    RETURN COALESCE(has_premium, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.matchop_standard_daily_swipe_limit()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT 20;
$$;

CREATE OR REPLACE FUNCTION public.get_swipe_limit_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_limit INTEGER := public.matchop_standard_daily_swipe_limit();
    v_daily_count INTEGER := 0;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'code', 'BAD_REQUEST',
            'message', 'user_id is required'
        );
    END IF;

    IF NOT public.matchop_can_access_profile_id(p_user_id) THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'code', 'FORBIDDEN',
            'message', 'Cannot access swipe usage for this profile'
        );
    END IF;

    IF public.matchop_profile_has_active_premium(p_user_id) THEN
        RETURN jsonb_build_object(
            'allowed', TRUE,
            'code', 'OK',
            'effective_plan', 'premium',
            'daily_count', 0,
            'limit_count', NULL,
            'remaining', NULL,
            'reached', FALSE
        );
    END IF;

    SELECT su.swipe_count
    INTO v_daily_count
    FROM public.swipe_usage su
    WHERE su.user_id = p_user_id
      AND su.usage_day = CURRENT_DATE;

    v_daily_count := COALESCE(v_daily_count, 0);

    RETURN jsonb_build_object(
        'allowed', v_daily_count < v_limit,
        'code', CASE WHEN v_daily_count < v_limit THEN 'OK' ELSE 'LIMIT_REACHED' END,
        'effective_plan', 'standard',
        'daily_count', v_daily_count,
        'limit_count', v_limit,
        'remaining', GREATEST(v_limit - v_daily_count, 0),
        'reached', v_daily_count >= v_limit
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_swipe_count(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_limit INTEGER := public.matchop_standard_daily_swipe_limit();
    v_existing_count INTEGER;
    v_new_count INTEGER;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'code', 'BAD_REQUEST',
            'message', 'user_id is required'
        );
    END IF;

    IF NOT public.matchop_can_access_profile_id(p_user_id) THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'code', 'FORBIDDEN',
            'message', 'Cannot increment swipe usage for this profile'
        );
    END IF;

    IF public.matchop_profile_has_active_premium(p_user_id) THEN
        RETURN jsonb_build_object(
            'allowed', TRUE,
            'code', 'OK',
            'effective_plan', 'premium',
            'daily_count', 0,
            'limit_count', NULL,
            'remaining', NULL,
            'reached', FALSE
        );
    END IF;

    LOOP
        SELECT su.swipe_count
        INTO v_existing_count
        FROM public.swipe_usage su
        WHERE su.user_id = p_user_id
          AND su.usage_day = CURRENT_DATE
        FOR UPDATE;

        IF FOUND THEN
            IF v_existing_count >= v_limit THEN
                RETURN jsonb_build_object(
                    'allowed', FALSE,
                    'code', 'LIMIT_REACHED',
                    'message', 'Daily swipe limit reached for standard plan',
                    'effective_plan', 'standard',
                    'daily_count', v_existing_count,
                    'limit_count', v_limit,
                    'remaining', 0,
                    'reached', TRUE
                );
            END IF;

            v_new_count := v_existing_count + 1;

            UPDATE public.swipe_usage
            SET swipe_count = v_new_count,
                updated_at = now()
            WHERE user_id = p_user_id
              AND usage_day = CURRENT_DATE;

            RETURN jsonb_build_object(
                'allowed', TRUE,
                'code', 'OK',
                'effective_plan', 'standard',
                'daily_count', v_new_count,
                'limit_count', v_limit,
                'remaining', GREATEST(v_limit - v_new_count, 0),
                'reached', v_new_count >= v_limit
            );
        END IF;

        BEGIN
            INSERT INTO public.swipe_usage (user_id, usage_day, swipe_count, created_at, updated_at)
            VALUES (p_user_id, CURRENT_DATE, 1, now(), now());

            RETURN jsonb_build_object(
                'allowed', TRUE,
                'code', 'OK',
                'effective_plan', 'standard',
                'daily_count', 1,
                'limit_count', v_limit,
                'remaining', GREATEST(v_limit - 1, 0),
                'reached', (1 >= v_limit)
            );
        EXCEPTION
            WHEN unique_violation THEN
                -- Concurrent insert for same (user_id, day). Retry loop.
        END;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_student_swipe_daily_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF NEW.student_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Ignore duplicate attempts; unique constraint will reject them.
    IF EXISTS (
        SELECT 1
        FROM public.student_swipes sw
        WHERE sw.student_id = NEW.student_id
          AND sw.offer_id = NEW.offer_id
    ) THEN
        RETURN NEW;
    END IF;

    v_result := public.increment_swipe_count(NEW.student_id);

    IF COALESCE((v_result ->> 'allowed')::BOOLEAN, FALSE) = FALSE THEN
        IF COALESCE(v_result ->> 'code', '') = 'LIMIT_REACHED' THEN
            RAISE EXCEPTION 'LIMIT_REACHED: Daily swipe limit reached'
                USING ERRCODE = 'P0001',
                      DETAIL = v_result::TEXT;
        END IF;

        RAISE EXCEPTION 'SWIPE_LIMIT_CHECK_FAILED'
            USING ERRCODE = 'P0001',
                  DETAIL = v_result::TEXT;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_swipes_daily_limit ON public.student_swipes;
CREATE TRIGGER trg_student_swipes_daily_limit
    BEFORE INSERT ON public.student_swipes
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_student_swipe_daily_limit();

CREATE OR REPLACE FUNCTION public.record_student_swipe_with_limit(
    p_student_id UUID,
    p_offer_id UUID,
    p_direction TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_direction TEXT;
    v_status JSONB;
BEGIN
    IF auth.uid() IS NULL AND auth.role() <> 'service_role' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'UNAUTHORIZED',
            'message', 'Authentication required'
        );
    END IF;

    IF p_student_id IS NULL OR p_offer_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'BAD_REQUEST',
            'message', 'student_id and offer_id are required'
        );
    END IF;

    IF NOT public.matchop_can_access_profile_id(p_student_id) THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'FORBIDDEN',
            'message', 'Cannot create swipe for this profile'
        );
    END IF;

    v_direction := lower(COALESCE(p_direction, 'left'));
    IF v_direction = 'super' THEN
        v_direction := 'right';
    END IF;

    IF v_direction NOT IN ('left', 'right') THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'BAD_REQUEST',
            'message', 'direction must be left, right, or super'
        );
    END IF;

    BEGIN
        INSERT INTO public.student_swipes (student_id, offer_id, direction)
        VALUES (p_student_id, p_offer_id, v_direction);
    EXCEPTION
        WHEN unique_violation THEN
            v_status := public.get_swipe_limit_status(p_student_id);
            RETURN jsonb_build_object(
                'success', FALSE,
                'code', 'ALREADY_SWIPED',
                'message', 'Offer already swiped',
                'usage', v_status
            );
        WHEN OTHERS THEN
            IF SQLSTATE = 'P0001' AND position('LIMIT_REACHED' IN SQLERRM) > 0 THEN
                v_status := public.get_swipe_limit_status(p_student_id);
                RETURN jsonb_build_object(
                    'success', FALSE,
                    'code', 'LIMIT_REACHED',
                    'message', 'Daily swipe limit reached for standard plan',
                    'usage', v_status
                );
            END IF;
            RAISE;
    END;

    v_status := public.get_swipe_limit_status(p_student_id);
    RETURN jsonb_build_object(
        'success', TRUE,
        'code', 'OK',
        'message', 'Swipe recorded',
        'usage', v_status
    );
END;
$$;

ALTER TABLE public.swipe_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS swipe_usage_select_own ON public.swipe_usage;
CREATE POLICY swipe_usage_select_own
    ON public.swipe_usage
    FOR SELECT
    TO authenticated
    USING (public.matchop_can_access_profile_id(user_id));

REVOKE ALL ON TABLE public.swipe_usage FROM PUBLIC;
GRANT SELECT ON TABLE public.swipe_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.swipe_usage TO service_role;

REVOKE ALL ON FUNCTION public.get_swipe_limit_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_swipe_limit_status(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.increment_swipe_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_swipe_count(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_student_swipe_with_limit(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_student_swipe_with_limit(UUID, UUID, TEXT) TO authenticated, service_role;

-- Backfill usage counts from historical swipes so limits are coherent immediately.
INSERT INTO public.swipe_usage (user_id, usage_day, swipe_count)
SELECT
    sw.student_id AS user_id,
    (sw.created_at AT TIME ZONE 'UTC')::DATE AS usage_day,
    COUNT(*)::INTEGER AS swipe_count
FROM public.student_swipes sw
GROUP BY sw.student_id, (sw.created_at AT TIME ZONE 'UTC')::DATE
ON CONFLICT (user_id, usage_day)
DO UPDATE
SET swipe_count = EXCLUDED.swipe_count,
    updated_at = now();

END
$swipe_usage_daily_limit$ LANGUAGE plpgsql;
