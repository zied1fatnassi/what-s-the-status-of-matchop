-- ============================================================
-- FIX ALL PERMISSIONS: experiences, student_education, students
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ENSURE TABLES EXIST
-- ============================================================

-- Create experiences table if missing
CREATE TABLE IF NOT EXISTS experiences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create student_education table if missing
CREATE TABLE IF NOT EXISTS student_education (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school TEXT NOT NULL,
    degree TEXT,
    field_of_study TEXT,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. ENABLE RLS
-- ============================================================
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. DROP EXISTING POLICIES (avoid duplicates)
-- ============================================================
DROP POLICY IF EXISTS "experiences_select" ON experiences;
DROP POLICY IF EXISTS "experiences_select_own" ON experiences;
DROP POLICY IF EXISTS "experiences_insert_own" ON experiences;
DROP POLICY IF EXISTS "experiences_update_own" ON experiences;
DROP POLICY IF EXISTS "experiences_delete_own" ON experiences;

DROP POLICY IF EXISTS "education_select" ON student_education;
DROP POLICY IF EXISTS "education_select_own" ON student_education;
DROP POLICY IF EXISTS "education_insert_own" ON student_education;
DROP POLICY IF EXISTS "education_update_own" ON student_education;
DROP POLICY IF EXISTS "education_delete_own" ON student_education;

DROP POLICY IF EXISTS "students_select" ON students;
DROP POLICY IF EXISTS "students_insert_own" ON students;
DROP POLICY IF EXISTS "students_update_own" ON students;

-- ============================================================
-- 4. GRANT TABLE PERMISSIONS TO authenticated ROLE
-- (This was MISSING for experiences and student_education!)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE experiences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE student_education TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE students TO authenticated;

-- Also grant to service_role for edge functions
GRANT ALL ON TABLE experiences TO service_role;
GRANT ALL ON TABLE student_education TO service_role;
GRANT ALL ON TABLE students TO service_role;

-- ============================================================
-- 5. CREATE RLS POLICIES
-- ============================================================

-- EXPERIENCES: users can CRUD their own
CREATE POLICY "experiences_select" ON experiences FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "experiences_insert_own" ON experiences FOR INSERT
    TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "experiences_update_own" ON experiences FOR UPDATE
    TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY "experiences_delete_own" ON experiences FOR DELETE
    TO authenticated USING (student_id = auth.uid());

-- STUDENT_EDUCATION: users can CRUD their own
CREATE POLICY "education_select" ON student_education FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "education_insert_own" ON student_education FOR INSERT
    TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "education_update_own" ON student_education FOR UPDATE
    TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY "education_delete_own" ON student_education FOR DELETE
    TO authenticated USING (student_id = auth.uid());

-- STUDENTS: users can read all, insert/update own
CREATE POLICY "students_select" ON students FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "students_insert_own" ON students FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "students_update_own" ON students FOR UPDATE
    TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- 6. VERIFY
-- ============================================================
SELECT tablename, policyname, cmd, roles
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('experiences', 'student_education', 'students')
ORDER BY tablename, cmd;

COMMIT;
