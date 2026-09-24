-- ============================================================
-- Migration: Lock down public PostGIS metadata table grants
-- Date: 2026-02-27
-- Purpose:
--   Block PostgREST anon/authenticated reads of public.spatial_ref_sys
--   using explicit privilege revocation (without destructive actions).
-- ============================================================

-- ---------------------------------------------------------------------------
-- Phase 0 evidence (pre-fix) printed to migration logs
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_info_schema_grants TEXT;
    v_relacl TEXT;
    v_anon_select BOOLEAN;
    v_auth_select BOOLEAN;
    v_public_select BOOLEAN;
    v_schemas_setting TEXT;
BEGIN
    SELECT COALESCE(
        string_agg(format('%s:%s', grantee, privilege_type), ', ' ORDER BY grantee, privilege_type),
        '<none>'
    )
    INTO v_info_schema_grants
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'spatial_ref_sys';

    SELECT c.relacl::TEXT
    INTO v_relacl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'spatial_ref_sys';

    v_anon_select := has_table_privilege('anon', 'public.spatial_ref_sys', 'select');
    v_auth_select := has_table_privilege('authenticated', 'public.spatial_ref_sys', 'select');
    v_public_select := has_table_privilege('public', 'public.spatial_ref_sys', 'select');

    SELECT setting
    INTO v_schemas_setting
    FROM pg_settings
    WHERE name = 'app.settings.schemas';

    RAISE NOTICE 'PRECHECK information_schema grants: %', v_info_schema_grants;
    RAISE NOTICE 'PRECHECK relacl: %', COALESCE(v_relacl, '<null>');
    RAISE NOTICE 'PRECHECK has_table_privilege anon/auth/public = %/%/%',
        v_anon_select, v_auth_select, v_public_select;
    RAISE NOTICE 'PRECHECK app.settings.schemas: %', COALESCE(v_schemas_setting, '<not-visible>');
END
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Core grant hardening (minimal blast radius)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    rel_name TEXT;
    rel_reg regclass;
BEGIN
    FOREACH rel_name IN ARRAY ARRAY[
        'public.spatial_ref_sys',
        'public.geometry_columns',
        'public.geography_columns',
        'public.raster_columns',
        'public.raster_overviews'
    ]
    LOOP
        rel_reg := to_regclass(rel_name);
        IF rel_reg IS NULL THEN
            CONTINUE;
        END IF;

        BEGIN
            EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC', rel_reg);
            EXECUTE format('REVOKE ALL ON TABLE %s FROM anon', rel_reg);
            EXECUTE format('REVOKE ALL ON TABLE %s FROM authenticated', rel_reg);
            RAISE NOTICE 'Applied REVOKE ALL on % for PUBLIC, anon, authenticated.', rel_name;
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE 'Could not revoke grants on % (insufficient privilege).', rel_name;
        END;
    END LOOP;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    BEGIN
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
        REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
        RAISE NOTICE 'Adjusted default privileges in schema public for tables.';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'Skipping ALTER DEFAULT PRIVILEGES due to insufficient privilege.';
    END;
END
$$ LANGUAGE plpgsql;

-- Optional RLS attempt only if allowed. Core remediation remains REVOKE-based.
DO $$
BEGIN
    IF to_regclass('public.spatial_ref_sys') IS NULL THEN
        RETURN;
    END IF;

    BEGIN
        ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.spatial_ref_sys FORCE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled and forced RLS on public.spatial_ref_sys.';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'Skipping RLS enable due to insufficient_privilege.';
    END;
END
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Post-fix evidence printed to migration logs
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_info_schema_grants TEXT;
    v_relacl TEXT;
    v_anon_select BOOLEAN;
    v_auth_select BOOLEAN;
    v_public_select BOOLEAN;
BEGIN
    SELECT COALESCE(
        string_agg(format('%s:%s', grantee, privilege_type), ', ' ORDER BY grantee, privilege_type),
        '<none>'
    )
    INTO v_info_schema_grants
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'spatial_ref_sys';

    SELECT c.relacl::TEXT
    INTO v_relacl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'spatial_ref_sys';

    v_anon_select := has_table_privilege('anon', 'public.spatial_ref_sys', 'select');
    v_auth_select := has_table_privilege('authenticated', 'public.spatial_ref_sys', 'select');
    v_public_select := has_table_privilege('public', 'public.spatial_ref_sys', 'select');

    RAISE NOTICE 'POSTCHECK information_schema grants: %', v_info_schema_grants;
    RAISE NOTICE 'POSTCHECK relacl: %', COALESCE(v_relacl, '<null>');
    RAISE NOTICE 'POSTCHECK has_table_privilege anon/auth/public = %/%/%',
        v_anon_select, v_auth_select, v_public_select;
END
$$ LANGUAGE plpgsql;
