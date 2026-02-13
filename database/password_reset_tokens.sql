-- ============================================
-- Password Reset Tokens Table
-- ============================================
-- Stores SHA-256 hashes of single-use password reset tokens.
-- Plaintext tokens are NEVER stored in the database.
--
-- Security Properties:
--   - token_hash: SHA-256 hash of the random 256-bit token
--   - expires_at: 15-minute TTL enforced by queries AND a cron cleanup
--   - used: boolean flag, set to true immediately when token is consumed
--   - ip_address: audit trail for abuse detection
--
-- Rate Limiting: Application layer enforces 3 resets/email/hour
-- via COUNT(*) queries filtered by created_at.

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by email + active tokens
CREATE INDEX IF NOT EXISTS idx_reset_tokens_email_active
    ON public.password_reset_tokens (email, used, expires_at DESC);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires
    ON public.password_reset_tokens (expires_at)
    WHERE used = FALSE;

-- ============================================
-- RLS Policies
-- ============================================
-- Only the service role (Edge Functions) should access this table.
-- No client-side access is permitted.

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon/authenticated roles.
-- Only service_role bypasses RLS.

-- ============================================
-- Automatic Cleanup of Expired Tokens
-- ============================================
-- Runs via pg_cron (if available) or manual cleanup.
-- Deletes tokens older than 24 hours (generous buffer for audit).

-- If pg_cron is enabled on your Supabase project:
-- SELECT cron.schedule(
--     'cleanup-expired-reset-tokens',
--     '0 * * * *',  -- Every hour
--     $$DELETE FROM public.password_reset_tokens WHERE expires_at < NOW() - INTERVAL '24 hours'$$
-- );

-- Manual cleanup function (call via Edge Function or scheduled job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.password_reset_tokens
    WHERE expires_at < NOW() - INTERVAL '24 hours'
    OR (used = TRUE AND created_at < NOW() - INTERVAL '24 hours');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Grant execute to service_role only
REVOKE ALL ON FUNCTION public.cleanup_expired_reset_tokens() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_reset_tokens() TO service_role;
