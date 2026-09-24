-- ============================================================================
-- MATCHOP DATABASE VERIFICATION QUERIES
-- Run these in Supabase SQL Editor to diagnose loading issues
-- ============================================================================

-- 1. CHECK IF ALL REQUIRED TABLES EXIST
-- Expected: 6 tables should be listed
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'students', 
    'experiences', 
    'student_education', 
    'offers', 
    'matches', 
    'student_swipes'
)
ORDER BY table_name;

-- 2. CHECK RLS IS ENABLED ON CRITICAL TABLES
-- Expected: All tables should show 'true'
SELECT 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('students', 'experiences', 'student_education', 'offers')
ORDER BY tablename;

-- 3. CHECK RLS POLICIES ON STUDENTS TABLE
-- Expected: Should see SELECT, INSERT, UPDATE policies
SELECT 
    policyname,
    cmd as operation,
    qual as using_expression,
    with_check as check_expression
FROM pg_policies 
WHERE tablename = 'students'
ORDER BY cmd;

-- 4. CHECK PERMISSIONS FOR AUTHENTICATED ROLE
-- Expected: Should see SELECT, INSERT, UPDATE, DELETE for authenticated role
SELECT 
    table_name,
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name IN ('students', 'experiences', 'student_education')
AND grantee IN ('authenticated', 'anon')
ORDER BY table_name, grantee, privilege_type;

-- 5. CHECK IF THERE'S ANY DATA
-- Expected: Should show counts for each table
SELECT 
    'students' as table_name, COUNT(*) as row_count FROM students
UNION ALL
SELECT 'experiences', COUNT(*) FROM experiences
UNION ALL
SELECT 'student_education', COUNT(*) FROM student_education
UNION ALL
SELECT 'offers', COUNT(*) FROM offers
UNION ALL
SELECT 'matches', COUNT(*) FROM matches
UNION ALL
SELECT 'student_swipes', COUNT(*) FROM student_swipes;

-- 6. TEST A SIMPLE SELECT AS AUTHENTICATED USER
-- This simulates what your app does
-- If this fails, RLS policies are blocking reads
SELECT id, display_name 
FROM students 
LIMIT 5;

-- ============================================================================
-- TROUBLESHOOTING TIPS:
-- ============================================================================
-- If Query 1 shows < 6 tables: Tables are missing, run your schema SQL
-- If Query 2 shows 'false': RLS is disabled, run: ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;
-- If Query 3 shows no policies: RLS policies missing, run your RLS setup SQL
-- If Query 4 shows no 'authenticated': Grant permissions with: GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO authenticated;
-- If Query 6 fails with "permission denied": Your RLS policies are too strict
-- ============================================================================
