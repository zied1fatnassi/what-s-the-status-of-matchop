# MatchOp — Match Your Opportunity

> Connect students with top companies through an AI-powered, swipe-based matching experience.

**Live:** [matchop.vercel.app](https://matchop.vercel.app/)

---

## Features

- **Swipe-to-match** — Students browse and swipe on opportunities; mutual interest creates a match.
- **Real-time chat** — Matched students and companies can message instantly via Supabase Realtime.
- **AI-powered matching** — Semantic vector matching ranks opportunities by profile relevance (via Edge Functions).
- **External Job Aggregation** — A dedicated Scrapling + Groq AI scraper automatically ingests opportunities from third-party ATS platforms.
- **Company dashboard** — Post offers, review intros, manage candidates, and track matches.
- **Admin panel** — User management, analytics, reports, offer moderation, payment oversight, and platform settings.
- **Premium tier** — Gated features with upgrade modals, waitlist mode, and D17 mobile-payment checkout.
- **Referral system** — Students earn rewards by sharing referral codes and tracking invite progress.
- **Internationalization** — Full English and French translations via i18next.
- **Dark mode** — Theme toggle with system-preference detection.
- **Legal pages** — Terms of Service, Privacy Policy, and Cookie Policy.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Framer Motion |
| Backend | Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) |
| Data Ingestion (Scraper) | Python 3.11+, Scrapling, Groq API, httpx |
| Build | Vite 7 |
| Styling | Vanilla CSS, Google Fonts (Inter) |
| Charts | Chart.js + react-chartjs-2 |
| Icons | Lucide React |
| i18n | i18next + react-i18next |
| Analytics | Vercel Analytics, Vercel Speed Insights, Web Vitals |
| Unit Tests | Vitest, Testing Library |
| E2E / Visual Tests | Playwright |
| CI/CD | GitHub Actions |
| Deployment | Vercel (frontend), Supabase (backend) |
| Containerization | Docker (dev environment) |

---

## Prerequisites

- Node.js 18+ (tested on Node 24)
- npm 9+
- Python 3.11+ (if running the external scraper locally)
- A Supabase project (URL + anon key)

---

## Getting Started

### 1. Clone

```bash
git clone https://github.com/zied1fatnassi/MATCHOP.git
cd MATCHOP
```

### 2. Environment

Copy the template and fill in your Supabase credentials:

```bash
cp .env.example .env
```

**Required variables:**

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase public anon key |

**Optional frontend toggles:**

| Variable | Default | Description |
|---|---|---|
| `VITE_E2E_MOCK_MODE` | `false` | Enable mock mode for E2E testing |
| `VITE_PREMIUM_ENABLED` | — | Enable premium features |
| `VITE_PREMIUM_WAITLIST_MODE` | — | Show waitlist instead of direct purchase |
| `VITE_SWIPE_STACK_V2` | `false` | Enable V2 swipe stack algorithm |
| `VITE_STANDARD_DAILY_SWIPE_LIMIT` | `20` | Daily swipe limit for standard users |
| `VITE_DEBUG_WEBVITALS` | `false` | Log Web Vitals to console |
| `VITE_DEBUG_AUTH` | — | Verbose auth logging |
| `VITE_DEBUG_SAFE_LOGGER` | — | Enable safe logger debug output |

**Server-side secrets** (set in Supabase or CI, never prefixed with `VITE_`):

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | AI provider key for Edge Functions |
| `HF_API_KEY` | HuggingFace API key for embeddings |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged access for server-side operations |
| `GROQ_API_KEY` | Groq API key for the Scraper's AI extraction |

### 3. Install & Run

```bash
npm ci
npm run dev
```

### 4. Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## NPM Scripts

| Script | Description |
|---|---|
| `dev` | Start Vite dev server |
| `build` | Production build to `dist/` |
| `preview` | Preview built app locally |
| `lint` | Run ESLint |
| `test` | Run Vitest in watch mode |
| `test:run` | Run Vitest once (CI-friendly) |
| `test:mobile` | Run Playwright mobile visual regression suite |
| `test:mobile:update` | Update Playwright mobile snapshots |

---

## Project Structure

```
MATCHOP/
├── src/
│   ├── main.jsx                 # App bootstrap (providers + router)
│   ├── App.jsx                  # Route tree + lazy-loaded pages
│   ├── components/              # Shared UI (Navbar, SwipeCard, Modals, etc.)
│   ├── pages/
│   │   ├── student/             # Student views (swipe, matches, chat, profile, referrals)
│   │   ├── company/             # Company views (intros, matches, offers, chat, profile)
│   │   ├── admin/               # Admin panel (dashboard, users, analytics, payments)
│   │   ├── legal/               # Terms, Privacy, Cookies
│   │   └── *.jsx                # Shared pages (Landing, Premium, Checkout, etc.)
│   ├── hooks/                   # Data & feature hooks (offers, matches, messages, etc.)
│   ├── context/                 # Providers (AuthContext, ApplicationContext, ThemeContext)
│   ├── lib/                     # Infra helpers (Supabase client, validation, payments, etc.)
│   ├── features/                # Feature modules (conversations)
│   ├── config/                  # App configuration (pricing)
│   ├── data/                    # Static suggestion datasets (skills, companies, job titles)
│   ├── locales/                 # i18n dictionaries (en.json, fr.json)
│   └── test/                    # Test setup and utilities
├── supabase/
│   ├── functions/               # 15 Edge Functions (Deno/TypeScript)
│   │   ├── ai-job-description/      # AI-generated job descriptions
│   │   ├── ai-profile-polisher/     # AI profile enhancement
│   │   ├── generate-embedding/      # Vector embeddings for semantic matching
│   │   ├── get-matched-jobs/        # Semantic job recommendations
│   │   ├── match-recommendations/   # AI match suggestions
│   │   ├── suggest-icebreakers/     # AI conversation starters
│   │   ├── generate-pdf/            # PDF generation
│   │   ├── record-swipe/            # Server-side swipe recording
│   │   ├── swipe-stack/             # Swipe stack API
│   │   ├── create-d17-payment-request/  # D17 payment integration
│   │   ├── admin-review-payment/    # Admin payment review
│   │   ├── grant-premium-dev/       # Dev-mode premium granting
│   │   ├── ingest-partner-offers/   # Partner offer ingestion
│   │   ├── secure-password-reset/   # Secure password reset flow
│   │   └── janitor/                 # Cleanup/maintenance tasks
│   ├── migrations/              # Timestamped SQL migrations
│   ├── manual/                  # Operator runbooks
│   └── config.toml              # Supabase project config
├── database/                    # Manual SQL scripts (canonical RLS, schema, seeds)
├── docs/                        # Operational docs (email setup, premium discovery, security)
├── public/                      # Static assets (favicon, team photos)
├── scraper/                     # Python-based External Job Scraper subsystem
│   ├── matchop_scraper/         # Scraper source code (scrapling + Groq AI)
│   ├── config/                  # Seed URLs (greenhouse, lever, workable)
│   ├── docker/                  # Docker cron deployment setup
│   └── pyproject.toml           # Scraper dependencies
├── .github/workflows/           # CI/CD workflows
├── Dockerfile                   # Docker dev environment (Node 22)
├── vercel.json                  # Vercel deploy config (SPA rewrites + security headers)
├── middleware.js                 # Edge middleware
├── vite.config.js               # Vite build config
├── vitest.config.js             # Unit test config
├── playwright.mobile.config.js  # Mobile visual test config
└── eslint.config.js             # ESLint config
```

---

## Supabase Edge Functions

The backend logic runs as 15 Deno/TypeScript Edge Functions:

| Function | Purpose |
|---|---|
| `get-matched-jobs` | Semantic vector-based job recommendations |
| `generate-embedding` | Generate vector embeddings for profiles/offers |
| `match-recommendations` | AI-powered match suggestions |
| `ai-job-description` | Generate polished job descriptions |
| `ai-profile-polisher` | Enhance student profile content |
| `suggest-icebreakers` | Generate conversation starters for matches |
| `record-swipe` | Server-side swipe event recording |
| `swipe-stack` | Serve the next swipe stack |
| `generate-pdf` | Generate PDF exports |
| `create-d17-payment-request` | D17 mobile payment integration |
| `admin-review-payment` | Admin payment approval/rejection |
| `grant-premium-dev` | Grant premium access in development |
| `ingest-partner-offers` | Ingest offers from partner APIs |
| `secure-password-reset` | Secure password reset token flow |
| `janitor` | Periodic cleanup and maintenance |

---

## External Job Scraper Subsystem

In addition to companies manually posting offers, MatchOp utilizes a dedicated Python scraper (in the `scraper/` directory) to continuously ingest job postings from third-party ATS platforms (Greenhouse, Lever, Workable).

**Pipeline Flow:**
1. **Scrapling** fetches seed pages based on configurations in `scraper/config/seeds.yml`.
2. ATS-specific scrapers discover and parse job pages.
3. **Groq AI** extracts structured fields (skills, experience, summary).
4. The pipeline cleans titles, locations, and salaries, then deduplicates by URL and content hash.
5. Jobs are upserted into the `external_jobs` table in Supabase via the Service Role key.

See [`scraper/README.md`](scraper/README.md) for detailed local setup and running instructions.

---

## Database

This repo contains two SQL sources:

1. **`supabase/migrations/`** — Supabase-managed migration history (applied via CLI/dashboard).
2. **`database/`** — Curated manual SQL scripts including canonical RLS policies, schema definitions, seed data, and feature scripts.

> ⚠️ Use caution when applying manual SQL scripts in production. Always verify the live schema first.

---

## Deployment

### Vercel (Frontend)

1. Create a Vercel project pointing to this repository.
2. Set the required environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. Build command: `npm run build`
4. Output directory: `dist`
5. SPA rewrites and security headers are configured in `vercel.json`.

### Docker (Development)

```bash
docker build -t matchop .
docker run -p 5173:5173 matchop
```

### Scraper Deployment

The scraper runs autonomously via two supported methods:
1. **GitHub Actions**: A cron job defined in `.github/workflows/external-job-scraper.yml` runs every 4 hours.
2. **Docker Cron**: Located in `scraper/docker-compose.cron.yml` for isolated containerized scheduling.

---

## Route Map

### Public
| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Student login alias |
| `/forgot-password` | Password recovery |
| `/reset-password` | Password reset |
| `/auth/callback` | OAuth callback |
| `/legal/terms` | Terms of Service |
| `/legal/privacy` | Privacy Policy |
| `/legal/cookies` | Cookie Policy |

### Student
| Route | Description |
|---|---|
| `/student/signup` | Student registration |
| `/student/login` | Student login |
| `/student/swipe` | Swipe through opportunities |
| `/student/matches` | View matches |
| `/student/chat/:matchId` | Chat with a matched company |
| `/student/referrals` | Referral program dashboard |
| `/student/notifications` | Notification center |
| `/student/profile` | Profile editor |
| `/payments` | Payment history |
| `/checkout` | Premium checkout |

### Company
| Route | Description |
|---|---|
| `/company/signup` | Company registration |
| `/company/login` | Company login |
| `/company/intros` | Review student intros |
| `/company/matches` | View matches |
| `/company/chat/:matchId` | Chat with a matched student |
| `/company/profile` | Company profile editor |
| `/company/post-offer` | Create a new offer |
| `/company/notifications` | Notification center |
| `/company/archived` | Archived intros/matches |

### Admin
| Route | Description |
|---|---|
| `/admin/dashboard` | Platform overview |
| `/admin/users` | User management |
| `/admin/offers` | Offer moderation |
| `/admin/companies` | Company management |
| `/admin/reports` | Reports & flagged content |
| `/admin/analytics` | Platform analytics |
| `/admin/settings` | Platform settings |
| `/admin/payments` | Payment management |

---

## Documentation Index

| Document | Description |
|---|---|
| [`PROJECT_MAP.md`](PROJECT_MAP.md) | Architecture overview, folder map, and data flow |
| [`scraper/README.md`](scraper/README.md) | External job scraper architecture and runbook |
| [`HANDOFF.md`](HANDOFF.md) | Production handoff: routes, env, deploy, and QA behaviors |
| [`CLEANUP_REPORT.md`](CLEANUP_REPORT.md) | Cleanup pass: removed files, rationale, and risks |
| [`24H_DB_HANDOFF_REPORT.md`](24H_DB_HANDOFF_REPORT.md) | Database handoff: schema findings and repair plan |
| [`docs/EMAIL_SETUP.md`](docs/EMAIL_SETUP.md) | Email provider configuration |
| [`docs/PREMIUM_MATCHING_DISCOVERY.md`](docs/PREMIUM_MATCHING_DISCOVERY.md) | Premium feature architecture deep-dive |
| [`docs/SECURITY_SUPABASE_ADVISOR_REMEDIATION.md`](docs/SECURITY_SUPABASE_ADVISOR_REMEDIATION.md) | Security audit remediation notes |

---

## License

This project is licensed under the [MIT License](LICENSE).
