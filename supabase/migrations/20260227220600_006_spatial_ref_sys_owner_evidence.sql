-- ============================================================
-- Migration: Evidence snapshot for spatial_ref_sys ownership/ACL
-- Date: 2026-02-27
-- Purpose:
--   Capture authoritative diagnostics from linked project without
--   mutating schema objects.
-- ============================================================

DO $$
DECLARE
    v_current_user TEXT;
    v_owner TEXT;
    v_relacl TEXT;
    v_public_select BOOLEAN;
    v_anon_select BOOLEAN;
    v_auth_select BOOLEAN;
BEGIN
    SELECT current_user INTO v_current_user;

    SELECT
        c.relowner::regrole::TEXT,
        c.relacl::TEXT
    INTO
        v_owner,
        v_relacl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'spatial_ref_sys';

    v_public_select := has_table_privilege('public', 'public.spatial_ref_sys', 'select');
    v_anon_select := has_table_privilege('anon', 'public.spatial_ref_sys', 'select');
    v_auth_select := has_table_privilege('authenticated', 'public.spatial_ref_sys', 'select');

    RAISE NOTICE 'EVIDENCE current_user=%', COALESCE(v_current_user, '<null>');
    RAISE NOTICE 'EVIDENCE public.spatial_ref_sys owner=% relacl=%',
        COALESCE(v_owner, '<null>'),
        COALESCE(v_relacl, '<null>');
    RAISE NOTICE 'EVIDENCE has_table_privilege public/anon/auth=%/%/%',
        v_public_select,
        v_anon_select,
        v_auth_select;
END
$$ LANGUAGE plpgsql;
