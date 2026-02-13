/**
 * Secure Password Reset Client
 * 
 * Client-side API for the secure-password-reset Edge Function.
 * Replaces the direct Supabase Auth resetPasswordForEmail flow
 * with our hardened single-use token system.
 * 
 * Flow:
 * 1. User enters email → requestPasswordReset() → Edge Function generates token
 * 2. User clicks email link → validateResetToken() → Edge Function validates hash
 * 3. User submits new password → executePasswordReset() → Token consumed + password updated
 * 
 * @module passwordReset
 */

import { getCSRFHeaders } from './cookieStorage'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/secure-password-reset`

/**
 * Make a POST request to the password reset Edge Function.
 * Includes CSRF token and Supabase anon key headers.
 * 
 * @param {string} action - The endpoint action (request-reset | validate-token | reset-password)
 * @param {object} body - Request body
 * @returns {Promise<object>} Response data
 * @throws {Error} On network or server errors
 */
async function callResetEndpoint(action, body) {
    const response = await fetch(`${EDGE_FUNCTION_URL}/${action}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            ...getCSRFHeaders(),
        },
        body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok && !data.success) {
        throw new Error(data.error || data.message || `Request failed with status ${response.status}`)
    }

    return data
}

/**
 * Request a password reset email.
 * 
 * The Edge Function will:
 * - Validate the email format
 * - Check rate limits (3 per hour per email)
 * - Generate a 256-bit cryptographic token
 * - Store the SHA-256 hash in the database
 * - Send the plaintext token via email link
 * - Always return success (prevents user enumeration)
 * 
 * @param {string} email - User's email address
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function requestPasswordReset(email) {
    return callResetEndpoint('request-reset', { email })
}

/**
 * Validate a reset token from the URL query params.
 * 
 * Called when the user lands on /reset-password?token=xxx&email=yyy
 * Checks that the token:
 * - Exists in the database (as a SHA-256 hash)
 * - Has not been used
 * - Has not expired (15-minute window)
 * 
 * Does NOT consume the token — that happens on password submission.
 * 
 * @param {string} token - The plaintext token from the URL
 * @param {string} email - The email from the URL
 * @returns {Promise<{ valid: boolean, expiresAt?: string, error?: string }>}
 */
export async function validateResetToken(token, email) {
    return callResetEndpoint('validate-token', { token, email })
}

/**
 * Execute the password reset — consume the token and update the password.
 * 
 * The Edge Function will:
 * - Validate the token (hash comparison, expiry, single-use)
 * - Mark the token as used IMMEDIATELY (before updating password)
 * - Validate password strength server-side
 * - Update the password via Supabase Auth Admin API
 * - On failure: re-enable the token for retry
 * 
 * @param {string} token - The plaintext token from the URL
 * @param {string} email - The email from the URL
 * @param {string} newPassword - The new password
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function executePasswordReset(token, email, newPassword) {
    return callResetEndpoint('reset-password', { token, email, newPassword })
}

/**
 * Extract reset parameters from the current URL.
 * Expected format: /reset-password?token=xxx&email=yyy
 * 
 * @returns {{ token: string|null, email: string|null }}
 */
export function getResetParamsFromURL() {
    const params = new URLSearchParams(window.location.search)
    return {
        token: params.get('token'),
        email: params.get('email'),
    }
}
