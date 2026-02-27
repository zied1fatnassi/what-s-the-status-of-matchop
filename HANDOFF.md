# MatchOp Production Handoff

## Scope
- Frontend-only stabilization for production handoff.
- No new backend endpoints.
- No database schema changes.

## Route Map

### Public / Shared
- `/` landing
- `/login` student login alias
- `/signup` legacy alias redirecting to `/student/signup`
- `/forgot-password`
- `/reset-password`
- `/auth/callback`
- `/legal/terms`
- `/legal/privacy`
- `/legal/cookies`

### Student
- `/student/signup`
- `/student/login`
- `/student/swipe`
- `/student/matches`
- `/student/chat/:matchId`
- `/student/referrals`
- `/student/notifications`
- `/student/profile`
- `/payments`
- `/checkout`

### Company
- `/company/signup`
- `/company/login`
- `/company/intros`
- `/company/matches`
- `/company/chat/:matchId`
- `/company/profile`
- `/company/post-offer`
- `/company/notifications`
- `/company/archived` (archived intros/matches view)
- `/company/candidates` redirects to `/company/intros` (legacy compatibility)

### Admin
- `/admin`
- `/admin/dashboard`
- `/admin/users`
- `/admin/offers`
- `/admin/companies`
- `/admin/reports`
- `/admin/analytics`
- `/admin/settings`
- `/admin/payments`

## Required Environment Variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If these are missing (and `VITE_E2E_MOCK_MODE` is not `true`), the app shows a blocking "Missing configuration" screen.

## Optional Frontend Toggles
- `VITE_E2E_MOCK_MODE`
- `VITE_PREMIUM_ENABLED`
- `VITE_PREMIUM_WAITLIST_MODE`
- `VITE_SWIPE_STACK_V2`
- `VITE_STANDARD_DAILY_SWIPE_LIMIT`
- `VITE_DEBUG_WEBVITALS`
- `VITE_DEBUG_AUTH`
- `VITE_DEBUG_SAFE_LOGGER`

## Local Runbook
1. `npm ci`
2. Copy `.env.example` to `.env` and set required values.
3. `npm run dev`
4. Validation:
   - `npm run lint`
   - `npm run test:run`
   - `npm run build`

## Deploy (Vercel)
1. Create/update Vercel project pointing to this repo.
2. Set required environment variables in Vercel project settings.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Ensure SPA rewrite and security headers from `vercel.json` are active.

## Known Preview / LocalStorage Behaviors
- Student referrals progression is preview/local and stored in:
  - `matchop_referral_progress`
  - `matchop_referral_reward_claimed`
- Referral capture/local attribution keys:
  - `matchop_referral_code`
  - `matchop_referral_seen_at`
  - `matchop_my_referral_code`
- Company archived page reason/status overrides are local only:
  - `matchop_company_match_fail_reasons`
  - `matchop_company_match_status_overrides`
- Notification center state is local:
  - `matchop_notifications_student`
  - `matchop_notifications_company`
  - legacy key migrated from `matchop_notifications`
- Student swipe preferences/discovery mode persistence:
  - `matchop_student_swipe_preferences`
  - `matchop_discovery_scope`
  - legacy key `matchop_discovery_mode` (migrated)
- Admin payments preview premium overrides are local:
  - `matchop_admin_premium_overrides`
