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

function buildFallbackDescription(
    jobTitle: string,
    department?: string,
    jobType?: string,
    tone = 'professional'
) {
    const normalizedTone = tone || 'professional'
    const normalizedType = jobType || 'Internship'
    const normalizedDepartment = department ? ` in ${department}` : ''

    return `## About the role
We are hiring a **${jobTitle}**${normalizedDepartment}. This ${normalizedType.toLowerCase()} position is ideal for someone eager to learn, contribute quickly, and grow in a ${normalizedTone} team environment.

## Key Responsibilities
- Contribute to active projects and support day-to-day execution.
- Collaborate with teammates to deliver high-quality outcomes.
- Communicate progress, blockers, and solutions clearly.
- Follow best practices for planning, documentation, and delivery.

## What You'll Learn
- Real-world workflows and collaboration standards.
- Technical and professional skills relevant to the role.
- How to work effectively in cross-functional teams.

## Qualifications
- Strong motivation to learn and take ownership of tasks.
- Good communication and teamwork skills.
- Basic background relevant to the role (coursework, projects, or internships).
- Ability to work in a ${normalizedTone} and fast-paced environment.`
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

        const { jobTitle, department, jobType, tone = 'professional' } = await req.json()

        // Validate required fields
        if (!jobTitle) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Job title is required'
            }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const apiKey = Deno.env.get('OPENROUTER_API_KEY')
        if (!apiKey) {
            return new Response(JSON.stringify({
                success: true,
                description: buildFallbackDescription(jobTitle, department, jobType, tone),
                fallback: true,
                provider: 'local',
                warning: 'OPENROUTER_API_KEY is not configured'
            }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        const prompt = `You are a hiring manager writing a job description for a company.
Job title: ${jobTitle}
${department ? `Department: ${department}` : ''}
${jobType ? `Position type: ${jobType}` : ''}

Write a compelling job description in a ${tone} tone with the following structure:

1. **Opening paragraph** (2-3 sentences): Describe the role's purpose and impact on the company. Make it exciting and engaging for students/interns.

2. **Key Responsibilities** (4-5 bullet points): List the main tasks and duties. Use action verbs.

3. **What You'll Learn** (3-4 bullet points): Highlight growth opportunities and skills they'll develop.

4. **Qualifications** (3-4 bullet points): Required and preferred qualifications. Be realistic for student/intern level.

Keep the total length under 300 words. Use markdown formatting for headers and bullets.
Write in a ${tone} but energetic tone that appeals to young professionals.`

        // Call OpenRouter API (OpenAI-compatible)
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://matchop.vercel.app',
                'X-Title': 'MatchOp Job Description Generator',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.2-3b-instruct:free',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 800,
                temperature: 0.7,
            }),
        })

        if (!response.ok) {
            const errorData = await response.text()
            console.error('OpenRouter API Error:', errorData)
            return new Response(JSON.stringify({
                success: true,
                description: buildFallbackDescription(jobTitle, department, jobType, tone),
                fallback: true,
                provider: 'local',
                warning: `OpenRouter API error: ${response.status}`
            }), {
                headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        const data = await response.json()
        const description = data.choices?.[0]?.message?.content || ''

        if (!description.trim()) {
            return new Response(JSON.stringify({
                success: true,
                description: buildFallbackDescription(jobTitle, department, jobType, tone),
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
            description
        }), {
            headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('AI Job Description Error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred'
        }), {
            headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})



