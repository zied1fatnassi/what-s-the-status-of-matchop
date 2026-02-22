-- ============================================================
-- Manual Runbook: Supabase migration metadata repair + backfill
-- Date: 2026-02-19
-- Run this in Supabase SQL Editor (staging first, then production).
-- ============================================================

-- 1) Recreate/repair migration metadata schema/tables expected by Supabase CLI.
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version text NOT NULL PRIMARY KEY
);

ALTER TABLE supabase_migrations.schema_migrations
    ADD COLUMN IF NOT EXISTS inserted_at timestamptz;

ALTER TABLE supabase_migrations.schema_migrations
    ALTER COLUMN inserted_at SET DEFAULT timezone('utc'::text, now());

ALTER TABLE supabase_migrations.schema_migrations
    ADD COLUMN IF NOT EXISTS statements text[];

ALTER TABLE supabase_migrations.schema_migrations
    ADD COLUMN IF NOT EXISTS name text;

UPDATE supabase_migrations.schema_migrations
SET inserted_at = timezone('utc'::text, now())
WHERE inserted_at IS NULL;

CREATE TABLE IF NOT EXISTS supabase_migrations.seed_files (
    path text NOT NULL PRIMARY KEY,
    hash text NOT NULL
);

-- 2) Backfill already-applied migrations.
-- Leave 20260219005000_function_search_path_hardening.sql and
-- 20260219010100_public_schema_hardening.sql unapplied until
-- postgis/pg_trgm/vector are confirmed out of public.
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
    ('20251222010100', 'vector_matching'),
    ('20251222010200', 'external_jobs_rls'),
    ('20260213010100', 'partner_ingest_model')
ON CONFLICT (version) DO NOTHING;

-- 3) Verify unique versions and ordering.
SELECT version, inserted_at, name
FROM supabase_migrations.schema_migrations
ORDER BY version;
