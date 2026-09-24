import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const CORS_BASE_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DEV_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

function getAllowedOrigins() {
  const siteUrl = (Deno.env.get('SITE_URL') ?? '').trim().replace(/\/+$/, '')
  const allowed = new Set(DEV_ORIGINS)
  if (siteUrl) allowed.add(siteUrl)
  return allowed
}

function getCorsHeaders(origin: string | null) {
  const allowed = getAllowedOrigins()
  const allowOrigin = origin && allowed.has(origin) ? origin : 'null'
  return { ...CORS_BASE_HEADERS, 'Access-Control-Allow-Origin': allowOrigin, 'Vary': 'Origin' }
}

type ReviewAction = 'approve' | 'reject' | 'revert'

type RequestBody = {
  paymentRequestId?: string
  action?: ReviewAction
  admin_note?: string
}

type AdminActionResponse = {
  ok?: boolean
  already_applied?: boolean
  error_code?: string | null
  message?: string | null
  payment_request?: Record<string, unknown> | null
  profile?: Record<string, unknown> | null
}

function jsonResponse(body: Record<string, unknown>, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

function getBearerToken(authHeader: string | null) {
  if (!authHeader) return null
  const [scheme, token] = authHeader.split(' ')
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null
  return token.trim()
}

function hasAdminClaim(user: { app_metadata?: Record<string, unknown> | null; user_metadata?: Record<string, unknown> | null }) {
  const appRole = String(user.app_metadata?.role ?? '').toLowerCase()
  const appRoles = Array.isArray(user.app_metadata?.roles)
    ? user.app_metadata?.roles.map((entry) => String(entry).toLowerCase())
    : []
  // SECURITY: Do NOT check user_metadata here — it is client-writable and can be spoofed.
  // Only app_metadata (server-writable) and the user_profiles DB table are trusted sources.
  return appRole === 'admin' || appRoles.includes('admin')
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

  const userProfilesError = userProfiles.error?.message?.toLowerCase() ?? ''
  if (userProfiles.error && !userProfilesError.includes('user_profiles') && !userProfilesError.includes('profile_type')) {
    console.warn(`[admin-review-payment] unexpected user_profiles lookup error: ${userProfiles.error.message}`)
  }

  const legacyProfile = await userClient
    .from('profiles')
    .select('id, role, type, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (legacyProfile.error || !legacyProfile.data) {
    return false
  }

  const role = String((legacyProfile.data as Record<string, unknown>).role ?? '').toLowerCase()
  const type = String((legacyProfile.data as Record<string, unknown>).type ?? '').toLowerCase()
  const isAdminFlag = Boolean((legacyProfile.data as Record<string, unknown>).is_admin ?? false)

  return role === 'admin' || type === 'admin' || isAdminFlag
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function mapRpcErrorToStatus(errorCode: string | null | undefined) {
  if (errorCode === 'NOT_FOUND') return 404
  if (errorCode === 'BAD_ACTION' || errorCode === 'BAD_DATA') return 400
  if (errorCode === 'PROFILE_NOT_FOUND' || errorCode === 'CONFLICT') return 409
  return 500
}

serve(async (req) => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ code: 'METHOD_NOT_ALLOWED', message: 'Use POST' }, 405, origin)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ code: 'SERVER_MISCONFIG', message: 'Supabase env vars are missing' }, 500, origin)
    }

    const token = getBearerToken(req.headers.get('Authorization'))
    if (!token) {
      return jsonResponse({ code: 'UNAUTHORIZED', message: 'Authorization bearer token required' }, 401, origin)
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return jsonResponse({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' }, 401, origin)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    })

    const isAdmin = await isRequesterAdmin(userClient, user)
    if (!isAdmin) {
      return jsonResponse({ code: 'FORBIDDEN', message: 'Admin access required' }, 403, origin)
    }

    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'Invalid JSON body' }, 400, origin)
    }

    const paymentRequestId = String(body.paymentRequestId ?? '').trim()
    const action = body.action
    const adminNote = body.admin_note ? String(body.admin_note).trim() : null

    if (!paymentRequestId || !isUuid(paymentRequestId)) {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'paymentRequestId must be a valid UUID' }, 400, origin)
    }

    if (action !== 'approve' && action !== 'reject' && action !== 'revert') {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'action must be "approve", "reject", or "revert"' }, 400, origin)
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const rpcRes = await serviceClient.rpc('payment_requests_apply_admin_action', {
      p_payment_request_id: paymentRequestId,
      p_action: action,
      p_admin_id: user.id,
      p_note: adminNote,
    })

    if (rpcRes.error) {
      console.error('[admin-review-payment] failed to apply admin action', rpcRes.error)
      return jsonResponse({ code: 'DB_ERROR', message: 'Failed to review payment request' }, 500, origin)
    }

    const rpcData = (rpcRes.data ?? null) as AdminActionResponse | null
    if (!rpcData || rpcData.ok !== true) {
      const errorCode = rpcData?.error_code ?? 'INTERNAL_ERROR'
      const message = rpcData?.message ?? 'Failed to review payment request'
      return jsonResponse(
        { code: errorCode, message },
        mapRpcErrorToStatus(errorCode),
        origin,
      )
    }

    const paymentRequest = rpcData.payment_request ?? null
    const profile = rpcData.profile ?? null

    return jsonResponse({
      success: true,
      alreadyApplied: Boolean(rpcData.already_applied),
      message: rpcData.message ?? null,
      paymentRequestId: paymentRequest?.id ?? paymentRequestId,
      userId: paymentRequest?.user_id ?? null,
      status: paymentRequest?.status ?? null,
      planId: paymentRequest?.plan_id ?? null,
      adminNote: paymentRequest?.admin_note ?? null,
      reviewedBy: paymentRequest?.reviewed_by ?? user.id,
      reviewedAt: paymentRequest?.reviewed_at ?? null,
      premiumExpiresAt: profile?.premium_expires_at ?? null,
    }, 200, origin)
  } catch (error) {
    console.error('[admin-review-payment] unhandled error', error)
    return jsonResponse({ code: 'INTERNAL_ERROR', message: 'Failed to review payment request' }, 500, origin)
  }
})
