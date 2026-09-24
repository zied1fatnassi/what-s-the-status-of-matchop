-- ============================================================================
-- ADD EXPERIENCES TABLE TO STUDENTS SCHEMA
-- ============================================================================

-- Create experiences table for student work history
CREATE TABLE IF NOT EXISTS experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    is_current BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_experiences_student ON experiences(student_id);

-- RLS Policies
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own experiences" ON experiences;
CREATE POLICY "Students can view own experiences"
ON experiences FOR SELECT
TO authenticated
USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own experiences" ON experiences;
CREATE POLICY "Students can insert own experiences"
ON experiences FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own experiences" ON experiences;
CREATE POLICY "Students can update own experiences"
ON experiences FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can delete own experiences" ON experiences;
CREATE POLICY "Students can delete own experiences"
ON experiences FOR DELETE
TO authenticated
USING (student_id = auth.uid());

-- Companies can view experiences of matched students
DROP POLICY IF EXISTS "Companies can view matched experiences" ON experiences;
CREATE POLICY "Companies can view matched experiences"
ON experiences FOR SELECT
TO authenticated
USING (
    student_id IN (
        SELECT student_id FROM matches WHERE company_id = auth.uid()
    )
);

SELECT '✅ Experiences table created!' as status;
