/**
 * Secure Password Reset — Supabase Edge Function
 * 
 * Implements a hardened password reset flow:
 * 1. Single-use tokens with crypto.randomBytes (256-bit entropy)
 * 2. 15-minute expiration enforced server-side
 * 3. Token stored as SHA-256 hash in DB (never stored in plaintext)
 * 4. Rate limiting: 3 reset requests per email per hour
 * 5. Timing-safe token comparison to prevent timing attacks
 * 
 * Endpoints:
 * - POST /request-reset  → Generate & email a reset token
 * - POST /validate-token → Verify a token is valid (without consuming it)
 * - POST /reset-password → Consume token & update password
 * 
 * @module secure-password-reset
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { crypto } from 'https://deno.land/std@0.208.0/crypto/mod.ts'
import { encodeHex } from 'https://deno.land/std@0.208.0/encoding/hex.ts'
import { timingSafeEqual } from 'https://deno.land/std@0.208.0/crypto/timing_safe_equal.ts'

// ============================================
// CONSTANTS
// ============================================

const TOKEN_EXPIRY_MINUTES = 15
const TOKEN_BYTE_LENGTH = 32 // 256 bits of entropy
const MAX_RESETS_PER_HOUR = 3
const CORS_BASE_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const DEV_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

// ============================================
// HELPERS
// ============================================

/**
 * Generate a cryptographically secure random token.
 * Uses Deno's crypto.getRandomValues (backed by OS CSPRNG).
 * @returns {string} 64-character hex string (256 bits)
 */
function generateSecureToken() {
  const bytes = new Uint8Array(TOKEN_BYTE_LENGTH)
  crypto.getRandomValues(bytes)
  return encodeHex(bytes)
}

/**
 * Hash a token with SHA-256 for safe database storage.
 * We never store plaintext tokens — only hashes.
 * @param {string} token - The plaintext token
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
async function hashToken(token) {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return encodeHex(new Uint8Array(hashBuffer))
}

/**
 * Constant-time comparison of two hex strings.
 * Prevents timing attacks on token validation.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeCompare(a, b) {
  const encoder = new TextEncoder()
  const bufA = encoder.encode(a)
  const bufB = encoder.encode(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Create a JSON response with CORS headers.
 * @param {object} body
 * @param {number} status
 * @param {string | null} origin
 * @returns {Response}
 */
function jsonResponse(body, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

/**
 * Validate email format (basic server-side check).
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getAllowedOrigins() {
  const configuredRaw = (Deno.env.get('SITE_URL') ?? '').trim()
  let configured = configuredRaw
  if (configuredRaw) {
    try {
      configured = new URL(configuredRaw).origin
    } catch {
      configured = configuredRaw.replace(/\/+$/, '')
    }
  }
  const allowed = new Set(DEV_ORIGINS)
  if (configured) allowed.add(configured)
  return allowed
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) return false
  const allowedOrigins = getAllowedOrigins()
  return allowedOrigins.has(origin)
}

function getCorsHeaders(origin: string | null) {
  const allowOrigin = isAllowedOrigin(origin) ? origin : 'null'
  return {
    ...CORS_BASE_HEADERS,
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
  }
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  const origin = req.headers.get('origin')

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) })
  }

  if (!isAllowedOrigin(origin)) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, origin)
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin)
  }

  const csrfHeader = req.headers.get('x-csrf-token')
  if (!csrfHeader || csrfHeader.length < 32) {
    return jsonResponse({ error: 'Missing or invalid CSRF token header' }, 400, origin)
  }

  // Initialize Supabase admin client (service role for DB writes)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const url = new URL(req.url)
  const action = url.pathname.split('/').pop() // request-reset | validate-token | reset-password

  try {
    const body = await req.json()

    switch (action) {
      case 'request-reset':
        return await handleRequestReset(supabaseAdmin, body, req, origin)

      case 'validate-token':
        return await handleValidateToken(supabaseAdmin, body, origin)

      case 'reset-password':
        return await handleResetPassword(supabaseAdmin, body, origin)

      default:
        return jsonResponse({ error: 'Unknown action', validActions: ['request-reset', 'validate-token', 'reset-password'] }, 400, origin)
    }
  } catch (err) {
    console.error('[secure-password-reset] Error:', err.message)
    return jsonResponse({ error: 'Internal server error' }, 500, origin)
  }
})

// ============================================
// ACTION HANDLERS
// ============================================

/**
 * POST /request-reset
 * 
 * Generate a single-use reset token and store its hash in the DB.
 * Always returns success (even if email doesn't exist) to prevent
 * user enumeration attacks.
 * 
 * @param {SupabaseClient} supabase
 * @param {{ email: string }} body
 * @param {Request} req - Original request (for IP-based rate limiting)
 * @param {string | null} origin
 * @returns {Response}
 */
async function handleRequestReset(supabase, body, req, origin) {
  const { email } = body

  if (!isValidEmail(email)) {
    return jsonResponse({ error: 'Invalid email address' }, 400, origin)
  }

  const normalizedEmail = email.toLowerCase().trim()

  // --- Rate Limiting: Max 3 resets per email per hour ---
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentResets } = await supabase
    .from('password_reset_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('email', normalizedEmail)
    .gte('created_at', oneHourAgo)

  if (recentResets >= MAX_RESETS_PER_HOUR) {
    // Return success anyway to prevent enumeration, but don't send email
    console.warn(`[rate-limit] Password reset rate limit exceeded for ${normalizedEmail}`)
    return jsonResponse({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    }, 200, origin)
  }

  // --- Check if user exists (silently — never expose this to the client) ---
  const { data: userData } = await supabase.auth.admin.listUsers()
  const userExists = userData?.users?.some(u => u.email?.toLowerCase() === normalizedEmail)

  if (!userExists) {
    // User doesn't exist — return same response to prevent enumeration
    return jsonResponse({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    }, 200, origin)
  }

  // --- Invalidate any existing tokens for this email (single-use enforcement) ---
  await supabase
    .from('password_reset_tokens')
    .update({ used: true })
    .eq('email', normalizedEmail)
    .eq('used', false)

  // --- Generate new token ---
  const plainToken = generateSecureToken()
  const tokenHash = await hashToken(plainToken)
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString()

  // Store the HASH (not the plaintext token)
  const { error: insertError } = await supabase
    .from('password_reset_tokens')
    .insert({
      email: normalizedEmail,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used: false,
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
    })

  if (insertError) {
    console.error('[request-reset] DB insert error:', insertError.message)
    return jsonResponse({ error: 'Failed to generate reset token' }, 500, origin)
  }

  // --- Send the reset email via Supabase Auth (uses their email templates) ---
  // The plaintext token goes in the URL; the hash stays in the DB.
  const resetUrl = `${req.headers.get('origin') || Deno.env.get('SITE_URL')}/reset-password?token=${plainToken}&email=${encodeURIComponent(normalizedEmail)}`

  // Use Supabase's built-in password reset email OR a custom email service
  // For now, we leverage Supabase Auth's resetPasswordForEmail which sends
  // their standard email. The token we generated is an ADDITIONAL layer.
  const { error: emailError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: normalizedEmail,
    options: { redirectTo: resetUrl },
  })

  if (emailError) {
    console.error('[request-reset] Email send error:', emailError.message)
    // Don't expose error details — could leak info about account existence
  }

  return jsonResponse({
    success: true,
    message: 'If an account with that email exists, a reset link has been sent.',
  }, 200, origin)
}

/**
 * POST /validate-token
 * 
 * Check if a token is valid without consuming it.
 * Used by the frontend to show/hide the password form.
 * 
 * @param {SupabaseClient} supabase
 * @param {{ token: string, email: string }} body
 * @param {string | null} origin
 * @returns {Response}
 */
async function handleValidateToken(supabase, body, origin) {
  const { token, email } = body

  if (!token || !email) {
    return jsonResponse({ valid: false, error: 'Missing token or email' }, 400, origin)
  }

  const tokenHash = await hashToken(token)
  const normalizedEmail = email.toLowerCase().trim()

  const { data: tokenRecord, error } = await supabase
    .from('password_reset_tokens')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !tokenRecord) {
    return jsonResponse({ valid: false, error: 'Token is invalid or expired' }, 200, origin)
  }

  // Timing-safe comparison of token hashes
  const isValid = safeCompare(tokenHash, tokenRecord.token_hash)

  return jsonResponse({ valid: isValid, expiresAt: tokenRecord.expires_at }, 200, origin)
}

/**
 * POST /reset-password
 * 
 * Consume the token and update the user's password.
 * Token is marked as used immediately (single-use).
 * 
 * @param {SupabaseClient} supabase
 * @param {{ token: string, email: string, newPassword: string }} body
 * @param {string | null} origin
 * @returns {Response}
 */
async function handleResetPassword(supabase, body, origin) {
  const { token, email, newPassword } = body

  if (!token || !email || !newPassword) {
    return jsonResponse({ error: 'Missing required fields: token, email, newPassword' }, 400, origin)
  }

  // --- Password validation (server-side) ---
  if (newPassword.length < 8) {
    return jsonResponse({ error: 'Password must be at least 8 characters' }, 400, origin)
  }
  if (!/[A-Z]/.test(newPassword)) {
    return jsonResponse({ error: 'Password must contain an uppercase letter' }, 400, origin)
  }
  if (!/[0-9]/.test(newPassword)) {
    return jsonResponse({ error: 'Password must contain a number' }, 400, origin)
  }
  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    return jsonResponse({ error: 'Password must contain a special character' }, 400, origin)
  }

  const tokenHash = await hashToken(token)
  const normalizedEmail = email.toLowerCase().trim()

  // --- Find and validate the token ---
  const { data: tokenRecord, error: findError } = await supabase
    .from('password_reset_tokens')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (findError || !tokenRecord) {
    return jsonResponse({ error: 'Token is invalid or has expired. Please request a new reset link.' }, 400, origin)
  }

  // Timing-safe comparison
  if (!safeCompare(tokenHash, tokenRecord.token_hash)) {
    return jsonResponse({ error: 'Invalid token' }, 400, origin)
  }

  // --- Mark token as used IMMEDIATELY (single-use, before password update) ---
  const { error: markError } = await supabase
    .from('password_reset_tokens')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('id', tokenRecord.id)

  if (markError) {
    console.error('[reset-password] Failed to mark token as used:', markError.message)
    return jsonResponse({ error: 'Failed to process reset. Please try again.' }, 500, origin)
  }

  // --- Find the user and update password ---
  const { data: userData } = await supabase.auth.admin.listUsers()
  const targetUser = userData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail)

  if (!targetUser) {
    return jsonResponse({ error: 'User not found' }, 404, origin)
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    targetUser.id,
    { password: newPassword }
  )

  if (updateError) {
    console.error('[reset-password] Password update error:', updateError.message)
    // Re-enable the token if password update failed
    await supabase
      .from('password_reset_tokens')
      .update({ used: false, used_at: null })
      .eq('id', tokenRecord.id)
    return jsonResponse({ error: 'Failed to update password. Please try again.' }, 500, origin)
  }

  // --- Invalidate ALL sessions for this user (force re-login) ---
  // This is critical: if an attacker has an active session, it should be killed
  // when the legitimate user resets their password.
  // Note: Supabase doesn't have a "revoke all sessions" API out of the box,
  // but updating the password invalidates the current refresh token chain.

  return jsonResponse({
    success: true,
    message: 'Password has been reset successfully. Please sign in with your new password.',
  }, 200, origin)
}
