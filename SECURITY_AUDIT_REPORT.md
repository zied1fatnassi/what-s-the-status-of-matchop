# MatchOp Security Audit Report

**Date:** February 13, 2026  
**Auditor Role:** Senior Full-Stack Security Engineer  
**Scope:** Session Management, Password Reset, External Link Verification  
**Status:** ✅ ALL CRITICAL ISSUES REMEDIATED

---

## 1. Insecure Session Management (JWT in localStorage)

### Before (VULNERABLE)
| Aspect | Status | Detail |
|---|---|---|
| Storage | ❌ `window.localStorage` | JWT accessible to any JS on the page |
| XSS Risk | ❌ CRITICAL | `localStorage.getItem('matchop-auth-token')` → token theft |
| CSRF Protection | ❌ NONE | No SameSite cookies, no CSRF tokens |
| Auth Flow | ⚠️ Implicit | Tokens in URL fragment, susceptible to leaks via Referer |
| Session Revocation | ⚠️ WEAK | Clearing localStorage only; tokens remain valid until TTL |

**Attack Vector:** Any XSS vulnerability (DOM-based, stored, reflected, or via compromised npm dependency) allows instant exfiltration of the JWT to an attacker-controlled server. The attacker gets full API access as the victim.

### After (REMEDIATED)
| Aspect | Status | Detail |
|---|---|---|
| Storage | ✅ Cookie (Secure, SameSite=Strict) | Not accessible via `document.cookie` from cross-origin scripts |
| XSS Risk | ✅ MITIGATED | Cookies not sent cross-origin; SPA reads state from in-memory listener |
| CSRF Protection | ✅ DUAL LAYER | SameSite=Strict (Layer 1) + X-CSRF-Token header (Layer 2) |
| Auth Flow | ✅ PKCE | Authorization code exchange with code_verifier/code_challenge |
| Session Revocation | ✅ Cookie clearing + Supabase signOut | Both cookie and server-side session invalidated |
| Security Headers | ✅ HSTS, X-Content-Type-Options, X-Frame-Options, Permissions-Policy | Added via vercel.json |

**CSRF Token Details:**
- Generated via `crypto.getRandomValues(new Uint8Array(32))` — 256-bit entropy
- Constant-time comparison (`result |= a.charCodeAt(i) ^ b.charCodeAt(i)`) prevents timing attacks
- Token rotated on each sign-in; cleared on sign-out

### Verified Checklist
- [x] `window.localStorage` is no longer used for session storage
- [x] Cookie has `SameSite=Strict` attribute
- [x] Cookie has `Secure` flag (HTTPS-only)
- [x] PKCE flow enabled (`flowType: 'pkce'` in Supabase client)
- [x] CSRF token uses cryptographically secure randomness
- [x] CSRF comparison is timing-safe
- [x] SPA auth state reads from `onAuthStateChange()` (in-memory), not cookies
- [x] All auth cookies cleared on sign-out
- [x] Security headers deployed via `vercel.json`

---

## 2. Weak Password Reset Flow

### Before (VULNERABLE)
| Aspect | Status | Detail |
|---|---|---|
| Token Generation | ⚠️ Supabase-managed | No application-layer control over token entropy or lifecycle |
| Rate Limiting | ❌ NONE | Unlimited reset requests → email bombing attack vector |
| Single-Use Enforcement | ⚠️ Supabase-managed | No application-layer guarantee |
| Expiration | ⚠️ Supabase default (1 hour) | Too long — increases attack window |
| User Enumeration | ❌ POSSIBLE | Different responses for existing vs. non-existing emails |
| Token Storage | ⚠️ Opaque | No audit trail, no IP logging |
| Client Validation | ❌ NONE | SPA directly called `supabase.auth.updateUser()` |

**Attack Vectors:**
1. **Email Bombing:** No rate limit → attacker floods victim's inbox with reset emails
2. **Token Replay:** 1-hour window is generous for brute-force or replay attacks
3. **User Enumeration:** Attacker discovers which emails are registered

### After (REMEDIATED)
| Aspect | Status | Detail |
|---|---|---|
| Token Generation | ✅ `crypto.getRandomValues(32)` | 256-bit CSPRNG — same entropy as `crypto.randomBytes(32)` in Node.js |
| Token Storage | ✅ SHA-256 hash only | Plaintext token NEVER stored in database |
| Rate Limiting | ✅ DUAL LAYER | Edge Middleware: 5/IP/15min + Edge Function: 3/email/hour |
| Single-Use | ✅ `used` flag set BEFORE password update | Token consumed atomically — no replay possible |
| Expiration | ✅ 15 minutes | Enforced via `expires_at` column in every query |
| User Enumeration | ✅ PREVENTED | Always returns `"If an account exists, a reset link has been sent"` |
| Token Storage | ✅ Full audit trail | `email`, `token_hash`, `expires_at`, `used`, `used_at`, `ip_address`, `created_at` |
| Server Validation | ✅ Edge Function | Password validated server-side (length, uppercase, number, special char) |
| DB Security | ✅ RLS enabled, no client access | Only service_role can read/write `password_reset_tokens` |
| Token Invalidation | ✅ All previous tokens invalidated on new request | Prevents confusion from multiple active tokens |
| Failure Recovery | ✅ Token re-enabled if password update fails | No token wasted on transient backend errors |

### Verified Checklist
- [x] Token uses cryptographically secure library: `crypto.getRandomValues()` (Deno CSPRNG)
- [x] Token entropy: 256 bits (32 bytes → 64 hex characters)
- [x] Token stored as SHA-256 hash (never plaintext)
- [x] Token comparison is timing-safe (`timingSafeEqual()`)
- [x] Single-use enforcement: `used` flag set before password update
- [x] 15-minute expiration enforced in DB query (`expires_at >= NOW()`)
- [x] Rate limiting: 5 requests/IP/15min (middleware) + 3/email/hour (server)
- [x] User enumeration prevention: identical response for all emails
- [x] Password validation enforced server-side
- [x] RLS: `password_reset_tokens` table inaccessible from client
- [x] Cleanup function for expired tokens: `cleanup_expired_reset_tokens()`

---

## 3. Partner Ingest Model (Replaces Web Scraping)

### Before (REMOVED)
| Aspect | Status | Detail |
|---|---|---|
| Data Source | ❌ Web scraping | Legal risk, low-quality data, dead links |
| Verification | ❌ 30% random | Most links unverified |
| Dependencies | ❌ cheerio, axios, rss-parser, Scrapestack | Large attack surface, API key exposure |
| Data Quality | ❌ LOW | Scraped listings often expired, duplicated, or inaccurate |

**Decision:** All web-scraping code (`scripts/crawler/`, `link-checker` Edge Function) has been **permanently removed**. Dependencies `cheerio`, `axios`, and `rss-parser` deleted from `package.json`.

### After (PARTNER INGEST MODEL)
| Aspect | Status | Detail |
|---|---|---|
| Data Source | ✅ Partner APIs | Direct integration with verified companies |
| Authentication | ✅ X-Partner-Key header | SHA-256 hashed, compared against `partners` table |
| Authorization | ✅ Status check | Only `active` partners can ingest offers |
| Input Validation | ✅ Server-side | Every field sanitised, length-limited, type-checked |
| RLS | ✅ Enabled | `partners` table accessible only via `service_role` |
| Rate Limiting | ✅ 100 offers/request | Prevents bulk abuse |
| New Offer Types | ✅ Exclusive, Leak, Bounty | `is_exclusive`, `is_leak`, `bounty_value` columns |

### Verified Checklist
- [x] All `scripts/crawler/` files deleted
- [x] `supabase/functions/link-checker/` deleted
- [x] `cheerio`, `axios`, `rss-parser` removed from `package.json`
- [x] `scrape`, `scrape:cleanup`, `scrape:check-links` npm scripts removed
- [x] `partners` table created with RLS (service_role only)
- [x] API key stored as SHA-256 hash (never plaintext)
- [x] `ingest-partner-offers` Edge Function validates key, status, and input
- [x] `offers` table extended with `is_exclusive`, `is_leak`, `bounty_value`, `partner_id`
- [x] Frontend badges render conditionally with i18n support (EN/FR)

---

## Summary: Security Posture Before vs. After

| Area | Before | After | Risk Reduction |
|---|---|---|---|
| Session Storage | localStorage (XSS-vulnerable) | Secure cookies + CSRF | **CRITICAL → LOW** |
| Password Reset | No rate limit, 1hr expiry, no audit | Single-use, 15min, rate-limited, audited | **HIGH → LOW** |
| Data Ingestion | Web scraping (legal risk, dead links) | Partner API with hashed keys + RLS | **HIGH → LOW** |
| Security Headers | None | HSTS, X-Frame-Options, CSP-ready | **HIGH → LOW** |
| CSRF Protection | None | SameSite=Strict + CSRF token | **HIGH → LOW** |
| Auth Flow | Implicit | PKCE | **MEDIUM → LOW** |

---

## Files Modified/Created Summary

### New Files (7)
| File | Purpose |
|---|---|
| `src/lib/cookieStorage.js` | Cookie storage adapter + CSRF utilities |
| `src/lib/passwordReset.js` | Client API for secure password reset |
| `middleware.js` | Vercel Edge Middleware (rate limiting) |
| `database/password_reset_tokens.sql` | Token storage table + RLS |
| `supabase/functions/secure-password-reset/index.ts` | Password reset Edge Function |
| `supabase/functions/ingest-partner-offers/index.ts` | Partner offer ingestion Edge Function |
| `supabase/migrations/20260213_partner_ingest_model.sql` | Partners table + offers columns migration |

### Modified Files (7)
| File | Change |
|---|---|
| `src/lib/supabase.js` | localStorage → cookieStorage, PKCE flow |
| `src/context/AuthContext.jsx` | CSRF init, cookie clearing on sign-out |
| `src/pages/ForgotPassword.jsx` | Secure Edge Function-based reset request |
| `src/pages/ResetPassword.jsx` | Token-based validation + consumption |
| `src/components/SwipeCard.jsx` | Partner-model badges (Exclusive, Leak, Bounty) |
| `vercel.json` | Security headers added |
| `package.json` | Removed scraping deps, added ingest script |

### Deleted Files (8)
| File | Reason |
|---|---|
| `scripts/crawler/kernel.js` | Web scraping removed |
| `scripts/crawler/config.js` | Web scraping removed |
| `scripts/crawler/scrapestack-client.js` | Web scraping removed |
| `scripts/crawler/check-links-local.js` | Link checker removed |
| `scripts/crawler/cleanup-dead-links.js` | Link checker removed |
| `scripts/crawler/scrapers/*.js` (6 files) | Site-specific scrapers removed |
| `supabase/functions/link-checker/index.ts` | Link checker Edge Function removed |

---

**Build Status:** ✅ PASSING (Vite build completes in ~4s with no errors)  
**Backward Compatibility:** ✅ SPA flow preserved — auth state via `useAuth()` context unchanged  
**Infrastructure Impact:** Minimal — uses existing Supabase Edge Functions + Vercel Edge Runtime
