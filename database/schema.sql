-- =====================================================
-- MATCHOP DATABASE SCHEMA (DROP & RECREATE)
-- Run this if you get "relation already exists" errors
-- =====================================================

-- Drop existing tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS swipes CASCADE;
DROP TABLE IF EXISTS job_offers CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS student_profiles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- =====================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('student', 'company')),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STUDENT PROFILES
-- =====================================================
CREATE TABLE student_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    bio TEXT,
    location TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    portfolio_url TEXT,
    behance_url TEXT,
    cv_url TEXT,
    skills TEXT[] DEFAULT '{}',
    experience TEXT,
    availability TEXT,
    university TEXT,
    graduation_year INT
);

-- =====================================================
-- COMPANIES
-- =====================================================
CREATE TABLE companies (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    website TEXT,
    sector TEXT,
    size TEXT,
    description TEXT,
    logo_url TEXT,
    location TEXT,
    contact_email TEXT
);

-- =====================================================
-- JOB OFFERS
-- =====================================================
CREATE TABLE job_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    salary_min INT,
    salary_max INT,
    salary_currency TEXT DEFAULT 'TND',
    skills TEXT[] DEFAULT '{}',
    requirements TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SWIPES (Student actions on job offers)
-- =====================================================
CREATE TABLE swipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('left', 'right', 'super')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, offer_id)
);

-- =====================================================
-- MATCHES (When both parties swipe right)
-- =====================================================
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'hired')),
    UNIQUE(student_id, offer_id)
);

-- =====================================================
-- MESSAGES
-- =====================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX idx_job_offers_company ON job_offers(company_id);
CREATE INDEX idx_job_offers_active ON job_offers(is_active);
CREATE INDEX idx_swipes_student ON swipes(student_id);
CREATE INDEX idx_swipes_offer ON swipes(offer_id);
CREATE INDEX idx_matches_student ON matches(student_id);
CREATE INDEX idx_matches_company ON matches(company_id);
CREATE INDEX idx_messages_match ON messages(match_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Student profiles policies
CREATE POLICY "Student profiles viewable" ON student_profiles FOR SELECT USING (true);
CREATE POLICY "Students update own" ON student_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Students insert own" ON student_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Companies policies
CREATE POLICY "Companies viewable" ON companies FOR SELECT USING (true);
CREATE POLICY "Companies update own" ON companies FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Companies insert own" ON companies FOR INSERT WITH CHECK (auth.uid() = id);

-- Job offers policies
CREATE POLICY "Active offers viewable" ON job_offers FOR SELECT USING (is_active = true OR company_id = auth.uid());
CREATE POLICY "Companies insert offers" ON job_offers FOR INSERT WITH CHECK (company_id = auth.uid());
CREATE POLICY "Companies update own offers" ON job_offers FOR UPDATE USING (company_id = auth.uid());

-- Swipes policies
CREATE POLICY "Students view own swipes" ON swipes FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students create swipes" ON swipes FOR INSERT WITH CHECK (student_id = auth.uid());

-- Matches policies
CREATE POLICY "Participants view matches" ON matches FOR SELECT 
    USING (student_id = auth.uid() OR company_id = auth.uid());

-- Messages policies
CREATE POLICY "Participants view messages" ON messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM matches 
        WHERE matches.id = messages.match_id 
        AND (matches.student_id = auth.uid() OR matches.company_id = auth.uid())
    ));
CREATE POLICY "Participants send messages" ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM matches 
            WHERE matches.id = match_id 
            AND (matches.student_id = auth.uid() OR matches.company_id = auth.uid())
        )
    );

-- Success message
SELECT 'MatchOp database schema created successfully!' as status;
