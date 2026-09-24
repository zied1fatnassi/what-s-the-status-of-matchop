-- ============================================================
-- Migration: Harden PostGIS public exposure without destructive actions
-- Date: 2026-02-27
-- Purpose:
--   1) Diagnose why spatial_ref_sys is reachable via Data API.
--   2) Revoke direct access to PostGIS metadata relations in public.
--   3) Tighten default privileges in public schema (best effort).
-- Notes:
--   - No DROP EXTENSION / DROP TABLE actions.
--   - No RLS policy widening.
-- ============================================================

DO $$
DECLARE
    v_grants TEXT;
    v_rls TEXT;
    v_schemas TEXT;
    v_read_memberships TEXT;
BEGIN
    SELECT COALESCE(
        string_agg(format('%s:%s', grantee, privilege_type), ', ' ORDER BY grantee, privilege_type),
        '<none>'
    )
    INTO v_grants
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'spatial_ref_sys';

    SELECT COALESCE(
        format('rowsecurity=%s, force_rls=%s', c.relrowsecurity, c.relforcerowsecurity),
        '<table_not_found>'
    )
    INTO v_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'spatial_ref_sys';

    SELECT COALESCE(setting, '<not_visible>')
    INTO v_schemas
    FROM pg_settings
    WHERE name = 'app.settings.schemas';

    SELECT COALESCE(
        string_agg(format('%s<- %s', m.member_name, m.parent_role), ', ' ORDER BY m.member_name, m.parent_role),
        '<none>'
    )
    INTO v_read_memberships
    FROM (
        SELECT
            child.rolname AS member_name,
            parent.rolname AS parent_role
        FROM pg_auth_members am
        JOIN pg_roles child ON child.oid = am.member
        JOIN pg_roles parent ON parent.oid = am.roleid
        WHERE child.rolname IN ('anon', 'authenticated')
          AND parent.rolname IN ('pg_read_all_data', 'pg_write_all_data')
    ) m;

    RAISE NOTICE 'PRECHECK spatial_ref_sys grants: %', v_grants;
    RAISE NOTICE 'PRECHECK spatial_ref_sys RLS state: %', v_rls;
    RAISE NOTICE 'PRECHECK app.settings.schemas: %', v_schemas;
    RAISE NOTICE 'PRECHECK anon/auth privileged memberships: %', v_read_memberships;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_auth_members am
        JOIN pg_roles child ON child.oid = am.member
        JOIN pg_roles parent ON parent.oid = am.roleid
        WHERE child.rolname = 'anon'
          AND parent.rolname = 'pg_read_all_data'
    ) THEN
        BEGIN
            REVOKE pg_read_all_data FROM anon;
            RAISE NOTICE 'Revoked pg_read_all_data from anon.';
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE 'Could not revoke pg_read_all_data from anon (insufficient privilege).';
        END;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_auth_members am
        JOIN pg_roles child ON child.oid = am.member
        JOIN pg_roles parent ON parent.oid = am.roleid
        WHERE child.rolname = 'authenticated'
          AND parent.rolname = 'pg_read_all_data'
    ) THEN
        BEGIN
            REVOKE pg_read_all_data FROM authenticated;
            RAISE NOTICE 'Revoked pg_read_all_data from authenticated.';
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE 'Could not revoke pg_read_all_data from authenticated (insufficient privilege).';
        END;
    END IF;
END
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    rel_name TEXT;
    rel_reg regclass;
BEGIN
    FOREACH rel_name IN ARRAY ARRAY[
        'public.spatial_ref_sys',
        'public.geography_columns',
        'public.geometry_columns',
        'public.raster_columns',
        'public.raster_overviews'
    ]
    LOOP
        rel_reg := to_regclass(rel_name);
        IF rel_reg IS NULL THEN
            CONTINUE;
        END IF;

        BEGIN
            EXECUTE format('REVOKE ALL ON TABLE %s FROM anon, authenticated', rel_reg);
            EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC', rel_reg);
            RAISE NOTICE 'Applied REVOKE hardening on %.', rel_name;
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE 'Could not revoke privileges on % (insufficient privilege).', rel_name;
        END;
    END LOOP;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    BEGIN
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
        REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
        RAISE NOTICE 'Adjusted default table privileges in schema public.';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'Could not alter default table privileges in schema public (insufficient privilege).';
    END;
END
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    v_grants TEXT;
BEGIN
    SELECT COALESCE(
        string_agg(format('%s:%s', grantee, privilege_type), ', ' ORDER BY grantee, privilege_type),
        '<none>'
    )
    INTO v_grants
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'spatial_ref_sys';

    RAISE NOTICE 'POSTCHECK spatial_ref_sys grants: %', v_grants;
END
$$ LANGUAGE plpgsql;
