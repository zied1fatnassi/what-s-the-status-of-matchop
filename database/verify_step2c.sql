-- ============================================================================
-- VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify Step 2C success
-- ============================================================================

-- 1. Check if 'role' column is gone from 'profiles'
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'role';
-- EXPECTED: No results (empty row)

-- 2. Check if 'user_profiles' table exists and has data
SELECT count(*) as user_profiles_count FROM user_profiles;
-- EXPECTED: > 0 (if you had users)

-- 3. Check RLS enablement
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_profiles', 'students', 'companies');
-- EXPECTED: rowsecurity = true for all

-- 4. Check specific RLS policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'user_profiles';
-- EXPECTED: 
-- "user_profiles_select_own", SELECT, {authenticated}
-- "user_profiles_insert_own", INSERT, {authenticated}
-- "user_profiles_update_own", UPDATE, {authenticated}
-- "Admins can manage user_profiles", ALL, {public} (or specific roles)

-- 5. Check Foreign Keys (Crucial for AuthContext)
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'user_profiles';
-- EXPECTED: verify user_profiles references auth.users (or profiles?)
