-- ============================================================
-- Migration: user_profiles access fix
-- Date: 2026-02-20
-- Purpose:
--   Resolve 403 errors when authenticated users read their own
--   public.user_profiles rows from the SPA.
-- ============================================================

DO $$
DECLARE
    _has_id boolean;
    _has_user_id boolean;
    _owner_condition text;
BEGIN
    IF to_regclass('public.user_profiles') IS NULL THEN
        RAISE NOTICE 'Skipping user_profiles access fix because public.user_profiles does not exist.';
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_profiles'
          AND column_name = 'id'
    )
    INTO _has_id;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_profiles'
          AND column_name = 'user_id'
    )
    INTO _has_user_id;

    IF _has_user_id AND _has_id THEN
        _owner_condition := '(user_id = auth.uid() OR id = auth.uid())';
    ELSIF _has_user_id THEN
        _owner_condition := '(user_id = auth.uid())';
    ELSIF _has_id THEN
        _owner_condition := '(id = auth.uid())';
    ELSE
        RAISE EXCEPTION
            'public.user_profiles has neither id nor user_id column; cannot apply ownership policy safely';
    END IF;

    ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.user_profiles FROM anon;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.user_profiles TO authenticated;
    GRANT ALL ON TABLE public.user_profiles TO service_role;

    DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
    EXECUTE format(
        'CREATE POLICY user_profiles_select_own ON public.user_profiles FOR SELECT TO authenticated USING %s',
        _owner_condition
    );

    DROP POLICY IF EXISTS user_profiles_insert_own ON public.user_profiles;
    EXECUTE format(
        'CREATE POLICY user_profiles_insert_own ON public.user_profiles FOR INSERT TO authenticated WITH CHECK %s',
        _owner_condition
    );

    DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
    EXECUTE format(
        'CREATE POLICY user_profiles_update_own ON public.user_profiles FOR UPDATE TO authenticated USING %s WITH CHECK %s',
        _owner_condition,
        _owner_condition
    );
END
$$ LANGUAGE plpgsql;

