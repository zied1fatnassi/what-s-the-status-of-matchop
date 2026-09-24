-- ============================================================================
-- SAFE PROFILE FIX - Check if tables exist before querying
-- Run this to ensure all tables exist
-- ============================================================================

-- Check existing tables
DO $$ 
BEGIN
    -- Create education table if not exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'education') THEN
        CREATE TABLE education (
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
        
        CREATE INDEX idx_education_student ON education(student_id);
        
        ALTER TABLE education ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Students can manage own education"
        ON education FOR ALL TO authenticated
        USING (student_id = auth.uid())
        WITH CHECK (student_id = auth.uid());
        
        RAISE NOTICE 'Created education table';
    END IF;

    -- Create certifications table if not exists  
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'certifications') THEN
        CREATE TABLE certifications (
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
        
        CREATE INDEX idx_certifications_student ON certifications(student_id);
        
        ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Students can manage own certifications"
        ON certifications FOR ALL TO authenticated
        USING (student_id = auth.uid())
        WITH CHECK (student_id = auth.uid());
        
        RAISE NOTICE 'Created certifications table';
    END IF;

    -- Create profile_views table if not exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_views') THEN
        CREATE TABLE profile_views (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
            viewer_type TEXT,
            viewed_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_profile_views_student ON profile_views(student_id);
        
        ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Students can view own analytics"
        ON profile_views FOR SELECT TO authenticated
        USING (student_id = auth.uid());
        
        CREATE POLICY "Anyone can insert profile views"
        ON profile_views FOR INSERT TO authenticated, anon
        WITH CHECK (true);
        
        RAISE NOTICE 'Created profile_views table';
    END IF;
END $$;

SELECT 'All tables checked/created successfully!' as status;
