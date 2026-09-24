# AWS Amplify Runbook — MatchOp

Step-by-step console/CLI commands for the Vercel → AWS migration.

---

## Prerequisites

- AWS account with free tier eligibility
- GitHub repository: `zied1fatnassi/MATCHOP`
- Access to OVH DNS management for `matchop.tech`
- Access to Supabase Dashboard

---

## Step 1: Create Amplify App (AWS Console)

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/) → Region: **eu-west-3 (Paris)**
2. Click **"Create new app"**
3. Select **"GitHub"** as the source provider
4. Authorize AWS Amplify to access your GitHub account
5. Select repository: `MATCHOP`
6. Select branch: `main`
7. Amplify will auto-detect `amplify.yml` — verify build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
8. Click **"Next"**

## Step 2: Configure Environment Variables

In the Amplify app creation wizard or later in **App settings → Environment variables:**

```
VITE_SUPABASE_URL=https://kedqldpdvycbnznejbbl.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key-from-supabase-dashboard>
VITE_SITE_URL=https://matchop.tech
VITE_PREMIUM_ENABLED=true
VITE_SWIPE_STACK_V2=true
VITE_STANDARD_DAILY_SWIPE_LIMIT=20
```

⚠️ Do NOT add `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, or any `*_API_KEY`.

## Step 3: Deploy and Test

1. Click **"Save and deploy"**
2. Wait for build to complete (~1–2 minutes)
3. Amplify provides a URL like: `https://main.d1234abcd.amplifyapp.com`
4. Test:
   - Landing page loads
   - Navigate to `/student/login` directly (SPA routing)
   - Login works (if Supabase auth URLs updated)
   - Page refresh on `/student/profile` doesn't 404

## Step 4: Configure SPA Redirect Rule

If direct URL navigation returns 404:

1. Go to **Amplify Console → App → Rewrites and redirects**
2. Click **"Add rewrite"**
3. Enter:
   - **Source:** `</^[^.]+$|\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|webmanifest)$)([^.]+$)/>`
   - **Target:** `/index.html`
   - **Type:** `200 (Rewrite)`
4. Save

## Step 5: Update Supabase Auth Redirect URLs

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/) → Your project
2. Go to **Authentication → URL Configuration**
3. Add redirect URL: `https://main.d1234abcd.amplifyapp.com/auth/callback` (your actual Amplify URL)
4. Save

## Step 6: Full Testing on Amplify Domain

Test these on the `*.amplifyapp.com` URL:

```
[ ] Landing page
[ ] /student/signup — form loads
[ ] /student/login — login works
[ ] /student/profile — profile loads after login
[ ] /student/feed — swipe feed loads
[ ] /student/matches — matches page
[ ] /student/chat/<matchId> — chat works + realtime messages
[ ] /company/signup
[ ] /company/login
[ ] /company/profile
[ ] /company/offers
[ ] /company/post-offer
[ ] /admin/dashboard — admin access
[ ] /forgot-password — password reset flow
[ ] /premium — premium page
[ ] /checkout — checkout flow
[ ] Direct URL paste + page refresh
[ ] Browser back/forward
[ ] File upload (avatar, CV)
[ ] HTTPS certificate valid
```

## Step 7: Connect Custom Domain

1. In Amplify Console → **App → Domain management**
2. Click **"Add domain"**
3. Enter: `matchop.tech`
4. Configure:
   - `matchop.tech` → main branch
   - `www.matchop.tech` → redirect to `matchop.tech` (or same branch)
5. Amplify will provide DNS records to configure

## Step 8: Update OVH DNS

**⚠️ FIRST: Export/screenshot current DNS zone as backup!**

In OVH Manager → Domains → `matchop.tech` → DNS Zone:

1. **Delete** the old Vercel A/CNAME records for `@` and `www`
2. **Add** the records provided by Amplify (typically CNAME to CloudFront)
3. **DO NOT TOUCH:**
   - MX records (email)
   - SPF TXT record
   - DKIM records
   - DMARC TXT record
   - Any verification TXT records

Typical Amplify DNS records:

| Type | Name | Value |
|------|------|-------|
| CNAME | `_<hash>.matchop.tech` | `_<hash>.acm-validations.aws` (SSL verification) |
| CNAME | `matchop.tech` | `d<hash>.cloudfront.net` |
| CNAME | `www.matchop.tech` | `d<hash>.cloudfront.net` |

> Note: For apex/naked domains, Amplify may require an ANAME/ALIAS record.
> OVH may not support ALIAS records. In that case, you may need to use Route 53
> or configure `www.matchop.tech` as primary with a redirect from the naked domain.

## Step 9: Verify Production

After DNS propagation (5–60 minutes):

```bash
# Check HTTPS
curl -I https://matchop.tech

# Check www redirect
curl -I https://www.matchop.tech

# Check SPA routing (should return 200, not 404)
curl -I https://matchop.tech/student/profile

# Check security headers
curl -I https://matchop.tech | grep -i strict-transport
curl -I https://matchop.tech | grep -i x-frame
curl -I https://matchop.tech | grep -i content-security
```

## Step 10: Cleanup (After 48–72h Stability)

1. **Supabase Dashboard:** Remove `https://matchop.vercel.app/auth/callback` from redirect URLs
2. **Vercel:** Delete the Vercel project (or just disconnect the domain)
3. **Repository (optional):** Remove `vercel.json` and `middleware.js`
4. **Supabase config.toml:** Remove `https://matchop.vercel.app/auth/callback` from `additional_redirect_urls`

---

## Rollback (If AWS Fails)

```
1. Log in to OVH Manager
2. Go to Domains → matchop.tech → DNS Zone
3. Restore the old Vercel A/CNAME records (from your backup)
4. Wait 5–60 minutes for DNS propagation
5. Verify https://matchop.tech serves from Vercel
6. Investigate Amplify issues in AWS Console → Build logs
```
