-- ============================================================================
-- grant_premium_dev.sql
-- DEV/LOCAL ONLY utility: grant premium to a single profile for testing.
--
-- Safety notes:
--   - Intended for local/dev SQL editor usage only.
--   - Do NOT use this in production change pipelines.
--   - Replace the UUID below with your target user/profile id.
--
-- Usage:
--   1) Open Supabase Studio SQL editor (local/dev project).
--   2) Replace target_user_id in the CTE.
--   3) Run this script.
-- ============================================================================

WITH target AS (
    SELECT '00000000-0000-0000-0000-000000000000'::uuid AS target_user_id
)
UPDATE public.profiles AS p
SET
    is_premium = TRUE,
    premium_expires_at = now() + interval '30 days'
FROM target
WHERE p.id = target.target_user_id
RETURNING
    p.id,
    p.email,
    p.is_premium,
    p.premium_expires_at;

