-- ============================================================
-- Migration: Public schema hardening for advisor warnings
-- Date: 2026-02-19
-- Purpose:
--   1) Move extensions out of public schema
--   2) Keep extension-owned objects (for example spatial_ref_sys) out of public
--      by relocating PostGIS to a non-public schema
-- ============================================================

-- Keep extension objects in dedicated non-public schemas.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS gis;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA gis TO anon, authenticated, service_role;

-- Move pg_trgm out of public when needed.
DO $$
DECLARE
    _owner text;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_extension e
        JOIN pg_namespace n ON n.oid = e.extnamespace
        WHERE e.extname = 'pg_trgm'
          AND n.nspname = 'public'
    ) THEN
        SELECT pg_get_userbyid(e.extowner)
        INTO _owner
        FROM pg_extension e
        WHERE e.extname = 'pg_trgm'
        LIMIT 1;

        IF _owner = current_user THEN
            EXECUTE 'ALTER EXTENSION pg_trgm SET SCHEMA extensions';
        ELSE
            RAISE NOTICE
                'Skipping pg_trgm move. Owner is "%", current role is "%".',
                coalesce(_owner, '<unknown>'),
                current_user;
        END IF;
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Could not move extension pg_trgm (insufficient privilege).';
    WHEN feature_not_supported THEN
        RAISE NOTICE 'Could not move extension pg_trgm (SET SCHEMA not supported).';
END
$$ LANGUAGE plpgsql;

-- Move vector (pgvector) out of public when needed.
DO $$
DECLARE
    _owner text;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_extension e
        JOIN pg_namespace n ON n.oid = e.extnamespace
        WHERE e.extname = 'vector'
          AND n.nspname = 'public'
    ) THEN
        SELECT pg_get_userbyid(e.extowner)
        INTO _owner
        FROM pg_extension e
        WHERE e.extname = 'vector'
        LIMIT 1;

        IF _owner = current_user THEN
            EXECUTE 'ALTER EXTENSION vector SET SCHEMA extensions';
        ELSE
            RAISE NOTICE
                'Skipping vector move. Owner is "%", current role is "%".',
                coalesce(_owner, '<unknown>'),
                current_user;
        END IF;
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Could not move extension vector (insufficient privilege).';
    WHEN feature_not_supported THEN
        RAISE NOTICE 'Could not move extension vector (SET SCHEMA not supported).';
END
$$ LANGUAGE plpgsql;

-- Move postgis out of public when needed.
DO $$
DECLARE
    _owner text;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_extension e
        JOIN pg_namespace n ON n.oid = e.extnamespace
        WHERE e.extname = 'postgis'
          AND n.nspname = 'public'
    ) THEN
        SELECT pg_get_userbyid(e.extowner)
        INTO _owner
        FROM pg_extension e
        WHERE e.extname = 'postgis'
        LIMIT 1;

        IF _owner = current_user THEN
            EXECUTE 'ALTER EXTENSION postgis SET SCHEMA gis';
        ELSE
            RAISE NOTICE
                'Skipping postgis move. Owner is "%", current role is "%".',
                coalesce(_owner, '<unknown>'),
                current_user;
        END IF;
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Could not move extension postgis (insufficient privilege).';
    WHEN feature_not_supported THEN
        RAISE NOTICE 'Could not move extension postgis (SET SCHEMA not supported).';
END
$$ LANGUAGE plpgsql;

-- Validation:
-- In managed Supabase, extension ownership is often controlled by supabase_admin.
-- If current role cannot move extensions, emit notices instead of aborting migration.
DO $$
DECLARE
    _remaining text;
    _owned_by_current_user text;
BEGIN
    SELECT string_agg(e.extname, ', ' ORDER BY e.extname)
    INTO _remaining
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE n.nspname = 'public'
      AND e.extname IN ('postgis', 'pg_trgm', 'vector');

    SELECT string_agg(e.extname, ', ' ORDER BY e.extname)
    INTO _owned_by_current_user
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE n.nspname = 'public'
      AND e.extname IN ('postgis', 'pg_trgm', 'vector')
      AND pg_get_userbyid(e.extowner) = current_user;

    IF _owned_by_current_user IS NOT NULL THEN
        RAISE EXCEPTION
            'Extensions still installed in public schema and owned by current role (%): %',
            current_user,
            _owned_by_current_user;
    END IF;

    IF _remaining IS NOT NULL THEN
        RAISE NOTICE
            'Extensions still in public schema but not owned by current role (%): %. Managed project support may be required to move them.',
            current_user,
            _remaining;
    END IF;

    IF to_regclass('public.spatial_ref_sys') IS NOT NULL THEN
        RAISE NOTICE
            'public.spatial_ref_sys remains in public schema; this is expected while PostGIS is managed by another owner.';
    END IF;
END
$$ LANGUAGE plpgsql;
