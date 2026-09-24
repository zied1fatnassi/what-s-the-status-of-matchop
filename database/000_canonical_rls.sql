-- ============================================================
-- 000_canonical_rls.sql
-- SINGLE AUTHORITATIVE RLS POLICY FILE FOR MATCHOP
-- Replaces ALL previous fix_*.sql / nuclear_fix.sql files
-- Run this ONCE in Supabase SQL Editor to fix all policy issues
-- ============================================================

BEGIN;

-- 1. RE-ENABLE RLS ON ALL TABLES (undo nuclear fixes)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Handle optional tables
DO $$ BEGIN
    EXECUTE 'ALTER TABLE IF EXISTS experiences ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
    EXECUTE 'ALTER TABLE IF EXISTS student_education ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
    EXECUTE 'ALTER TABLE IF EXISTS external_jobs ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
    EXECUTE 'ALTER TABLE IF EXISTS blocked_users ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
    EXECUTE 'ALTER TABLE IF EXISTS reported_users ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 2. DROP ALL EXISTING POLICIES (nuclear cleanup of duplicates)
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

-- 3. REVOKE DANGEROUS GRANTS (undo nuclear grants to anon)
REVOKE ALL ON TABLE profiles FROM anon;
REVOKE ALL ON TABLE students FROM anon;
REVOKE ALL ON TABLE companies FROM anon;
REVOKE ALL ON TABLE offers FROM anon;
REVOKE ALL ON TABLE student_swipes FROM anon;
REVOKE ALL ON TABLE company_swipes FROM anon;
REVOKE ALL ON TABLE matches FROM anon;
REVOKE ALL ON TABLE messages FROM anon;

-- Re-grant proper access to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE students TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE offers TO authenticated;
GRANT SELECT, INSERT ON TABLE student_swipes TO authenticated;
GRANT SELECT, INSERT ON TABLE company_swipes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE matches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE messages TO authenticated;

-- ============================================================
-- 4. CREATE CANONICAL POLICIES
-- ============================================================

-- ---- PROFILES ----
CREATE POLICY "profiles_select" ON profiles FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
    TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- GDPR: Allow users to delete their own profile (account deletion)
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE
    TO authenticated USING (auth.uid() = id);

-- ---- STUDENTS ----
CREATE POLICY "students_select" ON students FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "students_insert_own" ON students FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "students_update_own" ON students FOR UPDATE
    TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---- COMPANIES ----
CREATE POLICY "companies_select" ON companies FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "companies_insert_own" ON companies FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "companies_update_own" ON companies FOR UPDATE
    TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---- OFFERS ----
CREATE POLICY "offers_select_active" ON offers FOR SELECT
    TO authenticated USING (status = 'active' OR company_id = auth.uid());

CREATE POLICY "offers_insert_company" ON offers FOR INSERT
    TO authenticated WITH CHECK (company_id = auth.uid());

CREATE POLICY "offers_update_company" ON offers FOR UPDATE
    TO authenticated USING (company_id = auth.uid()) WITH CHECK (company_id = auth.uid());

CREATE POLICY "offers_delete_company" ON offers FOR DELETE
    TO authenticated USING (company_id = auth.uid());

-- ---- STUDENT SWIPES ----
CREATE POLICY "student_swipes_select_own" ON student_swipes FOR SELECT
    TO authenticated USING (student_id = auth.uid());

CREATE POLICY "student_swipes_insert_own" ON student_swipes FOR INSERT
    TO authenticated WITH CHECK (student_id = auth.uid());

-- ---- COMPANY SWIPES ----
CREATE POLICY "company_swipes_select_own" ON company_swipes FOR SELECT
    TO authenticated USING (company_id = auth.uid());

CREATE POLICY "company_swipes_insert_own" ON company_swipes FOR INSERT
    TO authenticated WITH CHECK (company_id = auth.uid());

-- ---- MATCHES ----
CREATE POLICY "matches_select_participant" ON matches FOR SELECT
    TO authenticated USING (
        student_id = auth.uid() OR company_id = auth.uid()
    );

-- SECURITY: Only the backend (service_role via Edge Functions/triggers) should create
-- matches. Allowing either party to INSERT enables fake match creation.
CREATE POLICY "matches_insert_service_only" ON matches FOR INSERT
    TO service_role WITH CHECK (true);

CREATE POLICY "matches_update_participant" ON matches FOR UPDATE
    TO authenticated USING (
        student_id = auth.uid() OR company_id = auth.uid()
    );

-- ---- MESSAGES ----
CREATE POLICY "messages_select_match_member" ON messages FOR SELECT
    TO authenticated USING (
        match_id IN (
            SELECT id FROM matches 
            WHERE student_id = auth.uid() OR company_id = auth.uid()
        )
    );

CREATE POLICY "messages_insert_match_member" ON messages FOR INSERT
    TO authenticated WITH CHECK (
        sender_id = auth.uid() AND
        match_id IN (
            SELECT id FROM matches 
            WHERE student_id = auth.uid() OR company_id = auth.uid()
        )
    );

CREATE POLICY "messages_update_read" ON messages FOR UPDATE
    TO authenticated USING (
        match_id IN (
            SELECT id FROM matches 
            WHERE student_id = auth.uid() OR company_id = auth.uid()
        )
    );

-- ---- EXPERIENCES (optional table) ----
DO $$ BEGIN
    CREATE POLICY "experiences_select" ON experiences FOR SELECT
        TO authenticated USING (true);
    CREATE POLICY "experiences_insert_own" ON experiences FOR INSERT
        TO authenticated WITH CHECK (student_id = auth.uid());
    CREATE POLICY "experiences_update_own" ON experiences FOR UPDATE
        TO authenticated USING (student_id = auth.uid());
    CREATE POLICY "experiences_delete_own" ON experiences FOR DELETE
        TO authenticated USING (student_id = auth.uid());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ---- STUDENT EDUCATION (optional table) ----
DO $$ BEGIN
    CREATE POLICY "education_select" ON student_education FOR SELECT
        TO authenticated USING (true);
    CREATE POLICY "education_insert_own" ON student_education FOR INSERT
        TO authenticated WITH CHECK (student_id = auth.uid());
    CREATE POLICY "education_update_own" ON student_education FOR UPDATE
        TO authenticated USING (student_id = auth.uid());
    CREATE POLICY "education_delete_own" ON student_education FOR DELETE
        TO authenticated USING (student_id = auth.uid());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ---- EXTERNAL JOBS (public read) ----
DO $$ BEGIN
    CREATE POLICY "external_jobs_select" ON external_jobs FOR SELECT
        TO authenticated USING (true);
    CREATE POLICY "external_jobs_select_anon" ON external_jobs FOR SELECT
        TO anon USING (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ---- BLOCKED USERS (optional table) ----
DO $$ BEGIN
    CREATE POLICY "blocked_select_own" ON blocked_users FOR SELECT
        TO authenticated USING (blocker_id = auth.uid());
    CREATE POLICY "blocked_insert_own" ON blocked_users FOR INSERT
        TO authenticated WITH CHECK (blocker_id = auth.uid());
    CREATE POLICY "blocked_delete_own" ON blocked_users FOR DELETE
        TO authenticated USING (blocker_id = auth.uid());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ---- REPORTED USERS (optional table) ----
DO $$ BEGIN
    CREATE POLICY "reported_select_own" ON reported_users FOR SELECT
        TO authenticated USING (reporter_id = auth.uid());
    CREATE POLICY "reported_insert_own" ON reported_users FOR INSERT
        TO authenticated WITH CHECK (reporter_id = auth.uid());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- 5. VERIFY
-- ============================================================
SELECT tablename, policyname, cmd, roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

COMMIT;
