# MatchOp Architecture

## Purpose
MatchOp is a student-to-company opportunity platform with two distinct opportunity systems:

- Internal MatchOp offers in `offers`, which drive the core interaction flow:
  `offers -> student_swipes -> intros -> matches -> messages`
- External discovery jobs in `external_jobs`, which are browse-and-redirect opportunities only

The repository does not contain a separate Node or Python API server for the main product. The runtime application is a React single-page app backed directly by Supabase services and Supabase Edge Functions.

## High-Level Diagram
```text
Browser
  React + Vite SPA
    -> Supabase Auth
    -> Supabase Postgres (tables, RLS, RPC)
    -> Supabase Realtime
    -> Supabase Storage
    -> Supabase Edge Functions

Standalone Python worker (Scrapling + Groq AI)
  scraper/matchop_scraper
    -> Scrapling fetches ATS pages
    -> Groq AI extracts structured fields
    -> writes external jobs only to external_jobs
```

## Main Runtime Pieces

### Frontend
- React 19 SPA bootstrapped from `src/main.jsx`
- Vite build tooling
- `react-router-dom` for routing
- `@supabase/supabase-js` for auth, database, storage, realtime, and edge-function access
- `framer-motion` for swipe-card interactions
- `i18next` for translations
- `chart.js` and `react-chartjs-2` for company/admin analytics
- Vercel analytics and speed insights in `src/App.jsx`

### Backend and Platform Services
- Supabase Auth for signup, login, email verification, and password reset flows
- Supabase Postgres for all application data
- Row Level Security across almost all public tables
- Postgres RPC functions for matching, intros, swipe limits, janitor maintenance, and payments
- Supabase Edge Functions for privileged orchestration
- Supabase Realtime for chat message inserts
- Supabase Storage for avatars, company logos, CVs, and payment proofs

### Additional Worker
- `scraper/` contains a standalone Python subsystem for external job ingestion, powered by Scrapling and Groq AI
- It is intentionally outside the SPA and edge runtime
- It writes only to `external_jobs`
- Groq AI enriches scraped data with structured fields (skills, experience level, summary)

## Supabase Services Used

### Auth
- User accounts live in `auth.users`
- App-level profile rows are created in `profiles`
- Persona linking is handled by `user_profiles`
- `AuthContext` bootstraps missing rows on sign-in if needed

### Postgres
Core product data lives in:
- `profiles`
- `user_profiles`
- `students`
- `companies`
- `offers`
- `external_jobs`
- `student_swipes`
- `company_swipes`
- `intros`
- `matches`
- `messages`

Additional support data includes:
- `swipe_usage`
- `experiences`
- `student_education`
- `payment_requests`
- `payment_requests_audit`
- `reports`
- `admin_audit_logs`
- `app_settings`
- `partners`

### Realtime
- Chat subscribes to `messages` inserts per `match_id`
- The UI listens on channels like `messages:{matchId}`
- Realtime is used for message delivery, not for the swipe feed

### Storage
- `avatars`: public student avatar uploads
- `company-logos`: public company logo uploads
- `cvs`: private student CV files, readable by owner and matched companies
- `payment_proofs`: private D17 proof uploads, readable by owner and admins

### Edge Functions
Important functions in the repo:
- `swipe-stack`
- `record-swipe`
- `get-matched-jobs`
- `ingest-partner-offers`
- `janitor`
- `create-d17-payment-request`
- `admin-review-payment`
- `generate-embedding`
- `ai-job-description`
- `ai-profile-polisher`
- `match-recommendations`
- `grant-premium-dev`
- `secure-password-reset`
- `suggest-icebreakers`
- `generate-pdf`

## Core Architectural Flows

### Auth and Profile Bootstrap
1. User signs up or signs in through Supabase Auth.
2. `AuthContext` loads `profiles`.
3. If missing, it creates:
   - a `profiles` row
   - a `user_profiles` row
   - a type-specific `students` or `companies` row
4. The resolved profile drives route guards and page access.

### Internal Offer Lifecycle
1. Company creates an offer from the SPA.
2. The SPA inserts into `offers`.
3. Student discovery surfaces the offer.
4. Student swipe writes `student_swipes`.
5. A right swipe on an internal offer also creates an `intros` row through RPC.
6. Company accepts the intro.
7. A trigger inserts a `matches` row.
8. `messages` become available and chat opens.

### External Job Lifecycle
1. The Scrapling-powered Python worker scrapes external ATS boards (Greenhouse, Lever, Workable).
2. Groq AI extracts structured fields (skills, experience level, job type, summary) from raw descriptions.
3. Normaliser cleans titles, locations, company names, and salary ranges.
4. Pipeline deduplicates and upserts rows into `external_jobs`.
5. The student feed reads those jobs either:
   - directly through `swipe-stack` on the server side, or
   - through `external_jobs_public` in client-side fallback paths
6. The UI labels them as external and redirects to `original_url`.
7. No intro, match, or chat is created for external jobs.

## Repository Map

### `src/`
Main React application.

### `src/pages/`
Route-level screens for student, company, admin, auth, checkout, and legal flows.

### `src/hooks/`
Client-side data orchestration for offers, matches, messages, intros, company analytics, uploads, and profiles.

### `src/context/`
Global providers for auth, theme, and app-level UI state.

### `src/lib/`
Supabase client setup, API wrappers, payment helpers, validation, notifications, storage helpers, analytics, and utility modules.

### `src/features/`
Larger frontend features such as the conversation hub.

### `src/components/`
Reusable UI components including swipe cards, modals, nav, and discovery controls.

### `supabase/functions/`
Deno TypeScript edge functions used for privileged logic and RPC orchestration.

### `supabase/migrations/`
Deployable migration history for the current Supabase project.

### `database/`
Historical and supplemental SQL. This directory is important for understanding behavior, but not every file is equally current. Legacy files still reference older names like `job_offers` and `student_profiles`.

### `scraper/`
Standalone Python external-job ingestion worker using Scrapling + Groq AI.

### `tests/`
Automated UI tests and supporting test assets.

## Known Architecture Drift
The repository contains a few layers of history that future work must respect:

- The active app uses `offers`, not legacy `job_offers`.
- The current user flow is intro-based, but older swipe-to-match logic still exists in SQL for `company_swipes`.
- The student discovery UI has a local preference system, while the `swipe-stack` edge function reads server-side `profiles.preferences`.
- Some admin pages and hooks still assume fields like `required_skills`, `salary_min`, `salary_max`, `matches.created_at`, or `matches.last_message`, which are not clearly part of the canonical base schema reviewed in this pass.

Those mismatches should be documented and handled carefully rather than silently “cleaned up” during feature work.
