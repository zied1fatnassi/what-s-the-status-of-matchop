-- ============================================================
-- Migration: PostGIS handling (best-effort move + safe fallback)
-- Date: 2026-02-27
-- Purpose:
--   1) Create dedicated schemas for extensions/geospatial objects.
--   2) Best-effort move postgis out of public.
--   3) If move is blocked, keep extension but harden public.spatial_ref_sys.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS gis;

GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA gis TO anon, authenticated, service_role;

DO $$
DECLARE
    v_postgis_schema TEXT;
    v_postgis_owner TEXT;
    v_move_attempted BOOLEAN := FALSE;
BEGIN
    SELECT n.nspname, pg_get_userbyid(e.extowner)
    INTO v_postgis_schema, v_postgis_owner
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'postgis'
    LIMIT 1;

    IF v_postgis_schema IS NULL THEN
        RAISE NOTICE 'postgis extension is not installed; skipping postgis handling.';
        RETURN;
    END IF;

    IF v_postgis_schema = 'public' THEN
        v_move_attempted := TRUE;
        BEGIN
            ALTER EXTENSION postgis SET SCHEMA gis;
            RAISE NOTICE 'Moved extension postgis from public to gis.';
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE
                    'Could not move extension postgis to gis (insufficient privilege). Owner is "%", current role is "%".',
                    COALESCE(v_postgis_owner, '<unknown>'),
                    current_user;
            WHEN feature_not_supported THEN
                RAISE NOTICE 'Could not move extension postgis to gis (SET SCHEMA not supported).';
        END;
    END IF;

    IF to_regclass('public.spatial_ref_sys') IS NOT NULL THEN
        BEGIN
            ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.spatial_ref_sys FORCE ROW LEVEL SECURITY;
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE 'Could not enforce RLS on public.spatial_ref_sys during fallback hardening (insufficient privilege).';
            WHEN feature_not_supported THEN
                RAISE NOTICE 'Could not enforce RLS on public.spatial_ref_sys during fallback hardening (feature not supported).';
        END;

        BEGIN
            REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE 'Could not revoke anon/authenticated grants on public.spatial_ref_sys during fallback hardening.';
        END;
    END IF;

    SELECT n.nspname
    INTO v_postgis_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'postgis'
    LIMIT 1;

    IF v_postgis_schema = 'public' THEN
        RAISE NOTICE
            'postgis remains in public schema after best-effort handling; managed project support may be required for relocation.';
    ELSIF v_move_attempted THEN
        RAISE NOTICE 'postgis extension now resides in schema "%".', v_postgis_schema;
    END IF;
END
$$ LANGUAGE plpgsql;
