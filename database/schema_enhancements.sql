-- =====================================================
-- MATCHOP DATABASE SCHEMA ENHANCEMENTS
-- Run this in Supabase SQL Editor AFTER complete_setup.sql
-- Adds: Applications, Normalized Skills, Location fields,
--       Match feedback, Notifications, User Preferences
-- =====================================================

-- =====================================================
-- 1. APPLICATIONS TABLE
-- Track job applications (beyond just swipes/matches)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.applications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    offer_id uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    cover_letter text,
    applied_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    notes text,
    CONSTRAINT applications_pkey PRIMARY KEY (id),
    CONSTRAINT applications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT applications_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.job_offers(id) ON DELETE CASCADE,
    CONSTRAINT applications_status_check CHECK (status = ANY (ARRAY['pending', 'reviewing', 'accepted', 'rejected', 'withdrawn'])),
    CONSTRAINT applications_unique UNIQUE (student_id, offer_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_student ON public.applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_offer ON public.applications(offer_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON public.applications(applied_at DESC);

-- =====================================================
-- 2. NORMALIZED SKILLS TABLES
-- Better for search, matching, and avoiding duplication
-- =====================================================

-- Master skills table
CREATE TABLE IF NOT EXISTS public.skills (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    category text, -- e.g., 'programming', 'design', 'soft-skills'
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT skills_pkey PRIMARY KEY (id),
    CONSTRAINT skills_name_unique UNIQUE (name)
);

-- Student-Skills junction table
CREATE TABLE IF NOT EXISTS public.student_skills (
    student_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    proficiency_level text DEFAULT 'intermediate', -- beginner, intermediate, advanced, expert
    years_experience integer DEFAULT 0,
    CONSTRAINT student_skills_pkey PRIMARY KEY (student_id, skill_id),
    CONSTRAINT student_skills_student_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT student_skills_skill_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE
);

-- Offer-Skills junction table (required skills for job)
CREATE TABLE IF NOT EXISTS public.offer_skills (
    offer_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    is_required boolean DEFAULT true, -- required vs nice-to-have
    CONSTRAINT offer_skills_pkey PRIMARY KEY (offer_id, skill_id),
    CONSTRAINT offer_skills_offer_fkey FOREIGN KEY (offer_id) REFERENCES public.job_offers(id) ON DELETE CASCADE,
    CONSTRAINT offer_skills_skill_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE
);

-- Index for skill lookups
CREATE INDEX IF NOT EXISTS idx_student_skills_skill ON public.student_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_offer_skills_skill ON public.offer_skills(skill_id);

-- =====================================================
-- 3. JOB LOCATION & REMOTE WORK ENHANCEMENTS
-- =====================================================

-- Add location columns to job_offers (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_offers' AND column_name = 'job_location_type') THEN
        ALTER TABLE public.job_offers ADD COLUMN job_location_type text DEFAULT 'onsite';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_offers' AND column_name = 'city') THEN
        ALTER TABLE public.job_offers ADD COLUMN city text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_offers' AND column_name = 'country') THEN
        ALTER TABLE public.job_offers ADD COLUMN country text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_offers' AND column_name = 'salary_min') THEN
        ALTER TABLE public.job_offers ADD COLUMN salary_min integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_offers' AND column_name = 'salary_max') THEN
        ALTER TABLE public.job_offers ADD COLUMN salary_max integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_offers' AND column_name = 'salary_currency') THEN
        ALTER TABLE public.job_offers ADD COLUMN salary_currency text DEFAULT 'USD';
    END IF;
END $$;

-- Add constraint for job_location_type
ALTER TABLE public.job_offers DROP CONSTRAINT IF EXISTS job_offers_location_type_check;
ALTER TABLE public.job_offers ADD CONSTRAINT job_offers_location_type_check 
    CHECK (job_location_type = ANY (ARRAY['onsite', 'remote', 'hybrid']));

-- =====================================================
-- 4. MATCH FEEDBACK & RATINGS
-- =====================================================

-- Add feedback columns to matches (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'student_rating') THEN
        ALTER TABLE public.matches ADD COLUMN student_rating integer CHECK (student_rating >= 1 AND student_rating <= 5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'company_rating') THEN
        ALTER TABLE public.matches ADD COLUMN company_rating integer CHECK (company_rating >= 1 AND company_rating <= 5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'student_feedback') THEN
        ALTER TABLE public.matches ADD COLUMN student_feedback text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'company_feedback') THEN
        ALTER TABLE public.matches ADD COLUMN company_feedback text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'outcome') THEN
        ALTER TABLE public.matches ADD COLUMN outcome text; -- 'hired', 'rejected', 'expired', 'ongoing'
    END IF;
END $$;

-- =====================================================
-- 5. NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    type text NOT NULL, -- 'match', 'message', 'application_update', 'new_offer'
    title text NOT NULL,
    body text,
    data jsonb, -- Additional data (e.g., match_id, offer_id)
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_pkey PRIMARY KEY (id),
    CONSTRAINT notifications_user_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY['match', 'message', 'application_update', 'new_offer', 'profile_view', 'reminder']))
);

-- Index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- =====================================================
-- 6. USER PREFERENCES TABLE
-- Better matching based on preferences
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id uuid NOT NULL,
    preferred_sectors text[], -- Array of preferred sectors
    preferred_locations text[], -- Array of preferred cities/regions
    remote_preference text DEFAULT 'any', -- 'onsite', 'remote', 'hybrid', 'any'
    salary_min integer,
    salary_max integer,
    availability text, -- 'immediately', '2weeks', '1month', 'negotiable'
    notification_email boolean DEFAULT true,
    notification_push boolean DEFAULT true,
    profile_visibility text DEFAULT 'public', -- 'public', 'matches_only', 'private'
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_preferences_pkey PRIMARY KEY (id),
    CONSTRAINT user_preferences_user_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- =====================================================
-- 7. ADDITIONAL INDEXES FOR PERFORMANCE
-- =====================================================

-- Job offers indexes
CREATE INDEX IF NOT EXISTS idx_job_offers_created ON public.job_offers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_offers_active ON public.job_offers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_job_offers_company ON public.job_offers(company_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_location ON public.job_offers(job_location_type);

-- Swipes indexes
CREATE INDEX IF NOT EXISTS idx_swipes_student ON public.swipes(student_id);
CREATE INDEX IF NOT EXISTS idx_swipes_offer ON public.swipes(offer_id);
CREATE INDEX IF NOT EXISTS idx_swipes_direction ON public.swipes(direction);

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_student ON public.matches(student_id);
CREATE INDEX IF NOT EXISTS idx_matches_company ON public.matches(company_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_match ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- =====================================================
-- 8. SEED INITIAL SKILLS DATA
-- =====================================================

INSERT INTO public.skills (name, category) VALUES
    -- Programming
    ('JavaScript', 'programming'),
    ('TypeScript', 'programming'),
    ('Python', 'programming'),
    ('Java', 'programming'),
    ('C++', 'programming'),
    ('C#', 'programming'),
    ('Go', 'programming'),
    ('Rust', 'programming'),
    ('PHP', 'programming'),
    ('Ruby', 'programming'),
    ('Swift', 'programming'),
    ('Kotlin', 'programming'),
    -- Frontend
    ('React', 'frontend'),
    ('Vue.js', 'frontend'),
    ('Angular', 'frontend'),
    ('Next.js', 'frontend'),
    ('HTML/CSS', 'frontend'),
    ('Tailwind CSS', 'frontend'),
    -- Backend
    ('Node.js', 'backend'),
    ('Django', 'backend'),
    ('Flask', 'backend'),
    ('Spring Boot', 'backend'),
    ('Express.js', 'backend'),
    ('FastAPI', 'backend'),
    -- Database
    ('SQL', 'database'),
    ('PostgreSQL', 'database'),
    ('MongoDB', 'database'),
    ('Redis', 'database'),
    ('MySQL', 'database'),
    -- DevOps
    ('Docker', 'devops'),
    ('Kubernetes', 'devops'),
    ('AWS', 'devops'),
    ('GCP', 'devops'),
    ('Azure', 'devops'),
    ('CI/CD', 'devops'),
    ('Git', 'devops'),
    -- Data Science
    ('Machine Learning', 'data-science'),
    ('Data Analysis', 'data-science'),
    ('TensorFlow', 'data-science'),
    ('PyTorch', 'data-science'),
    ('Pandas', 'data-science'),
    -- Design
    ('UI/UX Design', 'design'),
    ('Figma', 'design'),
    ('Adobe XD', 'design'),
    ('Photoshop', 'design'),
    ('Illustrator', 'design'),
    -- Soft Skills
    ('Communication', 'soft-skills'),
    ('Leadership', 'soft-skills'),
    ('Problem Solving', 'soft-skills'),
    ('Teamwork', 'soft-skills'),
    ('Project Management', 'soft-skills'),
    ('Agile', 'soft-skills'),
    ('Scrum', 'soft-skills')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 9. RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Applications policies
CREATE POLICY "Students can view own applications" ON public.applications
    FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can create applications" ON public.applications
    FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can withdraw applications" ON public.applications
    FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Companies can view applications for their offers" ON public.applications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.job_offers WHERE id = offer_id AND company_id = auth.uid())
    );
CREATE POLICY "Companies can update application status" ON public.applications
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.job_offers WHERE id = offer_id AND company_id = auth.uid())
    );

-- Skills policies (public read)
CREATE POLICY "Anyone can view skills" ON public.skills
    FOR SELECT USING (true);

-- Student skills policies
CREATE POLICY "Students can manage own skills" ON public.student_skills
    FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Others can view student skills" ON public.student_skills
    FOR SELECT USING (true);

-- Offer skills policies
CREATE POLICY "Companies can manage offer skills" ON public.offer_skills
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.job_offers WHERE id = offer_id AND company_id = auth.uid())
    );
CREATE POLICY "Anyone can view offer skills" ON public.offer_skills
    FOR SELECT USING (true);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = id);

-- =====================================================
-- SUCCESS
-- =====================================================

SELECT '✅ Schema Enhancements Applied Successfully!' as status;
