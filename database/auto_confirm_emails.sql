-- ============================================================
-- AUTO-CONFIRM EMAIL ON SIGNUP
-- ============================================================
-- Supabase's built-in email service (free tier) is rate-limited
-- to ~3 emails/hour and often fails to deliver.
-- This trigger auto-confirms user emails at signup so they
-- get a valid session immediately without waiting for email.
--
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- ============================================================

-- Function that sets email_confirmed_at BEFORE the user row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user_auto_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Auto-confirm email so user gets a session immediately
  NEW.email_confirmed_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;

-- Create BEFORE INSERT trigger so email is confirmed before GoTrue checks
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_auto_confirm();
