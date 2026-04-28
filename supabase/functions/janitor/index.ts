import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * MATCHOP JANITOR — Scheduled Maintenance Edge Function
 * 
 * Runs every 24 hours (triggered by pg_cron, GitHub Action, or external scheduler).
 * 
 * Tasks:
 * 1. Expire intros older than 7 days (pending → expired)
 * 2. Recalculate elo_score based on user activity
 * 3. Return a digest summary of pending intros per company
 * 
 * Invoke manually:  curl -X POST <SUPABASE_URL>/functions/v1/janitor \
 *                    -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
 *                    -H "Content-Type: application/json"
 */

const CORS_BASE_HEADERS = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: getCorsHeaders(req.headers.get('origin')) })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        // Use service role to bypass RLS — this is an admin-level operation
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // =============================================
        // TASK 1: Run the janitor DB function
        // Expires stale intros + updates elo scores
        // =============================================
        const { data: janitorResult, error: janitorError } = await supabase
            .rpc('run_daily_janitor')

        if (janitorError) {
            console.error('[Janitor] DB function error:', janitorError)
            throw new Error(`Janitor function failed: ${janitorError.message}`)
        }

        console.log('[Janitor] DB function result:', janitorResult)

        // =============================================
        // TASK 2: Build digest of pending intros
        // Groups pending intros by company for digest
        // =============================================
        const { data: pendingDigest, error: digestError } = await supabase
            .from('intros')
            .select(`
                company_id,
                companies!company_id (
                    company_name
                )
            `)
            .eq('status', 'pending')

        if (digestError) {
            console.error('[Janitor] Digest query error:', digestError)
        }

        // Aggregate by company
        const companyDigest = new Map()
        pendingDigest?.forEach(intro => {
            const companyId = intro.company_id
            if (!companyDigest.has(companyId)) {
                companyDigest.set(companyId, {
                    company_id: companyId,
                    company_name: intro.companies?.company_name || 'Unknown',
                    pending_count: 0
                })
            }
            companyDigest.get(companyId).pending_count++
        })

        const digest = Array.from(companyDigest.values())
            .filter(d => d.pending_count > 0)
            .sort((a, b) => b.pending_count - a.pending_count)

        console.log('[Janitor] Companies with pending intros:', digest.length)

        // =============================================
        // TASK 3: Log the digest (future: send emails)
        // For now, we store the digest result as a return.
        // When email service is integrated, this is where
        // you'd iterate `digest` and send each company
        // a "You have X pending candidates" email.
        // =============================================

        const result = {
            success: true,
            janitor: janitorResult,
            digest: {
                companies_with_pending_intros: digest.length,
                details: digest
            },
            run_at: new Date().toISOString()
        }

        console.log('[Janitor] Complete:', JSON.stringify(result))

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('[Janitor] Fatal error:', error.message)
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            run_at: new Date().toISOString()
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
