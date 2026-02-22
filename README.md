# MatchOp â€” Match Your Opportunity

> A full-stack, AI-powered studentâ€“company matching platform with a Tinder-style swipe interface, real-time chat, intelligent job recommendations, and an automated MENA job aggregator.

![Version](https://img.shields.io/badge/version-1.0.0-6366f1)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF)
![Supabase](https://img.shields.io/badge/Supabase-2.89.0-3ECF8E)
![License](https://img.shields.io/badge/License-MIT-green)
![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20FR-blue)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-black)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Cahier des Charges (Requirements Specification)](#2-cahier-des-charges-requirements-specification)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Project Structure](#5-project-structure)
6. [Database Design](#6-database-design)
7. [Row Level Security (RLS) Policies](#7-row-level-security-rls-policies)
8. [Authentication System](#8-authentication-system)
9. [User Roles & Permissions](#9-user-roles--permissions)
10. [Frontend Application](#10-frontend-application)
11. [AI & Machine Learning Features](#11-ai--machine-learning-features)
12. [Job Crawler System](#12-job-crawler-system)
13. [Real-Time Features](#13-real-time-features)
14. [Design System & Theming](#14-design-system--theming)
15. [Internationalization (i18n)](#15-internationalization-i18n)
16. [Routing & Navigation](#16-routing--navigation)
17. [Components Reference](#17-components-reference)
18. [Hooks Reference](#18-hooks-reference)
19. [Pages Reference](#19-pages-reference)
20. [Supabase Edge Functions](#20-supabase-edge-functions)
21. [Utility Libraries](#21-utility-libraries)
22. [Testing](#22-testing)
23. [Deployment](#23-deployment)
24. [Environment Variables](#24-environment-variables)
25. [Getting Started](#25-getting-started)
26. [Scripts Reference](#26-scripts-reference)
27. [Security Considerations](#27-security-considerations)
28. [Known Issues & Bug Registry](#28-known-issues--bug-registry)
29. [Feature Roadmap](#29-feature-roadmap)
30. [Contributing](#30-contributing)
31. [License](#31-license)

---

## 1. Project Overview

**MatchOp** (Match Your Opportunity) is a modern web application that connects students with internship and job opportunities through a swipe-based matching system, similar to Tinder but for recruitment. The platform is designed to serve the **Tunisian and MENA** job market with support for local companies, job boards, and bilingual (English/French) interfaces.

### Core Value Proposition

- **Students** discover jobs by swiping through AI-ranked offers, build rich profiles, and chat with employers after matching.
- **Companies** post offers, receive AI-written job descriptions, browse pre-qualified candidates, and manage hiring pipelines.
- **Administrators** oversee platform health via a full-featured dashboard with user management, analytics, and moderation tools.

### Key Features at a Glance

| Feature | Description |
|---------|-------------|
| Swipe-to-Match | Tinder-style card swiping for job discovery with like/pass/super-like actions |
| AI Job Matching | pgvector cosine similarity + PostGIS geospatial + skill overlap scoring |
| AI Job Descriptions | LLM-powered job description generation for companies |
| AI Profile Polisher | AI-enhanced student bios |
| AI Icebreakers | Conversation starter suggestions for new matches |
| Real-Time Chat | Supabase Realtime subscriptions for instant messaging |
| Live Match Notifications | Realtime listener fires when a new match is created |
| External Job Aggregator | Crawls 5 MENA job boards + 2 RSS feeds, saves to database |
| Smart Apply | Auto-compose emails to external job contacts with CV attachment |
| PDF CV Export | Generate downloadable PDF resume from profile data |
| Verification System | Email auto-verification + LinkedIn manual verification with badges |
| Report & Block | User moderation with reason-based reporting and instant blocking |
| Spam Detection | Multi-tier spam analysis on chat messages and profile bios |
| Smart Scheduling | Date/time detection in chat messages + Google Calendar integration |
| Dark/Light/System Theme | Full theme system with CSS custom properties |
| Bilingual UI | English and French with RTL scaffolding for Arabic |
| Admin Dashboard | User/offer/company management, analytics, reports, audit logs |
| Mobile-First Design | Responsive bento-grid layout with glassmorphism design language |

---

## 2. Cahier des Charges (Requirements Specification)

### 2.1 Project Context

| Item | Detail |
|------|--------|
| **Project Name** | MatchOp â€” Match Your Opportunity |
| **Type** | Web Application (Single Page Application) |
| **Target Market** | Tunisia and MENA region |
| **Primary Language** | French & English (bilingual) |
| **Currency** | Tunisian Dinar (TND) |
| **Target Users** | University students, recent graduates, Tunisian companies, MENA employers |
| **Platform** | Desktop browsers, mobile browsers (responsive) |
| **Deployment** | Vercel (frontend), Supabase Cloud (backend) |

### 2.2 Functional Requirements

#### FR-01: User Authentication & Registration
- Users must register as either **Student** or **Company** (mutually exclusive roles).
- Registration requires email, password, full name, and role-specific data.
- Password policy: minimum 8 characters, must include uppercase, lowercase, number, and special character.
- Email verification is required. On confirmation, the account is auto-verified and receives a verification badge.
- Password reset flow via email link.
- Session persistence using Supabase Auth with JWT tokens stored in `localStorage`.
- Auth state listener detects session changes (login, logout, token refresh, email verification).

#### FR-02: Student Profile Management
- Students must be able to edit: display name, headline, bio, location (governorate + city), skills, avatar photo, and CV/resume (PDF/Word, max 5 MB).
- Education section: institution (autocomplete from Tunisian universities), degree, field of study, start/end dates, current flag.
- Experience section: job title, company (autocomplete from Tunisian companies dataset), start/end dates, current flag, description.
- Additional sections: certifications (name, issuer, date, URL), projects (name, description, URL, dates), languages (name + proficiency level), volunteer work (organization, role, cause, dates).
- Profile completion percentage calculated across 11 criteria.
- AI bio improvement via edge function (minimum 10 characters required).
- Embedding generation triggered on profile save (bio, skills, headline changes) for semantic matching.

#### FR-03: Company Profile & Offer Management
- Companies must be able to edit: company name, industry, website, description, logo, location, contact email.
- Companies can create job offers with: title, department, type (internship/full-time/part-time/contract), description, requirements, location type (onsite/remote/hybrid), governorate/city, salary range, duration, required skills.
- AI-powered job description generation from job title, department, and type.
- Embedding generation triggered on offer creation for semantic matching.
- Companies can view, edit, and deactivate their offers.

#### FR-04: Swipe-Based Job Discovery
- Students are presented with a stack of job offer cards, ranked by AI match score.
- Swipe right = Like (apply), swipe left = Pass, super-like available.
- Card displays: match score percentage, company logo, verification badge, job title, description, location, salary, skills, and source badge for external jobs.
- Filter panel: work type, contract type, salary range (4 TND brackets), industry (8 categories).
- Undo last swipe (UI reversal only â€” DB swipe committed).
- When both student and company swipe right, a match is auto-created by database trigger.
- External job right-swipe opens the URL in a new tab (no match creation).

#### FR-05: Company Candidate Review
- Companies view candidates who swiped right on their offers.
- Grid/List view toggle.
- Filter by skills and location.
- Like (right) and Pass (left) actions per candidate.
- Like on a candidate who already liked the company's offer triggers a match.

#### FR-06: Matching System
- Symmetric matching: requires both student swipe right AND company swipe right.
- Match creation handled by PostgreSQL triggers (`on_student_swipe_match`, `on_company_swipe_match`).
- Match celebration modal with confetti animation, dual avatars, and next-step instructions.
- Match statuses: `matched`, `accepted`, `rejected`, `archived`.
- Real-time match notifications via Supabase Realtime subscriptions.

#### FR-07: Real-Time Chat
- One chat thread per match.
- Real-time message delivery via Supabase Realtime (`postgres_changes` on `messages` table).
- Message persistence in database.
- Chat bubble component with sender/receiver styling.
- Smart scheduling detection: recognizes date/time mentions in messages and offers Google Calendar link.
- Spam detection on outgoing messages.

#### FR-08: External Job Aggregation
- Automated crawler scrapes 5 MENA job boards: LinkedIn, TanitJobs, KeeJobs, Wuzzuf, Bayt.
- 2 RSS feeds: WeWorkRemotely, Jobspresso.
- Uses Scrapestack API for JavaScript rendering and anti-blocking.
- Link verification before database save (URL validation + HTTP check on 30% sample).
- Jobs stored in `external_jobs` table with upsert on `original_url`.
- Dead link cleanup script.
- Students browse external jobs with search, location filter, and pagination (24/page).
- Smart Apply: opens `mailto:` with pre-filled subject/body + CV link, or opens external URL.

#### FR-09: Admin Dashboard
- Admin role with dedicated route guard.
- Dashboard displays: total users, students, companies, total offers, active offers, matches, pending reports.
- User management (CRUD).
- Offer management.
- Company management.
- Report review and moderation.
- Analytics dashboard.
- Platform settings.
- Audit log (last 10 admin actions).

#### FR-10: Report & Block System
- Users can report others with a reason (spam, fake profile, harassment, inappropriate content, other) and optional details (500 char limit).
- Duplicate report prevention (unique per reporter+reported pair).
- Users can block/unblock others.
- Blocked users are filtered from the swipe deck and chat.
- Report statuses: pending, reviewed, dismissed, action_taken.
- RLS: users see only their own reports and blocks.

#### FR-11: Verification System
- Email auto-verification: triggered when Supabase auth email is confirmed.
- LinkedIn manual verification: validates LinkedIn URL format, stores in profile.
- Verification badges displayed on SwipeCard and profile (3 types: email/LinkedIn/manual, color-coded).
- Badge sizes: xs, sm, md, lg.

#### FR-12: PDF Export
- Students can export their profile as a downloadable PDF CV.
- Includes: name, location, bio, skills, experience entries, education entries, certifications.
- Generated client-side via jsPDF.

### 2.3 Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| **Performance** | Code-split via 28 lazy-loaded route components; vendor chunk splitting (react, router, supabase, i18n, icons); Lighthouse-optimized |
| **Responsiveness** | Mobile-first design with breakpoints at 640px, 768px, 1024px; minimum touch target 44px; iOS safe-area support |
| **Accessibility** | ARIA labels, keyboard navigation, screen-reader-only helpers (`.sr-only`), `prefers-reduced-motion` support |
| **Security** | Row Level Security on all tables; JWT-based auth; CORS headers on edge functions; spam detection; rate limiting |
| **Scalability** | Supabase Cloud managed PostgreSQL; HNSW vector indexes for O(log n) similarity search; chunk-based job saves |
| **Maintainability** | Component-based architecture; custom hooks for data logic; CSS variables for theming; ESLint flat config |
| **Browser Support** | ES2020 target; tested on Chrome, Firefox, Safari, Edge; iOS Safari safe-area support |
| **SEO** | Open Graph meta, Twitter Card, DNS prefetch, preloaded fonts |

### 2.4 Technical Constraints

- No server-side rendering (pure SPA).
- No Tailwind CSS â€” custom CSS design system with hand-written utility classes.
- Free-tier AI models only (OpenRouter Llama 3.2 3B, HuggingFace all-MiniLM-L6-v2).
- Supabase free tier limits apply.
- Single-region deployment (EU Central recommended for Tunisia proximity).

---

## 3. Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.0 | UI framework (functional components + hooks) |
| Vite | 7.2.4 | Build tool & dev server |
| react-router-dom | 7.11.0 | Client-side routing with lazy loading |
| framer-motion | 12.23.26 | Swipe card physics, page transitions, animations |
| lucide-react | 0.561.0 | Icon library (200+ icons used) |
| i18next | 23.16.8 | Internationalization framework |
| react-i18next | 14.1.3 | React bindings for i18next |
| jspdf | 3.0.4 | Client-side PDF generation |
| html2canvas | 1.4.1 | Screenshot capture for PDF |
| @vercel/analytics | 1.6.1 | Page view analytics |
| @vercel/speed-insights | 1.3.1 | Performance monitoring |

### Backend (Supabase)

| Technology | Purpose |
|-----------|---------|
| Supabase Auth | Email/password authentication, JWT sessions, email verification |
| Supabase Database (PostgreSQL) | Relational data storage with extensions |
| Supabase Realtime | WebSocket subscriptions for chat and match notifications |
| Supabase Storage | File uploads (avatars, CVs, company logos) |
| Supabase Edge Functions (Deno) | 6 serverless AI functions |
| pgvector | 384-dimensional vector embeddings for semantic matching |
| PostGIS | Geospatial queries for distance-based matching |
| pg_trgm | Trigram text similarity for fuzzy search |

### AI & ML

| Service | Model | Purpose |
|---------|-------|---------|
| OpenRouter | meta-llama/llama-3.2-3b-instruct (free) | Job descriptions, profile polishing, icebreakers |
| HuggingFace Inference | sentence-transformers/all-MiniLM-L6-v2 | 384-dim vector embeddings for semantic matching |

### Crawler

| Technology | Purpose |
|-----------|---------|
| Node.js | Crawler runtime |
| axios | HTTP client for scraping |
| cheerio | HTML parsing |
| rss-parser | RSS feed parsing |
| Scrapestack API | JavaScript rendering & anti-blocking proxy |

### Dev Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 4.0.16 | Unit testing framework |
| @testing-library/react | 16.3.1 | Component testing utilities |
| jsdom | 27.3.0 | Browser environment simulation |
| ESLint | 9.39.1 | Code linting (flat config) |
| eslint-plugin-react-hooks | 7.0.1 | Hooks linting rules |
| eslint-plugin-react-refresh | 0.4.24 | Fast refresh compatibility |

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    CLIENT (Vercel SPA)                        â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚ React 19â”‚  â”‚ Router v7â”‚  â”‚Framer Motâ”‚  â”‚ i18next      â”‚ â”‚
â”‚  â”‚   App   â”‚â”€â”€â”‚ 38 routesâ”‚  â”‚  Swipe   â”‚  â”‚ EN/FR        â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚       â”‚                                                      â”‚
â”‚  â”Œâ”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚            Context Providers                             â”‚ â”‚
â”‚  â”‚  AuthContext â†’ ApplicationContext â†’ ThemeContext          â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚ HTTPS / WSS
â”Œâ”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚       â”‚          SUPABASE CLOUD                              â”‚
â”‚  â”Œâ”€â”€â”€â”€â”´â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚  Auth   â”‚  â”‚PostgreSQLâ”‚  â”‚ Realtime  â”‚  â”‚   Storage    â”‚ â”‚
â”‚  â”‚  (JWT)  â”‚  â”‚+ pgvectorâ”‚  â”‚(WebSocket)â”‚  â”‚  (avatars,   â”‚ â”‚
â”‚  â”‚         â”‚  â”‚+ PostGIS â”‚  â”‚           â”‚  â”‚   CVs)       â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚+ pg_trgm â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚               â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜                                   â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚              Edge Functions (Deno)                        â”‚ â”‚
â”‚  â”‚  ai-job-description  â”‚  ai-profile-polisher              â”‚ â”‚
â”‚  â”‚  generate-embedding  â”‚  get-matched-jobs                 â”‚ â”‚
â”‚  â”‚  match-recommendationsâ”‚  suggest-icebreakers             â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              â”‚                       â”‚
     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”
     â”‚   OpenRouter     â”‚    â”‚  HuggingFace    â”‚
     â”‚ Llama 3.2 3B    â”‚    â”‚ all-MiniLM-L6-v2â”‚
     â”‚ (job desc, bio,  â”‚    â”‚ (384-dim vectors)â”‚
     â”‚  icebreakers)    â”‚    â”‚                  â”‚
     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                JOB CRAWLER (Node.js)                          â”‚
â”‚  kernel.js â†’ [linkedin, tanitjobs, keejobs, wuzzuf, bayt]    â”‚
â”‚           â†’ [WeWorkRemotely RSS, Jobspresso RSS]             â”‚
â”‚           â†’ Scrapestack API â†’ Supabase external_jobs         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 4.2 Provider Hierarchy

```
<StrictMode>
  <BrowserRouter>
    <AuthProvider>          â† Supabase auth session + profile state
      <ApplicationProvider> â† localStorage job application tracking
        <ThemeProvider>     â† light/dark/system via data-theme attribute
          <App />           â† Routes + Navbar + Footer + Diagnostics
        </ThemeProvider>
      </ApplicationProvider>
    </AuthProvider>
  </BrowserRouter>
</StrictMode>
```

### 4.3 Data Flow: Swipe â†’ Match â†’ Chat

```
Student swipes RIGHT on offer
  â”‚
  â”œâ”€â”€ INSERT student_swipes (student_id, offer_id, 'right')
  â”‚
  â”œâ”€â”€ DB Trigger: on_student_swipe_match
  â”‚     â””â”€â”€ SELECT company_swipes WHERE student_id AND direction='right'
  â”‚           â”œâ”€â”€ [Company already swiped right] â†’ INSERT matches â†’ Realtime event
  â”‚           â””â”€â”€ [No company swipe yet]         â†’ Wait
  â”‚
  â”œâ”€â”€ (Later) Company swipes RIGHT on student
  â”‚     â”œâ”€â”€ INSERT company_swipes (company_id, student_id, 'right')
  â”‚     â””â”€â”€ DB Trigger: on_company_swipe_match
  â”‚           â””â”€â”€ SELECT student_swipes WHERE student_id AND direction='right'
  â”‚                 â””â”€â”€ [Student already swiped right] â†’ INSERT matches â†’ Realtime event
  â”‚
  â””â”€â”€ Match created â†’ useMatchListener fires â†’ MatchModal displayed
        â””â”€â”€ "Send a Message" â†’ Navigate to /chat/:matchId â†’ WebSocket subscription
```

### 4.4 AI Matching Pipeline

```
Student saves profile (bio, skills, headline)
  â”‚
  â””â”€â”€ generate-embedding Edge Function
        â”œâ”€â”€ HuggingFace: all-MiniLM-L6-v2 â†’ 384-dim vector
        â””â”€â”€ UPDATE students SET embedding = [...]

Company creates offer (title, description, skills)
  â”‚
  â””â”€â”€ generate-embedding Edge Function
        â”œâ”€â”€ HuggingFace: all-MiniLM-L6-v2 â†’ 384-dim vector
        â””â”€â”€ UPDATE offers SET embedding = [...]

Student opens swipe page
  â”‚
  â””â”€â”€ get-matched-jobs Edge Function
        â”œâ”€â”€ [Has embedding?] â†’ RPC match_jobs_for_student
        â”‚     â””â”€â”€ SELECT offers ORDER BY cosine_similarity DESC
        â””â”€â”€ [No embedding]  â†’ Fallback: recent active offers
```

---

## 5. Project Structure

```
matchop/
â”œâ”€â”€ .env                          # Environment variables (git-ignored)
â”œâ”€â”€ .env.local                    # Local override (git-ignored)
â”œâ”€â”€ .gitignore
â”œâ”€â”€ index.html                    # SPA entry point (meta tags, fonts, OG tags)
â”œâ”€â”€ package.json                  # Dependencies & scripts
â”œâ”€â”€ vite.config.js                # Build config (chunk splitting, aliases)
â”œâ”€â”€ vitest.config.js              # Test config (jsdom, coverage)
â”œâ”€â”€ vercel.json                   # Vercel SPA rewrites
â”œâ”€â”€ eslint.config.js              # ESLint flat config
â”œâ”€â”€ LICENSE                       # MIT License
â”‚
â”œâ”€â”€ public/                       # Static assets
â”‚   â”œâ”€â”€ favicon.svg               # App favicon
â”‚   â””â”€â”€ founder.jpg               # Founder photo
â”‚
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ main.jsx                  # App entry: provider hierarchy + env debug
â”‚   â”œâ”€â”€ App.jsx                   # Root component: routes + layout
â”‚   â”œâ”€â”€ App.css                   # (Legacy Vite boilerplate)
â”‚   â”œâ”€â”€ index.css                 # Design system (892 lines)
â”‚   â”‚
â”‚   â”œâ”€â”€ assets/
â”‚   â”‚   â””â”€â”€ react.svg             # React logo asset
â”‚   â”‚
â”‚   â”œâ”€â”€ components/               # 36 reusable UI components
â”‚   â”‚   â”œâ”€â”€ Navbar.jsx + .css     # Top nav (role-based, hamburger, lang, theme)
â”‚   â”‚   â”œâ”€â”€ SwipeCard.jsx + .css  # Draggable job card (Framer Motion)
â”‚   â”‚   â”œâ”€â”€ MatchModal.jsx + .css # Match celebration (confetti)
â”‚   â”‚   â”œâ”€â”€ OfferDetailModal.jsx + .css  # Full job detail view
â”‚   â”‚   â”œâ”€â”€ FilterPanel.jsx + .css       # Swipe deck filters
â”‚   â”‚   â”œâ”€â”€ ChatBubble.jsx + .css        # Chat message bubble
â”‚   â”‚   â”œâ”€â”€ RouteGuards.jsx       # ProtectedRoute, PublicRoute, AdminRoute
â”‚   â”‚   â”œâ”€â”€ ErrorBoundary.jsx     # Catch render errors
â”‚   â”‚   â”œâ”€â”€ Footer.jsx            # Site footer
â”‚   â”‚   â”œâ”€â”€ Logo.jsx + .css       # Animated brand logo
â”‚   â”‚   â”œâ”€â”€ ScrollToTop.jsx       # Scroll reset on navigation
â”‚   â”‚   â”œâ”€â”€ DiagnosticHelper.jsx  # Debug overlay
â”‚   â”‚   â”œâ”€â”€ SkeletonLoader.jsx + .css    # Content loading skeleton
â”‚   â”‚   â”œâ”€â”€ VerificationBadge.jsx + .css # Email/LinkedIn/manual badge
â”‚   â”‚   â”œâ”€â”€ ApplicationToast.jsx + .css  # Application sent toast
â”‚   â”‚   â”œâ”€â”€ AuthToast.jsx + .css         # Auth event toasts
â”‚   â”‚   â”œâ”€â”€ ErrorToast.jsx + .css        # Error notification
â”‚   â”‚   â”œâ”€â”€ MatchToast.jsx + .css        # Match toast notification
â”‚   â”‚   â”œâ”€â”€ ReportModal.jsx + .css       # Report user modal
â”‚   â”‚   â”œâ”€â”€ BlockConfirmModal.jsx        # Block confirmation dialog
â”‚   â”‚   â”œâ”€â”€ ThemeToggle.css              # Theme toggle styles
â”‚   â”‚   â”‚
â”‚   â”‚   â””â”€â”€ forms/                # Form components
â”‚   â”‚       â”œâ”€â”€ FormComponents.jsx + .css
â”‚   â”‚       â”œâ”€â”€ FormEducationSelector.jsx
â”‚   â”‚       â”œâ”€â”€ FormLocationSelector.jsx
â”‚   â”‚       â”œâ”€â”€ SuggestionInput.jsx + .css
â”‚   â”‚
â”‚   â”œâ”€â”€ context/                  # React Context providers
â”‚   â”‚   â”œâ”€â”€ AuthContext.jsx       # Auth state, signUp, signIn, signOut, profile
â”‚   â”‚   â”œâ”€â”€ ApplicationContext.jsx # Job application tracking (localStorage)
â”‚   â”‚   â””â”€â”€ ThemeContext.jsx      # Dark/light/system theme
â”‚   â”‚
â”‚   â”œâ”€â”€ hooks/                    # Custom React hooks (14 total)
â”‚   â”‚   â”œâ”€â”€ index.js              # Barrel export
â”‚   â”‚   â”œâ”€â”€ useJobOffers.js       # Fetch & swipe on job offers
â”‚   â”‚   â”œâ”€â”€ useMatches.js         # Match data + swipe history
â”‚   â”‚   â”œâ”€â”€ useMatchListener.js   # Realtime match subscription
â”‚   â”‚   â”œâ”€â”€ useMessages.js        # Chat messages CRUD + realtime
â”‚   â”‚   â”œâ”€â”€ useCandidates.js      # Company's candidate list
â”‚   â”‚   â”œâ”€â”€ useExternalJobs.js    # External jobs (paginated, filtered)
â”‚   â”‚   â”œâ”€â”€ useGlobalOffers.js    # Global offers listing
â”‚   â”‚   â”œâ”€â”€ useStudentProfile.js  # Student profile CRUD + embedding
â”‚   â”‚   â”œâ”€â”€ useImageUpload.js     # Avatar upload to Storage
â”‚   â”‚   â”œâ”€â”€ useCVUpload.js        # CV upload to Storage
â”‚   â”‚   â”œâ”€â”€ useBlocking.js        # Block/unblock user
â”‚   â”‚   â”œâ”€â”€ useReporting.js       # Report user
â”‚   â”‚   â””â”€â”€ useLoadingError.js    # Loading/error state helper
â”‚   â”‚
â”‚   â”œâ”€â”€ pages/                    # Route page components
â”‚   â”‚   â”œâ”€â”€ Landing.jsx + .css    # Public homepage
â”‚   â”‚   â”œâ”€â”€ ForgotPassword.jsx    # Password reset request
â”‚   â”‚   â”œâ”€â”€ ResetPassword.jsx     # Password reset confirm
â”‚   â”‚   â”œâ”€â”€ About.jsx             # About page
â”‚   â”‚   â”œâ”€â”€ Blog.jsx              # Blog page
â”‚   â”‚   â”œâ”€â”€ Contact.jsx           # Contact page
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ student/              # Student pages (8 components)
â”‚   â”‚   â”‚   â”œâ”€â”€ StudentSignup.jsx + .css
â”‚   â”‚   â”‚   â”œâ”€â”€ StudentLogin.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ StudentProfile.jsx + .css
â”‚   â”‚   â”‚   â”œâ”€â”€ StudentSwipe.jsx + .css
â”‚   â”‚   â”‚   â”œâ”€â”€ StudentMatches.jsx + .css
â”‚   â”‚   â”‚   â”œâ”€â”€ StudentChat.jsx + .css
â”‚   â”‚   â”‚   â”œâ”€â”€ GlobalJobs.jsx + .css
â”‚   â”‚   â”‚   â””â”€â”€ GlobalOffers.jsx + .css
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ company/              # Company pages (7 components)
â”‚   â”‚   â”‚   â”œâ”€â”€ CompanySignup.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ CompanyLogin.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ CompanyProfile.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ PostOffer.jsx + .css
â”‚   â”‚   â”‚   â”œâ”€â”€ ViewCandidates.jsx + .css
â”‚   â”‚   â”‚   â”œâ”€â”€ CompanyMatches.jsx
â”‚   â”‚   â”‚   â””â”€â”€ CompanyChat.jsx
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ admin/                # Admin pages (7 components)
â”‚   â”‚   â”‚   â”œâ”€â”€ Admin.css
â”‚   â”‚   â”‚   â”œâ”€â”€ AdminDashboard.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ AdminUsers.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ AdminOffers.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ AdminCompanies.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ AdminReports.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ AdminAnalytics.jsx
â”‚   â”‚   â”‚   â””â”€â”€ AdminSettings.jsx
â”‚   â”‚   â”‚
â”‚   â”‚   â””â”€â”€ legal/                # Legal pages
â”‚   â”‚       â”œâ”€â”€ Legal.css
â”‚   â”‚       â”œâ”€â”€ TermsOfService.jsx
â”‚   â”‚       â”œâ”€â”€ PrivacyPolicy.jsx
â”‚   â”‚       â”œâ”€â”€ Terms.jsx
â”‚   â”‚       â”œâ”€â”€ Privacy.jsx
â”‚   â”‚       â””â”€â”€ Cookies.jsx
â”‚   â”‚
â”‚   â”œâ”€â”€ lib/                      # Library utilities
â”‚   â”‚   â”œâ”€â”€ supabase.js           # Supabase client init
â”‚   â”‚   â”œâ”€â”€ i18n.js               # i18next config (en/fr)
â”‚   â”‚   â”œâ”€â”€ validation.js         # Password, email, name validation + location data
â”‚   â”‚   â”œâ”€â”€ verification.js       # LinkedIn/email verification
â”‚   â”‚   â”œâ”€â”€ spamDetection.js      # Multi-tier spam detection
â”‚   â”‚   â”œâ”€â”€ email.js              # Email stub (EmailJS removed)
â”‚   â”‚   â”œâ”€â”€ storage.js            # Supabase storage helpers
â”‚   â”‚   â”œâ”€â”€ spamDetection.test.js # Spam detection tests
â”‚   â”‚   â””â”€â”€ verification.test.js  # Verification tests
â”‚   â”‚
â”‚   â”œâ”€â”€ data/                     # Static datasets
â”‚   â”‚   â”œâ”€â”€ companies.js          # 87 Tunisian companies (autocomplete)
â”‚   â”‚   â”œâ”€â”€ jobTitles.js          # Job title suggestions
â”‚   â”‚   â””â”€â”€ skills.js             # Skill suggestions
â”‚   â”‚
â”‚   â”œâ”€â”€ locales/                  # Translation files
â”‚   â”‚   â”œâ”€â”€ en.json               # English (~160 keys)
â”‚   â”‚   â””â”€â”€ fr.json               # French (~160 keys)
â”‚   â”‚
â”‚   â”œâ”€â”€ types/
â”‚   â”‚   â””â”€â”€ index.js              # Type definitions / constants
â”‚   â”‚
â”‚   â”œâ”€â”€ utils/
â”‚   â”‚   â”œâ”€â”€ profileUtils.js       # PDF export, share link, clipboard
â”‚   â”‚   â””â”€â”€ smartScheduling.js    # Date detection + Google Calendar
â”‚   â”‚
â”‚   â””â”€â”€ test/
â”‚       â””â”€â”€ setup.js              # Vitest setup file
â”‚
â”œâ”€â”€ database/                     # SQL migration & setup files (45 files)
â”‚   â”œâ”€â”€ 000_canonical_rls.sql     # Authoritative RLS policy file
â”‚   â”œâ”€â”€ schema.sql                # V1 schema
â”‚   â”œâ”€â”€ refactor_v2.sql           # V2 schema (current)
â”‚   â”œâ”€â”€ matching_engine.sql       # V3 matching (PostGIS + skills)
â”‚   â”œâ”€â”€ report_block_system.sql   # Report & block tables
â”‚   â”œâ”€â”€ create_external_jobs.sql  # External jobs table
â”‚   â”œâ”€â”€ storage.sql               # Storage bucket setup
â”‚   â”œâ”€â”€ admin_setup.sql           # Admin role tables
â”‚   â”œâ”€â”€ seed_v3.sql               # Seed data
â”‚   â””â”€â”€ ...                       # Various fix/migration files
â”‚
â”œâ”€â”€ supabase/
â”‚   â”œâ”€â”€ functions/                # Edge Functions (6 Deno functions)
â”‚   â”‚   â”œâ”€â”€ ai-job-description/index.ts
â”‚   â”‚   â”œâ”€â”€ ai-profile-polisher/index.ts
â”‚   â”‚   â”œâ”€â”€ generate-embedding/index.ts
â”‚   â”‚   â”œâ”€â”€ get-matched-jobs/index.ts
â”‚   â”‚   â”œâ”€â”€ match-recommendations/index.ts
â”‚   â”‚   â””â”€â”€ suggest-icebreakers/index.ts
â”‚   â”‚
â”‚   â””â”€â”€ migrations/               # Supabase-managed migrations
â”‚       â”œâ”€â”€ 20251222010100_vector_matching.sql
â”‚       â”œâ”€â”€ 20251222010200_external_jobs_rls.sql
â”‚       â”œâ”€â”€ 20260213010100_partner_ingest_model.sql
â”‚       â”œâ”€â”€ 20260219005000_function_search_path_hardening.sql
â”‚       â””â”€â”€ 20260219010100_public_schema_hardening.sql
â”‚
â””â”€â”€ scripts/
    â”œâ”€â”€ run_migration.js          # Migration runner
    â””â”€â”€ crawler/                  # Job aggregator
        â”œâ”€â”€ kernel.js             # Main crawler orchestrator
        â”œâ”€â”€ config.js             # Crawler configuration
        â”œâ”€â”€ scrapestack-client.js # Scrapestack API client
        â”œâ”€â”€ cleanup-dead-links.js # Dead link remover
        â””â”€â”€ scrapers/             # Site-specific scrapers
            â”œâ”€â”€ index.js
            â”œâ”€â”€ linkedin.js
            â”œâ”€â”€ tanitjobs.js
            â”œâ”€â”€ keejobs.js
            â”œâ”€â”€ wuzzuf.js
            â””â”€â”€ bayt.js
```

---

## 6. Database Design

### 6.1 PostgreSQL Extensions

| Extension | Purpose |
|-----------|---------|
| `uuid-ossp` | UUID generation (`uuid_generate_v4()`) |
| `pgvector` | 384-dimensional vector embeddings for semantic similarity |
| `PostGIS` | Geospatial queries (distance calculation, geofencing) |
| `pg_trgm` | Trigram-based text similarity for fuzzy matching |

### 6.2 Custom Enums

```sql
CREATE TYPE user_role AS ENUM ('student', 'company', 'admin');
CREATE TYPE offer_status AS ENUM ('active', 'closed', 'draft');
CREATE TYPE match_status AS ENUM ('matched', 'accepted', 'rejected', 'archived');
```

### 6.3 Entity-Relationship Diagram

```
AUTH_USERS â”€â”€1:1â”€â”€ PROFILES â”€â”€1:0..1â”€â”€ STUDENTS
                      â”‚                     â”‚
                      â”œâ”€â”€1:0..1â”€â”€ COMPANIES  â”œâ”€â”€1:Nâ”€â”€ EXPERIENCES
                      â”‚              â”‚       â”œâ”€â”€1:Nâ”€â”€ STUDENT_EDUCATION
                      â”œâ”€â”€1:Nâ”€â”€ MESSAGES      â”œâ”€â”€1:Nâ”€â”€ STUDENT_SWIPES
                      â”œâ”€â”€1:Nâ”€â”€ BLOCKED_USERS â””â”€â”€1:Nâ”€â”€ MATCHES
                      â””â”€â”€1:Nâ”€â”€ REPORTED_USERS
                                     â”‚
                   COMPANIES â”€â”€1:Nâ”€â”€ OFFERS â”€â”€1:Nâ”€â”€ STUDENT_SWIPES
                      â”‚                â”‚
                      â”œâ”€â”€1:Nâ”€â”€ COMPANY_SWIPES
                      â””â”€â”€1:Nâ”€â”€ MATCHES

                   MATCHES â”€â”€1:Nâ”€â”€ MESSAGES

                   EXTERNAL_JOBS (standalone, populated by crawler)
```

### 6.4 Table Definitions

#### `profiles` â€” Central user identity
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, FK â†’ `auth.users(id)` ON DELETE CASCADE |
| `role` | `user_role` | NOT NULL (`'student'`, `'company'`, `'admin'`) |
| `email` | TEXT | NOT NULL |
| `verified` | BOOLEAN | DEFAULT FALSE |
| `verification_method` | TEXT | `'email'`, `'linkedin'`, `'manual'`, NULL |
| `verification_data` | JSONB | LinkedIn URL, etc. |
| `verified_at` | TIMESTAMPTZ | NULL |
| `elo_score` | INT | DEFAULT 1000 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `students` â€” Student-specific profile data
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, FK â†’ `profiles(id)` ON DELETE CASCADE |
| `display_name` | TEXT | |
| `bio` | TEXT | |
| `location` | TEXT | "Governorate, City" format |
| `skills` | TEXT[] | DEFAULT `'{}'` |
| `avatar_url` | TEXT | |
| `headline` | TEXT | |
| `linkedin_url` | TEXT | |
| `github_url` | TEXT | |
| `portfolio_url` | TEXT | |
| `behance_url` | TEXT | |
| `cv_url` | TEXT | |
| `open_to_work` | BOOLEAN | DEFAULT TRUE |
| `embedding` | vector(384) | For semantic matching |
| `location_point` | GEOGRAPHY(Point) | For geospatial queries |

#### `companies` â€” Company-specific profile data
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, FK â†’ `profiles(id)` ON DELETE CASCADE |
| `company_name` | TEXT | |
| `industry` | TEXT | |
| `website` | TEXT | |
| `description` | TEXT | |
| `logo_url` | TEXT | |
| `location` | TEXT | |
| `contact_email` | TEXT | |
| `size` | TEXT | |
| `embedding` | vector(384) | |
| `location_point` | GEOGRAPHY(Point) | |

#### `offers` â€” Job offers posted by companies
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` |
| `company_id` | UUID | FK â†’ `companies(id)` ON DELETE CASCADE |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | |
| `location` | TEXT | |
| `type` | TEXT | `'internship'`, `'full-time'`, `'part-time'`, `'contract'` |
| `salary_range` | TEXT | |
| `req_skills` | TEXT[] | DEFAULT `'{}'` |
| `requirements` | TEXT[] | |
| `status` | `offer_status` | DEFAULT `'active'` |
| `embedding` | vector(384) | |
| `location_point` | GEOGRAPHY(Point) | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `student_swipes` â€” Student actions on job offers
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `student_id` | UUID | FK â†’ `students(id)`, composite PK part |
| `offer_id` | UUID | FK â†’ `offers(id)`, composite PK part |
| `direction` | TEXT | `'left'`, `'right'` |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(`student_id`, `offer_id`) |

#### `company_swipes` â€” Company actions on candidates
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `company_id` | UUID | FK â†’ `companies(id)` |
| `student_id` | UUID | FK â†’ `students(id)` |
| `offer_id` | UUID | FK â†’ `offers(id)` |
| `direction` | TEXT | `'left'`, `'right'` |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(`company_id`, `student_id`, `offer_id`) |

#### `matches` â€” Confirmed mutual interest
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` |
| `student_id` | UUID | FK â†’ `students(id)` |
| `offer_id` | UUID | FK â†’ `offers(id)` |
| `company_id` | UUID | FK â†’ `companies(id)` |
| `status` | `match_status` | DEFAULT `'matched'` |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(`student_id`, `offer_id`) |

#### `messages` â€” Chat messages within matches
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` |
| `match_id` | UUID | FK â†’ `matches(id)` ON DELETE CASCADE |
| `sender_id` | UUID | FK â†’ `profiles(id)` |
| `content` | TEXT | NOT NULL |
| `is_read` | BOOLEAN | DEFAULT FALSE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `experiences` â€” Student work experience
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `student_id` | UUID | FK â†’ `students(id)` |
| `company_name` | TEXT | |
| `role` | TEXT | |
| `description` | TEXT | |
| `start_date` | DATE | |
| `end_date` | DATE | NULL for current |
| `is_current` | BOOLEAN | |

#### `student_education` â€” Student education history
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `student_id` | UUID | FK â†’ `students(id)` |
| `institution` | TEXT | |
| `degree` | TEXT | |
| `field_of_study` | TEXT | |
| `start_date` | DATE | |
| `end_date` | DATE | |
| `is_current` | BOOLEAN | |

#### `external_jobs` â€” Crawler-aggregated jobs
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` |
| `source_website` | TEXT | |
| `original_url` | TEXT | UNIQUE |
| `title` | TEXT | |
| `company_name` | TEXT | |
| `location` | TEXT | |
| `description` | TEXT | |
| `job_type` | TEXT | |
| `posted_at` | TIMESTAMPTZ | |
| `tags` | TEXT[] | |
| `logo_url` | TEXT | |
| `contact_email` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `blocked_users` â€” User blocking
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `blocker_id` | UUID | FK â†’ `profiles(id)` |
| `blocked_id` | UUID | FK â†’ `profiles(id)` |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(`blocker_id`, `blocked_id`) |

#### `reported_users` â€” User reports
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `reporter_id` | UUID | FK â†’ `profiles(id)` |
| `reported_id` | UUID | FK â†’ `profiles(id)` |
| `reason` | TEXT | `'spam'`, `'fake_profile'`, `'harassment'`, `'inappropriate_content'`, `'other'` |
| `details` | TEXT | Max 500 chars |
| `status` | TEXT | `'pending'`, `'reviewed'`, `'dismissed'`, `'action_taken'` |
| `reviewed_by` | UUID | FK â†’ `profiles(id)` |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(`reporter_id`, `reported_id`) |

### 6.5 Database Functions

| Function | Purpose | Type |
|----------|---------|------|
| `calculate_match_score(student_uuid, offer_uuid)` | 70% skill overlap + 30% location match â†’ 0-100 score | PLPGSQL |
| `get_student_feed(student_uuid)` | Returns offers sorted by match score, excluding already-swiped | PLPGSQL |
| `handle_new_match()` | Trigger function: checks cross-swipe and creates match | PLPGSQL |
| `match_jobs_for_student(embedding, excluded_ids, count)` | pgvector cosine similarity search on offers | PLPGSQL |
| `recommend_matches_rpc(student_id, limit, offset, distance)` | PostGIS + skills + recency composite scoring | PLPGSQL SECURITY DEFINER |
| `get_distance_km(point1, point2)` | PostGIS distance in kilometers | PLPGSQL |
| `get_skill_score(student_skills, offer_skills)` | Array intersection ratio | PLPGSQL |
| `get_user_report_count(user_id)` | Count pending+reviewed reports | PLPGSQL SECURITY DEFINER |
| `is_user_blocked(checker_id, target_id)` | Check if a user is blocked | PLPGSQL SECURITY DEFINER |
| `update_updated_at()` | Generic trigger: sets `updated_at = NOW()` | PLPGSQL |

### 6.6 Database Triggers

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| `on_student_swipe_match` | `student_swipes` | AFTER INSERT | Check if company already swiped right â†’ create match |
| `on_company_swipe_match` | `company_swipes` | AFTER INSERT | Check if student already swiped right â†’ create match |
| `update_profiles_updated_at` | `profiles` | BEFORE UPDATE | `update_updated_at()` |
| `update_offers_updated_at` | `offers` | BEFORE UPDATE | `update_updated_at()` |

### 6.7 Indexes

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| `students` | `students_embedding_idx` | HNSW (vector_cosine_ops) | Fast semantic similarity search |
| `offers` | `offers_embedding_idx` | HNSW (vector_cosine_ops) | Fast semantic similarity search |
| `students` | `students_location_idx` | GiST | Geospatial distance queries |
| `offers` | `offers_location_idx` | GiST | Geospatial distance queries |
| `offers` | `idx_offers_company` | B-tree | Company offer lookups |
| `offers` | `idx_offers_status` | B-tree | Active offer filtering |
| `student_swipes` | `idx_swipes_student` | B-tree | Student's swipe history |
| `student_swipes` | `idx_swipes_offer` | B-tree | Offer's swipe count |
| `matches` | `idx_matches_student` | B-tree | Student's matches |
| `matches` | `idx_matches_company` | B-tree | Company's matches |
| `messages` | `idx_messages_match` | B-tree | Chat history lookup |
| `messages` | `idx_messages_created` | B-tree | Chronological ordering |
| `students.skills` | GIN | Full | Skill array containment queries |
| `offers.req_skills` | GIN | Full | Skill array containment queries |

---

## 7. Row Level Security (RLS) Policies

All tables have RLS enabled. The authoritative policy file is `database/000_canonical_rls.sql`.

### Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | All authenticated | Own (`id = auth.uid()`) | Own | â€” |
| `students` | All authenticated | Own | Own | â€” |
| `companies` | All authenticated | Own | Own | â€” |
| `offers` | Active OR own company | Own company | Own company | Own company |
| `student_swipes` | Own student | Own student | â€” | â€” |
| `company_swipes` | Own company | Own company | â€” | â€” |
| `matches` | Participant (student or company) | Participant | Participant | â€” |
| `messages` | Match member (via subquery) | Match member + own sender_id | Match member | â€” |
| `experiences` | All authenticated | Own student | Own student | Own student |
| `student_education` | All authenticated | Own student | Own student | Own student |
| `external_jobs` | All (authenticated + anon) | â€” | â€” | â€” |
| `blocked_users` | Own blocker | Own blocker | â€” | Own blocker |
| `reported_users` | Own reporter | Own reporter | â€” | â€” |

### Storage Policies (Avatars Bucket)

| Operation | Policy |
|-----------|--------|
| SELECT | Public (anyone can view) |
| INSERT | User can upload to own folder (`auth.uid() = folder name`) |
| UPDATE | Own folder only |
| DELETE | Own folder only |

---

## 8. Authentication System

### 8.1 Auth Flow

1. **Sign Up**: `supabase.auth.signUp()` â†’ creates `auth.users` record â†’ inserts `profiles` row + `students`/`companies` row.
2. **Email Verification**: If required, defers profile creation until email confirmed. On confirmation, `onAuthStateChange` fires and creates profile.
3. **Sign In**: `supabase.auth.signInWithPassword()` â†’ JWT stored in `localStorage` (key: `matchop-auth-token`).
4. **Session Management**: Auto-refresh via `autoRefreshToken: true`. `detectSessionInUrl: true` handles OAuth/magic link redirects.
5. **Profile Fetch**: On every auth state change, fetches `profiles` with `students(*)` or `companies(*)` join.
6. **Auto-Profile Creation**: If authenticated user has no profile row (edge case), auto-creates from `user_metadata`.
7. **Email Auto-Verification**: When `user.email_confirmed_at` is set, auto-marks profile as `verified: true`.

### 8.2 Auth Context API

```javascript
const {
  user,                    // Supabase auth user object
  profile,                 // profiles + students/companies join
  isLoggedIn,              // !!user
  isEmailVerified,         // user.email_confirmed_at exists
  isStudent,               // profile.role === 'student'
  isCompany,               // profile.role === 'company'
  isLoading,               // Auth initialization in progress
  authError,               // Last auth error
  signUp,                  // (email, password, userType, userData)
  signIn,                  // (email, password)
  signOut,                 // ()
  resendVerificationEmail, // (email)
  resetPassword,           // (email)
  updateProfile,           // (updates)
  refreshProfile,          // () â†’ re-fetch profile
  clearError,              // () â†’ clear authError
} = useAuth()
```

### 8.3 Password Policy

| Rule | Requirement |
|------|-------------|
| Minimum length | 8 characters |
| Uppercase | At least 1 uppercase letter |
| Lowercase | At least 1 lowercase letter |
| Number | At least 1 digit |
| Special character | At least 1 special character |
| Strength scoring | 0-100 (Weak/Fair/Good/Strong) |

---

## 9. User Roles & Permissions

### 9.1 Role Definitions

| Role | Description | Route Prefix | Guard |
|------|-------------|-------------|-------|
| `student` | Job seeker, university student, recent graduate | `/student/*` | `ProtectedRoute requiredType="student"` |
| `company` | Employer, recruiter, HR manager | `/company/*` | `ProtectedRoute requiredType="company"` |
| `admin` | Platform administrator | `/admin/*` | `AdminRoute` |

### 9.2 Feature Access Matrix

| Feature | Student | Company | Admin |
|---------|---------|---------|-------|
| Browse offers (swipe) | âœ… | â€” | â€” |
| Apply to jobs | âœ… | â€” | â€” |
| View matches | âœ… | âœ… | â€” |
| Chat with match | âœ… | âœ… | â€” |
| Edit own profile | âœ… | âœ… | â€” |
| Upload avatar/CV | âœ… | âœ… | â€” |
| Browse external jobs | âœ… | â€” | â€” |
| Post offer | â€” | âœ… | â€” |
| AI job description | â€” | âœ… | â€” |
| View candidates | â€” | âœ… | â€” |
| Swipe on candidates | â€” | âœ… | â€” |
| Report user | âœ… | âœ… | â€” |
| Block user | âœ… | âœ… | â€” |
| Export PDF CV | âœ… | â€” | â€” |
| AI bio polisher | âœ… | â€” | â€” |
| Manage users | â€” | â€” | âœ… |
| Manage offers | â€” | â€” | âœ… |
| Manage companies | â€” | â€” | âœ… |
| Review reports | â€” | â€” | âœ… |
| View analytics | â€” | â€” | âœ… |
| Platform settings | â€” | â€” | âœ… |

---

## 10. Frontend Application

### 10.1 Build Configuration

**Vite** (`vite.config.js`):
- Plugin: `@vitejs/plugin-react`
- Build target: `es2020`
- Source maps: disabled (production)
- CSS code splitting: enabled
- Assets inline limit: 4096 bytes
- Chunk size warning: 500 KB

**Vendor chunk splitting** (manual chunks):

| Chunk Name | Packages |
|------------|----------|
| `vendor-react` | `react`, `react-dom` |
| `vendor-router` | `react-router-dom` |
| `vendor-supabase` | `@supabase/supabase-js` |
| `vendor-i18n` | `i18next`, `react-i18next` |
| `vendor-icons` | `lucide-react` |

**Output naming**:
- JS chunks: `assets/js/[name]-[hash].js`
- Assets: `assets/[ext]/[name]-[hash].[ext]`

### 10.2 Code Splitting

28 route components are lazy-loaded via `React.lazy()`:
- All student pages (8)
- All company pages (7)
- All admin pages (7)
- Landing, ForgotPassword, ResetPassword
- Legal pages (TermsOfService, PrivacyPolicy)

Eagerly loaded: Navbar, Footer, RouteGuards, ScrollToTop, DiagnosticHelper, AuthToast, About, Blog, Contact, Cookies.

### 10.3 Entry Point (`main.jsx`)

- Initializes i18n before rendering
- Wraps `<App />` in provider hierarchy (see Â§4.2)
- Logs environment debug info on mount (href, userAgent, platform, screen dimensions, devicePixelRatio, cookies, localStorage)

### 10.4 App Component (`App.jsx`)

- No forced startup splash; initial loading UI is shown only when route/auth state is actually pending
- Parses URL hash for auth events (email verification, password recovery, magic links, errors)
- `SmartLanding`: redirects authenticated users to their role dashboard
- Renders: `ScrollToTop` + `Navbar` + `<Suspense>` routes + `Footer` + Vercel analytics

---

## 11. AI & Machine Learning Features

### 11.1 Semantic Matching Pipeline

**Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions) via HuggingFace Inference API.

**Flow**:
1. Student saves profile â†’ `generate-embedding` edge function â†’ stores 384-dim vector in `students.embedding`
2. Company creates offer â†’ `generate-embedding` edge function â†’ stores 384-dim vector in `offers.embedding`
3. Student opens swipe â†’ `get-matched-jobs` edge function â†’ `match_jobs_for_student` RPC â†’ cosine similarity ranking
4. Fallback: if no embedding, returns recent active offers

**Vector Index**: HNSW with `vector_cosine_ops` for O(log n) approximate nearest neighbor search.

**Fallback Embedding**: When HuggingFace is unavailable, a deterministic hash-based 384-dim vector is generated (character + word hashing, normalized to unit vector). Not semantically meaningful but keeps the system functional.

### 11.2 Composite Matching Algorithm (`recommend_matches_rpc`)

Three-factor composite score:

| Factor | Weight | Calculation |
|--------|--------|-------------|
| Skill Match | 60% | Array intersection ratio (`matched_skills / total_required_skills`) |
| Distance | 30% | `MAX(0, 1 - distance_km / max_distance_km)` via PostGIS `ST_Distance` |
| Recency | 10% | `1 / (1 + days_since_posted)` â€” 7-day decay |

Excludes already-swiped offers and offers beyond `max_distance_km` (default 100 km).

### 11.3 AI Job Description Generator

**Model**: OpenRouter â†’ `meta-llama/llama-3.2-3b-instruct:free`

**Input**: Job title (required), department, position type, tone (default: professional).

**Output**: Structured markdown job description (< 300 words) with:
- Opening paragraph (2-3 sentences)
- Key Responsibilities (4-5 bullets)
- What You'll Learn (3-4 bullets)
- Qualifications (3-4 bullets)

**Max tokens**: 800, temperature: 0.7.

### 11.4 AI Profile Polisher

**Model**: Same as above.

**Input**: Student bio (min 10 chars), skills array, headline.

**Output**: Rewritten bio (150-250 words), professional tone, action-oriented, first person.

**Max tokens**: 500, temperature: 0.7.

### 11.5 AI Icebreaker Suggestions

**Model**: Same as above.

**Input**: Match ID â†’ fetches student name/skills, offer title, company name.

**Output**: 3 conversation starter suggestions (< 150 chars each, JSON array).

**Security**: Verifies requesting user is a participant of the match.

**Fallback**: 3 hardcoded template icebreakers if AI parsing fails.

---

## 12. Job Crawler System

### 12.1 Architecture

The crawler (`scripts/crawler/kernel.js`) is a Node.js script that scrapes job listings from 5 MENA job boards and 2 RSS feeds, verifies links, and saves them to the `external_jobs` Supabase table.

### 12.2 Data Sources

| Source | Type | Region | Scraper File |
|--------|------|--------|-------------|
| LinkedIn | HTML scraper | Global | `scrapers/linkedin.js` |
| TanitJobs | HTML scraper | Tunisia | `scrapers/tanitjobs.js` |
| KeeJobs | HTML scraper | Tunisia | `scrapers/keejobs.js` |
| Wuzzuf | HTML scraper | Egypt/MENA | `scrapers/wuzzuf.js` |
| Bayt | HTML scraper | MENA | `scrapers/bayt.js` |
| WeWorkRemotely | RSS feed | Remote | Built into `kernel.js` |
| Jobspresso | RSS feed | Remote | Built into `kernel.js` |

### 12.3 Scrapestack Integration

The crawler uses the **Scrapestack API** for JavaScript rendering and anti-blocking:

| Configuration | Value |
|---------------|-------|
| Base URL | `http://api.scrapestack.com/scrape` |
| Request timeout | 30,000 ms |
| Retry attempts | 3 (exponential backoff) |
| Concurrent requests | 3 |
| JS rendering | Enabled by default |

**Per-site rate limits** (requests per minute):
- LinkedIn: 10
- TanitJobs/KeeJobs: 20
- Wuzzuf/Bayt: 15
- Default: 20

**Proxy locations**: Tunisia (`tn`), UAE (`ae`), Egypt (`eg`), US (`us` for global).

### 12.4 Link Verification

Before saving, each job undergoes validation:

1. **URL format check**: Must start with `http://` or `https://`.
2. **Blocked pattern check**: Rejects URLs containing `example.com`, `placeholder`, `test.com`, `localhost`, `fake`.
3. **HTTP verification** (30% sample): Fetches page via Scrapestack without JS rendering; scans HTML for error indicators (`404`, `page not found`, `job expired`, `no longer available`, etc.).

### 12.5 Database Storage

Jobs are upserted in chunks of 50 using `original_url` as the conflict key (`ignoreDuplicates: true`). Fields are truncated: title (255 chars), company_name (255 chars), location (255 chars), description (1000 chars).

### 12.6 Search Keywords & Locations

**Keywords**: software engineer, developer, frontend, backend, fullstack, devops, data scientist, product manager, designer, marketing, remote.

**Locations**: Tunisia, Tunis, Remote, Dubai, Cairo, MENA.

### 12.7 Running the Crawler

```bash
# Run full scrape
npm run scrape

# Clean up dead links
npm run scrape:cleanup
```

---

## 13. Real-Time Features

### 13.1 Chat Messages

The `useMessages` hook subscribes to Supabase Realtime `postgres_changes` on the `messages` table, filtered by `match_id`:

```
supabase.channel(`messages:${matchId}`)
  .on('postgres_changes', { event: 'INSERT', table: 'messages', filter: `match_id=eq.${matchId}` })
```

New messages are appended to local state in real-time. Messages include sender profile data (name, avatar) via join.

### 13.2 Match Notifications

The `useMatchListener` hook subscribes to `INSERT` events on the `matches` table, filtered by `student_id`:

```
supabase.channel(`matches:student:${userId}`)
  .on('postgres_changes', { event: 'INSERT', table: 'matches', filter: `student_id=eq.${userId}` })
```

When a new match appears, the MatchModal is triggered with celebration UI.

### 13.3 Smart Scheduling Integration

When a chat message contains a date/time reference (e.g., "Let's meet Monday at 10am"), `detectDateInMessage()` identifies it and `generateCalendarUrl()` creates a Google Calendar link with a pre-filled event.

Detected patterns:
- Day names (Mondayâ€“Sunday)
- "tomorrow", "today", "next week"
- Month+day (e.g., "Dec 25th")
- Clock times with am/pm (e.g., "2:30pm")

---

## 14. Design System & Theming

### 14.1 Overview

MatchOp uses a **custom CSS design system** (892 lines in `index.css`) built on CSS custom properties. The design language is **bento-grid glassmorphism** â€” frosted glass cards on gradient backgrounds with generous border-radius and subtle shadows.

There is **no Tailwind CSS**. Hand-written utility classes replace common Tailwind patterns.

### 14.2 Color Palette

**Brand Colors**:

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#3b82f6` | Primary actions, links, highlights |
| `--primary-hover` | `#60a5fa` | Hover state |
| `--primary-light` | `#93c5fd` | Light accent |
| `--primary-dark` | `#2563eb` | Dark accent |
| `--primary-glow` | `rgba(59, 130, 246, 0.3)` | Glow effects |

**Accent Colors**:

| Token | Value | Usage |
|-------|-------|-------|
| `--accent-teal` | `#14b8a6` | Success, positive |
| `--accent-purple` | `#a78bfa` | Premium, special |
| `--accent-rose` | `#fb7185` | Warning, attention |
| `--accent-amber` | `#fbbf24` | Gold, achievement |
| `--accent-green` | `#4ade80` | Online, active |
| `--accent-red` | `#ef4444` | Error, destructive |

### 14.3 Theme Modes

Three modes: **Light** (default), **Dark**, **System** (follows `prefers-color-scheme`).

Theme is applied via `data-theme` attribute on `<html>` and persisted in `localStorage` (key: `matchop-theme`).

**Light Mode Tokens**:

| Token | Value |
|-------|-------|
| `--bg-main` | `#f8fafc` |
| `--bento-card` | `#ffffff` |
| `--glass-base` | `rgba(255, 255, 255, 0.85)` |
| `--text-primary` | `#0f172a` |
| `--text-secondary` | `#475569` |
| `--text-muted` | `#94a3b8` |
| `--input-bg` | `#ffffff` |

**Dark Mode Tokens**:

| Token | Value |
|-------|-------|
| `--bg-main` | `#0a0a0b` |
| `--bento-card` | `#1c1c21` |
| `--glass-base` | `rgba(28, 28, 33, 0.9)` |
| `--text-primary` | `#fafafa` |
| `--text-secondary` | `#a1a1aa` |
| `--text-muted` | `#52525b` |
| `--input-bg` | `#26262d` |

### 14.4 Spacing Scale

| Token | Value |
|-------|-------|
| `--space-1` | `0.25rem` (4px) |
| `--space-2` | `0.5rem` (8px) |
| `--space-3` | `0.75rem` (12px) |
| `--space-4` | `1rem` (16px) |
| `--space-5` | `1.25rem` (20px) |
| `--space-6` | `1.5rem` (24px) |
| `--space-8` | `2rem` (32px) |
| `--space-10` | `2.5rem` (40px) |
| `--space-12` | `3rem` (48px) |
| `--space-16` | `4rem` (64px) |
| `--space-20` | `5rem` (80px) |

### 14.5 Border Radius

| Token | Value |
|-------|-------|
| `--radius-sm` | `0.5rem` |
| `--radius-md` | `0.75rem` |
| `--radius-lg` | `1rem` |
| `--radius-xl` | `1.25rem` |
| `--radius-2xl` | `1.5rem` |
| `--radius-3xl` | `1.875rem` |
| `--radius-bento` | `1.5rem` |
| `--radius-pill` | `9999px` |

### 14.6 Shadow System

| Token | Light | Dark |
|-------|-------|------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | `0 1px 2px rgba(0,0,0,0.4)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | `0 4px 12px rgba(0,0,0,0.5)` |
| `--shadow-lg` | `0 10px 30px rgba(0,0,0,0.1)` | `0 10px 30px rgba(0,0,0,0.6)` |
| `--shadow-xl` | `0 20px 50px rgba(0,0,0,0.12)` | `0 20px 50px rgba(0,0,0,0.7)` |
| `--shadow-glow` | `0 0 30px rgba(59,130,246,0.15)` | `0 0 30px rgba(59,130,246,0.2)` |

### 14.7 Animation Tokens

| Token | Value |
|-------|-------|
| `--ease-spring` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` |
| `--ease-out` | `cubic-bezier(0.215, 0.61, 0.355, 1)` |
| `--ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--duration-fast` | `150ms` |
| `--duration-normal` | `300ms` |
| `--duration-slow` | `400ms` |

**Keyframe Animations**: `fadeIn`, `fadeInUp`, `scaleIn`, `float`, `utility-spin`, `utility-pulse`.

### 14.8 Responsive Breakpoints

| Breakpoint | Target |
|------------|--------|
| `max-width: 767px` | Mobile â€” disable hover transforms, 44px touch targets, 70px navbar |
| `min-width: 640px` | Small tablets â€” 2-column grids |
| `min-width: 768px` | Tablets â€” hover effects, hide mobile elements |
| `min-width: 1024px` | Desktop â€” 3-column grids, wider container padding |

### 14.9 Typography

- **Font family**: Inter (Google Fonts, weights 300-800), with system fallback stack
- **Font loading**: Preloaded for weights 400, 600, 700; `display=swap`
- **Headings**: Responsive via `clamp()`:
  - h1: `clamp(1.75rem, 4vw, 2.5rem)`
  - h2: `clamp(1.5rem, 3.5vw, 2rem)`
  - h3: `clamp(1.25rem, 3vw, 1.5rem)`
  - h4: `clamp(1rem, 2vw, 1.25rem)`

### 14.10 Component Systems

- **Bento Cards** (`.bento-card`): Glass background, border, shadow, hover lift, overflow hidden
- **Glass Cards** (`.glass-card`): Frosted glass (`backdrop-filter: blur(20px)`), border, shadow
- **Bento Grid** (`.bento-grid`): CSS Grid with responsive columns and `--bento-gap`
- **Bento Inputs**: Pill-shaped (50px height), 16px font (prevents iOS zoom), focus glow
- **Bento Buttons**: Pill-shaped, primary/secondary/ghost variants, sm/md/lg sizes
- **Container**: Max-width 1200px, responsive padding

---

## 15. Internationalization (i18n)

### 15.1 Supported Languages

| Language | Code | Status | Direction |
|----------|------|--------|-----------|
| English | `en` | Complete (~160 keys) | LTR |
| French | `fr` | Complete (~160 keys) | LTR |
| Arabic | `ar` | Scaffolded (RTL ready, no translations) | RTL |

### 15.2 Configuration

- Library: `i18next` + `react-i18next`
- Detection: `localStorage` â†’ browser language â†’ default `'en'`
- Persistence: Saves to `localStorage` on change
- RTL: Sets `dir` attribute on `<html>` when language is `'ar'`
- Namespace: Single `translation` namespace

### 15.3 Translation Keys (Top-Level)

| Namespace | Content |
|-----------|---------|
| `common` | Loading, Error, Save, Cancel, Close, Back, Delete |
| `nav` | Discover, Matches, Global Jobs, Profile, Logout |
| `landing` | Hero title/subtitle, stats, how-it-works steps, features, CTAs |
| `auth` | Login/signup form labels, validation messages |
| `profile` | Bio, Skills, Culture, Benefits section labels |
| `swipe` | Like, Pass, SuperLike, Undo, no more offers |
| `match` | "It's a Match!", view profile, send message |
| `matches` | Your matches, chat, match date |
| `chat` | Type a message, send, delivered, read |
| `candidates` | View candidates, filter, accept, reject |
| `postJob` | Post job form labels |
| `empty` | No matches yet, keep swiping! |

### 15.4 Usage in Components

```jsx
import { useTranslation } from 'react-i18next'

function Component() {
  const { t } = useTranslation()
  return <h1>{t('landing.heroTitle')}</h1>
}
```

Language switcher in Navbar toggles between EN (ðŸ‡¬ðŸ‡§) and FR (ðŸ‡«ðŸ‡·).

---

## 16. Routing & Navigation

### 16.1 Complete Route Map

#### Public Routes (no auth required)

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `SmartLanding` | Redirects authenticated users, shows landing for guests |
| `/login` | `StudentLogin` | Student login form |
| `/signup` | `StudentSignup` | Student registration form |
| `/forgot-password` | `ForgotPassword` | Password reset request |
| `/reset-password` | `ResetPassword` | Password reset confirm |
| `/offers` | `GlobalOffers` | Public offers listing |
| `/about` | `About` | About page |
| `/blog` | `Blog` | Blog page |
| `/contact` | `Contact` | Contact page |
| `/legal/terms` | `TermsOfService` | Terms of Service |
| `/legal/privacy` | `PrivacyPolicy` | Privacy Policy |
| `/legal/cookies` | `Cookies` | Cookie Policy |

#### Student Routes (`PublicRoute` for auth pages, `ProtectedRoute requiredType="student"` for app pages)

| Path | Component | Guard | Description |
|------|-----------|-------|-------------|
| `/student/signup` | `StudentSignup` | PublicRoute | Student registration |
| `/student/login` | `StudentLogin` | PublicRoute | Student login |
| `/student/profile` | `StudentProfile` | Protected(student) | Profile editor |
| `/student/swipe` | `StudentSwipe` | Protected(student) | Job swipe deck |
| `/student/matches` | `StudentMatches` | Protected(student) | Match list |
| `/student/chat/:matchId` | `StudentChat` | Protected(student) | Chat with company |
| `/student/global-jobs` | `StudentGlobalJobs` | Protected(student) | External jobs browser |
| `/student/offers` | `GlobalOffers` | Protected(student) | All platform offers |

#### Company Routes

| Path | Component | Guard | Description |
|------|-----------|-------|-------------|
| `/company/signup` | `CompanySignup` | PublicRoute | Company registration |
| `/company/login` | `CompanyLogin` | PublicRoute | Company login |
| `/company/profile` | `CompanyProfile` | Protected(company) | Company profile |
| `/company/post-offer` | `PostOffer` | Protected(company) | Create job offer |
| `/company/candidates` | `ViewCandidates` | Protected(company) | Candidate browser |
| `/company/matches` | `CompanyMatches` | Protected(company) | Match list |
| `/company/chat/:matchId` | `CompanyChat` | Protected(company) | Chat with student |

#### Admin Routes

| Path | Component | Guard | Description |
|------|-----------|-------|-------------|
| `/admin` | `AdminDashboard` | AdminRoute | Dashboard |
| `/admin/dashboard` | `AdminDashboard` | AdminRoute | Dashboard (alias) |
| `/admin/users` | `AdminUsers` | AdminRoute | User management |
| `/admin/offers` | `AdminOffers` | AdminRoute | Offer management |
| `/admin/companies` | `AdminCompanies` | AdminRoute | Company management |
| `/admin/reports` | `AdminReports` | AdminRoute | Report moderation |
| `/admin/analytics` | `AdminAnalytics` | AdminRoute | Analytics |
| `/admin/settings` | `AdminSettings` | AdminRoute | Settings |

**Total: 38 routes** (12 public + 8 student + 7 company + 8 admin + 3 legal).

### 16.2 Route Guards

- **`ProtectedRoute`**: Shows loading spinner while auth initializes. Redirects unauthenticated users to login. Optional `requiredType` enforces role â€” mismatched roles redirected to correct dashboard. Waits for profile load before role checking.
- **`PublicRoute`**: Shows loading spinner while auth initializes. Redirects authenticated users to their role-appropriate dashboard.
- **`AdminRoute`**: Checks `profile.role === 'admin'` or `user_metadata.type === 'admin'`. Non-admins redirected to their dashboard.

### 16.3 Navigation (Navbar)

**Logged out**: Logo + Student Sign Up + Company Sign Up buttons.

**Student logged in**: Matches, Discover, Global Jobs, Profile + Logout.

**Company logged in**: Candidates, Matches, Post Job, Profile + Logout.

**All states**: Language switcher (EN/FR) + Theme toggle (Sun/Moon).

**Mobile**: Hamburger menu toggling nav link list. Minimum 44px touch targets.

---

## 17. Components Reference

### Core UI Components

| Component | Description | Key Props |
|-----------|-------------|-----------|
| `Navbar` | Top navigation with role-based links, language switcher, theme toggle, mobile hamburger | â€” |
| `SwipeCard` | Draggable Framer Motion card for job offers | `offer`, `onSwipe(direction)`, `isTop`, `onViewDetails` |
| `MatchModal` | Match celebration with confetti, dual avatars, next steps | `match`, `onClose`, `userType` |
| `OfferDetailModal` | Full job detail overlay | `offer`, `onClose` |
| `FilterPanel` | Swipe deck filter panel (work type, contract, salary, industry) | `filters`, `onFilterChange`, `onReset`, `jobCount` |
| `ChatBubble` | Chat message bubble with sender/receiver styling | `message`, `isOwn` |
| `Footer` | Site footer with brand, founder, links, legal, theme toggle | â€” |
| `Logo` | Animated MatchOp brand logo | `size`, `animated` |

### Feedback Components

| Component | Description |
|-----------|-------------|
| `ApplicationToast` | "Application sent to {company}" toast |
| `AuthToast` | Auth event feedback (verification, recovery, errors) |
| `ErrorToast` | Generic error notification |
| `MatchToast` | Match celebration mini-toast |
| `SkeletonLoader` | Content skeleton while data loads |

### Safety & Moderation Components

| Component | Description |
|-----------|-------------|
| `ReportModal` | Report user dialog (reason selection, details) |
| `BlockConfirmModal` | Block confirmation dialog |
| `VerificationBadge` | Email/LinkedIn/manual verification badge (xs/sm/md/lg) |
| `ErrorBoundary` | Catches render errors, shows fallback UI |
| `DiagnosticHelper` | Debug overlay for environment diagnostics |

### Routing Components

| Component | Description |
|-----------|-------------|
| `RouteGuards` | ProtectedRoute, PublicRoute, AdminRoute |
| `ScrollToTop` | Resets scroll position on navigation |

### Form Components (`components/forms/`)

| Component | Description |
|-----------|-------------|
| `FormComponents` | Shared form input components |
| `FormEducationSelector` | Education institution autocomplete |
| `FormLocationSelector` | Tunisian governorate + city selector |
| `SuggestionInput` | Autocomplete input with suggestion dropdown |

---

## 18. Hooks Reference

| Hook | Source Table(s) | Description | Key Returns |
|------|----------------|-------------|-------------|
| `useJobOffers` | `offers`, `companies` | Fetch active offers for student swipe deck | `offers`, `loading`, `swipe()`, `refresh()` |
| `useMatches` | `matches`, `offers`, `companies`, `student_swipes` | Match data with swipe history | `matches`, `loading`, `error` |
| `useMatchListener` | `matches` (Realtime) | WebSocket subscription for new matches | `newMatch`, `clearMatch()` |
| `useMessages` | `messages` (Realtime) | Chat messages CRUD + real-time updates | `messages`, `loading`, `sendMessage()` |
| `useCandidates` | `offers`, `student_swipes`, `students`, `company_swipes` | Candidates who swiped right on company's offers | `candidates`, `loading`, `swipeOnCandidate()` |
| `useExternalJobs` | `external_jobs` | Paginated, filtered external job browsing | `jobs`, `filters`, `page`, `totalPages`, pagination functions |
| `useGlobalOffers` | `offers` | Global offers listing | `offers`, `loading` |
| `useStudentProfile` | `students`, `experiences`, `student_education` | Full student profile CRUD + embedding generation | `profile`, `experiences`, `education`, CRUD methods, `completeness` |
| `useImageUpload` | Storage `avatars`, `students` | Avatar upload with progress | `uploading`, `upload()`, `progress` |
| `useCVUpload` | Storage (via `lib/storage.js`) | CV/resume upload | `uploading`, `upload()` |
| `useBlocking` | `blocked_users` | Block/unblock users | `blockedUsers`, `blockUser()`, `unblockUser()` |
| `useReporting` | `reported_users` | Report user with reason | `reportUser()`, `loading` |
| `useLoadingError` | â€” (utility) | Generic loading/error state | `loading`, `error`, `setLoading()`, `setError()` |

---

## 19. Pages Reference

### Landing Page
- Hero: animated gradient orb, Logo, badge, headline, subtitle, dual CTA (Student/Company), trust-first status chips (Private, Invite, Dec 2025 launch)
- How It Works: 3-step glass cards (Create Profile â†’ Swipe & Match â†’ Connect & Chat)
- For Students: 4 feature cards + signup CTA
- For Companies: 4 feature cards + candidate pipeline mockup + hiring CTA
- Final CTA: "Ready to Transform Your Career Journey?"

### Student Pages

| Page | Key Features |
|------|-------------|
| `StudentSignup` | Email, password (strength meter), full name, skills, location, terms acceptance |
| `StudentLogin` | Email, password, forgot password link, company login redirect |
| `StudentProfile` | Avatar upload, bio (AI polishing), skills editor, education CRUD, experience CRUD, certifications/projects/languages/volunteer (local-only), CV upload, profile completion %, preview modal |
| `StudentSwipe` | Card stack (2 visible), swipe gestures, Like/Pass/SuperLike/Undo buttons, FilterPanel, OfferDetailModal, MatchModal, external job handling, AI match scores |
| `StudentMatches` | Match list with company info, match date, chat link |
| `StudentChat` | Real-time chat, ChatBubble, smart scheduling detection, Google Calendar link |
| `GlobalJobs` | External jobs grid, text search, location filter, pagination (24/page), Smart Apply |
| `GlobalOffers` | All platform offers with details |

### Company Pages

| Page | Key Features |
|------|-------------|
| `CompanySignup` | Company name, industry, email, password, website, description |
| `CompanyLogin` | Email, password, student login redirect |
| `CompanyProfile` | Company info editor, logo upload |
| `PostOffer` | Two-column form, AI description generation, skill tags, salary, location type, embedding generation on submit |
| `ViewCandidates` | Candidate cards, grid/list toggle, skill/location filter, Like/Pass actions, match toast |
| `CompanyMatches` | Match list with student info, offer info, chat link |
| `CompanyChat` | Real-time chat with matched student |

### Admin Pages

| Page | Key Features |
|------|-------------|
| `AdminDashboard` | 7 stat cards, 6 quick action links, recent audit log |
| `AdminUsers` | User table with CRUD |
| `AdminOffers` | Offer management table |
| `AdminCompanies` | Company management table |
| `AdminReports` | Report review, status updates, moderation actions |
| `AdminAnalytics` | Platform analytics visualizations |
| `AdminSettings` | Platform configuration |

### Legal Pages
- `TermsOfService`, `PrivacyPolicy`, `Cookies` â€” standard legal content pages.

### Static Pages
- `About` â€” company info, mission, team
- `Blog` â€” blog posts
- `Contact` â€” contact form / info

---

## 20. Supabase Edge Functions

All 6 functions run on **Deno** in Supabase Edge Functions. They share a common pattern: CORS headers â†’ Authorization header validation â†’ Supabase client creation with user JWT â†’ business logic.

| Function | AI Provider | Input | Output | Auth |
|----------|-------------|-------|--------|------|
| `ai-job-description` | OpenRouter (Llama 3.2) | `jobTitle`, `department`, `jobType`, `tone` | Markdown job description | JWT required |
| `ai-profile-polisher` | OpenRouter (Llama 3.2) | `bio` (â‰¥10 chars), `skills[]`, `headline` | Improved bio text | JWT required |
| `generate-embedding` | HuggingFace (MiniLM-L6-v2) | `text`, `type` (`student`/`job`), `id` | Stores 384-dim vector in DB | JWT required |
| `get-matched-jobs` | â€” (database only) | Student's JWT | Ranked offers (semantic or fallback) | JWT required |
| `match-recommendations` | â€” (database only) | `limit`, `offset`, `distance` | PostGIS+skill scored offers | JWT required |
| `suggest-icebreakers` | OpenRouter (Llama 3.2) | `match_id` | 3 conversation starters (JSON) | JWT + ownership check |

### Environment Variables (Edge Functions)

| Variable | Used By |
|----------|---------|
| `SUPABASE_URL` | All functions |
| `SUPABASE_ANON_KEY` | All functions |
| `SUPABASE_SERVICE_ROLE_KEY` | `generate-embedding`, `get-matched-jobs` |
| `OPENROUTER_API_KEY` | `ai-job-description`, `ai-profile-polisher`, `suggest-icebreakers` |
| `HF_API_KEY` | `generate-embedding` (fallback: `OPENROUTER_API_KEY`) |

---

## 21. Utility Libraries

### `lib/validation.js`

| Function | Description |
|----------|-------------|
| `validatePassword(password)` | Returns `{ valid, errors[], strength (0-100) }` |
| `getPasswordStrengthLabel(strength)` | Returns label (Weak/Fair/Good/Strong) + color |
| `validateEmail(email)` | Returns boolean (regex check) |
| `validateName(name)` | Returns boolean (2-100 chars, non-empty) |
| `getAuthErrorMessage(error)` | Maps Supabase error codes to user-friendly messages |

**Exported Data**:
- `TUNISIAN_GOVERNORATES` â€” 24 Tunisian governorates
- `CITIES_BY_GOVERNORATE` â€” city arrays per governorate
- `TUNISIAN_CITIES` â€” flat array (legacy)
- `TUNISIAN_UNIVERSITIES` â€” public universities, engineering schools, private universities, ISETs

### `lib/spamDetection.js`

| Function | Description |
|----------|-------------|
| `detectSpam(message)` | Multi-tier analysis: High (block), Medium (block), Low (flag) |
| `sanitizeMessage(message)` | Trim, normalize whitespace, truncate 2000 chars |
| `checkProfileBio(bio)` | `detectSpam` + affiliate link detection |
| `isRateLimited(userId, store, max, window)` | Sliding window rate limiter (default: 5/10s) |

**Spam patterns**: URL floods, URL shorteners, money scams, spam phrases, inappropriate content, contact harvesting, repetitive characters, phone spam, WhatsApp/Telegram redirects, excessive caps, affiliate links.

### `lib/verification.js`

| Function | Description |
|----------|-------------|
| `validateLinkedInUrl(url)` | Validates LinkedIn profile/company URL format |
| `verifyLinkedInProfile(userId, url)` | Updates DB: `verified=true`, `method='linkedin'` |
| `autoVerifyEmail(userId)` | Sets `verified=true`, `method='email'` on email confirmation |
| `removeVerification(userId)` | Resets all verification fields |
| `isVerified(profile)` | Returns boolean |
| `getVerificationInfo(profile)` | Returns `{ verified, method, verifiedAt, data }` |

### `lib/storage.js`

Supabase Storage helper functions for avatar and CV file operations.

### `lib/email.js`

Stub module â€” `sendMatchEmail()` is a no-op returning `{ status: 'disabled' }`. EmailJS has been removed; export exists to keep imports stable.

### `utils/smartScheduling.js`

| Function | Description |
|----------|-------------|
| `detectDateInMessage(text)` | Regex detection of dates/times in chat messages |
| `generateCalendarUrl(title, details)` | Google Calendar link with default tomorrow 10-11am |

### `utils/profileUtils.js`

| Function | Description |
|----------|-------------|
| `exportProfileToPDF(profile, exp, edu, certs)` | Generates A4 PDF CV via jsPDF |
| `generateProfileShareLink(userId)` | Returns `{origin}/profile/{userId}` |
| `copyToClipboard(text)` | Wraps `navigator.clipboard.writeText()` |

### `data/companies.js`

87 Tunisian companies sorted alphabetically. Categories: public companies (banks, insurance, industrial, automotive, holding groups), startups/tech (Enova Robotics, WASHYY, etc.), telecom (Tunisie Telecom, Ooredoo, Orange).

### `data/jobTitles.js`

Job title suggestions for autocomplete in forms.

### `data/skills.js`

Skill suggestions for autocomplete in profile and offer forms.

---

## 22. Testing

### 22.1 Framework

| Tool | Purpose |
|------|---------|
| Vitest | Test runner |
| @testing-library/react | Component testing |
| @testing-library/jest-dom | DOM matchers |
| jsdom | Browser environment |

### 22.2 Configuration

```javascript
// vitest.config.js
{
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    coverage: { reporter: ['text', 'html'], exclude: ['node_modules/', 'src/test/'] }
  }
}
```

### 22.3 Existing Tests

| File | Coverage |
|------|----------|
| `src/lib/spamDetection.test.js` | Spam detection logic |
| `src/lib/verification.test.js` | Verification system logic |

### 22.4 Running Tests

```bash
# Interactive mode
npm test

# Single run
npm run test:run
```

---

## 23. Deployment

### 23.1 Vercel (Frontend)

**Configuration** (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

The SPA rewrite ensures all routes are handled by React Router (deep links like `/student/swipe` don't 404).

**Production URL**: `https://matchop.vercel.app`

### 23.2 Supabase (Backend)

- PostgreSQL database with pgvector, PostGIS, pg_trgm extensions
- Auth service with email verification
- Realtime WebSocket service
- Storage buckets (avatars, CVs)
- 6 Edge Functions (Deno runtime)

### 23.3 Deploy Steps

```bash
# 1. Build locally
npm run build

# 2. Run tests
npm run test:run

# 3. Deploy to Vercel
vercel --prod

# 4. Deploy edge functions
supabase functions deploy ai-job-description
supabase functions deploy ai-profile-polisher
supabase functions deploy generate-embedding
supabase functions deploy get-matched-jobs
supabase functions deploy match-recommendations
supabase functions deploy suggest-icebreakers
```

### 23.4 Post-Deploy Checklist

- [ ] Verify SPA routing (deep links)
- [ ] Check Vercel environment variables match Supabase project
- [ ] Test signup flow (student + company)
- [ ] Test swipe â†’ match trigger
- [ ] Test message send/receive
- [ ] Verify Edge Functions: `supabase functions list`
- [ ] Monitor Supabase logs for RLS violations
- [ ] Test on mobile devices (not just DevTools)
- [ ] Run Lighthouse audit

---

## 24. Environment Variables

### Frontend (Vite â€” prefixed with `VITE_`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous public key |

### Supabase Edge Functions (set via `supabase secrets set`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Auto | Set automatically by Supabase |
| `SUPABASE_ANON_KEY` | Auto | Set automatically by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto | Set automatically by Supabase |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for LLM calls |
| `HF_API_KEY` | Yes | HuggingFace API key for embeddings |

### Crawler (read from `.env` via dotenv)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Preferred | Service role key (bypasses RLS) |
| `VITE_SUPABASE_ANON_KEY` | Fallback | Anon key (if no service key) |

### Vercel Dashboard

Both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be set in Vercel Environment Variables (Production, Preview, Development) and redeployed after changes.

---

## 25. Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase project (free tier works)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/zied1fatnassi/MATCHOP.git
cd MATCHOP

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env with your Supabase URL and anon key

# 4. Run database migrations
# Open Supabase SQL Editor and run in order:
#   1. database/refactor_v2.sql        (V2 schema)
#   2. database/matching_engine.sql    (PostGIS + scoring)
#   3. database/report_block_system.sql (moderation)
#   4. database/create_external_jobs.sql (crawler table)
#   5. database/000_canonical_rls.sql   (RLS policies)
#   6. supabase/migrations/20251222010100_vector_matching.sql  (vector search)
#   7. supabase/migrations/20251222010200_external_jobs_rls.sql (external jobs RLS)
#   8. supabase/migrations/20260213010100_partner_ingest_model.sql (partner ingest model)
#   9. supabase/migrations/20260219005000_function_search_path_hardening.sql (function search_path hardening)
#  10. supabase/migrations/20260219010100_public_schema_hardening.sql (extensions/public hardening)
#  11. database/auto_confirm_emails.sql (fix signup - see docs/EMAIL_SETUP.md)

# 5. Start development server
npm run dev

# 6. Open in browser
# http://localhost:5173
```

### Optional: Seed Data

```bash
# In Supabase SQL Editor, run:
# database/seed_v3.sql
```

### Optional: Deploy Edge Functions

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set OPENROUTER_API_KEY=your_key HF_API_KEY=your_key
supabase functions deploy --no-verify-jwt
```

### Optional: Run Crawler

```bash
npm run scrape
```

---

## 26. Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `vite` | Start development server with HMR |
| `npm run build` | `vite build` | Production build to `dist/` |
| `npm run preview` | `vite preview` | Preview production build locally |
| `npm run lint` | `eslint .` | Run ESLint on all JS/JSX files |
| `npm test` | `vitest` | Run tests in interactive watch mode |
| `npm run test:run` | `vitest run` | Run tests once |
| `npm run scrape` | `node scripts/crawler/kernel.js` | Run job crawler |
| `npm run scrape:cleanup` | `node scripts/crawler/cleanup-dead-links.js` | Remove dead job links |

---

## 27. Security Considerations

### Implemented

| Measure | Implementation |
|---------|---------------|
| Row Level Security | All tables have RLS policies (see Â§7) |
| JWT Authentication | Supabase Auth with auto-refresh |
| Password Policy | Min 8 chars, uppercase, lowercase, number, special char |
| Edge Function Auth | All 6 functions validate JWT before processing |
| Spam Detection | Multi-tier pattern matching on messages and bios |
| Rate Limiting | Per-user sliding window on chat messages |
| Input Sanitization | Message trimming, whitespace normalization, 2000 char limit |
| CORS Headers | All edge functions return proper CORS headers |
| Profile Ownership | Write operations verify `auth.uid()` matches record owner |
| Storage Policies | Upload restricted to own folder |
| Email Verification | Required for account activation |
| Link Verification | Crawler validates job URLs before saving |
| Block System | Blocked users filtered from swipe deck and chat |

### Recommendations

| Area | Recommendation |
|------|---------------|
| Scrapestack API key | Move from hardcoded `config.js` to `.env` |
| Supabase keys in docs | Remove any leaked keys from version history |
| Content Security Policy | Add CSP headers via Vercel config |
| API rate limiting | Add rate limiting to edge functions |
| CSRF protection | Consider adding CSRF tokens for state-changing operations |
| Dependency auditing | Run `npm audit` periodically |
| Logging | Centralize error logging (Sentry or similar) |

---

## 28. Known Issues & Bug Registry

### Critical

| ID | Bug | Impact | File(s) |
|----|-----|--------|---------|
| C5 | Auth buttons hidden on mobile via `display:none` | Mobile users cannot sign up from nav | `Navbar.css:163` |
| C6 | Ghost Tailwind classes (`mb-4`, `text-primary`, `font-bold`) â€” Tailwind is NOT installed | Broken layout silently | Multiple components |
| C7 | `useMessages` falls back to fake local message on INSERT failure | Lost messages, false success | `useMessages.js` |
| C9 | `PublicRoute` redirect loop when user logged in but profile not loaded | White screen / infinite redirect | `RouteGuards.jsx` |
| C10 | Certifications, projects, languages, volunteer are local-only state | Data lost on page refresh | `useStudentProfile.js` |

### Medium

| ID | Bug | Impact |
|----|-----|--------|
| M1 | `ProtectedRoute` checks role before profile loads â†’ premature redirect | Confusing UX on slow connections |
| M3 | `useMatches` 30s timeout race condition | Shows "no data" then flashes |
| M4 | `useExternalJobs` double-fetch on mount | Wasted API calls |
| M5 | `useMatchListener` only subscribes for students | Companies get no realtime match notifications |
| M6 | Module-level caches not user-scoped | Data leak between sessions |
| M9 | `ApplicationContext` value not memoized | Re-renders all consumers |
| M10 | Navbar language dropdown doesn't close on outside click | UX annoyance |
| M11 | Swipe undo only reverses UI â€” DB swipe committed | Misleading feature |
| M12 | Two mobile breakpoints in navbar (768px vs 901px) | Broken layout 768-900px |

### Low

| ID | Bug |
|----|-----|
| L1 | "Global Jobs" label hardcoded English in Navbar |
| L2 | Landing stats were hardcoded (fixed: replaced with private-beta status labels) |
| L4 | Duplicate `@keyframes fadeIn` |
| L6 | Non-lazy imports for Navbar, Footer, Logo inflate main bundle |
| L9 | `unread_count` in StudentMatches never set |
| L12 | ThemeContext initializes `'light'` causing FOUC if user prefers dark |
| L13 | Supabase client silently creates with empty strings on missing env vars |

---

## 29. Feature Roadmap

### Phase 1: AI-Powered Matching Enhancement (Short-term)
- Auto-generate embeddings on profile/offer save via database trigger
- Preference weights in student profile (remote preference, salary minimum, contract type)
- "Why this match?" explainability â€” show skill overlap percentage in SwipeCard
- Create missing `recommend_matches_rpc` PostgreSQL function

### Phase 2: Real-Time Chat & Notifications (Short-term)
- Fix `useMessages` to not fake messages on failure
- Unread message count badge in matches list
- Push notifications via Web Push API + service worker
- Typing indicators via Supabase Realtime presence
- Read receipts via IntersectionObserver + `is_read` update

### Phase 3: Enhanced Profiles (Medium-term)
- Video introductions (60s max, new Storage bucket)
- Skill endorsements table + UI
- Portfolio image gallery carousel
- LinkedIn PDF import for auto-fill
- Persist certifications, projects, languages, volunteer to database

### Phase 4: Company Dashboards (Medium-term)
- Analytics: views per offer, swipe-right rate, time-to-match
- Offer templates (save/load configurations)
- Team accounts (`company_members` table with roles)
- ATS-lite: pipeline stages (Applied â†’ Screening â†’ Interview â†’ Offer â†’ Hired) with drag-and-drop Kanban

### Phase 5: Gamification & Engagement (Long-term)
- Daily swipe streaks with XP points
- Achievements system ("First Match", "10-Day Streak", "Profile Complete")
- Opt-in leaderboard
- Super Swipe â€” limited daily priority likes
- Profile boost via streaks or premium

### Phase 6: Platform Growth (Long-term)
- Arabic language support (translations + RTL layout)
- PWA (Progressive Web App) with service worker
- Email notifications (new match, new message)
- Mobile app (React Native)
- Advanced company analytics (Chart.js/Recharts charts)
- Interview scheduling integration (Google Meet, Zoom)

---

## 30. Contributing

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/MATCHOP.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature`

### Development

```bash
npm run dev       # Start dev server
npm run lint      # Run ESLint
npm run test:run  # Run tests
npm run build     # Build for production
```

### Code Style

- Use functional components with hooks
- Keep components small and focused
- Use CSS variables from the design system for theming
- Add `useTranslation()` for any user-facing text
- Write custom hooks for data logic
- Comments for complex logic
- Follow existing naming conventions (PascalCase components, camelCase functions/variables)

### Pull Request Process

1. Ensure your code passes linting: `npm run lint`
2. Ensure tests pass: `npm run test:run`
3. Update translations in both `en.json` and `fr.json` if adding UI text
4. Test on mobile viewport (375px width minimum)
5. Test both light and dark themes
6. Create a pull request with a clear description

---

## 31. License

MIT License â€” Copyright (c) 2026 MatchOp.

See [LICENSE](LICENSE) for full text.

---

*Built with React, Supabase, and AI â€” for students, by builders.*


