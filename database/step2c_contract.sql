-- ============================================================================
-- MATCHOP: STEP 2C — CONTRACT (Post-Verification)
-- ============================================================================
-- This migration:
--   1. Creates profile_type enum + user_profiles table (if Step 2A wasn't run)
--   2. Adds 'admin' to profile_type enum
--   3. Drops profiles.role + profiles.elo_score columns
--   4. Rewrites admin RLS using user_profiles (TEXT cast to avoid commit issue)
--   5. Contracts dual-read RLS to single-path (user_profiles only)
--   6. Rewrites run_daily_janitor() to target user_profiles.elo_score
-- ============================================================================
-- ===================== ENUM SETUP (runs outside transaction) ================

-- Create enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE profile_type AS ENUM ('student', 'company');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add 'admin' to the enum (must be committed before use as an enum literal,
-- but we use TEXT casts below so this is safe even in the same session)
ALTER TYPE profile_type ADD VALUE IF NOT EXISTS 'admin';

-- ===================== MAIN MIGRATION =======================================

BEGIN;

-- ============================================================================
-- 0. PREREQUISITES — Ensure user_profiles table & data exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_type profile_type NOT NULL,
    is_default  BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, profile_type)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user    ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_type    ON user_profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_default ON user_profiles(user_id, is_default)
    WHERE is_default = true;

-- Add active_profile_id to profiles if missing
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS active_profile_id UUID;

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Migrate existing profiles → user_profiles (idempotent)
INSERT INTO user_profiles (id, user_id, profile_type, is_default)
SELECT
    p.id,
    p.id,
    p.role::TEXT::profile_type,
    true
FROM profiles p
WHERE p.role IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.id = p.id
);

-- Copy elo_score to user_profiles if the column exists on profiles
DO $$ BEGIN
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS elo_score INT DEFAULT 1000;

    UPDATE user_profiles up
    SET elo_score = p.elo_score
    FROM profiles p
    WHERE up.user_id = p.id
    AND up.elo_score = 1000
    AND p.elo_score IS NOT NULL
    AND p.elo_score != 1000;
EXCEPTION WHEN undefined_column THEN
    -- elo_score doesn't exist on profiles, just ensure the column exists on user_profiles
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS elo_score INT DEFAULT 1000;
END $$;

-- Helper function: get all profile IDs for the current user
CREATE OR REPLACE FUNCTION my_profile_ids()
RETURNS SETOF UUID AS $$
    SELECT id FROM user_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ============================================================================
-- 1. DROP profiles.role COLUMN
-- ============================================================================
-- Remove constraint, index, then column.

-- A. Drop CHECK constraint
DO $$ BEGIN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- B. Drop index
DROP INDEX IF EXISTS idx_profiles_role;

-- C. Drop column
ALTER TABLE profiles DROP COLUMN IF EXISTS role;

-- ============================================================================
-- 2. DROP profiles.elo_score COLUMN
-- ============================================================================
ALTER TABLE profiles DROP COLUMN IF EXISTS elo_score;


-- ============================================================================
-- 3. ADMIN HELPER FUNCTION
-- ============================================================================
-- Uses TEXT cast so it works even if 'admin' enum value hasn't been committed yet
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND profile_type::TEXT = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ============================================================================
-- 4. REWRITE ADMIN RLS POLICIES (from admin_setup.sql)
-- ============================================================================

-- ── Admin Audit Logs ──
DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON admin_audit_logs
    FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON admin_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON admin_audit_logs
    FOR INSERT WITH CHECK (is_admin());

-- ── App Settings ──
DROP POLICY IF EXISTS "Admins can view settings" ON app_settings;
CREATE POLICY "Admins can view settings" ON app_settings
    FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can update settings" ON app_settings;
CREATE POLICY "Admins can update settings" ON app_settings
    FOR ALL USING (is_admin());

-- ── Reports ──
DROP POLICY IF EXISTS "Admins can manage all reports" ON reports;
CREATE POLICY "Admins can manage all reports" ON reports
    FOR ALL USING (is_admin());

-- ── Profiles (admin overrides) ──
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (auth.uid() = id OR is_admin());

-- ── Offers (admin overrides) ──
DROP POLICY IF EXISTS "Admins can manage all offers" ON offers;
CREATE POLICY "Admins can manage all offers" ON offers
    FOR ALL USING (is_admin());

-- ── Companies (admin overrides) ──
DROP POLICY IF EXISTS "Admins can manage all companies" ON companies;
CREATE POLICY "Admins can manage all companies" ON companies
    FOR ALL USING (is_admin());

-- ── Students (admin overrides) ──
DROP POLICY IF EXISTS "Admins can view all students" ON students;
CREATE POLICY "Admins can view all students" ON students
    FOR SELECT USING (is_admin());

-- ── Matches (admin overrides) ──
DROP POLICY IF EXISTS "Admins can view all matches" ON matches;
CREATE POLICY "Admins can view all matches" ON matches
    FOR SELECT USING (is_admin());


-- ============================================================================
-- 5. CONTRACT DUAL-READ RLS TO SINGLE-PATH
-- ============================================================================
-- Drop all current non-admin public-schema policies, then recreate with ONLY
-- the user_profiles-based path (no more legacy fallback).

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND policyname NOT LIKE 'Admins%'
        AND policyname NOT LIKE 'user_profiles_%'
        AND policyname NOT LIKE 'Users can%'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                       r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 5A. PROFILES
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select"
    ON profiles FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "profiles_insert_own"
    ON profiles FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────
-- 5B. STUDENTS — Single-path via my_profile_ids()
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "students_select"
    ON students FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "students_insert_own"
    ON students FOR INSERT TO authenticated
    WITH CHECK (id IN (SELECT my_profile_ids()));

CREATE POLICY "students_update_own"
    ON students FOR UPDATE TO authenticated
    USING (id IN (SELECT my_profile_ids()))
    WITH CHECK (id IN (SELECT my_profile_ids()));

-- ─────────────────────────────────────────────────────────────────────
-- 5C. COMPANIES — Single-path
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "companies_select"
    ON companies FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "companies_insert_own"
    ON companies FOR INSERT TO authenticated
    WITH CHECK (id IN (SELECT my_profile_ids()));

CREATE POLICY "companies_update_own"
    ON companies FOR UPDATE TO authenticated
    USING (id IN (SELECT my_profile_ids()))
    WITH CHECK (id IN (SELECT my_profile_ids()));

-- ─────────────────────────────────────────────────────────────────────
-- 5D. OFFERS — Single-path
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "offers_select_active"
    ON offers FOR SELECT TO authenticated
    USING (
        status = 'active'
        OR company_id IN (SELECT my_profile_ids())
    );

CREATE POLICY "offers_insert_company"
    ON offers FOR INSERT TO authenticated
    WITH CHECK (company_id IN (SELECT my_profile_ids()));

CREATE POLICY "offers_update_company"
    ON offers FOR UPDATE TO authenticated
    USING (company_id IN (SELECT my_profile_ids()))
    WITH CHECK (company_id IN (SELECT my_profile_ids()));

CREATE POLICY "offers_delete_company"
    ON offers FOR DELETE TO authenticated
    USING (company_id IN (SELECT my_profile_ids()));

-- ─────────────────────────────────────────────────────────────────────
-- 5E. STUDENT SWIPES — Single-path
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "student_swipes_select_own"
    ON student_swipes FOR SELECT TO authenticated
    USING (student_id IN (SELECT my_profile_ids()));

CREATE POLICY "student_swipes_insert_own"
    ON student_swipes FOR INSERT TO authenticated
    WITH CHECK (student_id IN (SELECT my_profile_ids()));

-- ─────────────────────────────────────────────────────────────────────
-- 5F. COMPANY SWIPES — Single-path
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "company_swipes_select_own"
    ON company_swipes FOR SELECT TO authenticated
    USING (company_id IN (SELECT my_profile_ids()));

CREATE POLICY "company_swipes_insert_own"
    ON company_swipes FOR INSERT TO authenticated
    WITH CHECK (company_id IN (SELECT my_profile_ids()));

-- ─────────────────────────────────────────────────────────────────────
-- 5G. MATCHES — Single-path
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "matches_select_participant"
    ON matches FOR SELECT TO authenticated
    USING (
        student_id IN (SELECT my_profile_ids())
        OR company_id IN (SELECT my_profile_ids())
    );

CREATE POLICY "matches_insert_trigger"
    ON matches FOR INSERT TO authenticated
    WITH CHECK (
        student_id IN (SELECT my_profile_ids())
        OR company_id IN (SELECT my_profile_ids())
    );

CREATE POLICY "matches_update_participant"
    ON matches FOR UPDATE TO authenticated
    USING (
        student_id IN (SELECT my_profile_ids())
        OR company_id IN (SELECT my_profile_ids())
    );

-- ─────────────────────────────────────────────────────────────────────
-- 5H. MESSAGES — Single-path
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "messages_select_match_member"
    ON messages FOR SELECT TO authenticated
    USING (
        match_id IN (
            SELECT id FROM matches
            WHERE student_id IN (SELECT my_profile_ids())
               OR company_id IN (SELECT my_profile_ids())
        )
    );

CREATE POLICY "messages_insert_match_member"
    ON messages FOR INSERT TO authenticated
    WITH CHECK (
        sender_id IN (SELECT my_profile_ids())
        AND match_id IN (
            SELECT id FROM matches
            WHERE student_id IN (SELECT my_profile_ids())
               OR company_id IN (SELECT my_profile_ids())
        )
    );

CREATE POLICY "messages_update_read"
    ON messages FOR UPDATE TO authenticated
    USING (
        match_id IN (
            SELECT id FROM matches
            WHERE student_id IN (SELECT my_profile_ids())
               OR company_id IN (SELECT my_profile_ids())
        )
    );

-- ─────────────────────────────────────────────────────────────────────
-- 5I. INTROS — Single-path (skip if table doesn't exist)
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE POLICY "intros_select_student"
        ON intros FOR SELECT TO authenticated
        USING (student_id IN (SELECT my_profile_ids()));

    CREATE POLICY "intros_select_company"
        ON intros FOR SELECT TO authenticated
        USING (company_id IN (SELECT my_profile_ids()));

    CREATE POLICY "intros_update_company"
        ON intros FOR UPDATE TO authenticated
        USING (company_id IN (SELECT my_profile_ids()))
        WITH CHECK (company_id IN (SELECT my_profile_ids()));

    CREATE POLICY "intros_insert_student"
        ON intros FOR INSERT TO authenticated
        WITH CHECK (student_id IN (SELECT my_profile_ids()));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 5J. EXPERIENCES — Single-path
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE POLICY "experiences_select"
        ON experiences FOR SELECT TO authenticated
        USING (true);

    CREATE POLICY "experiences_insert_own"
        ON experiences FOR INSERT TO authenticated
        WITH CHECK (student_id IN (SELECT my_profile_ids()));

    CREATE POLICY "experiences_update_own"
        ON experiences FOR UPDATE TO authenticated
        USING (student_id IN (SELECT my_profile_ids()));

    CREATE POLICY "experiences_delete_own"
        ON experiences FOR DELETE TO authenticated
        USING (student_id IN (SELECT my_profile_ids()));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 5K. EDUCATION — Single-path
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE POLICY "education_select"
        ON education FOR SELECT TO authenticated
        USING (true);

    CREATE POLICY "education_insert_own"
        ON education FOR INSERT TO authenticated
        WITH CHECK (student_id IN (SELECT my_profile_ids()));

    CREATE POLICY "education_update_own"
        ON education FOR UPDATE TO authenticated
        USING (student_id IN (SELECT my_profile_ids()));

    CREATE POLICY "education_delete_own"
        ON education FOR DELETE TO authenticated
        USING (student_id IN (SELECT my_profile_ids()));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "student_education_select"
        ON student_education FOR SELECT TO authenticated
        USING (true);

    CREATE POLICY "student_education_insert_own"
        ON student_education FOR INSERT TO authenticated
        WITH CHECK (student_id IN (SELECT my_profile_ids()));

    CREATE POLICY "student_education_update_own"
        ON student_education FOR UPDATE TO authenticated
        USING (student_id IN (SELECT my_profile_ids()));

    CREATE POLICY "student_education_delete_own"
        ON student_education FOR DELETE TO authenticated
        USING (student_id IN (SELECT my_profile_ids()));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 5L. CERTIFICATIONS — Single-path
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE POLICY "certifications_select"
        ON certifications FOR SELECT TO authenticated
        USING (true);

    CREATE POLICY "certifications_insert_own"
        ON certifications FOR INSERT TO authenticated
        WITH CHECK (student_id IN (SELECT my_profile_ids()));

    CREATE POLICY "certifications_update_own"
        ON certifications FOR UPDATE TO authenticated
        USING (student_id IN (SELECT my_profile_ids()));

    CREATE POLICY "certifications_delete_own"
        ON certifications FOR DELETE TO authenticated
        USING (student_id IN (SELECT my_profile_ids()));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 5M. PROFILE VIEWS — Single-path
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE POLICY "profile_views_select_own"
        ON profile_views FOR SELECT TO authenticated
        USING (student_id IN (SELECT my_profile_ids()));

    CREATE POLICY "profile_views_insert_any"
        ON profile_views FOR INSERT
        TO authenticated, anon
        WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 5N. EXTERNAL JOBS
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE POLICY "external_jobs_select"
        ON external_jobs FOR SELECT TO authenticated
        USING (true);

    CREATE POLICY "external_jobs_select_anon"
        ON external_jobs FOR SELECT TO anon
        USING (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 5O. BLOCKED USERS
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE POLICY "blocked_select_own"
        ON blocked_users FOR SELECT TO authenticated
        USING (blocker_id = auth.uid());

    CREATE POLICY "blocked_insert_own"
        ON blocked_users FOR INSERT TO authenticated
        WITH CHECK (blocker_id = auth.uid());

    CREATE POLICY "blocked_delete_own"
        ON blocked_users FOR DELETE TO authenticated
        USING (blocker_id = auth.uid());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 5P. REPORTED USERS
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE POLICY "reported_select_own"
        ON reported_users FOR SELECT TO authenticated
        USING (reporter_id = auth.uid());

    CREATE POLICY "reported_insert_own"
        ON reported_users FOR INSERT TO authenticated
        WITH CHECK (reporter_id = auth.uid());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;


-- ============================================================================
-- 6. REWRITE run_daily_janitor() — ELO NOW ON user_profiles
-- ============================================================================
CREATE OR REPLACE FUNCTION run_daily_janitor()
RETURNS JSON AS $$
DECLARE
    expired_count INT;
    elo_updated_count INT;
BEGIN
    -- A. Expire intros older than 7 days
    UPDATE intros
    SET status = 'expired', reviewed_at = NOW()
    WHERE status = 'pending'
    AND expires_at < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;

    -- B. Recalculate elo_score on user_profiles based on activity window
    UPDATE user_profiles up
    SET elo_score = CASE
        WHEN p.last_active_at > NOW() - INTERVAL '1 day'   THEN LEAST(up.elo_score + 10, 2000)
        WHEN p.last_active_at > NOW() - INTERVAL '7 days'  THEN up.elo_score
        WHEN p.last_active_at > NOW() - INTERVAL '30 days' THEN GREATEST(up.elo_score - 20, 200)
        ELSE GREATEST(up.elo_score - 50, 100)
    END
    FROM profiles p
    WHERE up.user_id = p.id;

    GET DIAGNOSTICS elo_updated_count = ROW_COUNT;

    RETURN json_build_object(
        'expired_intros', expired_count,
        'elo_updated_profiles', elo_updated_count,
        'run_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 7. USER_PROFILES RLS
-- ============================================================================
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
CREATE POLICY "user_profiles_select_own"
    ON user_profiles FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
CREATE POLICY "user_profiles_insert_own"
    ON user_profiles FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
CREATE POLICY "user_profiles_update_own"
    ON user_profiles FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins can manage all user_profiles
DROP POLICY IF EXISTS "Admins can manage user_profiles" ON user_profiles;
CREATE POLICY "Admins can manage user_profiles" ON user_profiles
    FOR ALL USING (is_admin());


-- ============================================================================
-- 8. VERIFICATION
-- ============================================================================

-- Confirm role and elo_score columns are gone
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Show all active policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

COMMIT;

SELECT '✅ Step 2C Contract applied — profiles.role + elo_score dropped, single-path RLS active' AS status;
