# MatchOp

MatchOp is a Vite + React single-page application for student/company opportunity matching, powered by Supabase (Auth, Postgres, Realtime, Storage, Edge Functions).

## Current Architecture

- Frontend app: `src/` (React 19 + React Router)
- Backend platform: Supabase (no separate Node API server in this repo)
- Build tool: Vite
- Unit tests: Vitest
- Mobile visual tests: Playwright

See `PROJECT_MAP.md` for a fuller architecture map.
See `HANDOFF.md` for production handoff routes, env requirements, deploy notes, and QA-critical behaviors.

## Prerequisites

- Node.js 18+ (tested on Node 24)
- npm 9+
- Supabase project (URL + anon key)

## Environment

Create a local env file from the committed template:

```bash
cp .env.example .env
```

Required frontend variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Notes:

- Do not expose service-role keys with `VITE_` prefixed vars.
- Service-role keys should only be used server-side (Supabase secrets, secure tooling, CI).

## Install

```bash
npm ci
```

## Run

Development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Testing and Linting

Lint:

```bash
npm run lint
```

Unit tests:

```bash
npm run test:run
```

Interactive unit test mode:

```bash
npm test
```

Mobile visual regression tests:

```bash
npm run test:mobile
```

Update mobile snapshots:

```bash
npm run test:mobile:update
```

## NPM Scripts

- `dev`: Start Vite dev server
- `build`: Production build to `dist/`
- `preview`: Preview built app
- `lint`: Run ESLint
- `test`: Run Vitest in watch mode
- `test:run`: Run Vitest once
- `test:mobile`: Run Playwright mobile suite
- `test:mobile:update`: Update Playwright snapshots

## Key Paths

- App entry: `src/main.jsx`
- Router shell: `src/App.jsx`
- Supabase client wrapper: `src/lib/supabase.js`
- Supabase functions: `supabase/functions/`
- Supabase migrations: `supabase/migrations/`
- Manual SQL scripts: `database/`
- Mobile tests: `tests/mobile/`

## Database / Supabase Notes

This repo contains two SQL sources:

1. `supabase/migrations/`: Supabase-managed migration history.
2. `database/`: curated manual SQL scripts (canonical RLS + feature scripts retained).

Use caution when applying manual SQL scripts in production.

## Deployment Notes

- Frontend deploy target: Vercel
- Runtime headers/rewrites: `vercel.json`
- Edge middleware: `middleware.js`

## Cleanup History

A major safe cleanup/stabilization pass was applied.

See:

- `CLEANUP_REPORT.md` for removed files/dependencies, rationale, risks, and verification commands.
- `PROJECT_MAP.md` for architecture/folder/entry-point overview.
