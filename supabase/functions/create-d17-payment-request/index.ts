import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const D17_PHONE = '+21652460278'
const PRICING: Record<'monthly' | 'yearly', number> = {
  monthly: 19,
  yearly: 149,
}

type RequestBody = {
  plan_id?: string
}

type PlanId = keyof typeof PRICING

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

function parsePlanId(raw: unknown): PlanId | null {
  if (raw === 'monthly' || raw === 'yearly') return raw
  return null
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
    if (!supabaseUrl || !supabaseAnonKey) {
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

    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'Invalid JSON body' }, 400)
    }

    const planId = parsePlanId(body.plan_id)
    if (!planId) {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'plan_id must be "monthly" or "yearly"' }, 400)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    })

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
        )
      }

      console.error('[create-d17-payment-request] insert failed', insertRes.error)
      return jsonResponse({ code: 'DB_ERROR', message: 'Failed to create payment request' }, 500)
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
    })
  } catch (error) {
    console.error('[create-d17-payment-request] unhandled error', error)
    return jsonResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create payment request' }, 500)
  }
})
