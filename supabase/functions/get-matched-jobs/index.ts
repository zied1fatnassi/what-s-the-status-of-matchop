import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Get job offers ranked by similarity to student's profile embedding
 * Falls back to regular query if embeddings not available
 */
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing authorization header'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        // Create client with user's auth to get their profile
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        })

        // Create service client for embedding queries
        const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

        // Get current user
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Not authenticated'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        // Get student's embedding
        const { data: studentData, error: studentError } = await supabaseService
            .from('students')
            .select('embedding')
            .eq('id', user.id)
            .single()

        // Get already swiped offer IDs
        const { data: swipedData } = await supabaseUser
            .from('student_swipes')
            .select('offer_id')
            .eq('student_id', user.id)

        const swipedIds = swipedData?.map(s => s.offer_id) || []

        // If student has embedding, use similarity search
        if (studentData?.embedding) {
            // Use RPC function for vector similarity (need to create this)
            const { data: matches, error: matchError } = await supabaseService
                .rpc('match_jobs_for_student', {
                    student_embedding: studentData.embedding,
                    excluded_ids: swipedIds,
                    match_count: 20
                })

            if (!matchError && matches && matches.length > 0) {
                // Enrich with company data
                const enrichedMatches = await enrichWithCompanyData(supabaseService, matches)

                return new Response(JSON.stringify({
                    success: true,
                    offers: enrichedMatches,
                    method: 'semantic'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }
        }

        // Fallback: Regular query without similarity
        let query = supabaseService
            .from('offers')
            .select('*, companies!company_id(id, company_name, logo_url, industry)')
            .eq('status', 'active')
            .limit(20)


        if (swipedIds.length > 0) {
            query = query.not('id', 'in', `(${swipedIds.join(',')})`)
        }

        const { data: offers, error: offersError } = await query

        if (offersError) {
            return new Response(JSON.stringify({
                success: false,
                error: offersError.message
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            })
        }

        // Transform offers — explicitly tag as internal MatchOp offers
        const transformedOffers = (offers || []).map(offer => ({
            ...offer,
            company: offer.companies?.company_name || 'Unknown Company',
            companyLogo: offer.companies?.logo_url,
            industry: offer.companies?.industry,
            salary: offer.salary_range || 'Competitive',
            skills: offer.req_skills || [],
            matchScore: null, // No score in fallback mode
            isExternal: false,
            externalUrl: null
        }))

        return new Response(JSON.stringify({
            success: true,
            offers: transformedOffers,
            method: 'fallback'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Get Matched Jobs Error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'An unexpected error occurred'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

// Helper to enrich matches with company data
async function enrichWithCompanyData(supabase: any, matches: any[]) {
    const offerIds = matches.map(m => m.id)

    const { data: offersWithCompanies } = await supabase
        .from('offers')
        .select('*, companies!company_id(id, company_name, logo_url, industry)')
        .in('id', offerIds)

    const offerMap = new Map(offersWithCompanies?.map(o => [o.id, o]) || [])

    return matches.map(match => {
        const offer = offerMap.get(match.id) || match
        return {
            ...offer,
            company: offer.companies?.company_name || 'Unknown Company',
            companyLogo: offer.companies?.logo_url,
            industry: offer.companies?.industry,
            salary: offer.salary_range || 'Competitive',
            skills: offer.req_skills || [],
            matchScore: match.similarity, // Include the similarity score
            isExternal: false,
            externalUrl: null
        }
    })
}
