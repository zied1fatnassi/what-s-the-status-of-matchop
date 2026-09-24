BEGIN;

ALTER TABLE public.external_jobs
    ADD COLUMN IF NOT EXISTS source_job_id TEXT,
    ADD COLUMN IF NOT EXISTS content_hash TEXT,
    ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_jobs_source_job_id
    ON public.external_jobs (source_website, source_job_id);

CREATE INDEX IF NOT EXISTS idx_external_jobs_content_hash
    ON public.external_jobs (content_hash);

CREATE INDEX IF NOT EXISTS idx_external_jobs_last_seen_at
    ON public.external_jobs (last_seen_at DESC);

COMMIT;
