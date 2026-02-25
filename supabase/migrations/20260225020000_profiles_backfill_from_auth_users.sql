-- ============================================================
-- Migration: Backfill profiles from auth.users
-- Date: 2026-02-25
-- Purpose:
--   1) Ensure auth.users -> public.profiles trigger is present and upserts email.
--   2) Backfill missing public.profiles rows for existing auth users.
--   3) Repair null/blank emails on existing profile rows.
-- ============================================================

DO $$
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN
        RAISE NOTICE 'Skipping profiles backfill migration because public.profiles does not exist yet.';
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

    INSERT INTO public.profiles (id, email)
    SELECT u.id, u.email
    FROM auth.users u
    LEFT JOIN public.profiles p
        ON p.id = u.id
    WHERE p.id IS NULL;

    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id
      AND (p.email IS NULL OR p.email = '');
END
$$ LANGUAGE plpgsql;
