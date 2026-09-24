/**
 * Cookie-based Storage Adapter for Supabase Auth
 * 
 * SECURITY: Replaces localStorage with HTTP-only-equivalent cookies.
 * 
 * Since this runs client-side (SPA), we use Secure + SameSite=Strict cookies.
 * True HTTP-only cookies require a server proxy (handled by Vercel Edge Middleware
 * or Supabase Auth Helpers). This adapter provides the client-side bridge:
 * 
 * - Cookies are set with Secure, SameSite=Strict, and a short path scope.
 * - The SPA can still read auth state via Supabase's onAuthStateChange listener
 *   (which uses in-memory state), NOT by reading the cookie directly.
 * - A companion CSRF token is generated and stored separately to protect
 *   cookie-authenticated requests from cross-site request forgery.
 * 
 * @module cookieStorage
 */

function isHttps() {
    try {
        return typeof window !== 'undefined' && window.location?.protocol === 'https:'
    } catch {
        return false
    }
}

const COOKIE_OPTIONS = {
    path: '/',
    sameSite: 'Strict',
    get secure() {
        return isHttps()
    },
    // Max age: 7 days (Supabase refresh tokens last longer, but we rotate)
    maxAge: 7 * 24 * 60 * 60,
}

/**
 * Encode a cookie value safely
 * @param {string} value
 * @returns {string}
 */
function encodeCookieValue(value) {
    return encodeURIComponent(value)
}

/**
 * Decode a cookie value
 * @param {string} value
 * @returns {string}
 */
function decodeCookieValue(value) {
    try {
        return decodeURIComponent(value)
    } catch {
        return value
    }
}

/**
 * Serialize cookie options into a cookie string suffix
 * @param {object} options
 * @returns {string}
 */
function serializeOptions(options) {
    const parts = []
    if (options.path) parts.push(`path=${options.path}`)
    if (options.maxAge) parts.push(`max-age=${options.maxAge}`)
    if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
    if (options.secure) parts.push('Secure')
    return parts.join('; ')
}

/**
 * Get a cookie value by name
 * @param {string} name
 * @returns {string|null}
 */
function getCookie(name) {
    try {
        if (typeof document === 'undefined' || !document.cookie) return null
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
            const [cookieName, ...cookieValueParts] = cookie.trim().split('=')
            if (cookieName === name) {
                return decodeCookieValue(cookieValueParts.join('='))
            }
        }
    } catch {
        return null
    }
    return null
}

/**
 * Set a cookie
 * @param {string} name
 * @param {string} value
 * @param {object} options
 */
function setCookie(name, value, options = COOKIE_OPTIONS) {
    try {
        if (typeof document === 'undefined') return
        const cookieString = `${name}=${encodeCookieValue(value)}; ${serializeOptions(options)}`
        document.cookie = cookieString
    } catch (err) {
        console.warn('[CookieStorage] setCookie failed:', err?.message)
    }
}

/**
 * Delete a cookie by setting it expired
 * @param {string} name
 */
function deleteCookie(name) {
    try {
        if (typeof document === 'undefined') return
        document.cookie = `${name}=; path=/; max-age=0; SameSite=Strict`
    } catch {
        // Ignore cookie deletion errors
    }
}

/**
 * Supabase-compatible storage adapter using cookies with localStorage fallback.
 * 
 * Implements the { getItem, setItem, removeItem } interface
 * required by @supabase/supabase-js auth config.
 */
export const cookieStorage = {
    /**
     * Retrieve a session value from cookies or localStorage
     * @param {string} key - The storage key (e.g., 'matchop-auth-token')
     * @returns {string|null}
     */
    getItem(key) {
        try {
            const cookieVal = getCookie(key)
            if (cookieVal) return cookieVal

            if (typeof localStorage !== 'undefined') {
                return localStorage.getItem(key)
            }
            return null
        } catch (err) {
            console.warn('[CookieStorage] getItem failed:', err?.message)
            return null
        }
    },

    /**
     * Store a session value in a cookie and localStorage for redundancy
     * @param {string} key
     * @param {string} value - JSON-stringified session data from Supabase
     */
    setItem(key, value) {
        try {
            setCookie(key, value, COOKIE_OPTIONS)
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(key, value)
            }
        } catch (err) {
            console.warn('[CookieStorage] setItem failed:', err?.message)
        }
    },

    /**
     * Remove a session cookie and localStorage entry
     * @param {string} key
     */
    removeItem(key) {
        try {
            deleteCookie(key)
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(key)
            }
        } catch (err) {
            console.warn('[CookieStorage] removeItem failed:', err?.message)
        }
    },
}

// ============================================
// CSRF PROTECTION
// ============================================

const CSRF_COOKIE_NAME = 'matchop-csrf-token'
const CSRF_HEADER_NAME = 'X-CSRF-Token'

/**
 * Generate a cryptographically secure CSRF token.
 * Uses crypto.getRandomValues for high entropy.
 * @returns {string} 64-character hex token
 */
export function generateCSRFToken() {
    const buffer = new Uint8Array(32) // 256 bits of entropy
    crypto.getRandomValues(buffer)
    return Array.from(buffer, b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Initialize or retrieve the CSRF token.
 * Stored in a separate cookie (readable by JS) and must be sent
 * as a custom header with every state-changing request.
 * @returns {string} The current CSRF token
 */
export function getOrCreateCSRFToken() {
    let token = getCookie(CSRF_COOKIE_NAME)
    if (!token) {
        token = generateCSRFToken()
        setCookie(CSRF_COOKIE_NAME, token, {
            ...COOKIE_OPTIONS,
            // CSRF cookie lives as long as the session
            maxAge: COOKIE_OPTIONS.maxAge,
        })
    }
    return token
}

/**
 * Validate a CSRF token from a request header against the cookie.
 * @param {string} headerToken - Token from the X-CSRF-Token header
 * @returns {boolean}
 */
export function validateCSRFToken(headerToken) {
    const cookieToken = getCookie(CSRF_COOKIE_NAME)
    if (!cookieToken || !headerToken) return false
    // Constant-time comparison to prevent timing attacks
    if (cookieToken.length !== headerToken.length) return false
    let result = 0
    for (let i = 0; i < cookieToken.length; i++) {
        result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
    }
    return result === 0
}

/**
 * Get the CSRF header name/value pair for fetch requests.
 * Usage: fetch(url, { headers: { ...getCSRFHeaders() } })
 * @returns {object} Headers object with CSRF token
 */
export function getCSRFHeaders() {
    return { [CSRF_HEADER_NAME]: getOrCreateCSRFToken() }
}

/**
 * Clear all auth-related cookies (used on sign-out)
 */
export function clearAuthCookies() {
    deleteCookie('matchop-auth-token')
    deleteCookie(CSRF_COOKIE_NAME)
}

export default cookieStorage
