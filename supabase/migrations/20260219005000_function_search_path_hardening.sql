-- ============================================================
-- Migration: Function search_path hardening
-- Date: 2026-02-19
-- Purpose:
--   Fix "Function Search Path Mutable" warnings by setting an
--   explicit, immutable search_path on user-defined public functions.
-- ============================================================

DO $$
DECLARE
    fn record;
BEGIN
    FOR fn IN
        SELECT
            n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS identity_args,
            pg_get_userbyid(p.proowner) AS function_owner
        FROM pg_proc p
        JOIN pg_namespace n
            ON n.oid = p.pronamespace
        LEFT JOIN pg_depend d
            ON d.classid = 'pg_proc'::regclass
           AND d.objid = p.oid
           AND d.deptype = 'e'
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'
          AND d.objid IS NULL
    LOOP
        IF fn.function_owner = current_user THEN
            EXECUTE format(
                'ALTER FUNCTION %I.%I(%s) SET search_path = pg_catalog, public, extensions, gis',
                fn.schema_name,
                fn.function_name,
                fn.identity_args
            );
        ELSE
            RAISE NOTICE
                'Skipping function %.%(%): owner %, current role %.',
                fn.schema_name,
                fn.function_name,
                fn.identity_args,
                coalesce(fn.function_owner, '<unknown>'),
                current_user;
        END IF;
    END LOOP;
END
$$ LANGUAGE plpgsql;
