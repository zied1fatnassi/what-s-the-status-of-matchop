import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type SwipeDirection = 'left' | 'right'

type RequestBody = {
  student_id?: string
  offer_id?: string
  direction?: 'left' | 'right' | 'super'
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

function normalizeDirection(raw: unknown): SwipeDirection | null {
  if (raw === 'left') return 'left'
  if (raw === 'right' || raw === 'super') return 'right'
  return null
}

function shortUserTag(userId: string) {
  return `${userId.slice(0, 8)}...`
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

    const offerId = String(body.offer_id ?? '').trim()
    const direction = normalizeDirection(body.direction)
    const studentId = String(body.student_id ?? user.id).trim()

    if (!offerId) {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'offer_id is required' }, 400)
    }

    if (!direction) {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'direction must be left, right, or super' }, 400)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    const { data, error } = await userClient.rpc('record_student_swipe_with_limit', {
      p_student_id: studentId,
      p_offer_id: offerId,
      p_direction: direction,
    })

    if (error) {
      console.error(`[record-swipe] db error user=${shortUserTag(user.id)} message=${error.message}`)
      return jsonResponse({ code: 'DB_ERROR', message: 'Failed to record swipe' }, 500)
    }

    if (!data || typeof data !== 'object') {
      return jsonResponse({ code: 'INVALID_RESPONSE', message: 'record_student_swipe_with_limit returned invalid payload' }, 500)
    }

    const payload = data as Record<string, unknown>
    const code = String(payload.code ?? 'OK')

    if (code === 'LIMIT_REACHED') {
      return jsonResponse(payload, 429)
    }

    if (code === 'ALREADY_SWIPED') {
      return jsonResponse(payload, 409)
    }

    if (payload.success === false) {
      return jsonResponse(payload, 400)
    }

    console.log(
      `[record-swipe] user=${shortUserTag(user.id)} student=${shortUserTag(studentId)} offer=${offerId.slice(0, 8)}... code=${code}`,
    )

    return jsonResponse(payload, 200)
  } catch (error) {
    console.error('[record-swipe] unhandled error', error)
    return jsonResponse({ code: 'INTERNAL_ERROR', message: 'Failed to record swipe' }, 500)
  }
})

