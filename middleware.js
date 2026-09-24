/**
 * Vercel Edge Middleware - SPA Navigation Throttling
 *
 * Runs on requests that match `config.matcher` before the SPA is served.
 *
 * Important:
 * - This middleware only sees requests handled by this Vercel app.
 * - It does NOT rate-limit direct calls to Supabase Auth APIs.
 * - Auth endpoint protection must live server-side (Edge Functions, Supabase
 *   auth protections, CAPTCHA/WAF, and distributed rate limiting).
 *
 * NOTE: This file must be at the project root for Vercel to detect it.
 * @see https://vercel.com/docs/functions/edge-middleware
 */

// ============================================
// RATE LIMITER (In-memory, per-instance)
// ============================================
// In production with multiple Vercel Edge instances, use a distributed
// store (e.g. Redis/KV) if you need this to be globally consistent.

/** @type {Map<string, { count: number, resetAt: number }>} */
const rateLimitStore = new Map()

const RATE_LIMIT_CONFIG = {
    // Throttle repeated navigation to password recovery pages.
    '/forgot-password': { maxRequests: 5, windowMs: 15 * 60 * 1000 },
    '/reset-password': { maxRequests: 20, windowMs: 15 * 60 * 1000 },
}

/**
 * Check if a request is rate-limited.
 * @param {string} key - Unique identifier (IP + path)
 * @param {object} config - { maxRequests, windowMs }
 * @returns {{ limited: boolean, remaining: number, resetAt: number }}
 */
function checkRateLimit(key, config) {
    const now = Date.now()
    const entry = rateLimitStore.get(key)

    // Clean up expired entries periodically
    if (rateLimitStore.size > 10000) {
        for (const [k, v] of rateLimitStore) {
            if (v.resetAt < now) rateLimitStore.delete(k)
        }
    }

    if (!entry || entry.resetAt < now) {
        // New window
        rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs })
        return { limited: false, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
    }

    entry.count++
    rateLimitStore.set(key, entry)

    if (entry.count > config.maxRequests) {
        return { limited: true, remaining: 0, resetAt: entry.resetAt }
    }

    return { limited: false, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

// ============================================
// SECURITY HEADERS
// ============================================

const SECURITY_HEADERS = {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0', // Disabled - CSP is the modern replacement
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
}

// ============================================
// MIDDLEWARE HANDLER
// ============================================

/**
 * @param {Request} request
 * @returns {Response|undefined}
 */
export default function middleware(request) {
    const url = new URL(request.url)
    const pathname = url.pathname
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown'

    // --- Rate Limiting ---
    const rateLimitConfig = RATE_LIMIT_CONFIG[pathname]
    if (rateLimitConfig) {
        const key = `${ip}:${pathname}`
        const result = checkRateLimit(key, rateLimitConfig)

        if (result.limited) {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
            return new Response(
                JSON.stringify({
                    error: 'Too many requests',
                    message: 'You have exceeded the rate limit. Please try again later.',
                    retryAfter,
                }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': String(retryAfter),
                        'X-RateLimit-Limit': String(rateLimitConfig.maxRequests),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
                        ...SECURITY_HEADERS,
                    },
                }
            )
        }
    }

    // Security headers are set globally in vercel.json for static responses.
    return undefined
}

/**
 * Run only on recovery-related SPA routes to keep middleware overhead low.
 */
export const config = {
    matcher: [
        '/forgot-password',
        '/reset-password',
    ],
}
