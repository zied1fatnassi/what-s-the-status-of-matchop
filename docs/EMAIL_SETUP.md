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

Use this when you want **real** verification emails delivered to any address with zero drops and high deliverability.

### Architecture Principle: Business Mailbox vs Transactional Email

- **Business mailbox**: `contact@matchop.tech` (managed via OVHcloud EU, accessed via Webmail or mail client).
- **Transactional sender**: `no-reply@matchop.tech` (sent via dedicated SMTP provider, with Reply-To set to `contact@matchop.tech`).
- **Never** use personal email or shared webmail SMTP for high-volume automated application emails.

### Recommended Provider: Resend (Official Supabase Partner)

1. Create a free account at [Resend.com](https://resend.com/).
2. Add your domain (`matchop.tech`) or sending subdomain (`mail.matchop.tech` / `send.matchop.tech`).
3. Add the DNS records provided by Resend to your OVHcloud DNS Zone:
   - DKIM (CNAME or TXT)
   - SPF (TXT or subdomain include)
   - DMARC (`_dmarc.matchop.tech` TXT: `v=DMARC1; p=none; rua=mailto:contact@matchop.tech; pct=100; adkim=r; aspf=r`)
   - *Important:* Never create multiple root SPF records! Merge if using apex domain.
4. Obtain your Resend API Key.
5. In **Supabase Dashboard** → **Authentication** → **SMTP Settings**:
   - Enable **Custom SMTP**: ON
   - **Sender email**: `no-reply@matchop.tech`
   - **Sender name**: `MatchOp`
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL) or `587` (TLS)
   - **User**: `resend`
   - **Password**: `[YOUR_RESEND_API_KEY]`
6. In **Supabase Dashboard** → **Authentication** → **URL Configuration**:
   - **Site URL**: `https://matchop.tech`
   - **Additional Redirect URLs**:
     - `https://matchop.tech/auth/callback`
     - `https://matchop.tech/**`
     - `https://www.matchop.tech/auth/callback`
     - `https://matchop.vercel.app/auth/callback`
     - `http://localhost:5173/auth/callback`

### If using auto-confirm + SMTP

If you previously ran `auto_confirm_emails.sql` and now want real email verification:

1. Remove the trigger by running `database/disable_auto_confirm.sql` in the Supabase SQL Editor:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_auto_confirm();
```

2. Configure Custom SMTP as above.

---

## Checklist

| Scenario | What to do |
|----------|------------|
| Local dev / demo | Run `database/auto_confirm_emails.sql` |
| Production with email verification | Configure Custom SMTP in Supabase Dashboard with `no-reply@matchop.tech` |
| Disabling dev auto-confirm | Run `database/disable_auto_confirm.sql` in Supabase SQL Editor |
| Emails still not arriving after SMTP | Check Auth logs, spam folder, Resend delivery logs |
