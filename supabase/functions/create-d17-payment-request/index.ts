import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const CORS_BASE_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DEV_ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173'])

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

const D17_PHONE = '+21652460278'
const PRICING: Record<'monthly' | 'yearly', number> = {
  monthly: 19,
  yearly: 149,
}
const DEFAULT_COOLDOWN_MINUTES = 10

type RequestBody = {
  plan_id?: string
}

type PlanId = keyof typeof PRICING

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

function parsePlanId(raw: unknown): PlanId | null {
  if (raw === 'monthly' || raw === 'yearly') return raw
  return null
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
    if (!supabaseUrl || !supabaseAnonKey) {
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

    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'Invalid JSON body' }, 400, origin)
    }

    const planId = parsePlanId(body.plan_id)
    if (!planId) {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'plan_id must be "monthly" or "yearly"' }, 400, origin)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    })

    const cooldownMinutesEnv = Number(Deno.env.get('PAYMENT_REQUEST_COOLDOWN_MINUTES') ?? DEFAULT_COOLDOWN_MINUTES)
    const cooldownMinutes = Number.isFinite(cooldownMinutesEnv) && cooldownMinutesEnv > 0
      ? Math.floor(cooldownMinutesEnv)
      : DEFAULT_COOLDOWN_MINUTES

    const cooldownRes = await userClient.rpc('payment_requests_recent_pending_count', {
      p_user_id: user.id,
      p_minutes: cooldownMinutes,
    })

    if (cooldownRes.error) {
      console.error('[create-d17-payment-request] cooldown check failed', cooldownRes.error)
      return jsonResponse({ code: 'DB_ERROR', message: 'Failed to validate payment cooldown' }, 500, origin)
    }

    if ((cooldownRes.data ?? 0) > 0) {
      return jsonResponse(
        {
          code: 'COOLDOWN_ACTIVE',
          message: `You have an existing pending request created less than ${cooldownMinutes} minutes ago.`,
          cooldown_minutes: cooldownMinutes,
        },
        429,
        origin,
      )
    }

    const insertRes = await userClient
      .from('payment_requests')
      .insert({
        user_id: user.id,
        plan_id: planId,
        amount_tnd: PRICING[planId],
        currency: 'TND',
        d17_phone: D17_PHONE,
      })
      .select('id, plan_id, amount_tnd, currency, d17_phone, reference, status, created_at')
      .single()

    if (insertRes.error) {
      if (insertRes.error.code === '23505') {
        const pendingRes = await userClient
          .from('payment_requests')
          .select('id, plan_id, amount_tnd, currency, d17_phone, reference, status, created_at')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        return jsonResponse(
          {
            code: 'PENDING_EXISTS',
            message: 'A pending payment request already exists for this user.',
            payment_request: pendingRes.data ?? null,
          },
          409,
          origin,
        )
      }

      console.error('[create-d17-payment-request] insert failed', insertRes.error)
      return jsonResponse({ code: 'DB_ERROR', message: 'Failed to create payment request' }, 500, origin)
    }

    const paymentRequest = insertRes.data
    return jsonResponse({
      success: true,
      paymentRequestId: paymentRequest.id,
      reference: paymentRequest.reference,
      amount_tnd: paymentRequest.amount_tnd,
      currency: paymentRequest.currency,
      d17_phone: paymentRequest.d17_phone,
      status: paymentRequest.status,
      created_at: paymentRequest.created_at,
      plan_id: paymentRequest.plan_id,
    }, 200, origin)
  } catch (error) {
    console.error('[create-d17-payment-request] unhandled error', error)
    return jsonResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create payment request' }, 500, origin)
  }
})
