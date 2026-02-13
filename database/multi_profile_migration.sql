-- ============================================================================
-- MATCHOP: MULTI-PROFILE MIGRATION — STEP 2A (EXPAND)
-- ============================================================================
-- This migration adds the "One Account, Multiple Profiles" model ALONGSIDE
-- the existing role column. Nothing is dropped. All RLS policies are
-- rewritten with "dual-read" logic so both old (auth.uid() = entity.id)
-- and new (user_profiles lookup) paths work simultaneously.
--
-- Run AFTER all existing migrations. Safe to run on a live system.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PROFILE TYPE ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE profile_type AS ENUM ('student', 'company');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. USER_PROFILES TABLE (The New Link)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_type profile_type NOT NULL,
    is_default  BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW(),

    -- Enforce: max 1 student + max 1 company per account
    UNIQUE(user_id, profile_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user    ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_type    ON user_profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_default ON user_profiles(user_id, is_default)
    WHERE is_default = true;

-- ============================================================================
-- 3. ADD active_profile_id TO PROFILES
-- ============================================================================
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS active_profile_id UUID;

-- FK will be added after data migration (avoid chicken-and-egg)

-- ============================================================================
-- 4. MIGRATE EXISTING DATA
-- ============================================================================
-- For every existing user, create a user_profiles entry that mirrors their
-- current role. The user_profiles.id is set to the user's auth.users.id so
-- that existing FK relationships (students.id, companies.id → profiles.id)
-- continue to work without modification.

INSERT INTO user_profiles (id, user_id, profile_type, is_default)
SELECT
    p.id,                         -- Same UUID as profiles.id / auth.users.id
    p.id,                         -- user_id = auth.users.id
    p.role::TEXT::profile_type,   -- Cast existing role enum → new enum
    true                          -- Mark as default
FROM profiles p
WHERE NOT EXISTS (
    -- Idempotent: skip if already migrated
    SELECT 1 FROM user_profiles up WHERE up.id = p.id
);

-- Set active_profile_id for all existing users
UPDATE profiles p
SET active_profile_id = p.id   -- For legacy users, active_profile_id = their own id
WHERE active_profile_id IS NULL;

-- Now add the FK constraint
DO $$ BEGIN
    ALTER TABLE profiles
        ADD CONSTRAINT fk_profiles_active_profile
        FOREIGN KEY (active_profile_id)
        REFERENCES user_profiles(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 5. MOVE ELO_SCORE TO USER_PROFILES (per-persona scoring)
-- ============================================================================
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS elo_score INT DEFAULT 1000;

-- Copy existing elo scores
UPDATE user_profiles up
SET elo_score = p.elo_score
FROM profiles p
WHERE up.user_id = p.id
AND up.elo_score = 1000       -- Only if not already updated
AND p.elo_score IS NOT NULL
AND p.elo_score != 1000;

-- ============================================================================
-- 6. RLS FOR USER_PROFILES TABLE
-- ============================================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE user_profiles TO authenticated;

CREATE POLICY "user_profiles_select_own"
    ON user_profiles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "user_profiles_insert_own"
    ON user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_profiles_update_own"
    ON user_profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 7. HELPER FUNCTION — Resolve Profile IDs for Current User
-- ============================================================================
-- Returns all user_profiles.id values owned by the current auth user.
-- Used in RLS policies to avoid repeating the subquery everywhere.

CREATE OR REPLACE FUNCTION my_profile_ids()
RETURNS SETOF UUID AS $$
    SELECT id FROM user_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- 8. DUAL-READ RLS POLICIES (Drop old → Create new)
-- ============================================================================
-- Strategy: every policy that checks `auth.uid() = some_column` is rewritten
-- to also check `some_column IN (SELECT my_profile_ids())`.
-- This means:
--   Legacy users (auth.uid() = profiles.id = students.id) → still works
--   New multi-profile users → works via user_profiles lookup
-- ============================================================================

-- ── Drop ALL existing public-schema policies (same approach as canonical) ──
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                       r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 8A. PROFILES
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select"
    ON profiles FOR SELECT TO authenticated
    USING (true);  -- Public read (directory listing)

CREATE POLICY "profiles_insert_own"
    ON profiles FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────
-- 8B. STUDENTS
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "students_select"
    ON students FOR SELECT TO authenticated
    USING (true);  -- Public read

CREATE POLICY "students_insert_own"
    ON students FOR INSERT TO authenticated
    WITH CHECK (
        id = auth.uid()                     -- Legacy
        OR id IN (SELECT my_profile_ids())  -- Multi-profile
    );

CREATE POLICY "students_update_own"
    ON students FOR UPDATE TO authenticated
    USING (
        id = auth.uid()
        OR id IN (SELECT my_profile_ids())
    )
    WITH CHECK (
        id = auth.uid()
        OR id IN (SELECT my_profile_ids())
    );

-- ─────────────────────────────────────────────────────────────────────
-- 8C. COMPANIES
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "companies_select"
    ON companies FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "companies_insert_own"
    ON companies FOR INSERT TO authenticated
    WITH CHECK (
        id = auth.uid()
        OR id IN (SELECT my_profile_ids())
    );

CREATE POLICY "companies_update_own"
    ON companies FOR UPDATE TO authenticated
    USING (
        id = auth.uid()
        OR id IN (SELECT my_profile_ids())
    )
    WITH CHECK (
        id = auth.uid()
        OR id IN (SELECT my_profile_ids())
    );

-- ─────────────────────────────────────────────────────────────────────
-- 8D. OFFERS
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "offers_select_active"
    ON offers FOR SELECT TO authenticated
    USING (
        status = 'active'
        OR company_id = auth.uid()
        OR company_id IN (SELECT my_profile_ids())
    );

CREATE POLICY "offers_insert_company"
    ON offers FOR INSERT TO authenticated
    WITH CHECK (
        company_id = auth.uid()
        OR company_id IN (SELECT my_profile_ids())
    );

CREATE POLICY "offers_update_company"
    ON offers FOR UPDATE TO authenticated
    USING (
        company_id = auth.uid()
        OR company_id IN (SELECT my_profile_ids())
    )
    WITH CHECK (
        company_id = auth.uid()
        OR company_id IN (SELECT my_profile_ids())
    );

CREATE POLICY "offers_delete_company"
    ON offers FOR DELETE TO authenticated
    USING (
        company_id = auth.uid()
        OR company_id IN (SELECT my_profile_ids())
    );

-- ─────────────────────────────────────────────────────────────────────
-- 8E. STUDENT SWIPES
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "student_swipes_select_own"
    ON student_swipes FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR student_id IN (SELECT my_profile_ids())
    );

CREATE POLICY "student_swipes_insert_own"
    ON student_swipes FOR INSERT TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        OR student_id IN (SELECT my_profile_ids())
    );

-- ─────────────────────────────────────────────────────────────────────
-- 8F. COMPANY SWIPES
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "company_swipes_select_own"
    ON company_swipes FOR SELECT TO authenticated
    USING (
        company_id = auth.uid()
        OR company_id IN (SELECT my_profile_ids())
    );

CREATE POLICY "company_swipes_insert_own"
    ON company_swipes FOR INSERT TO authenticated
    WITH CHECK (
        company_id = auth.uid()
        OR company_id IN (SELECT my_profile_ids())
    );

-- ─────────────────────────────────────────────────────────────────────
-- 8G. MATCHES
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "matches_select_participant"
    ON matches FOR SELECT TO authenticated
    USING (
        student_id = auth.uid() OR company_id = auth.uid()
        OR student_id IN (SELECT my_profile_ids())
        OR company_id IN (SELECT my_profile_ids())
    );

CREATE POLICY "matches_insert_trigger"
    ON matches FOR INSERT TO authenticated
    WITH CHECK (
        student_id = auth.uid() OR company_id = auth.uid()
        OR student_id IN (SELECT my_profile_ids())
        OR company_id IN (SELECT my_profile_ids())
    );

CREATE POLICY "matches_update_participant"
    ON matches FOR UPDATE TO authenticated
    USING (
        student_id = auth.uid() OR company_id = auth.uid()
        OR student_id IN (SELECT my_profile_ids())
        OR company_id IN (SELECT my_profile_ids())
    );

-- ─────────────────────────────────────────────────────────────────────
-- 8H. MESSAGES
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "messages_select_match_member"
    ON messages FOR SELECT TO authenticated
    USING (
        match_id IN (
            SELECT id FROM matches
            WHERE student_id = auth.uid() OR company_id = auth.uid()
               OR student_id IN (SELECT my_profile_ids())
               OR company_id IN (SELECT my_profile_ids())
        )
    );

CREATE POLICY "messages_insert_match_member"
    ON messages FOR INSERT TO authenticated
    WITH CHECK (
        (sender_id = auth.uid() OR sender_id IN (SELECT my_profile_ids()))
        AND match_id IN (
            SELECT id FROM matches
            WHERE student_id = auth.uid() OR company_id = auth.uid()
               OR student_id IN (SELECT my_profile_ids())
               OR company_id IN (SELECT my_profile_ids())
        )
    );

CREATE POLICY "messages_update_read"
    ON messages FOR UPDATE TO authenticated
    USING (
        match_id IN (
            SELECT id FROM matches
            WHERE student_id = auth.uid() OR company_id = auth.uid()
               OR student_id IN (SELECT my_profile_ids())
               OR company_id IN (SELECT my_profile_ids())
        )
    );

-- ─────────────────────────────────────────────────────────────────────
-- 8I. INTROS (from handshake_system.sql)
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE POLICY "intros_select_student"
        ON intros FOR SELECT TO authenticated
        USING (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );

    CREATE POLICY "intros_select_company"
        ON intros FOR SELECT TO authenticated
        USING (
            company_id = auth.uid()
            OR company_id IN (SELECT my_profile_ids())
        );

    CREATE POLICY "intros_update_company"
        ON intros FOR UPDATE TO authenticated
        USING (
            company_id = auth.uid()
            OR company_id IN (SELECT my_profile_ids())
        )
        WITH CHECK (
            company_id = auth.uid()
            OR company_id IN (SELECT my_profile_ids())
        );

    CREATE POLICY "intros_insert_student"
        ON intros FOR INSERT TO authenticated
        WITH CHECK (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 8J. EXPERIENCES
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE POLICY "experiences_select"
        ON experiences FOR SELECT TO authenticated
        USING (true);

    CREATE POLICY "experiences_insert_own"
        ON experiences FOR INSERT TO authenticated
        WITH CHECK (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );

    CREATE POLICY "experiences_update_own"
        ON experiences FOR UPDATE TO authenticated
        USING (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );

    CREATE POLICY "experiences_delete_own"
        ON experiences FOR DELETE TO authenticated
        USING (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 8K. EDUCATION
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE POLICY "education_select"
        ON education FOR SELECT TO authenticated
        USING (true);

    CREATE POLICY "education_insert_own"
        ON education FOR INSERT TO authenticated
        WITH CHECK (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );

    CREATE POLICY "education_update_own"
        ON education FOR UPDATE TO authenticated
        USING (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );

    CREATE POLICY "education_delete_own"
        ON education FOR DELETE TO authenticated
        USING (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Also handle student_education if it exists
DO $$ BEGIN
    CREATE POLICY "student_education_select"
        ON student_education FOR SELECT TO authenticated
        USING (true);

    CREATE POLICY "student_education_insert_own"
        ON student_education FOR INSERT TO authenticated
        WITH CHECK (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );

    CREATE POLICY "student_education_update_own"
        ON student_education FOR UPDATE TO authenticated
        USING (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );

    CREATE POLICY "student_education_delete_own"
        ON student_education FOR DELETE TO authenticated
        USING (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 8L. CERTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE POLICY "certifications_select"
        ON certifications FOR SELECT TO authenticated
        USING (true);

    CREATE POLICY "certifications_insert_own"
        ON certifications FOR INSERT TO authenticated
        WITH CHECK (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );

    CREATE POLICY "certifications_update_own"
        ON certifications FOR UPDATE TO authenticated
        USING (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );

    CREATE POLICY "certifications_delete_own"
        ON certifications FOR DELETE TO authenticated
        USING (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 8M. PROFILE VIEWS
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE POLICY "profile_views_select_own"
        ON profile_views FOR SELECT TO authenticated
        USING (
            student_id = auth.uid()
            OR student_id IN (SELECT my_profile_ids())
        );

    CREATE POLICY "profile_views_insert_any"
        ON profile_views FOR INSERT
        TO authenticated, anon
        WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 8N. EXTERNAL JOBS (public read — unchanged)
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
-- 8O. BLOCKED USERS
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
-- 8P. REPORTED USERS
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
-- 9. VERIFICATION QUERIES
-- ============================================================================

-- A. Confirm user_profiles were created for all existing users
SELECT
    (SELECT COUNT(*) FROM profiles)          AS total_profiles,
    (SELECT COUNT(*) FROM user_profiles)     AS total_user_profiles,
    (SELECT COUNT(*) FROM user_profiles WHERE is_default = true) AS defaults;

-- B. Show all active policies
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

COMMIT;

SELECT '✅ Multi-Profile Migration Step 2A (Expand) applied — dual-read RLS active' AS status;
