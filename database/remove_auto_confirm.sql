-- ============================================================
-- REMOVE AUTO-CONFIRM EMAIL TRIGGER
-- ============================================================
-- Now that Gmail SMTP is configured, we no longer need to
-- auto-confirm emails. Users must verify via the email link.
--
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- ============================================================

-- Drop the auto-confirm trigger
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;

-- Drop the function too (cleanup)
DROP FUNCTION IF EXISTS public.handle_new_user_auto_confirm();
