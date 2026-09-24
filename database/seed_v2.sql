-- ============================================================================
-- MATCHOP V2.1 SEED (Updated for 'offers' table)
-- ============================================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

DO $$
DECLARE
    -- IDs
    comp1_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    stu1_id UUID := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
BEGIN
    -- 1. Create Company Profile
    INSERT INTO profiles (id, email, role)
    VALUES (comp1_id, 'tech@instadeep.com', 'company')
    ON CONFLICT DO NOTHING;

    INSERT INTO companies (id, company_name, industry, location)
    VALUES (comp1_id, 'InstaDeep', 'AI', 'Tunis')
    ON CONFLICT DO NOTHING;

    -- 2. Create Student Profile
    INSERT INTO profiles (id, email, role)
    VALUES (stu1_id, 'student@tek-up.tn', 'student')
    ON CONFLICT DO NOTHING;

    INSERT INTO students (id, display_name, skills, location)
    VALUES (stu1_id, 'Ahmed Tounsi', ARRAY['Python', 'React', 'AI'], 'Tunis')
    ON CONFLICT DO NOTHING;

    -- 3. Create Offer
    INSERT INTO offers (company_id, title, req_skills, location, salary_range)
    VALUES 
    (comp1_id, 'AI Intern', ARRAY['Python', 'AI'], 'Tunis', '1200 TND')
    ON CONFLICT DO NOTHING;

    -- 4. Create Offer (No output variable needed for simple seed)
    INSERT INTO offers (company_id, title, req_skills, location)
    VALUES 
    (comp1_id, 'Frontend Dev', ARRAY['React', 'CSS'], 'Tunis')
    ON CONFLICT DO NOTHING;

END $$;

SELECT '✅ Seed V2.1 Complete' as status;
