-- ============================================================
-- Migration: Partner Ingest Model (Phase 1)
-- Date: 2026-02-13
-- Purpose: Transition from scraper to partner-ingest model
--          Adds partners table + offer columns for exclusive,
--          leak, and bounty-based roles.
-- ============================================================

-- ============================================
-- 1. PARTNERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.partners (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    api_key_hash TEXT NOT NULL,          -- SHA-256 hash of the partner API key (never store plaintext)
    status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
    contact_email TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by hashed key during ingestion
CREATE INDEX IF NOT EXISTS idx_partners_api_key_hash ON public.partners (api_key_hash);

COMMENT ON TABLE public.partners IS 'Verified partner companies authorized to push job offers via API';
COMMENT ON COLUMN public.partners.api_key_hash IS 'SHA-256 hash of the X-Partner-Key header value';

-- ============================================
-- 2. OFFERS TABLE — NEW COLUMNS
-- ============================================

-- is_exclusive: Jobs that are ONLY available on MatchOp
ALTER TABLE public.offers
    ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN NOT NULL DEFAULT false;

-- is_leak: Internal roles posted by verified employees (insider knowledge)
ALTER TABLE public.offers
    ADD COLUMN IF NOT EXISTS is_leak BOOLEAN NOT NULL DEFAULT false;

-- bounty_value: Referral reward amount (0 = no bounty)
ALTER TABLE public.offers
    ADD COLUMN IF NOT EXISTS bounty_value NUMERIC(10, 2) NOT NULL DEFAULT 0
    CHECK (bounty_value >= 0);

-- partner_id: Links this offer to the partner who submitted it
ALTER TABLE public.offers
    ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

-- Index for filtering exclusive / leak / bounty offers
CREATE INDEX IF NOT EXISTS idx_offers_exclusive ON public.offers (is_exclusive) WHERE is_exclusive = true;
CREATE INDEX IF NOT EXISTS idx_offers_leak      ON public.offers (is_leak) WHERE is_leak = true;
CREATE INDEX IF NOT EXISTS idx_offers_bounty    ON public.offers (bounty_value) WHERE bounty_value > 0;
CREATE INDEX IF NOT EXISTS idx_offers_partner   ON public.offers (partner_id);

-- ============================================
-- 3. ROW LEVEL SECURITY — PARTNERS TABLE
-- ============================================

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Only service_role (Edge Functions) can manage partners — no client access
CREATE POLICY "partners_service_only_select"
    ON public.partners FOR SELECT
    TO service_role
    USING (true);

CREATE POLICY "partners_service_only_insert"
    ON public.partners FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "partners_service_only_update"
    ON public.partners FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Deny all access from anon and authenticated roles (explicit deny)
-- RLS is already enabled so default is deny; these are for clarity.

-- ============================================
-- 4. UPDATED_AT TRIGGER FOR PARTNERS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_partners_updated_at ON public.partners;
CREATE TRIGGER trg_partners_updated_at
    BEFORE UPDATE ON public.partners
    FOR EACH ROW
    EXECUTE FUNCTION public.update_partners_updated_at();

-- ============================================
-- 5. HELPER: Generate hashed API key
--    Usage: SELECT generate_partner_api_key('raw-key-here');
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_partner_api_key(raw_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(raw_key, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.generate_partner_api_key IS 'Returns SHA-256 hex hash of a raw API key for safe storage in partners.api_key_hash';
