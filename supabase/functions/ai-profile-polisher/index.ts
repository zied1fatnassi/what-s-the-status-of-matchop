import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

function improveBioLocally(bio: string, skills: string[] = [], headline = '') {
    let improved = bio.trim()

    if (!improved) return improved

    improved = improved.replace(/(^|\.\s+)([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`)
    improved = improved.charAt(0).toUpperCase() + improved.slice(1)

    if (!improved.match(/^(I am|I'm|As a|With|A passionate|A dedicated|A motivated)/i)) {
        const role = headline || 'professional'
        improved = `As a dedicated ${role}, ${improved.charAt(0).toLowerCase()}${improved.slice(1)}`
    }

    if (!/[.!?]$/.test(improved)) {
        improved += '.'
    }

    if (skills.length > 0) {
        const skillsMentioned = skills.some((skill) =>
            improved.toLowerCase().includes(String(skill).toLowerCase())
        )
        if (!skillsMentioned) {
            improved += ` My key skills include ${skills.slice(0, 5).join(', ')}.`
        }
    }

    return improved
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: getCorsHeaders(req.headers.get('origin')) })
    }

    try {
        // --- Auth check ---
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ success: false, error: 'Authorization required' }), {
                status: 401, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' }
            })
        }
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        )
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
                status: 401, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' }
            })
        }
        // --- End auth check ---

        const { bio, skills = [], headline = '' } = await req.json()

        // Validate - need something to work with
        if (!bio || bio.trim().length < 10) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Please enter at least a short bio to improve'
            }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const apiKey = Deno.env.get('OPENROUTER_API_KEY')
        if (!apiKey) {
            return new Response(JSON.stringify({
                success: true,
                bio: improveBioLocally(bio, skills, headline),
                fallback: true,
                provider: 'local',
                warning: 'OPENROUTER_API_KEY is not configured'
            }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        const skillsList = skills.length > 0 ? skills.join(', ') : 'not specified'

        const prompt = `You are a career counselor helping a student improve their professional bio.

Current bio:
"${bio}"

${headline ? `Their headline: "${headline}"` : ''}
Their skills: ${skillsList}

Rewrite this bio to be:
1. Professional but personable
2. Action-oriented with strong verbs
3. Highlighting their key strengths
4. Concise (150-250 words max)
5. Written in first person

Keep the same core information but make it more compelling for recruiters.
Only output the improved bio text, nothing else.`

        // Call OpenRouter API
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://matchop.vercel.app',
                'X-Title': 'MatchOp Profile Polisher',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.2-3b-instruct:free',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 500,
                temperature: 0.7,
            }),
        })

        if (!response.ok) {
            const errorData = await response.text()
            console.error('OpenRouter API Error:', errorData)
            return new Response(JSON.stringify({
                success: true,
                bio: improveBioLocally(bio, skills, headline),
                fallback: true,
                provider: 'local',
                warning: `AI service error: ${response.status}`
            }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        const data = await response.json()
        const improvedBio = data.choices?.[0]?.message?.content?.trim() || ''

        if (!improvedBio) {
            return new Response(JSON.stringify({
                success: true,
                bio: improveBioLocally(bio, skills, headline),
                fallback: true,
                provider: 'local',
                warning: 'AI response was empty'
            }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        return new Response(JSON.stringify({
            success: true,
            bio: improvedBio
        }), {
            headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Profile Polisher Error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred'
        }), {
            headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
