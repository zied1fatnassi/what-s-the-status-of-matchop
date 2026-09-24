-- ============================================================
-- Migration: Profiles premium + preferences fields
-- Date: 2026-02-24
-- Purpose:
--   Add premium metadata and JSONB preferences storage on public.profiles
--   to support future server-side preference filtering.
--
-- New columns on public.profiles:
--   - is_premium BOOLEAN NOT NULL DEFAULT false
--   - premium_expires_at TIMESTAMPTZ NULL
--   - preferences JSONB NOT NULL DEFAULT '{}'::jsonb
--
-- Indexes:
--   - GIN index on profiles.preferences for JSONB containment queries (@>)
-- ============================================================

DO $$
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN
        RAISE NOTICE 'Skipping profiles premium/preferences migration because public.profiles does not exist yet.';
        RETURN;
    END IF;

    ALTER TABLE public.profiles
        ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

    CREATE INDEX IF NOT EXISTS idx_profiles_preferences_gin
        ON public.profiles USING GIN (preferences);
END
$$ LANGUAGE plpgsql;
