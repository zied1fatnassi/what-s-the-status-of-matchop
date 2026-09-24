-- ============================================================
-- Migration: Premium-gate global opportunities via RLS SELECT
-- Date: 2026-02-24
-- Purpose:
--   1) Add is_global flag to opportunities tables.
--   2) Add supporting indexes for common filters.
--   3) Enforce premium-only access for global rows for students.
--      Preserve company/admin dashboard read paths.
-- ============================================================

CREATE OR REPLACE FUNCTION public.matchop_requester_has_profile_type(target_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    has_match BOOLEAN := FALSE;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
        BEGIN
            EXECUTE $sql$
                SELECT EXISTS (
                    SELECT 1
                    FROM public.user_profiles up
                    WHERE up.user_id = $1
                      AND up.profile_type::TEXT = $2
                )
            $sql$
            INTO has_match
            USING auth.uid(), target_type;
        EXCEPTION
            WHEN undefined_column THEN
                has_match := FALSE;
        END;

        IF has_match THEN
            RETURN TRUE;
        END IF;
    END IF;

    IF to_regclass('public.profiles') IS NOT NULL THEN
        BEGIN
            EXECUTE $sql$
                SELECT EXISTS (
                    SELECT 1
                    FROM public.profiles p
                    WHERE p.id = $1
                      AND p.role::TEXT = $2
                )
            $sql$
            INTO has_match
            USING auth.uid(), target_type;
        EXCEPTION
            WHEN undefined_column THEN
                has_match := FALSE;
        END;

        IF has_match THEN
            RETURN TRUE;
        END IF;

        BEGIN
            EXECUTE $sql$
                SELECT EXISTS (
                    SELECT 1
                    FROM public.profiles p
                    WHERE p.id = $1
                      AND p.type::TEXT = $2
                )
            $sql$
            INTO has_match
            USING auth.uid(), target_type;
        EXCEPTION
            WHEN undefined_column THEN
                has_match := FALSE;
        END;
    END IF;

    RETURN COALESCE(has_match, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.matchop_requester_has_active_premium()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    has_premium BOOLEAN := FALSE;
BEGIN
    IF auth.uid() IS NULL OR to_regclass('public.profiles') IS NULL THEN
        RETURN FALSE;
    END IF;

    BEGIN
        EXECUTE $sql$
            SELECT EXISTS (
                SELECT 1
                FROM public.profiles p
                WHERE p.id = $1
                  AND COALESCE(p.is_premium, FALSE) = TRUE
                  AND (p.premium_expires_at IS NULL OR p.premium_expires_at > now())
            )
        $sql$
        INTO has_premium
        USING auth.uid();
    EXCEPTION
        WHEN undefined_column THEN
            has_premium := FALSE;
    END;

    RETURN COALESCE(has_premium, FALSE);
END;
$$;

DO $$
BEGIN
    IF to_regclass('public.offers') IS NULL THEN
        RAISE NOTICE 'Skipping offers global-premium setup because public.offers does not exist.';
        RETURN;
    END IF;

    ALTER TABLE public.offers
        ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

    CREATE INDEX IF NOT EXISTS idx_offers_is_global
        ON public.offers (is_global);

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'offers' AND column_name = 'status'
    )
    AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'offers' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_offers_is_global_status_created_at
            ON public.offers (is_global, status, created_at DESC);
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'offers' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_offers_is_global_status
            ON public.offers (is_global, status);
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'offers' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_offers_is_global_created_at
            ON public.offers (is_global, created_at DESC);
    END IF;

    DROP POLICY IF EXISTS "matchop_offers_select_premium_gate" ON public.offers;
    CREATE POLICY "matchop_offers_select_premium_gate"
        ON public.offers
        AS RESTRICTIVE
        FOR SELECT
        TO authenticated
        USING (
            auth.uid() IS NOT NULL
            AND (
                public.matchop_requester_has_profile_type('admin')
                OR (
                    public.matchop_requester_has_profile_type('company')
                    AND (
                        status = 'active'
                        OR company_id = auth.uid()
                    )
                )
                OR (
                    public.matchop_requester_has_profile_type('student')
                    AND status = 'active'
                    AND (
                        COALESCE(is_global, FALSE) = FALSE
                        OR public.matchop_requester_has_active_premium()
                    )
                )
            )
        );
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF to_regclass('public.external_jobs') IS NULL THEN
        RAISE NOTICE 'Skipping external_jobs global-premium setup because public.external_jobs does not exist.';
        RETURN;
    END IF;

    ALTER TABLE public.external_jobs
        ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE public.external_jobs ENABLE ROW LEVEL SECURITY;

    CREATE INDEX IF NOT EXISTS idx_external_jobs_is_global
        ON public.external_jobs (is_global);

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'external_jobs' AND column_name = 'posted_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_external_jobs_is_global_posted_at
            ON public.external_jobs (is_global, posted_at DESC);
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'external_jobs' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_external_jobs_is_global_created_at
            ON public.external_jobs (is_global, created_at DESC);
    END IF;

    DROP POLICY IF EXISTS "matchop_external_jobs_select_premium_gate" ON public.external_jobs;
    CREATE POLICY "matchop_external_jobs_select_premium_gate"
        ON public.external_jobs
        AS RESTRICTIVE
        FOR SELECT
        TO public
        USING (
            auth.uid() IS NOT NULL
            AND (
                public.matchop_requester_has_profile_type('admin')
                OR public.matchop_requester_has_profile_type('company')
                OR (
                    public.matchop_requester_has_profile_type('student')
                    AND (
                        COALESCE(is_global, FALSE) = FALSE
                        OR public.matchop_requester_has_active_premium()
                    )
                )
            )
        );

    -- Remove legacy anon read policies; global access now requires authenticated context.
    DROP POLICY IF EXISTS "Allow anon read access to external_jobs" ON public.external_jobs;
    DROP POLICY IF EXISTS "external_jobs_select_anon" ON public.external_jobs;
    DROP POLICY IF EXISTS "Public read access for external jobs" ON public.external_jobs;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF to_regclass('public.jobs') IS NULL THEN
        RAISE NOTICE 'Skipping jobs global-premium setup because public.jobs does not exist.';
        RETURN;
    END IF;

    ALTER TABLE public.jobs
        ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

    CREATE INDEX IF NOT EXISTS idx_jobs_is_global
        ON public.jobs (is_global);

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'status'
    )
    AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_jobs_is_global_status_created_at
            ON public.jobs (is_global, status, created_at DESC);
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_jobs_is_global_status
            ON public.jobs (is_global, status);
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_jobs_is_global_created_at
            ON public.jobs (is_global, created_at DESC);
    END IF;

    DROP POLICY IF EXISTS "matchop_jobs_select_premium_gate" ON public.jobs;
    CREATE POLICY "matchop_jobs_select_premium_gate"
        ON public.jobs
        AS RESTRICTIVE
        FOR SELECT
        TO public
        USING (
            auth.uid() IS NOT NULL
            AND (
                public.matchop_requester_has_profile_type('admin')
                OR public.matchop_requester_has_profile_type('company')
                OR (
                    public.matchop_requester_has_profile_type('student')
                    AND (
                        COALESCE(is_global, FALSE) = FALSE
                        OR public.matchop_requester_has_active_premium()
                    )
                )
            )
        );
END
$$ LANGUAGE plpgsql;
