# PROJECT_MAP

## High-Level Architecture

MatchOp is a single-package Vite + React SPA that uses Supabase as its backend platform:

- Frontend: React 19 app (routing, views, hooks, UI)
- Backend services: Supabase Postgres + Auth + Realtime + Storage + Edge Functions
- Deployment target: Vercel (SPA rewrite + security headers via `vercel.json`)

There is no separate Node/Express backend in this repository.

## Folder Overview

- `src/`
  - Core application code.
  - `main.jsx` bootstraps providers/router.
  - `App.jsx` defines route tree and lazy-loaded pages.
  - `components/` shared UI components.
  - `pages/` route-level screens (`student/`, `company/`, `admin/`, `legal/`).
  - `hooks/` data and feature hooks (offers, matches, messages, profile, etc.).
  - `context/` app-wide providers (`AuthContext`, `ApplicationContext`, `ThemeContext`).
  - `lib/` infrastructure helpers (Supabase client wrapper, validation, storage, i18n, etc.).
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
  - Additional operational docs (e.g., email setup).

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
