-- =====================================================
-- MATCHOP ROW LEVEL SECURITY (RLS) POLICIES
-- Run this in Supabase SQL Editor AFTER creating tables
-- Ensures users can only access their own data
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow public read of basic profile info for matching
CREATE POLICY "Public profiles are viewable"
ON profiles FOR SELECT
USING (true);

-- =====================================================
-- STUDENT_PROFILES TABLE POLICIES
-- =====================================================

-- Students can view their own student profile
CREATE POLICY "Students can view own student profile"
ON student_profiles FOR SELECT
USING (auth.uid() = id);

-- Students can update their own student profile
CREATE POLICY "Students can update own student profile"
ON student_profiles FOR UPDATE
USING (auth.uid() = id);

-- Students can insert their own student profile
CREATE POLICY "Students can insert own student profile"
ON student_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Companies can view student profiles they've matched with
CREATE POLICY "Companies can view matched student profiles"
ON student_profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM matches 
        WHERE matches.student_id = student_profiles.id 
        AND matches.company_id = auth.uid()
    )
);

-- =====================================================
-- COMPANIES TABLE POLICIES
-- =====================================================

-- Companies can view their own company profile
CREATE POLICY "Companies can view own company profile"
ON companies FOR SELECT
USING (auth.uid() = id);

-- Companies can update their own company profile
CREATE POLICY "Companies can update own company profile"
ON companies FOR UPDATE
USING (auth.uid() = id);

-- Companies can insert their own company profile
CREATE POLICY "Companies can insert own company profile"
ON companies FOR INSERT
WITH CHECK (auth.uid() = id);

-- All authenticated users can view company profiles (for job offers)
CREATE POLICY "Authenticated users can view companies"
ON companies FOR SELECT
USING (auth.role() = 'authenticated');

-- =====================================================
-- JOB_OFFERS TABLE POLICIES
-- =====================================================

-- Companies can manage their own job offers
CREATE POLICY "Companies can view own job offers"
ON job_offers FOR SELECT
USING (auth.uid() = company_id);

CREATE POLICY "Companies can insert own job offers"
ON job_offers FOR INSERT
WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Companies can update own job offers"
ON job_offers FOR UPDATE
USING (auth.uid() = company_id);

CREATE POLICY "Companies can delete own job offers"
ON job_offers FOR DELETE
USING (auth.uid() = company_id);

-- Students can view active job offers
CREATE POLICY "Students can view active job offers"
ON job_offers FOR SELECT
USING (is_active = true);

-- =====================================================
-- MATCHES TABLE POLICIES
-- =====================================================

-- Students can view their own matches
CREATE POLICY "Students can view own matches"
ON matches FOR SELECT
USING (auth.uid() = student_id);

-- Companies can view their own matches
CREATE POLICY "Companies can view own matches"
ON matches FOR SELECT
USING (auth.uid() = company_id);

-- System can insert matches (based on mutual swipes)
-- Note: This should typically be done via a server function
CREATE POLICY "Authenticated users can insert matches"
ON matches FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Users can update matches they're part of (e.g., archive)
CREATE POLICY "Users can update own matches"
ON matches FOR UPDATE
USING (auth.uid() = student_id OR auth.uid() = company_id);

-- =====================================================
-- MESSAGES TABLE POLICIES
-- =====================================================

-- Users can view messages in matches they're part of
CREATE POLICY "Users can view messages in their matches"
ON messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM matches 
        WHERE matches.id = messages.match_id 
        AND (matches.student_id = auth.uid() OR matches.company_id = auth.uid())
    )
);

-- Users can insert messages in matches they're part of
CREATE POLICY "Users can insert messages in their matches"
ON messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM matches 
        WHERE matches.id = messages.match_id 
        AND (matches.student_id = auth.uid() OR matches.company_id = auth.uid())
    )
);

-- =====================================================
-- SWIPES TABLE POLICIES
-- =====================================================

-- Students can view their own swipes
CREATE POLICY "Students can view own swipes"
ON swipes FOR SELECT
USING (auth.uid() = student_id);

-- Students can insert their own swipes
CREATE POLICY "Students can insert own swipes"
ON swipes FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- =====================================================
-- STORAGE BUCKET POLICIES
-- =====================================================

-- Avatar bucket: Users can upload and view their own avatars
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- CV bucket: Only owner can access
CREATE POLICY "Users can upload own CV"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'cvs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own CV"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'cvs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Company logos: Companies can manage their logos
CREATE POLICY "Companies can upload logo"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'company-logos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Company logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- =====================================================
-- SUCCESS
-- =====================================================
SELECT '✅ RLS Policies Created! Run this after your tables are set up.' as status;
