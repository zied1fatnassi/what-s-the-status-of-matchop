-- ============================================================
-- Migration: Ensure external_jobs_public uses invoker security
-- Date: 2026-02-28
-- Purpose:
--   1) Remove SECURITY DEFINER behavior from public.external_jobs_public.
--   2) Keep existing view grants explicit.
--   3) Emit migration log evidence for security mode and privileges.
-- ============================================================

DO $$
DECLARE
    v_reloptions TEXT;
    v_view_anon BOOLEAN;
    v_view_auth BOOLEAN;
BEGIN
    IF to_regclass('public.external_jobs_public') IS NULL THEN
        RAISE NOTICE 'Skipping: public.external_jobs_public does not exist.';
        RETURN;
    END IF;

    ALTER VIEW public.external_jobs_public SET (security_invoker = true);

    REVOKE ALL ON TABLE public.external_jobs_public FROM PUBLIC;
    GRANT SELECT ON TABLE public.external_jobs_public TO anon;
    GRANT SELECT ON TABLE public.external_jobs_public TO authenticated;

    SELECT COALESCE(array_to_string(c.reloptions, ','), '<none>')
    INTO v_reloptions
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'external_jobs_public';

    SELECT has_table_privilege('anon', 'public.external_jobs_public', 'select')
    INTO v_view_anon;
    SELECT has_table_privilege('authenticated', 'public.external_jobs_public', 'select')
    INTO v_view_auth;

    RAISE NOTICE 'external_jobs_public reloptions=%', v_reloptions;
    RAISE NOTICE 'external_jobs_public has_table_privilege anon/auth=%/%', v_view_anon, v_view_auth;
END
$$ LANGUAGE plpgsql;
