-- ============================================================================
-- FIX PERMISSIONS & ENSURE DATA EXISTS
-- ============================================================================

-- 1. FORCEFULLY FIX RLS for Test User (20c01a12-d79a-48de-a17a-7696d52b1832)
-- Drop old hacks if any
DROP POLICY IF EXISTS "Allow all for student test" ON profiles;
DROP POLICY IF EXISTS "Allow all for student record test" ON students;

-- Allow this specific user to do EVERYTHING on their own row
CREATE POLICY "Super Permission Profile" ON profiles 
FOR ALL USING (id = '20c01a12-d79a-48de-a17a-7696d52b1832'::uuid) 
WITH CHECK (id = '20c01a12-d79a-48de-a17a-7696d52b1832'::uuid);

CREATE POLICY "Super Permission Student" ON students 
FOR ALL USING (id = '20c01a12-d79a-48de-a17a-7696d52b1832'::uuid) 
WITH CHECK (id = '20c01a12-d79a-48de-a17a-7696d52b1832'::uuid);


-- 2. ENSURE OFFERS EXIST (Re-seed if missing)
INSERT INTO profiles (id, email, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'instadeep@company.com', 'company')
ON CONFLICT DO NOTHING;

INSERT INTO companies (id, company_name, location_point)
VALUES ('00000000-0000-0000-0000-000000000001', 'InstaDeep', gis.ST_SetSRID(gis.ST_MakePoint(10.1815, 36.8065), 4326))
ON CONFLICT DO NOTHING;

INSERT INTO offers (company_id, title, req_skills, location, location_point, status)
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    'Senior AI Engineer', 
    ARRAY['Python', 'AI', 'TensorFlow'], 
    'Tunis', 
    gis.ST_SetSRID(gis.ST_MakePoint(10.1815, 36.8065), 4326),
    'active'
)
ON CONFLICT DO NOTHING;

SELECT '✅ Permissions Fixed & Data Verified' as status;
