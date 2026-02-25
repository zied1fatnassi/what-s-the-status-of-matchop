import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DEFAULT_DAYS = 30
const MAX_DAYS = 365

type RequestBody = {
  user_id?: string
  days?: number
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function getBearerToken(authHeader: string | null) {
  if (!authHeader) return null
  const [scheme, token] = authHeader.split(' ')
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null
  return token.trim()
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeDays(raw: unknown) {
  const parsed = Number(raw ?? DEFAULT_DAYS)
  if (!Number.isFinite(parsed)) return DEFAULT_DAYS
  const intDays = Math.trunc(parsed)
  if (intDays < 1) return 1
  if (intDays > MAX_DAYS) return MAX_DAYS
  return intDays
}

function shortUserTag(userId: string) {
  return `${userId.slice(0, 8)}...`
}

function hasAdminClaim(user: { app_metadata?: Record<string, unknown> | null; user_metadata?: Record<string, unknown> | null }) {
  const appRole = String(user.app_metadata?.role ?? '').toLowerCase()
  const appRoles = Array.isArray(user.app_metadata?.roles)
    ? user.app_metadata?.roles.map((entry) => String(entry).toLowerCase())
    : []
  const userRole = String(user.user_metadata?.role ?? '').toLowerCase()

  return appRole === 'admin' || appRoles.includes('admin') || userRole === 'admin'
}

async function isRequesterAdmin(
  userClient: ReturnType<typeof createClient>,
  user: { id: string; app_metadata?: Record<string, unknown> | null; user_metadata?: Record<string, unknown> | null },
) {
  if (hasAdminClaim(user)) return true

  const userProfiles = await userClient
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('profile_type', 'admin')
    .limit(1)

  if (!userProfiles.error && Array.isArray(userProfiles.data) && userProfiles.data.length > 0) {
    return true
  }

  const userProfileError = userProfiles.error?.message?.toLowerCase() ?? ''
  if (userProfiles.error && !userProfileError.includes('user_profiles') && !userProfileError.includes('profile_type')) {
    console.warn(`[grant-premium-dev] unexpected user_profiles lookup error: ${userProfiles.error.message}`)
  }

  const legacyProfile = await userClient
    .from('profiles')
    .select('id, role, type')
    .eq('id', user.id)
    .maybeSingle()

  if (legacyProfile.error || !legacyProfile.data) {
    return false
  }

  const role = String((legacyProfile.data as Record<string, unknown>).role ?? '').toLowerCase()
  const type = String((legacyProfile.data as Record<string, unknown>).type ?? '').toLowerCase()

  return role === 'admin' || type === 'admin'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ code: 'METHOD_NOT_ALLOWED', message: 'Use POST' }, 405)
  }

  if (Deno.env.get('ALLOW_DEV_PREMIUM_GRANT') !== 'true') {
    return jsonResponse(
      {
        code: 'DISABLED',
        message: 'grant-premium-dev is disabled. Set ALLOW_DEV_PREMIUM_GRANT=true in local/dev only.',
      },
      403,
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ code: 'SERVER_MISCONFIG', message: 'Supabase env vars are missing' }, 500)
    }

    const token = getBearerToken(req.headers.get('Authorization'))
    if (!token) {
      return jsonResponse({ code: 'UNAUTHORIZED', message: 'Authorization bearer token required' }, 401)
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return jsonResponse({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' }, 401)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    const admin = await isRequesterAdmin(userClient, user)
    if (!admin) {
      return jsonResponse({ code: 'FORBIDDEN', message: 'Admin access required' }, 403)
    }

    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'Invalid JSON body' }, 400)
    }

    const targetUserId = String(body.user_id ?? '').trim()
    if (!targetUserId || !isUuid(targetUserId)) {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'user_id must be a valid UUID' }, 400)
    }

    const days = normalizeDays(body.days)
    const premiumExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: updated, error: updateError } = await serviceClient
      .from('profiles')
      .update({
        is_premium: true,
        premium_expires_at: premiumExpiresAt,
      })
      .eq('id', targetUserId)
      .select('id, is_premium, premium_expires_at')
      .maybeSingle()

    if (updateError) {
      console.error(`[grant-premium-dev] update failed by=${shortUserTag(user.id)} err=${updateError.message}`)
      return jsonResponse({ code: 'DB_ERROR', message: 'Failed to grant premium' }, 500)
    }

    if (!updated) {
      return jsonResponse({ code: 'NOT_FOUND', message: 'Target profile was not found' }, 404)
    }

    console.log(
      `[grant-premium-dev] granted by=${shortUserTag(user.id)} target=${shortUserTag(targetUserId)} days=${days}`,
    )

    return jsonResponse({
      success: true,
      code: 'OK',
      grant: {
        user_id: updated.id,
        is_premium: updated.is_premium,
        premium_expires_at: updated.premium_expires_at,
        days,
      },
    })
  } catch (error) {
    console.error('[grant-premium-dev] unhandled error', error)
    return jsonResponse({ code: 'INTERNAL_ERROR', message: 'Failed to grant premium' }, 500)
  }
})

