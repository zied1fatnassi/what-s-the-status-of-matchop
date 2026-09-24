-- ==============================================================================
-- MATCHOP: Auto-Confirm Emails Trigger (For Development / Staging / Testing)
-- ==============================================================================
-- Run this script in the Supabase SQL Editor if you are experiencing
-- "Error sending confirmation email" due to Supabase email rate limits or
-- unconfigured Custom SMTP.
--
-- This trigger automatically sets `email_confirmed_at = NOW()` when a user signs up,
-- allowing immediate login and session generation without waiting for an email.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_auto_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Automatically confirm email upon creation if not already confirmed
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, NOW());
  RETURN NEW;
END;
$$;

-- Drop trigger if it previously existed and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_auto_confirm();

-- Also auto-confirm any existing unconfirmed users in the database
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
