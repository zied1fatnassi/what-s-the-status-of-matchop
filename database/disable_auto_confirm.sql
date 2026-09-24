-- ==============================================================================
-- MATCHOP: Disable Auto-Confirm Trigger (For Production with Custom SMTP)
-- ==============================================================================
-- Run this script in the Supabase SQL Editor when you have configured Custom SMTP
-- in Supabase Dashboard (Auth -> SMTP Settings) and want real email verification links.
-- ==============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_auto_confirm();
