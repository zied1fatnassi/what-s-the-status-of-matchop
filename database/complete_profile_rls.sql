-- ============================================================================
-- COMPLETE RLS FIX FOR MATCHOP STUDENT PROFILE
-- Run this ENTIRE script in Supabase SQL Editor
-- Fixes: avatar upload, profile save, experiences
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE - Used by avatar upload (updates avatar_url)
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;

-- CREATE NEW POLICIES
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_own"
ON profiles FOR DELETE
TO authenticated
USING (id = auth.uid());


-- ============================================================================
-- 2. STUDENTS TABLE - Used for saving profile info (name, bio, location, skills)
-- ============================================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Students can view own profile" ON students;
DROP POLICY IF EXISTS "Students can insert own profile" ON students;
DROP POLICY IF EXISTS "Students can update own profile" ON students;
DROP POLICY IF EXISTS "Students can delete own profile" ON students;
DROP POLICY IF EXISTS "students_select_own" ON students;
DROP POLICY IF EXISTS "students_insert_own" ON students;
DROP POLICY IF EXISTS "students_update_own" ON students;
DROP POLICY IF EXISTS "students_delete_own" ON students;
DROP POLICY IF EXISTS "Anyone can view students" ON students;
DROP POLICY IF EXISTS "Users can manage own student profile" ON students;

-- CREATE NEW POLICIES
CREATE POLICY "students_select_own"
ON students FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "students_insert_own"
ON students FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "students_update_own"
ON students FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "students_delete_own"
ON students FOR DELETE
TO authenticated
USING (id = auth.uid());

-- Also allow companies to view students they matched with
CREATE POLICY "students_select_for_companies"
ON students FOR SELECT
TO authenticated
USING (
    id IN (SELECT student_id FROM matches WHERE company_id = auth.uid())
);


-- ============================================================================
-- 3. EXPERIENCES TABLE - Used for work history
-- ============================================================================
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Students can view own experiences" ON experiences;
DROP POLICY IF EXISTS "Students can insert own experiences" ON experiences;
DROP POLICY IF EXISTS "Students can update own experiences" ON experiences;
DROP POLICY IF EXISTS "Students can delete own experiences" ON experiences;
DROP POLICY IF EXISTS "Students can manage own experiences" ON experiences;
DROP POLICY IF EXISTS "Companies can view matched experiences" ON experiences;

-- CREATE NEW POLICIES (uses student_id column, NOT id)
CREATE POLICY "experiences_select_own"
ON experiences FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "experiences_insert_own"
ON experiences FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "experiences_update_own"
ON experiences FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "experiences_delete_own"
ON experiences FOR DELETE
TO authenticated
USING (student_id = auth.uid());


-- ============================================================================
-- 4. STORAGE BUCKET - 'avatars' bucket for profile pictures
-- ============================================================================

-- Create bucket if not exists (ignore error if exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their avatars" ON storage.objects;

-- CREATE NEW STORAGE POLICIES
-- Public read for all avatars
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder (folder = user.id)
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can update their own files
CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can delete their own files
CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);


-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================
SELECT 'RLS Policies Applied Successfully!' as status;

-- Show all policies for verification
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('profiles', 'students', 'experiences')
ORDER BY tablename, policyname;
