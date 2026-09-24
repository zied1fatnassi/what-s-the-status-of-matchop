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

function getCorsHeaders(origin) {
    const allowed = getAllowedOrigins()
    const allowOrigin = origin && allowed.has(origin) ? origin : 'null'
    return { ...CORS_BASE_HEADERS, 'Access-Control-Allow-Origin': allowOrigin, 'Vary': 'Origin' }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: getCorsHeaders(req.headers.get('origin')) })
    }

    try {
        const { match_id } = await req.json()

        if (!match_id) {
            return new Response(JSON.stringify({ error: 'Missing match_id' }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        // 1. Authenticate User
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        })

        const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

        // 2. Fetch Match Details & Verify Ownership
        const { data: match, error: matchError } = await supabaseService
            .from('matches')
            .select(`
                student_id,
                offer_id,
                students (
                    display_name,
                    bio,
                    skills,
                    headline
                ),
                offers (
                    title,
                    description,
                    req_skills,
                    company_id,
                    companies (
                        company_name
                    )
                )
            `)
            .eq('id', match_id)
            .single()

        if (matchError || !match) {
            return new Response(JSON.stringify({ error: 'Match not found' }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 404,
            })
        }

        // Security Check: User must be the student OR the company
        const isStudent = match.student_id === user.id
        const isCompany = match.offers?.company_id === user.id

        if (!isStudent && !isCompany) {
            return new Response(JSON.stringify({ error: 'Forbidden: You are not part of this match' }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        const student = match.students
        const offer = match.offers
        const company = offer.companies?.company_name || 'the company'

        // 2. Construct Prompt for Llama 3.2
        const prompt = `
            You are a professional career coach. Generate 3 short, engaging conversation starters (icebreakers) for a student named ${student.display_name} to send to a recruiter at ${company}.
            
            Context:
            - Job: ${offer.title}
            - Student Headline: ${student.headline}
            - Student Skills: ${Array.isArray(student.skills) ? student.skills.join(', ') : student.skills}
            - Job Skills: ${Array.isArray(offer.req_skills) ? offer.req_skills.join(', ') : offer.req_skills}
            
            Rules:
            - Keep them professional but friendly.
            - Mention specific overlapping skills or interest in the role.
            - Less than 150 characters each.
            - Return ONLY a JSON array of strings. No markdown, no explanations.
            
            Example output:
            ["Hi! I saw you're looking for React devs. I recently built a dashboard using Next.js and would love to chat.", "Hello! I'm very interested in the ${offer.title} role. My background in Python seems like a great fit.", "Hi there! I admire ${company}'s work and would love to discuss how my design skills could contribute."]
        `

        // 3. Tailored fallback icebreakers based on actual offer/student data
        const studentSkillsList = Array.isArray(student.skills) ? student.skills : []
        const offerSkillsList = Array.isArray(offer.req_skills) ? offer.req_skills : []
        const overlappingSkills = studentSkillsList.filter(s => offerSkillsList.some(os => os.toLowerCase() === s.toLowerCase()))
        const skillMention = overlappingSkills.length > 0 ? overlappingSkills.slice(0, 2).join(' and ') : (studentSkillsList[0] || 'my skills')

        const fallbackSuggestions = [
            `Hi! I'm interested in the ${offer.title} position and would love to connect. My experience with ${skillMention} seems like a great match.`,
            `Hello! I saw your opening for ${offer.title} and think my background would be a great fit. Would love to learn more!`,
            `Hi there! I'd love to learn more about the team at ${company} and discuss how I could contribute to the ${offer.title} role.`
        ]

        // 4. Call OpenRouter (skip if key missing)
        let suggestions = fallbackSuggestions
        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')

        if (openRouterKey) {
            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openRouterKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'meta-llama/llama-3.2-3b-instruct:free',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.7,
                    }),
                })

                if (response.ok) {
                    const aiData = await response.json()
                    const content = aiData.choices?.[0]?.message?.content || '[]'

                    try {
                        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim()
                        const parsed = JSON.parse(cleanContent)
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            suggestions = parsed
                        }
                    } catch (parseErr) {
                        console.error('Failed to parse AI response:', content)
                        // Keep fallback suggestions
                    }
                } else {
                    console.error('OpenRouter API error:', response.status, await response.text())
                    // Keep fallback suggestions
                }
            } catch (apiErr) {
                console.error('OpenRouter API call failed:', apiErr.message)
                // Keep fallback suggestions
            }
        } else {
            console.warn('OPENROUTER_API_KEY not configured, using fallback icebreakers')
        }

        return new Response(JSON.stringify({ suggestions }), {
            headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
