-- ============================================================
-- Migration: Fix mutable search_path on targeted public functions
-- Date: 2026-02-27
-- Purpose:
--   Add explicit immutable search_path to advisor-flagged functions
--   without changing signatures, volatility, or runtime behavior.
-- ============================================================

CREATE OR REPLACE FUNCTION public.matchop_standard_daily_swipe_limit()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
    SELECT 20;
$$;

CREATE OR REPLACE FUNCTION public.payment_requests_recent_pending_count(
    p_user_id UUID,
    p_minutes INT
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
    SELECT COUNT(*)
    FROM public.payment_requests pr
    WHERE pr.user_id = p_user_id
      AND pr.status = 'pending'
      AND pr.created_at >= now() - (p_minutes || ' minutes')::interval;
$$;
