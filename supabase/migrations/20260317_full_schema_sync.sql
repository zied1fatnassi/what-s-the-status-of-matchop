BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Runtime base tables that existed only in database/*.sql need an idempotent
-- migration path inside supabase/migrations as well.

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('student', 'company', 'admin')),
    name TEXT,
    email TEXT NOT NULL,
    avatar_url TEXT,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    premium_expires_at TIMESTAMPTZ,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    active_profile_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS type TEXT,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS active_profile_id UUID,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.profiles
SET preferences = '{}'::jsonb
WHERE preferences IS NULL;

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.profiles p
    ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email
WHERE public.profiles.email IS NULL OR public.profiles.email = '';

CREATE INDEX IF NOT EXISTS idx_profiles_created_at
    ON public.profiles (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_preferences_gin
    ON public.profiles USING GIN (preferences);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT 'Student',
    bio TEXT,
    location TEXT,
    skills TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    avatar_url TEXT,
    cv_url TEXT
);

ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS cv_url TEXT;

UPDATE public.students
SET display_name = 'Student'
WHERE display_name IS NULL OR btrim(display_name) = '';

ALTER TABLE public.students
    ALTER COLUMN display_name SET DEFAULT 'Student';

CREATE INDEX IF NOT EXISTS idx_students_location
    ON public.students (location);

CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL DEFAULT 'Company',
    industry TEXT,
    website TEXT,
    description TEXT,
    logo_url TEXT,
    location TEXT,
    verified BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS industry TEXT,
    ADD COLUMN IF NOT EXISTS website TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.companies
SET company_name = 'Company'
WHERE company_name IS NULL OR btrim(company_name) = '';

ALTER TABLE public.companies
    ALTER COLUMN company_name SET DEFAULT 'Company';

CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    req_skills TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    location TEXT,
    salary_range TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    is_global BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offers
    ADD COLUMN IF NOT EXISTS req_skills TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS salary_range TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_offers_company_created_at
    ON public.offers (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_offers_status_created_at
    ON public.offers (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_offers_is_global
    ON public.offers (is_global);

CREATE TABLE IF NOT EXISTS public.student_swipes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('left', 'right', 'super')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, offer_id)
);

ALTER TABLE public.student_swipes
    ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.student_swipes
SET id = gen_random_uuid()
WHERE id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_swipes_id
    ON public.student_swipes (id);

CREATE INDEX IF NOT EXISTS idx_student_swipes_student_created_at
    ON public.student_swipes (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_swipes_offer_created_at
    ON public.student_swipes (offer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'matched',
    matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, offer_id)
);

ALTER TABLE public.matches
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'matched',
    ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

UPDATE public.matches
SET created_at = COALESCE(created_at, matched_at, now())
WHERE created_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_matches_student_created_at
    ON public.matches (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matches_company_created_at
    ON public.matches (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matches_offer_id
    ON public.matches (offer_id);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_messages_match_created_at
    ON public.messages (match_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id
    ON public.messages (sender_id);

CREATE TABLE IF NOT EXISTS public.external_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_website TEXT NOT NULL,
    original_url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    company_name TEXT,
    location TEXT,
    contact_email TEXT,
    description TEXT,
    salary_range TEXT,
    job_type TEXT,
    logo_url TEXT,
    posted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    tags TEXT[],
    is_global BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.external_jobs
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS contact_email TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS salary_range TEXT,
    ADD COLUMN IF NOT EXISTS job_type TEXT,
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS tags TEXT[],
    ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_external_jobs_posted_at
    ON public.external_jobs (posted_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_jobs_source
    ON public.external_jobs (source_website);

CREATE INDEX IF NOT EXISTS idx_external_jobs_is_global
    ON public.external_jobs (is_global);

CREATE OR REPLACE VIEW public.external_jobs_public AS
SELECT
    ej.id,
    ej.title,
    ej.company_name,
    ej.location,
    ej.job_type,
    ej.salary_range,
    ej.description,
    ej.logo_url,
    ej.source_website,
    ej.original_url,
    ej.posted_at,
    ej.created_at,
    ej.tags,
    ej.is_global,
    ej.source_website AS source,
    ej.original_url AS url
FROM public.external_jobs ej;

ALTER VIEW public.external_jobs_public SET (security_invoker = true);

CREATE TABLE IF NOT EXISTS public.external_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    external_job_id UUID NOT NULL REFERENCES public.external_jobs(id) ON DELETE CASCADE,
    source_website TEXT,
    original_url TEXT,
    title TEXT,
    company_name TEXT,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'saved',
    applied_at TIMESTAMPTZ,
    interview_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    follow_up_at TIMESTAMPTZ,
    CONSTRAINT external_matches_student_job_key UNIQUE (student_id, external_job_id)
);

ALTER TABLE public.external_matches
    ADD COLUMN IF NOT EXISTS source_website TEXT,
    ADD COLUMN IF NOT EXISTS original_url TEXT,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'saved',
    ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS interview_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;

UPDATE public.external_matches
SET status = 'saved'
WHERE status IS NULL OR status NOT IN ('saved', 'applied', 'interview', 'rejected', 'archived');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'external_matches_status_check'
          AND conrelid = 'public.external_matches'::regclass
    ) THEN
        ALTER TABLE public.external_matches
            ADD CONSTRAINT external_matches_status_check
            CHECK (status IN ('saved', 'applied', 'interview', 'rejected', 'archived'));
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_external_matches_student_saved_at
    ON public.external_matches (student_id, saved_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_matches_external_job_id
    ON public.external_matches (external_job_id);

CREATE INDEX IF NOT EXISTS idx_external_matches_status
    ON public.external_matches (status);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_matches ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.offers TO authenticated;
GRANT SELECT, INSERT ON TABLE public.student_swipes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.matches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.external_matches TO authenticated;

REVOKE ALL ON TABLE public.external_jobs FROM PUBLIC;
REVOKE ALL ON TABLE public.external_jobs FROM anon;
REVOKE ALL ON TABLE public.external_jobs FROM authenticated;
REVOKE ALL ON TABLE public.external_jobs_public FROM PUBLIC;
GRANT SELECT ON TABLE public.external_jobs_public TO anon;
GRANT SELECT ON TABLE public.external_jobs_public TO authenticated;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select'
    ) THEN
        CREATE POLICY profiles_select
            ON public.profiles
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_insert_own'
    ) THEN
        CREATE POLICY profiles_insert_own
            ON public.profiles
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update_own'
    ) THEN
        CREATE POLICY profiles_update_own
            ON public.profiles
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'students' AND policyname = 'students_select'
    ) THEN
        CREATE POLICY students_select
            ON public.students
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'students' AND policyname = 'students_insert_own'
    ) THEN
        CREATE POLICY students_insert_own
            ON public.students
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'students' AND policyname = 'students_update_own'
    ) THEN
        CREATE POLICY students_update_own
            ON public.students
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'companies' AND policyname = 'companies_select'
    ) THEN
        CREATE POLICY companies_select
            ON public.companies
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'companies' AND policyname = 'companies_insert_own'
    ) THEN
        CREATE POLICY companies_insert_own
            ON public.companies
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'companies' AND policyname = 'companies_update_own'
    ) THEN
        CREATE POLICY companies_update_own
            ON public.companies
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'offers' AND policyname = 'offers_select_active'
    ) THEN
        CREATE POLICY offers_select_active
            ON public.offers
            FOR SELECT
            TO authenticated
            USING (status = 'active' OR company_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'offers' AND policyname = 'offers_insert_company'
    ) THEN
        CREATE POLICY offers_insert_company
            ON public.offers
            FOR INSERT
            TO authenticated
            WITH CHECK (company_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'offers' AND policyname = 'offers_update_company'
    ) THEN
        CREATE POLICY offers_update_company
            ON public.offers
            FOR UPDATE
            TO authenticated
            USING (company_id = auth.uid())
            WITH CHECK (company_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'offers' AND policyname = 'offers_delete_company'
    ) THEN
        CREATE POLICY offers_delete_company
            ON public.offers
            FOR DELETE
            TO authenticated
            USING (company_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'offers' AND policyname = 'matchop_offers_select_premium_gate'
    ) THEN
        CREATE POLICY "matchop_offers_select_premium_gate"
            ON public.offers
            AS RESTRICTIVE
            FOR SELECT
            TO authenticated
            USING (
                auth.uid() IS NOT NULL
                AND (
                    public.matchop_requester_has_profile_type('admin')
                    OR (
                        public.matchop_requester_has_profile_type('company')
                        AND (
                            status = 'active'
                            OR company_id = auth.uid()
                        )
                    )
                    OR (
                        public.matchop_requester_has_profile_type('student')
                        AND status = 'active'
                        AND (
                            COALESCE(is_global, FALSE) = FALSE
                            OR public.matchop_requester_has_active_premium()
                        )
                    )
                )
            );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'student_swipes' AND policyname = 'student_swipes_select_own'
    ) THEN
        CREATE POLICY student_swipes_select_own
            ON public.student_swipes
            FOR SELECT
            TO authenticated
            USING (student_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'student_swipes' AND policyname = 'student_swipes_insert_own'
    ) THEN
        CREATE POLICY student_swipes_insert_own
            ON public.student_swipes
            FOR INSERT
            TO authenticated
            WITH CHECK (student_id = auth.uid());
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'matches' AND policyname = 'matches_select_participant'
    ) THEN
        CREATE POLICY matches_select_participant
            ON public.matches
            FOR SELECT
            TO authenticated
            USING (student_id = auth.uid() OR company_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'matches' AND policyname = 'matches_insert_trigger'
    ) THEN
        CREATE POLICY matches_insert_trigger
            ON public.matches
            FOR INSERT
            TO authenticated
            WITH CHECK (student_id = auth.uid() OR company_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'matches' AND policyname = 'matches_update_participant'
    ) THEN
        CREATE POLICY matches_update_participant
            ON public.matches
            FOR UPDATE
            TO authenticated
            USING (student_id = auth.uid() OR company_id = auth.uid());
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_select_match_member'
    ) THEN
        CREATE POLICY messages_select_match_member
            ON public.messages
            FOR SELECT
            TO authenticated
            USING (
                match_id IN (
                    SELECT id
                    FROM public.matches
                    WHERE student_id = auth.uid() OR company_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_insert_match_member'
    ) THEN
        CREATE POLICY messages_insert_match_member
            ON public.messages
            FOR INSERT
            TO authenticated
            WITH CHECK (
                sender_id = auth.uid()
                AND match_id IN (
                    SELECT id
                    FROM public.matches
                    WHERE student_id = auth.uid() OR company_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_update_match_member'
    ) THEN
        CREATE POLICY messages_update_match_member
            ON public.messages
            FOR UPDATE
            TO authenticated
            USING (
                match_id IN (
                    SELECT id
                    FROM public.matches
                    WHERE student_id = auth.uid() OR company_id = auth.uid()
                )
            );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'external_jobs' AND policyname = 'matchop_external_jobs_select_premium_gate'
    ) THEN
        CREATE POLICY "matchop_external_jobs_select_premium_gate"
            ON public.external_jobs
            AS RESTRICTIVE
            FOR SELECT
            TO public
            USING (
                auth.uid() IS NOT NULL
                AND (
                    public.matchop_requester_has_profile_type('admin')
                    OR public.matchop_requester_has_profile_type('company')
                    OR (
                        public.matchop_requester_has_profile_type('student')
                        AND (
                            COALESCE(is_global, FALSE) = FALSE
                            OR public.matchop_requester_has_active_premium()
                        )
                    )
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'external_matches' AND policyname = 'external_matches_select_own'
    ) THEN
        CREATE POLICY external_matches_select_own
            ON public.external_matches
            FOR SELECT
            TO authenticated
            USING (auth.uid() = student_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'external_matches' AND policyname = 'external_matches_insert_own'
    ) THEN
        CREATE POLICY external_matches_insert_own
            ON public.external_matches
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = student_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'external_matches' AND policyname = 'external_matches_update_own'
    ) THEN
        CREATE POLICY external_matches_update_own
            ON public.external_matches
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = student_id)
            WITH CHECK (auth.uid() = student_id);
    END IF;
END
$$;

COMMIT;
