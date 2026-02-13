# Email Setup for MATCHOP Auth

## Problem: "Email sent" but nothing arrives

When signing up as a student (or company), the app says "We've sent a verification link to your email" — but the email never arrives. This is a **Supabase limitation**, not a bug in MATCHOP.

## Root Cause

Supabase's built-in email provider has severe restrictions:

1. **Pre-authorized emails only** — Without custom SMTP, Supabase Auth only sends emails to addresses in your **organization's team**. All other addresses fail (often silently).
2. **Rate limit** — Only 2–3 messages per hour.
3. **No SLA** — Best-effort only, intended for demos, not production.

**Source:** [Supabase: Not receiving Auth emails](https://supabase.com/docs/guides/troubleshooting/not-receiving-auth-emails-from-the-supabase-project-OFSNzw)

---

## Solution A: Auto-Confirm (Quick Fix for Dev/Testing)

Use this when you want signup to work immediately **without** email verification. Users get a session right away.

### Steps

1. Open **Supabase Dashboard** → **SQL Editor**
2. Run the contents of `database/auto_confirm_emails.sql`:

```sql
-- Auto-confirm email on signup so users get a session immediately
CREATE OR REPLACE FUNCTION public.handle_new_user_auto_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.email_confirmed_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_auto_confirm();
```

3. Test signup — users should land on their profile immediately.

### When to use

- Local development
- Staging / demo environments
- When you don't need email verification

---

## Solution B: Custom SMTP (Production Fix)

Use this when you want **real** verification emails delivered to any address.

### Steps

1. Choose an SMTP provider (Resend, SendGrid, Brevo, AWS SES, Postmark, etc.)
2. Create an account and obtain SMTP credentials.
3. In **Supabase Dashboard** → **Authentication** → **SMTP Settings** (or [Auth → SMTP](https://supabase.com/dashboard/project/_/auth/smtp)):
   - Enable **Custom SMTP**
   - Host, port, user, password (from your provider)
   - Set **Sender email** (e.g. `no-reply@yourdomain.com`)
   - Set **Sender name** (e.g. `MatchOp`)
4. Save. Supabase Auth will now send emails via your SMTP provider.

### If using auto-confirm + SMTP

If you previously ran `auto_confirm_emails.sql` and now want real email verification:

1. Remove the trigger in Supabase SQL Editor:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
```

2. Configure Custom SMTP as above.

---

## Checklist

| Scenario | What to do |
|----------|------------|
| Local dev / demo | Run `database/auto_confirm_emails.sql` |
| Production with email verification | Configure Custom SMTP in Supabase Dashboard |
| Emails still not arriving after SMTP | Check Auth logs, spam folder, provider logs |
