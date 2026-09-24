-- ============================================================================
-- ADD EDUCATION AND CERTIFICATIONS TABLES
-- ============================================================================

-- Education table
CREATE TABLE IF NOT EXISTS education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    field_of_study TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT,
    is_current BOOLEAN DEFAULT false,
    grade TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certifications table
CREATE TABLE IF NOT EXISTS certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    issuing_organization TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    expiry_date TEXT,
    credential_id TEXT,
    credential_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile views analytics table
CREATE TABLE IF NOT EXISTS profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    viewer_type TEXT, -- 'company', 'student', 'anonymous'
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_education_student ON education(student_id);
CREATE INDEX IF NOT EXISTS idx_certifications_student ON certifications(student_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_student ON profile_views(student_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_date ON profile_views(viewed_at);

-- RLS Policies for Education
ALTER TABLE education ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can manage own education" ON education;
CREATE POLICY "Students can manage own education"
ON education FOR ALL
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Companies can view matched education" ON education;
CREATE POLICY "Companies can view matched education"
ON education FOR SELECT
TO authenticated
USING (
    student_id IN (
        SELECT student_id FROM matches WHERE company_id = auth.uid()
    )
);

-- RLS Policies for Certifications
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can manage own certifications" ON certifications;
CREATE POLICY "Students can manage own certifications"
ON certifications FOR ALL
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Companies can view matched certifications" ON certifications;
CREATE POLICY "Companies can view matched certifications"
ON certifications FOR SELECT
TO authenticated
USING (
    student_id IN (
        SELECT student_id FROM matches WHERE company_id = auth.uid()
    )
);

-- RLS Policies for Profile Views
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own analytics" ON profile_views;
CREATE POLICY "Students can view own analytics"
ON profile_views FOR SELECT
TO authenticated
USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can insert profile views" ON profile_views;
CREATE POLICY "Anyone can insert profile views"
ON profile_views FOR INSERT
TO authenticated, anon
WITH CHECK (true);

SELECT '✅ Education, Certifications, and Analytics tables created!' as status;
