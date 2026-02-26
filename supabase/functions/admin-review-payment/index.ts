import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PREMIUM_DAYS_BY_PLAN: Record<'monthly' | 'yearly', number> = {
  monthly: 30,
  yearly: 365,
}

type ReviewAction = 'approve' | 'reject'

type RequestBody = {
  paymentRequestId?: string
  action?: ReviewAction
  admin_note?: string
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ code: 'METHOD_NOT_ALLOWED', message: 'Use POST' }, 405)
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
        headers: { Authorization: `Bearer ${token}` },
      },
    })

    const isAdmin = await isRequesterAdmin(userClient, user)
    if (!isAdmin) {
      return jsonResponse({ code: 'FORBIDDEN', message: 'Admin access required' }, 403)
    }

    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'Invalid JSON body' }, 400)
    }

    const paymentRequestId = String(body.paymentRequestId ?? '').trim()
    const action = body.action
    const adminNote = body.admin_note ? String(body.admin_note).trim() : null

    if (!paymentRequestId || !isUuid(paymentRequestId)) {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'paymentRequestId must be a valid UUID' }, 400)
    }

    if (action !== 'approve' && action !== 'reject') {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'action must be "approve" or "reject"' }, 400)
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const existingRes = await serviceClient
      .from('payment_requests')
      .select('id, user_id, plan_id, status')
      .eq('id', paymentRequestId)
      .maybeSingle()

    if (existingRes.error) {
      console.error('[admin-review-payment] failed to load request', existingRes.error)
      return jsonResponse({ code: 'DB_ERROR', message: 'Failed to load payment request' }, 500)
    }

    if (!existingRes.data) {
      return jsonResponse({ code: 'NOT_FOUND', message: 'Payment request not found' }, 404)
    }

    if (existingRes.data.status !== 'pending') {
      return jsonResponse(
        {
          code: 'ALREADY_REVIEWED',
          message: `Payment request is already ${existingRes.data.status}.`,
          status: existingRes.data.status,
        },
        409,
      )
    }

    const nowIso = new Date().toISOString()
    const reviewStatus = action === 'approve' ? 'approved' : 'rejected'

    const reviewRes = await serviceClient
      .from('payment_requests')
      .update({
        status: reviewStatus,
        admin_note: adminNote,
        reviewed_by: user.id,
        reviewed_at: nowIso,
      })
      .eq('id', paymentRequestId)
      .eq('status', 'pending')
      .select('id, user_id, plan_id, status, admin_note, reviewed_by, reviewed_at')
      .maybeSingle()

    if (reviewRes.error) {
      console.error('[admin-review-payment] failed to review request', reviewRes.error)
      return jsonResponse({ code: 'DB_ERROR', message: 'Failed to update payment request status' }, 500)
    }

    if (!reviewRes.data) {
      return jsonResponse({ code: 'ALREADY_REVIEWED', message: 'Payment request is no longer pending.' }, 409)
    }

    let premiumExpiresAt: string | null = null

    if (action === 'approve') {
      const planId = reviewRes.data.plan_id as 'monthly' | 'yearly'
      const premiumDays = PREMIUM_DAYS_BY_PLAN[planId]
      if (!premiumDays) {
        return jsonResponse({ code: 'BAD_DATA', message: 'Payment request has invalid plan_id' }, 400)
      }

      premiumExpiresAt = new Date(Date.now() + premiumDays * 24 * 60 * 60 * 1000).toISOString()

      const profileRes = await serviceClient
        .from('profiles')
        .update({
          is_premium: true,
          premium_expires_at: premiumExpiresAt,
        })
        .eq('id', reviewRes.data.user_id)
        .select('id')
        .maybeSingle()

      if (profileRes.error || !profileRes.data) {
        console.error('[admin-review-payment] failed to activate premium', profileRes.error)
        return jsonResponse({ code: 'DB_ERROR', message: 'Failed to activate premium entitlement' }, 500)
      }
    }

    return jsonResponse({
      success: true,
      paymentRequestId: reviewRes.data.id,
      userId: reviewRes.data.user_id,
      status: reviewRes.data.status,
      planId: reviewRes.data.plan_id,
      adminNote: reviewRes.data.admin_note,
      reviewedBy: reviewRes.data.reviewed_by,
      reviewedAt: reviewRes.data.reviewed_at,
      premiumExpiresAt,
    })
  } catch (error) {
    console.error('[admin-review-payment] unhandled error', error)
    return jsonResponse({ code: 'INTERNAL_ERROR', message: 'Failed to review payment request' }, 500)
  }
})
