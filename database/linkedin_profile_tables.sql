-- ============================================================================
-- LINKEDIN-STYLE PROFILE SECTIONS - NEW TABLES
-- Run this in Supabase SQL Editor
-- Creates: education, projects, languages, volunteer_experience tables
-- Note: certifications table already exists
-- ============================================================================

-- ============================================================================
-- 1. EDUCATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school TEXT NOT NULL,
    degree TEXT,
    field_of_study TEXT,
    start_date TEXT,
    end_date TEXT,
    is_current BOOLEAN DEFAULT false,
    grade TEXT,
    activities TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_education_student ON student_education(student_id);

ALTER TABLE student_education ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "education_select_own" ON student_education;
DROP POLICY IF EXISTS "education_insert_own" ON student_education;
DROP POLICY IF EXISTS "education_update_own" ON student_education;
DROP POLICY IF EXISTS "education_delete_own" ON student_education;

CREATE POLICY "education_select_own" ON student_education FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "education_insert_own" ON student_education FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "education_update_own" ON student_education FOR UPDATE TO authenticated
USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY "education_delete_own" ON student_education FOR DELETE TO authenticated
USING (student_id = auth.uid());


-- ============================================================================
-- 2. PROJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    start_date TEXT,
    end_date TEXT,
    is_current BOOLEAN DEFAULT false,
    url TEXT,
    skills TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_student ON student_projects(student_id);

ALTER TABLE student_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_own" ON student_projects;
DROP POLICY IF EXISTS "projects_insert_own" ON student_projects;
DROP POLICY IF EXISTS "projects_update_own" ON student_projects;
DROP POLICY IF EXISTS "projects_delete_own" ON student_projects;

CREATE POLICY "projects_select_own" ON student_projects FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "projects_insert_own" ON student_projects FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "projects_update_own" ON student_projects FOR UPDATE TO authenticated
USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY "projects_delete_own" ON student_projects FOR DELETE TO authenticated
USING (student_id = auth.uid());


-- ============================================================================
-- 3. LANGUAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    proficiency TEXT NOT NULL, -- 'native', 'fluent', 'professional', 'conversational', 'elementary'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_languages_student ON student_languages(student_id);

ALTER TABLE student_languages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "languages_select_own" ON student_languages;
DROP POLICY IF EXISTS "languages_insert_own" ON student_languages;
DROP POLICY IF EXISTS "languages_update_own" ON student_languages;
DROP POLICY IF EXISTS "languages_delete_own" ON student_languages;

CREATE POLICY "languages_select_own" ON student_languages FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "languages_insert_own" ON student_languages FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "languages_update_own" ON student_languages FOR UPDATE TO authenticated
USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY "languages_delete_own" ON student_languages FOR DELETE TO authenticated
USING (student_id = auth.uid());


-- ============================================================================
-- 4. VOLUNTEER EXPERIENCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_volunteer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    organization TEXT NOT NULL,
    role TEXT NOT NULL,
    cause TEXT,
    start_date TEXT,
    end_date TEXT,
    is_current BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_student ON student_volunteer(student_id);

ALTER TABLE student_volunteer ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "volunteer_select_own" ON student_volunteer;
DROP POLICY IF EXISTS "volunteer_insert_own" ON student_volunteer;
DROP POLICY IF EXISTS "volunteer_update_own" ON student_volunteer;
DROP POLICY IF EXISTS "volunteer_delete_own" ON student_volunteer;

CREATE POLICY "volunteer_select_own" ON student_volunteer FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "volunteer_insert_own" ON student_volunteer FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "volunteer_update_own" ON student_volunteer FOR UPDATE TO authenticated
USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY "volunteer_delete_own" ON student_volunteer FOR DELETE TO authenticated
USING (student_id = auth.uid());


-- ============================================================================
-- 5. RLS FOR EXISTING CERTIFICATIONS TABLE (if not already set)
-- ============================================================================
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certifications_select_own" ON certifications;
DROP POLICY IF EXISTS "certifications_insert_own" ON certifications;
DROP POLICY IF EXISTS "certifications_update_own" ON certifications;
DROP POLICY IF EXISTS "certifications_delete_own" ON certifications;

CREATE POLICY "certifications_select_own" ON certifications FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "certifications_insert_own" ON certifications FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "certifications_update_own" ON certifications FOR UPDATE TO authenticated
USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY "certifications_delete_own" ON certifications FOR DELETE TO authenticated
USING (student_id = auth.uid());


-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT '✅ LinkedIn-style profile tables created!' as status;

SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('student_education', 'student_projects', 'student_languages', 'student_volunteer', 'certifications')
ORDER BY tablename;
