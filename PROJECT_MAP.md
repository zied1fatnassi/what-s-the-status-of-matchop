# PROJECT_MAP

## High-Level Architecture

MatchOp is a single-package Vite + React SPA that uses Supabase as its backend platform:

- Frontend: React 19 app (routing, views, hooks, UI)
- Backend services: Supabase Postgres + Auth + Realtime + Storage + Edge Functions
- Data Ingestion: Python 3.11+ Scrapling + Groq AI scraper for external job aggregation
- Deployment target: Vercel (SPA rewrite + security headers via `vercel.json`)

There is no separate Node/Express backend in this repository.

## Folder Overview

- `src/`
  - Core application code.
  - `main.jsx` bootstraps providers/router.
  - `App.jsx` defines route tree and lazy-loaded pages.
  - `components/` shared UI components.
    - `discovery/` — `VerticalOpportunityFeed.jsx`, `VerticalOpportunityItem.jsx` (core vertical scrolling feed).
    - `landing/` — Landing page sections and motion primitives.
    - `navigation/` — `StudentBottomNav.jsx` and app navigation.
    - `offers/` — `OfferScopeToggle`, `PreferencesButton`, `PreferencesDrawerOrModal`.
    - `forms/` — Reusable form components (location selector, etc.).
  - `pages/` route-level screens (`student/`, `company/`, `admin/`, `legal/`).
  - `hooks/` data and feature hooks (offers, matches, messages, profile, etc.).
  - `context/` app-wide providers (`AuthContext`, `ApplicationContext`, `ThemeContext`).
  - `lib/` infrastructure helpers (Supabase client wrapper, validation, storage, i18n, etc.).
  - `features/` feature modules (conversations).
  - `config/` app configuration (pricing).
  - `data/` static suggestion datasets.
  - `locales/` i18n dictionaries.

- `public/`
  - Static assets served directly by Vite/Vercel.

- `tests/mobile/`
  - Playwright mobile visual regression tests.

- `supabase/`
  - Supabase project config and managed migrations.
  - `functions/` Edge Functions (Deno/TypeScript) for AI, matching, PDF, ingestion, etc.
  - `migrations/` timestamped SQL migrations used by Supabase CLI/dashboard.
  - `manual/` operator docs/runbooks.

- `database/`
  - Manual SQL scripts retained for canonical setup + feature support.
  - Includes canonical RLS script and major schema/feature SQL.

- `docs/`
  - System documentation under `docs/system/`.
  - Additional operational docs (email setup, premium discovery, security).
  - Project preview screenshots under `docs/assets/screenshots/`.

- `scraper/`
  - Python-based external job scraper subsystem.
  - `matchop_scraper/` source code, `config/` seed URLs, `docker/` cron deployment.

## Key Entry Points

- Frontend entry: `src/main.jsx`
- App routing shell: `src/App.jsx`
- Supabase client abstraction: `src/lib/supabase.js`
- Vite build config: `vite.config.js`
- ESLint config: `eslint.config.js`
- Unit test config: `vitest.config.js`
- Mobile test config: `playwright.mobile.config.js`
- Vercel runtime config: `vercel.json`
- Edge middleware: `middleware.js`

## Discovery Architecture

The student discovery feed is assembled by `src/hooks/useJobOffers.js` and rendered through:

1. **Page**: `src/pages/student/StudentSwipe.jsx` — orchestrates the feed, scope toggle, preferences, empty/loading/error states, and swipe actions.
2. **Feed Component**: `src/components/discovery/VerticalOpportunityFeed.jsx` — manages vertical scroll/drag/keyboard navigation with Framer Motion spring transitions.
3. **Card Component**: `src/components/discovery/VerticalOpportunityItem.jsx` — renders individual opportunity cards with ambient backgrounds, match scores, skill tags, and action buttons (Apply, Ignore, Undo, Details).
4. **Scope Toggle**: `src/components/offers/OfferScopeToggle.jsx` — switches between local (standard) and global (premium) discovery scopes.
5. **Preferences**: `src/components/offers/PreferencesDrawerOrModal.jsx` — client-side filters for location, type, category, and radius.

### Feed Modes
- **V2 (swipe-stack)**: Server-ranked feed via `swipe-stack` edge function.
- **Legacy fallback**: `get-matched-jobs` + direct table reads + client-side merge.

Both modes serve a unified feed combining internal `offers` and external `external_jobs`.

## Frontend ↔ Backend (Supabase) Data Flow

1. Frontend initializes Supabase client in `src/lib/supabase.js` using:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Feature hooks/pages query Supabase directly:
   - Tables via `supabase.from(...)`
   - Auth via `supabase.auth...`
   - Realtime channels via `supabase.channel(...)`
   - Storage via `supabase.storage...`

3. AI and server-only operations go through Edge Functions via `supabase.functions.invoke(...)`.

4. Database authorization is enforced by RLS policies in Supabase (canonical policy script retained in `database/000_canonical_rls.sql`).

## Runtime Commands (Current)

- Dev server: `npm run dev`
- Build: `npm run build`
- Preview build: `npm run preview`
- Lint: `npm run lint`
- Unit tests: `npm run test:run`
- Mobile tests: `npm run test:mobile`
