# AWS Migration Guide — MatchOp

## Architecture Overview

### Before Migration
```
GitHub → Vercel → CloudFlare CDN → matchop.tech
                 ↓
           Supabase (Auth, DB, Realtime, Storage, Edge Functions)
```

### After Migration
```
GitHub → AWS Amplify → CloudFront CDN → matchop.tech
                 ↓
           Supabase (Auth, DB, Realtime, Storage, Edge Functions)  [UNCHANGED]
```

## What Changed

| Component | Before | After |
|-----------|--------|-------|
| Frontend Hosting | Vercel | AWS Amplify |
| CDN | Vercel Edge Network | AWS CloudFront |
| Build System | Vercel CI | AWS Amplify CI |
| Analytics | `@vercel/analytics` | Removed (web-vitals retained) |
| Speed Insights | `@vercel/speed-insights` | Removed (web-vitals retained) |
| Edge Middleware | Vercel Edge Middleware | Not applicable (server-side rate limiting in Supabase Edge Functions) |
| Custom Headers | `vercel.json` | `amplify.yml` |
| SPA Routing | Vercel rewrites | Amplify redirect rules |

## What Did NOT Change

| Component | Provider | Notes |
|-----------|----------|-------|
| Database | Supabase PostgreSQL | PostGIS, pgvector, RLS, triggers, RPC |
| Authentication | Supabase Auth | Email/password, email verification |
| Realtime | Supabase Realtime | Chat messages, match notifications |
| Storage | Supabase Storage | avatars, company-logos, cvs, payment_proofs |
| Edge Functions | Supabase (16 functions) | AI, payments, swipe, janitor, etc. |
| Scraper | GitHub Actions | Every 4 hours cron |
| Domain Registration | OVH | matchop.tech |
| Business Email | OVH | contact@matchop.tech |
| Transactional Email | Resend (SMTP via Supabase) | no-reply@matchop.tech |

## AWS Account Requirements

- **Region:** `eu-west-3` (Paris) — closest to Tunisia
- **Services Used:** Amplify Hosting only
- **Free Tier:** 12 months from account creation
  - 1,000 build minutes/month
  - 15 GB served/month
  - 5 GB storage

## Environment Variables (Amplify Console)

Set these in: **Amplify Console → App → Environment Variables**

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_SUPABASE_URL` | `https://kedqldpdvycbnznejbbl.supabase.co` | Public Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | *(from Supabase Dashboard)* | Public anon key |
| `VITE_SITE_URL` | `https://matchop.tech` | Used for canonical URLs |
| `VITE_PREMIUM_ENABLED` | `true` | Enable premium features |
| `VITE_SWIPE_STACK_V2` | `true` | Use v2 swipe stack |
| `VITE_STANDARD_DAILY_SWIPE_LIMIT` | `20` | Daily swipe limit |

> **⚠️ NEVER add these to Amplify:**
> - `SUPABASE_SERVICE_ROLE_KEY`
> - `STRIPE_SECRET_KEY`
> - `GROQ_API_KEY`
> - `OPENROUTER_API_KEY`
>
> These are server-side secrets stored in Supabase Dashboard and GitHub Secrets.

## Amplify Configuration

### SPA Redirect Rules

Add this rewrite rule in **Amplify Console → App → Rewrites and redirects:**

| Source | Target | Type |
|--------|--------|------|
| `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|jpeg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json\|webp\|webmanifest)$)([^.]+$)/>` | `/index.html` | 200 (Rewrite) |

This ensures all React Router paths (e.g., `/student/profile`, `/admin/dashboard`) serve `index.html` instead of returning 404.

### Build Settings

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Build specification:** `amplify.yml` (auto-detected from repository root)

## Supabase Dashboard Configuration

After Amplify deployment is verified, update:

### Authentication → URL Configuration

1. **Site URL:** `https://matchop.tech`
2. **Redirect URLs (add):**
   - `https://<app-id>.amplifyapp.com/auth/callback` (for testing)
3. **Redirect URLs (keep):**
   - `https://matchop.tech/auth/callback`
   - `https://www.matchop.tech/auth/callback`
   - `http://localhost:5173/auth/callback`
4. **Redirect URLs (remove after migration stable):**
   - `https://matchop.vercel.app/auth/callback`

### Edge Function Secrets

Verify `SITE_URL` is set to `https://matchop.tech` in Supabase Edge Function secrets.

## DNS Configuration

### Pre-Migration: Export OVH DNS Zone

Before any changes, export your current DNS zone from OVH:
1. Log in to OVH Manager
2. Go to **Domains** → `matchop.tech` → **DNS Zone**
3. Export/screenshot all records

### DNS Records to Change

| Type | Name | Old Value (Vercel) | New Value (Amplify) |
|------|------|--------------------|---------------------|
| CNAME | `@` or `A` | Vercel IP/CNAME | Amplify CloudFront distribution |
| CNAME | `www` | Vercel CNAME | Amplify CloudFront distribution |

### DNS Records to PRESERVE (DO NOT CHANGE)

| Type | Name | Purpose |
|------|------|---------|
| MX | `@` | Email delivery (OVH) |
| TXT | `@` | SPF record for email |
| TXT | `*._domainkey` | DKIM for email |
| TXT | `_dmarc` | DMARC policy |
| Any | Any | Domain verification TXT records |

## Deployment Procedure

### First Deployment

1. Push code changes to `main` branch
2. In AWS Console → Amplify:
   - Create new app → Connect to GitHub → Select `MATCHOP` repo
   - Branch: `main`
   - Build settings: Auto-detected from `amplify.yml`
   - Add environment variables (see table above)
3. Amplify builds and deploys to `https://<app-id>.amplifyapp.com`
4. Test thoroughly on the Amplify domain
5. Add Amplify domain to Supabase Auth redirect URLs
6. Connect custom domain in Amplify Console
7. Update OVH DNS records
8. Verify HTTPS + custom domain

### Subsequent Deployments

Automatic: Push to `main` → Amplify auto-builds and deploys.

## Rollback Procedure

If AWS Amplify is broken after DNS cutover:

1. **Revert OVH DNS:**
   - Restore previous A/CNAME records pointing to Vercel
   - Do NOT touch MX/TXT/DKIM records
2. **DNS propagation:** 5–60 minutes
3. **Verify:** `https://matchop.tech` serves from Vercel
4. **Investigate:** Check Amplify build logs, environment variables, redirect rules
5. **Retry** when issues are resolved

> **Keep Vercel project active for 48–72 hours** after successful AWS migration.

## Security Configuration

- HTTPS enforced via CloudFront (managed by Amplify)
- HSTS with 2-year max-age + includeSubDomains + preload
- CSP blocks inline scripts, frames, and external form actions
- X-Frame-Options: DENY (clickjacking protection)
- No server-side secrets exposed in frontend build
- Amplify environment variables: only `VITE_` prefixed (public by design)

## Cost Estimate

### Free Tier (First 12 Months)

| Service | Monthly Cost |
|---------|-------------|
| Amplify Hosting | $0 |
| **Total** | **$0/mo** |

### Post Free Tier

| Service | Monthly Cost |
|---------|-------------|
| Amplify build minutes (~50/mo) | ~$0.50 |
| Amplify data served (~5GB/mo) | ~$0.75 |
| Amplify storage (~200MB) | ~$0.01 |
| Route 53 (if used) | ~$0.50 |
| **Total** | **~$1.26–$1.76/mo** |

## Troubleshooting

### 404 on Direct Route Navigation

**Cause:** SPA redirect rule not configured.
**Fix:** Add the rewrite rule from the "SPA Redirect Rules" section above.

### Auth Callback Fails

**Cause:** Amplify domain not in Supabase Auth redirect URLs.
**Fix:** Add `https://<app-id>.amplifyapp.com/auth/callback` to Supabase Dashboard → Auth → URL Configuration.

### CORS Errors on Edge Functions

**Cause:** `SITE_URL` not set in Supabase Edge Function secrets.
**Fix:** Set `SITE_URL=https://matchop.tech` in Supabase Dashboard → Edge Functions → Secrets.

### Build Fails

**Cause:** Missing environment variables.
**Fix:** Ensure all `VITE_*` variables are set in Amplify Console → Environment Variables.

### Chat/Realtime Not Working

**Cause:** Supabase Realtime connects directly from browser via `wss://*.supabase.co`. This should work regardless of hosting provider.
**Fix:** Check browser console for WebSocket errors. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct.
