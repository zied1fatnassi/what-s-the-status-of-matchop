-- ============================================================
-- Migration: Ensure profile row for new auth users
-- Date: 2026-02-25
-- Purpose:
--   Add an AFTER INSERT trigger on auth.users that inserts
--   a matching row into public.profiles for every new auth user.
-- ============================================================

DO $$
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN
        RAISE NOTICE 'Skipping auth.users profile-row trigger migration because public.profiles does not exist yet.';
        RETURN;
    END IF;

    CREATE OR REPLACE FUNCTION public.matchop_ensure_profile_for_new_auth_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    BEGIN
        INSERT INTO public.profiles (id, email)
        VALUES (NEW.id, NEW.email)
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email;

        RETURN NEW;
    END;
    $fn$;

    DROP TRIGGER IF EXISTS trg_auth_users_ensure_profile ON auth.users;
    CREATE TRIGGER trg_auth_users_ensure_profile
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.matchop_ensure_profile_for_new_auth_user();
END
$$ LANGUAGE plpgsql;
