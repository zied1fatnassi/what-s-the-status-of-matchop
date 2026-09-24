-- ============================================================
-- Migration: Lock down external_jobs and expose safe public view
-- Date: 2026-02-28
-- Purpose:
--   1) Remove anon/auth/public direct SELECT access to base table.
--   2) Keep public read capability through a limited safe view.
--   3) Emit before/after privilege evidence in migration logs.
-- ============================================================

DO $$
DECLARE
    v_anon_select BOOLEAN;
    v_auth_select BOOLEAN;
    v_public_select BOOLEAN;
    v_columns TEXT;
    v_sensitive_columns TEXT;
BEGIN
    IF to_regclass('public.external_jobs') IS NULL THEN
        RAISE NOTICE 'Skipping migration because public.external_jobs does not exist.';
        RETURN;
    END IF;

    SELECT has_table_privilege('anon', 'public.external_jobs', 'select')
    INTO v_anon_select;
    SELECT has_table_privilege('authenticated', 'public.external_jobs', 'select')
    INTO v_auth_select;
    SELECT has_table_privilege('public', 'public.external_jobs', 'select')
    INTO v_public_select;

    SELECT COALESCE(
        string_agg(format('%s:%s', column_name, data_type), ', ' ORDER BY ordinal_position),
        '<none>'
    )
    INTO v_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'external_jobs';

    SELECT COALESCE(
        string_agg(column_name, ', ' ORDER BY column_name),
        '<none>'
    )
    INTO v_sensitive_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'external_jobs'
      AND (
          column_name ILIKE '%email%'
          OR column_name ILIKE '%phone%'
          OR column_name ILIKE '%payload%'
          OR column_name ILIKE '%raw%'
          OR column_name ILIKE '%internal%'
          OR column_name ILIKE '%moderat%'
          OR column_name ILIKE '%user_id%'
      );

    RAISE NOTICE 'PRECHECK external_jobs has_table_privilege anon/auth/public=%/%/%',
        v_anon_select, v_auth_select, v_public_select;
    RAISE NOTICE 'PRECHECK external_jobs columns=%', v_columns;
    RAISE NOTICE 'PRECHECK sensitive-like columns=%', v_sensitive_columns;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF to_regclass('public.external_jobs') IS NULL THEN
        RETURN;
    END IF;

    BEGIN
        ALTER TABLE public.external_jobs ENABLE ROW LEVEL SECURITY;
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'Could not enable RLS on public.external_jobs (insufficient privilege).';
    END;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF to_regclass('public.external_jobs') IS NULL THEN
        RETURN;
    END IF;

    REVOKE ALL ON TABLE public.external_jobs FROM PUBLIC;
    REVOKE ALL ON TABLE public.external_jobs FROM anon;
    REVOKE ALL ON TABLE public.external_jobs FROM authenticated;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW public.external_jobs_public AS
SELECT
    ej.id,
    ej.title,
    ej.company_name,
    ej.location,
    ej.job_type,
    ej.salary_range,
    ej.description,
    ej.logo_url,
    ej.source_website,
    ej.original_url,
    ej.posted_at,
    ej.created_at,
    ej.tags,
    ej.is_global,
    ej.source_website AS source,
    ej.original_url AS url
FROM public.external_jobs ej;

REVOKE ALL ON TABLE public.external_jobs_public FROM PUBLIC;
GRANT SELECT ON TABLE public.external_jobs_public TO anon;
GRANT SELECT ON TABLE public.external_jobs_public TO authenticated;

DO $$
DECLARE
    v_base_anon BOOLEAN;
    v_base_auth BOOLEAN;
    v_base_public BOOLEAN;
    v_view_anon BOOLEAN;
    v_view_auth BOOLEAN;
BEGIN
    IF to_regclass('public.external_jobs') IS NOT NULL THEN
        SELECT has_table_privilege('anon', 'public.external_jobs', 'select') INTO v_base_anon;
        SELECT has_table_privilege('authenticated', 'public.external_jobs', 'select') INTO v_base_auth;
        SELECT has_table_privilege('public', 'public.external_jobs', 'select') INTO v_base_public;
    END IF;

    SELECT has_table_privilege('anon', 'public.external_jobs_public', 'select') INTO v_view_anon;
    SELECT has_table_privilege('authenticated', 'public.external_jobs_public', 'select') INTO v_view_auth;

    RAISE NOTICE 'POSTCHECK external_jobs base has_table_privilege anon/auth/public=%/%/%',
        v_base_anon, v_base_auth, v_base_public;
    RAISE NOTICE 'POSTCHECK external_jobs_public view has_table_privilege anon/auth=%/%',
        v_view_anon, v_view_auth;
END
$$ LANGUAGE plpgsql;
