-- Create table for storing scraped external jobs
CREATE TABLE IF NOT EXISTS external_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_website TEXT NOT NULL,          -- e.g., 'TanitJobs', 'WeWorkRemotely'
    original_url TEXT NOT NULL UNIQUE,     -- Prevent duplicates
    title TEXT NOT NULL,
    company_name TEXT,
    location TEXT,
    contact_email TEXT,                    -- Nullable: if found, we enable "One Click Apply"
    description TEXT,
    salary_range TEXT,
    job_type TEXT,                         -- 'Full-time', 'Remote', etc.
    logo_url TEXT,                         -- Optional logo if scraped
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    tags TEXT[]                            -- Array of keywords for searching
);

-- Enable RLS
ALTER TABLE external_jobs ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Everyone (public) can read jobs (or just authenticated students)
CREATE POLICY "Public read access for external jobs" 
ON external_jobs FOR SELECT 
TO public 
USING (true);

-- 2. Only service_role (backend script) can insert/update/delete
-- Note: By default, if no policy enables INSERT for 'anon' or 'authenticated', they can't do it.
-- We rely on the backend script using the SERVICE_ROLE_KEY to bypass RLS for writing.

-- Create index for faster searching
CREATE INDEX IF NOT EXISTS idx_external_jobs_source ON external_jobs(source_website);
CREATE INDEX IF NOT EXISTS idx_external_jobs_title ON external_jobs(title);
