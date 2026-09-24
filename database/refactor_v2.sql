-- ============================================================================
-- MATCHOP V2.1: FINAL SCHEMA
-- ============================================================================
-- 1. RESET
-- ============================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
-- ============================================================================
CREATE TYPE user_role AS ENUM ('student', 'company', 'admin');
CREATE TYPE offer_status AS ENUM ('active', 'closed', 'draft');
CREATE TYPE match_status AS ENUM ('matched', 'accepted', 'rejected', 'archived');

-- 3. PROFILES (Base)
-- ============================================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STUDENTS
-- ============================================================================
CREATE TABLE students (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    bio TEXT,
    location TEXT,
    skills TEXT[] DEFAULT '{}',
    avatar_url TEXT
);

-- 5. COMPANIES
-- ============================================================================
CREATE TABLE companies (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    industry TEXT,
    website TEXT,
    description TEXT,
    logo_url TEXT,
    location TEXT
);

-- 6. OFFERS (Job Postings)
-- ============================================================================
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    req_skills TEXT[] DEFAULT '{}', -- "Required Skills"
    location TEXT,
    salary_range TEXT,
    status offer_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SWIPES & MATCHING
-- ============================================================================

-- Student Swipes (Applications)
CREATE TABLE student_swipes (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    direction TEXT CHECK (direction IN ('left', 'right')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (student_id, offer_id)
);

-- Company Swipes (Evaluations)
CREATE TABLE company_swipes (
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    direction TEXT CHECK (direction IN ('left', 'right')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (company_id, student_id, offer_id)
);

-- MATCHES (The Golden Record)
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE, -- Denormalized for easier querying
    status match_status DEFAULT 'matched',
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, offer_id)
);

-- MESSAGES
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ALGORITHMIC FUNCTIONS
-- ============================================================================

-- A. Match Score Function
-- Calculates overlap between Student Skills and Offer Required Skills
CREATE OR REPLACE FUNCTION calculate_match_score(student_uuid UUID, offer_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    student_skills TEXT[];
    offer_skills TEXT[];
    intersection_count INT;
    total_req_count INT;
    loc_student TEXT;
    loc_offer TEXT;
    score INT := 0;
BEGIN
    -- Get data
    SELECT skills, location INTO student_skills, loc_student FROM students WHERE id = student_uuid;
    SELECT req_skills, location INTO offer_skills, loc_offer FROM offers WHERE id = offer_uuid;

    -- 1. Skills Score (70% weight)
    IF array_length(offer_skills, 1) > 0 THEN
        SELECT COUNT(*) INTO intersection_count
        FROM (SELECT UNNEST(student_skills) INTERSECT SELECT UNNEST(offer_skills)) as i;
        
        total_req_count := array_length(offer_skills, 1);
        score := score + ((intersection_count::float / total_req_count::float) * 70)::INT;
    ELSE
        -- If no skills required, give full points for this section
        score := score + 70;
    END IF;

    -- 2. Location Score (30% weight)
    -- Simple exact match case-insensitive
    IF LOWER(loc_student) = LOWER(loc_offer) THEN
        score := score + 30;
    END IF;

    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- B. "Smart Feed" View
-- Returns offers for a student with their match score
CREATE OR REPLACE FUNCTION get_student_feed(student_uuid UUID)
RETURNS TABLE (
    offer_id UUID,
    title TEXT,
    company_name TEXT,
    match_score INT,
    location TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.title,
        c.company_name,
        calculate_match_score(student_uuid, o.id) as score,
        o.location
    FROM offers o
    JOIN companies c ON o.company_id = c.id
    WHERE o.status = 'active'
    AND NOT EXISTS (
        SELECT 1 FROM student_swipes s 
        WHERE s.student_id = student_uuid AND s.offer_id = o.id
    )
    ORDER BY score DESC;
END;
$$ LANGUAGE plpgsql;

-- 9. TRIGGERS
-- ============================================================================

-- Auto-Match Trigger
CREATE OR REPLACE FUNCTION handle_new_match() RETURNS TRIGGER AS $$
BEGIN
    -- Only care about RIGHT swipes
    IF NEW.direction = 'right' THEN
        -- Check if Student swiped RIGHT on this Offer
        IF EXISTS (
            SELECT 1 FROM student_swipes 
            WHERE student_id = NEW.student_id 
            AND offer_id = NEW.offer_id 
            AND direction = 'right'
        ) THEN
            -- create match
            INSERT INTO matches (student_id, offer_id, company_id)
            VALUES (NEW.student_id, NEW.offer_id, NEW.company_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_company_swipe_match
    AFTER INSERT ON company_swipes
    FOR EACH ROW EXECUTE FUNCTION handle_new_match();

-- 10. RLS POLICIES
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Students
CREATE POLICY "Public students" ON students FOR SELECT USING (true);
CREATE POLICY "Students update own" ON students FOR UPDATE USING (auth.uid() = id);

-- Companies
CREATE POLICY "Public companies" ON companies FOR SELECT USING (true);
CREATE POLICY "Companies update own" ON companies FOR UPDATE USING (auth.uid() = id);

-- Offers
CREATE POLICY "Public offers" ON offers FOR SELECT USING (status = 'active');
CREATE POLICY "Company manage offers" ON offers FOR ALL USING (company_id = auth.uid());

-- Matches
CREATE POLICY "Access own matches" ON matches FOR SELECT USING (
    student_id = auth.uid() OR company_id = auth.uid()
);

-- Messages
CREATE POLICY "Access match messages" ON messages FOR ALL USING (
    EXISTS (SELECT 1 FROM matches WHERE id = match_id AND (student_id = auth.uid() OR company_id = auth.uid()))
);

SELECT '✅ V2.1 Schema Applied (Calculated Matching Algo + Offers Table)' as status;
