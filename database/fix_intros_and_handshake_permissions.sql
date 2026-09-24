-- ==============================================================================
-- MATCHOP: Fix Handshake & Intros Table Permissions and RLS
-- ==============================================================================
-- Run this script in the Supabase SQL Editor to resolve:
-- "permission denied for table intros"
-- ==============================================================================

-- 1. Ensure table `intros` exists
CREATE TABLE IF NOT EXISTS public.intros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    icebreaker TEXT,
    match_score INT,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    UNIQUE(student_id, offer_id)
);

-- 2. Indexes for intros performance
CREATE INDEX IF NOT EXISTS idx_intros_company ON public.intros(company_id);
CREATE INDEX IF NOT EXISTS idx_intros_student ON public.intros(student_id);
CREATE INDEX IF NOT EXISTS idx_intros_offer ON public.intros(offer_id);
CREATE INDEX IF NOT EXISTS idx_intros_status ON public.intros(status);
CREATE INDEX IF NOT EXISTS idx_intros_expires ON public.intros(expires_at) WHERE status = 'pending';

-- 3. Explicit Table Grants for PostgreSQL roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- 4. Enable RLS on intros
ALTER TABLE public.intros ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies to avoid duplicates
DROP POLICY IF EXISTS "Students view own intros" ON public.intros;
DROP POLICY IF EXISTS "Companies view their intros" ON public.intros;
DROP POLICY IF EXISTS "Companies update intro status" ON public.intros;
DROP POLICY IF EXISTS "Students create intros" ON public.intros;
DROP POLICY IF EXISTS "intros_select_student" ON public.intros;
DROP POLICY IF EXISTS "intros_select_company" ON public.intros;
DROP POLICY IF EXISTS "intros_update_company" ON public.intros;
DROP POLICY IF EXISTS "intros_insert_student" ON public.intros;

-- 6. Recreate canonical RLS policies for intros
CREATE POLICY "intros_select_student"
    ON public.intros FOR SELECT TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "intros_select_company"
    ON public.intros FOR SELECT TO authenticated
    USING (
        company_id = auth.uid() OR
        offer_id IN (SELECT id FROM public.offers WHERE company_id = auth.uid())
    );

CREATE POLICY "intros_insert_student"
    ON public.intros FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "intros_update_company"
    ON public.intros FOR UPDATE TO authenticated
    USING (
        company_id = auth.uid() OR
        offer_id IN (SELECT id FROM public.offers WHERE company_id = auth.uid())
    )
    WITH CHECK (
        company_id = auth.uid() OR
        offer_id IN (SELECT id FROM public.offers WHERE company_id = auth.uid())
    );

-- 7. Ensure `get_company_intros` RPC function is granted execution
CREATE OR REPLACE FUNCTION public.get_company_intros(
    p_company_id UUID,
    p_status TEXT DEFAULT 'pending',
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    intro_id UUID,
    student_id UUID,
    offer_id UUID,
    student_name TEXT,
    student_skills TEXT[],
    student_location TEXT,
    student_avatar TEXT,
    student_bio TEXT,
    offer_title TEXT,
    match_score INT,
    icebreaker TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id AS intro_id,
        i.student_id,
        i.offer_id,
        s.display_name AS student_name,
        s.skills AS student_skills,
        s.location AS student_location,
        s.avatar_url AS student_avatar,
        s.bio AS student_bio,
        o.title AS offer_title,
        i.match_score,
        i.icebreaker,
        i.status,
        i.created_at,
        i.expires_at
    FROM public.intros i
    JOIN public.students s ON s.id = i.student_id
    JOIN public.offers o ON o.id = i.offer_id
    WHERE (i.company_id = p_company_id OR o.company_id = p_company_id)
      AND (p_status = 'all' OR i.status = p_status)
    ORDER BY i.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_intros(UUID, TEXT, INT, INT) TO authenticated, anon, service_role;
