BEGIN;

CREATE TABLE IF NOT EXISTS public.external_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id),
    external_job_id UUID NOT NULL REFERENCES public.external_jobs(id),
    source_website TEXT,
    original_url TEXT,
    title TEXT,
    company_name TEXT,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'saved',
    CONSTRAINT external_matches_student_job_key UNIQUE (student_id, external_job_id)
);

CREATE INDEX IF NOT EXISTS idx_external_matches_student_saved_at
    ON public.external_matches (student_id, saved_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_matches_external_job_id
    ON public.external_matches (external_job_id);

ALTER TABLE public.external_matches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.external_matches FROM PUBLIC;
REVOKE ALL ON TABLE public.external_matches FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.external_matches TO authenticated;

DROP POLICY IF EXISTS "external_matches_select_own" ON public.external_matches;
CREATE POLICY "external_matches_select_own"
    ON public.external_matches
    FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "external_matches_insert_own" ON public.external_matches;
CREATE POLICY "external_matches_insert_own"
    ON public.external_matches
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "external_matches_update_own" ON public.external_matches;
CREATE POLICY "external_matches_update_own"
    ON public.external_matches
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

COMMIT;
