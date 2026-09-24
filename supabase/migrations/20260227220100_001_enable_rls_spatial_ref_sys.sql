-- ============================================================
-- Migration: Harden public.spatial_ref_sys access
-- Date: 2026-02-27
-- Purpose:
--   1) Enable and force RLS on public.spatial_ref_sys.
--   2) Revoke anon/authenticated access.
--   3) Keep behavior idempotent and safe on managed environments.
-- ============================================================

DO $$
BEGIN
    IF to_regclass('public.spatial_ref_sys') IS NULL THEN
        RAISE NOTICE 'Skipping spatial_ref_sys hardening because public.spatial_ref_sys does not exist.';
        RETURN;
    END IF;

    BEGIN
        ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.spatial_ref_sys FORCE ROW LEVEL SECURITY;
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'Could not enforce RLS on public.spatial_ref_sys (insufficient privilege).';
        WHEN feature_not_supported THEN
            RAISE NOTICE 'Could not enforce RLS on public.spatial_ref_sys (feature not supported).';
    END;

    BEGIN
        REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'Could not revoke anon/authenticated grants on public.spatial_ref_sys (insufficient privilege).';
    END;
END
$$ LANGUAGE plpgsql;
