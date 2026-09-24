-- ============================================================
-- premium_rls_smoke_test.sql
-- Purpose:
--   Verify premium-gated SELECT behavior for global opportunities.
--
-- Usage:
--   1) Run the migration that adds `is_global` and restrictive policies.
--   2) Run this script in local Supabase SQL editor / psql as a privileged role.
--   3) This script uses BEGIN/ROLLBACK and leaves no persisted test data.
-- ============================================================

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.profiles';
    END IF;

    IF to_regclass('public.user_profiles') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.user_profiles';
    END IF;

    IF to_regclass('public.external_jobs') IS NULL THEN
        RAISE EXCEPTION 'Missing required table public.external_jobs';
    END IF;
END
$$;

-- --------------------------------------------------------------------------
-- Fixture users (auth user IDs represented in profiles/user_profiles)
-- --------------------------------------------------------------------------
-- non-premium student
INSERT INTO public.profiles (id, email, is_premium, premium_expires_at)
VALUES (
    '00000000-0000-0000-0000-000000000011',
    'rls-free-student@example.com',
    FALSE,
    NULL
)
ON CONFLICT (id) DO UPDATE
SET
    is_premium = EXCLUDED.is_premium,
    premium_expires_at = EXCLUDED.premium_expires_at;

-- premium student
INSERT INTO public.profiles (id, email, is_premium, premium_expires_at)
VALUES (
    '00000000-0000-0000-0000-000000000012',
    'rls-premium-student@example.com',
    TRUE,
    now() + interval '30 days'
)
ON CONFLICT (id) DO UPDATE
SET
    is_premium = EXCLUDED.is_premium,
    premium_expires_at = EXCLUDED.premium_expires_at;

-- company user
INSERT INTO public.profiles (id, email, is_premium, premium_expires_at)
VALUES (
    '00000000-0000-0000-0000-000000000013',
    'rls-company@example.com',
    FALSE,
    NULL
)
ON CONFLICT (id) DO NOTHING;

-- admin user
INSERT INTO public.profiles (id, email, is_premium, premium_expires_at)
VALUES (
    '00000000-0000-0000-0000-000000000014',
    'rls-admin@example.com',
    FALSE,
    NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, user_id, profile_type, is_default)
VALUES
    ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', 'student', TRUE),
    ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012', 'student', TRUE),
    ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000013', 'company', TRUE),
    ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000014', 'admin', TRUE)
ON CONFLICT (id) DO UPDATE
SET
    user_id = EXCLUDED.user_id,
    profile_type = EXCLUDED.profile_type,
    is_default = EXCLUDED.is_default;

-- --------------------------------------------------------------------------
-- External jobs fixtures (no FK dependencies)
-- --------------------------------------------------------------------------
INSERT INTO public.external_jobs (
    id,
    source_website,
    original_url,
    title,
    company_name,
    location,
    posted_at,
    is_global
)
VALUES
    (
        '20000000-0000-0000-0000-000000000001',
        'smoke-test',
        'https://smoke.test/non-global',
        'RLS Smoke Non-Global Job',
        'Smoke Co',
        'Remote',
        now(),
        FALSE
    ),
    (
        '20000000-0000-0000-0000-000000000002',
        'smoke-test',
        'https://smoke.test/global',
        'RLS Smoke Global Job',
        'Smoke Co',
        'Remote',
        now(),
        TRUE
    )
ON CONFLICT (original_url) DO UPDATE
SET
    title = EXCLUDED.title,
    posted_at = EXCLUDED.posted_at,
    is_global = EXCLUDED.is_global;

-- --------------------------------------------------------------------------
-- Optional offers fixtures if offers/companies exist in this environment
-- --------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.companies') IS NULL OR to_regclass('public.offers') IS NULL THEN
        RAISE NOTICE 'Skipping offers fixture setup (companies/offers table not found).';
        RETURN;
    END IF;

    INSERT INTO public.companies (id, company_name)
    VALUES ('00000000-0000-0000-0000-000000000013', 'RLS Smoke Company')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.offers (id, company_id, title, status, is_global)
    VALUES
        ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 'RLS Smoke Local Offer', 'active', FALSE),
        ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000013', 'RLS Smoke Global Offer', 'active', TRUE)
    ON CONFLICT (id) DO UPDATE
    SET
        status = EXCLUDED.status,
        is_global = EXCLUDED.is_global;
END
$$;

-- --------------------------------------------------------------------------
-- Case A: non-premium student
-- Expected:
--   external_jobs -> non_global: 1, global: 0
--   offers (if fixtures exist) -> non_global: 1, global: 0
-- --------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);

SELECT
    'free_student_external_jobs' AS case_name,
    count(*) FILTER (WHERE is_global = FALSE) AS non_global_visible,
    count(*) FILTER (WHERE is_global = TRUE)  AS global_visible
FROM public.external_jobs
WHERE id IN (
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002'
);

DO $$
BEGIN
    IF to_regclass('public.offers') IS NULL THEN
        RAISE NOTICE 'Skipping offers assertion for free student (offers table not found).';
        RETURN;
    END IF;

    RAISE NOTICE '%',
        (
            SELECT json_build_object(
                'case_name', 'free_student_offers',
                'non_global_visible', count(*) FILTER (WHERE is_global = FALSE),
                'global_visible', count(*) FILTER (WHERE is_global = TRUE)
            )::TEXT
            FROM public.offers
            WHERE id IN (
                '30000000-0000-0000-0000-000000000001',
                '30000000-0000-0000-0000-000000000002'
            )
        );
END
$$;

RESET ROLE;

-- --------------------------------------------------------------------------
-- Case B: premium student
-- Expected:
--   external_jobs -> non_global: 1, global: 1
--   offers (if fixtures exist) -> non_global: 1, global: 1
-- --------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);

SELECT
    'premium_student_external_jobs' AS case_name,
    count(*) FILTER (WHERE is_global = FALSE) AS non_global_visible,
    count(*) FILTER (WHERE is_global = TRUE)  AS global_visible
FROM public.external_jobs
WHERE id IN (
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002'
);

DO $$
BEGIN
    IF to_regclass('public.offers') IS NULL THEN
        RAISE NOTICE 'Skipping offers assertion for premium student (offers table not found).';
        RETURN;
    END IF;

    RAISE NOTICE '%',
        (
            SELECT json_build_object(
                'case_name', 'premium_student_offers',
                'non_global_visible', count(*) FILTER (WHERE is_global = FALSE),
                'global_visible', count(*) FILTER (WHERE is_global = TRUE)
            )::TEXT
            FROM public.offers
            WHERE id IN (
                '30000000-0000-0000-0000-000000000001',
                '30000000-0000-0000-0000-000000000002'
            )
        );
END
$$;

RESET ROLE;

-- --------------------------------------------------------------------------
-- Case C: company user (dashboard compatibility)
-- Expected:
--   external_jobs -> non_global: 1, global: 1
-- --------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000013', true);

SELECT
    'company_external_jobs' AS case_name,
    count(*) FILTER (WHERE is_global = FALSE) AS non_global_visible,
    count(*) FILTER (WHERE is_global = TRUE)  AS global_visible
FROM public.external_jobs
WHERE id IN (
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002'
);

RESET ROLE;

-- --------------------------------------------------------------------------
-- Case D: anon user
-- Expected:
--   external_jobs -> non_global: 0, global: 0
-- --------------------------------------------------------------------------
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.role', 'anon', true);
SELECT set_config('request.jwt.claim.sub', '', true);

SELECT
    'anon_external_jobs' AS case_name,
    count(*) FILTER (WHERE is_global = FALSE) AS non_global_visible,
    count(*) FILTER (WHERE is_global = TRUE)  AS global_visible
FROM public.external_jobs
WHERE id IN (
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002'
);

RESET ROLE;

-- Keep environment clean after smoke validation.
ROLLBACK;
