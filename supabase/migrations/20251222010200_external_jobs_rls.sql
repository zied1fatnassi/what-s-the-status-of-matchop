DO $$
BEGIN
    IF to_regclass('public.external_jobs') IS NULL THEN
        RAISE NOTICE 'Skipping external_jobs RLS migration because public.external_jobs does not exist yet.';
        RETURN;
    END IF;

    ALTER TABLE public.external_jobs ENABLE ROW LEVEL SECURITY;

    -- Allow authenticated users (students/companies) to read external jobs
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'external_jobs'
          AND policyname = 'Allow authenticated read access to external_jobs'
    ) THEN
        CREATE POLICY "Allow authenticated read access to external_jobs"
        ON public.external_jobs
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    -- Allow anon read access (optional, if you want public viewing)
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'external_jobs'
          AND policyname = 'Allow anon read access to external_jobs'
    ) THEN
        CREATE POLICY "Allow anon read access to external_jobs"
        ON public.external_jobs
        FOR SELECT
        TO anon
        USING (true);
    END IF;
END
$$ LANGUAGE plpgsql;
