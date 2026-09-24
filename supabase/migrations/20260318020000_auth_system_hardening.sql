-- ============================================================
-- Migration: Auth System Hardening & User Provisioning Trigger
-- Date: 2026-03-18
-- Purpose:
--   1) Ensure password_reset_tokens table exists with RLS for Edge Functions.
--   2) Create robust, fault-tolerant trigger on auth.users that automatically
--      provisions public.profiles, public.user_profiles, and role-specific
--      rows (public.students / public.companies) from raw_user_meta_data.
--   3) Backfill missing user_profiles and role rows for existing auth users.
-- ============================================================

BEGIN;

-- 1. Password Reset Tokens Table (for secure-password-reset Edge Function)
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_email_active
    ON public.password_reset_tokens (email, used, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires
    ON public.password_reset_tokens (expires_at)
    WHERE used = FALSE;

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- 2. Robust User Provisioning Trigger Function
CREATE OR REPLACE FUNCTION public.matchop_handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    _meta jsonb;
    _type text;
    _name text;
    _website text;
    _sector text;
    _university text;
    _major text;
    _up_id uuid;
BEGIN
    _meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    _type := COALESCE(_meta->>'type', 'student');
    
    -- Normalize user type
    IF _type NOT IN ('student', 'company', 'admin') THEN
        _type := 'student';
    END IF;

    _name := COALESCE(
        _meta->>'name',
        _meta->>'display_name',
        _meta->>'company_name',
        split_part(COALESCE(NEW.email, 'User'), '@', 1)
    );
    IF _name IS NULL OR btrim(_name) = '' THEN
        _name := CASE WHEN _type = 'company' THEN 'Company' ELSE 'Student' END;
    END IF;

    _website := _meta->>'website';
    _sector := COALESCE(_meta->>'sector', _meta->>'industry');
    _university := _meta->>'university';
    _major := _meta->>'major';

    -- A) Upsert public.profiles
    BEGIN
        INSERT INTO public.profiles (id, email, type, name)
        VALUES (NEW.id, COALESCE(NEW.email, ''), _type, _name)
        ON CONFLICT (id) DO UPDATE
        SET email = COALESCE(EXCLUDED.email, public.profiles.email),
            type = COALESCE(public.profiles.type, EXCLUDED.type),
            name = COALESCE(public.profiles.name, EXCLUDED.name),
            updated_at = now();
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'matchop_handle_auth_user_created: failed to upsert profiles for %: %', NEW.id, SQLERRM;
    END;

    -- B) Upsert public.user_profiles
    BEGIN
        IF to_regclass('public.user_profiles') IS NOT NULL THEN
            INSERT INTO public.user_profiles (id, user_id, profile_type, is_default)
            VALUES (NEW.id, NEW.id, _type, TRUE)
            ON CONFLICT (id) DO UPDATE
            SET profile_type = COALESCE(public.user_profiles.profile_type, EXCLUDED.profile_type);

            -- Link active_profile_id on profiles
            UPDATE public.profiles
            SET active_profile_id = NEW.id
            WHERE id = NEW.id AND active_profile_id IS NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'matchop_handle_auth_user_created: failed to upsert user_profiles for %: %', NEW.id, SQLERRM;
    END;

    -- C) Provision role-specific table row
    IF _type = 'student' THEN
        BEGIN
            IF to_regclass('public.students') IS NOT NULL THEN
                INSERT INTO public.students (id, display_name, location, skills)
                VALUES (NEW.id, _name, '', '{}'::text[])
                ON CONFLICT (id) DO UPDATE
                SET display_name = COALESCE(public.students.display_name, EXCLUDED.display_name);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'matchop_handle_auth_user_created: failed to upsert students for %: %', NEW.id, SQLERRM;
        END;
    ELSIF _type = 'company' THEN
        BEGIN
            IF to_regclass('public.companies') IS NOT NULL THEN
                INSERT INTO public.companies (id, company_name, industry, website, description)
                VALUES (NEW.id, _name, COALESCE(_sector, ''), _website, '')
                ON CONFLICT (id) DO UPDATE
                SET company_name = COALESCE(public.companies.company_name, EXCLUDED.company_name),
                    industry = COALESCE(public.companies.industry, EXCLUDED.industry),
                    website = COALESCE(public.companies.website, EXCLUDED.website);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'matchop_handle_auth_user_created: failed to upsert companies for %: %', NEW.id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$fn$;

-- 3. Attach Trigger to auth.users
DROP TRIGGER IF EXISTS trg_auth_users_ensure_profile ON auth.users;
DROP TRIGGER IF EXISTS trg_auth_users_handle_user_created ON auth.users;

CREATE TRIGGER trg_auth_users_handle_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.matchop_handle_auth_user_created();

-- 4. Backfill existing orphaned users
DO $$
DECLARE
    r RECORD;
    _type text;
    _name text;
BEGIN
    FOR r IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        _type := COALESCE(r.raw_user_meta_data->>'type', 'student');
        IF _type NOT IN ('student', 'company', 'admin') THEN
            _type := 'student';
        END IF;

        _name := COALESCE(
            r.raw_user_meta_data->>'name',
            r.raw_user_meta_data->>'display_name',
            r.raw_user_meta_data->>'company_name',
            split_part(COALESCE(r.email, 'User'), '@', 1)
        );

        -- Ensure profiles row
        INSERT INTO public.profiles (id, email, type, name)
        VALUES (r.id, COALESCE(r.email, ''), _type, _name)
        ON CONFLICT (id) DO UPDATE
        SET email = COALESCE(public.profiles.email, EXCLUDED.email),
            type = COALESCE(public.profiles.type, EXCLUDED.type),
            name = COALESCE(public.profiles.name, EXCLUDED.name);

        -- Ensure user_profiles row
        IF to_regclass('public.user_profiles') IS NOT NULL THEN
            INSERT INTO public.user_profiles (id, user_id, profile_type, is_default)
            VALUES (r.id, r.id, _type, TRUE)
            ON CONFLICT (id) DO NOTHING;

            UPDATE public.profiles
            SET active_profile_id = r.id
            WHERE id = r.id AND active_profile_id IS NULL;
        END IF;

        -- Ensure role-specific row
        IF _type = 'student' AND to_regclass('public.students') IS NOT NULL THEN
            INSERT INTO public.students (id, display_name)
            VALUES (r.id, _name)
            ON CONFLICT (id) DO NOTHING;
        ELSIF _type = 'company' AND to_regclass('public.companies') IS NOT NULL THEN
            INSERT INTO public.companies (id, company_name)
            VALUES (r.id, _name)
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END LOOP;
END;
$$;

COMMIT;
