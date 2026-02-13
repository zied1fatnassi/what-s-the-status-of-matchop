/**
 * Ingest Partner Offers — Supabase Edge Function
 *
 * Receives job offers from verified partners via authenticated API.
 * Partners authenticate with X-Partner-Key header (validated against
 * SHA-256 hash stored in the partners table).
 *
 * Endpoint:
 *   POST /ingest-partner-offers
 *
 * Headers:
 *   X-Partner-Key: <raw-api-key>
 *
 * Body (JSON):
 *   { "offers": [ { title, company, location, ... }, ... ] }
 *
 * Security:
 *   - API key is hashed and compared against DB (never stored raw)
 *   - Only 'active' partners may ingest
 *   - Uses service_role to bypass RLS for inserts
 *   - Input validated and sanitised before insert
 *
 * @module ingest-partner-offers
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

// ============================================
// CONSTANTS
// ============================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-partner-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_OFFERS_PER_REQUEST = 100

// ============================================
// HELPERS
// ============================================

/**
 * SHA-256 hash a string and return its hex encoding.
 * Used to hash the incoming X-Partner-Key for DB lookup.
 */
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate and sanitise a single offer payload.
 * Returns { valid: true, offer } or { valid: false, reason }.
 */
function validateOffer(raw: Record<string, unknown>): { valid: true; offer: Record<string, unknown> } | { valid: false; reason: string } {
  if (!raw.title || typeof raw.title !== 'string' || raw.title.trim().length === 0) {
    return { valid: false, reason: 'Missing or empty "title"' }
  }
  if (!raw.company || typeof raw.company !== 'string' || raw.company.trim().length === 0) {
    return { valid: false, reason: 'Missing or empty "company"' }
  }

  // Build a clean offer object with known fields only
  const offer: Record<string, unknown> = {
    title: raw.title.trim().slice(0, 255),
    company: raw.company.trim().slice(0, 255),
    location: typeof raw.location === 'string' ? raw.location.trim().slice(0, 255) : null,
    description: typeof raw.description === 'string' ? raw.description.trim().slice(0, 5000) : null,
    type: typeof raw.type === 'string' ? raw.type.trim().slice(0, 50) : 'Full-time',
    department: typeof raw.department === 'string' ? raw.department.trim().slice(0, 100) : null,
    salary: typeof raw.salary === 'string' ? raw.salary.trim().slice(0, 100) : null,
    duration: typeof raw.duration === 'string' ? raw.duration.trim().slice(0, 100) : null,
    skills: Array.isArray(raw.skills) ? raw.skills.filter(s => typeof s === 'string').slice(0, 20) : [],
    url: typeof raw.url === 'string' ? raw.url.trim().slice(0, 2048) : null,

    // Partner-model specific fields
    is_exclusive: typeof raw.is_exclusive === 'boolean' ? raw.is_exclusive : false,
    is_leak: typeof raw.is_leak === 'boolean' ? raw.is_leak : false,
    bounty_value: typeof raw.bounty_value === 'number' && raw.bounty_value >= 0 ? raw.bounty_value : 0,
  }

  return { valid: true, offer }
}

// ============================================
// REQUEST HANDLER
// ============================================

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // ── 1. Extract & validate API key ───────────────────
    const partnerKey = req.headers.get('x-partner-key')
    if (!partnerKey || partnerKey.length < 32) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid X-Partner-Key header' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── 2. Initialise Supabase client (service_role to bypass RLS) ──
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    // ── 3. Hash the key and look up the partner ─────────
    const keyHash = await sha256Hex(partnerKey)

    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, company_name, status')
      .eq('api_key_hash', keyHash)
      .single()

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    if (partner.status !== 'active') {
      return new Response(
        JSON.stringify({ error: `Partner account is ${partner.status}` }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── 4. Parse request body ───────────────────────────
    const body = await req.json()

    if (!body.offers || !Array.isArray(body.offers)) {
      return new Response(
        JSON.stringify({ error: 'Body must contain an "offers" array' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    if (body.offers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Offers array is empty' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    if (body.offers.length > MAX_OFFERS_PER_REQUEST) {
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_OFFERS_PER_REQUEST} offers per request` }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── 5. Validate each offer ──────────────────────────
    const validOffers: Record<string, unknown>[] = []
    const errors: { index: number; reason: string }[] = []

    for (let i = 0; i < body.offers.length; i++) {
      const result = validateOffer(body.offers[i])
      if (result.valid) {
        validOffers.push({
          ...result.offer,
          partner_id: partner.id,
        })
      } else {
        errors.push({ index: i, reason: result.reason })
      }
    }

    if (validOffers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid offers in payload', details: errors }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── 6. Insert into offers table ─────────────────────
    const { data: inserted, error: insertError } = await supabase
      .from('offers')
      .insert(validOffers)
      .select('id, title')

    if (insertError) {
      console.error('[ingest-partner-offers] Insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Database insert failed', detail: insertError.message }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── 7. Success response ─────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        partner: partner.company_name,
        inserted: inserted?.length ?? 0,
        rejected: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 201, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[ingest-partner-offers] Unhandled error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
