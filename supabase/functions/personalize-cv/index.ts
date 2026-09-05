// ─── personalize-cv Edge Function ──────────────────────────────────────
// Analyzes student's original DOCX text against target offer and tailors
// the CV with strict anti-hallucination guardrails.
// Accepts: POST { offer_id, cv_text, student_id }
// Returns: { success: true, tailored_cv: { headline, summary, highlighted_skills, experiences, match_analysis } }
// ─────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

function jsonResponse(body: Record<string, unknown>, status = 200, origin: string | null = null) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    })
}

function errorResponse(message: string, status = 400, origin: string | null = null) {
    return jsonResponse({ success: false, error: message }, status, origin)
}

interface TailoredCV {
    headline: string
    summary: string
    highlighted_skills: string[]
    experiences: Array<{
        job_title: string
        company: string
        start_date: string
        end_date: string
        is_current: boolean
        description: string
    }>
    match_analysis: string[]
}

function buildDeterministicFallback(
    student: any,
    offer: any,
    cvText: string,
    existingExperiences: any[] = []
): TailoredCV {
    const offerTitle = offer?.title || 'Opportunité'
    const companyName = offer?.companies?.company_name || 'Entreprise'
    const reqSkills: string[] = Array.isArray(offer?.req_skills) ? offer.req_skills : []
    const studentSkills: string[] = Array.isArray(student?.skills) ? student.skills : []

    const textLower = (cvText || '').toLowerCase()
    
    // Find overlapping skills mentioned in CV or student skills
    const matchingSkills = reqSkills.filter(skill => {
        const s = skill.toLowerCase()
        return textLower.includes(s) || studentSkills.some(sk => sk.toLowerCase() === s)
    })

    const highlightedSkills = matchingSkills.length > 0
        ? matchingSkills
        : (studentSkills.length > 0 ? studentSkills.slice(0, 5) : reqSkills.slice(0, 3))

    const headline = student?.headline
        ? `${student.headline} | Profil ciblé pour ${offerTitle}`
        : `Candidat qualifié pour ${offerTitle} chez ${companyName}`

    const summary = student?.bio
        ? `${student.bio.trim()} Profil aligné avec les exigences de ${companyName} pour le poste de ${offerTitle}.`
        : `Candidat motivé disposant de compétences clés en ${highlightedSkills.join(', ')}, prêt à contribuer aux missions de ${companyName} sur le poste de ${offerTitle}.`

    const experiences = existingExperiences.length > 0
        ? existingExperiences.map(exp => ({
            job_title: exp.job_title || 'Poste',
            company: exp.company || 'Entreprise',
            start_date: exp.start_date || '',
            end_date: exp.end_date || '',
            is_current: Boolean(exp.is_current),
            description: exp.description ? `${exp.description}` : 'Expérience professionnelle significative.'
        }))
        : [
            {
                job_title: 'Expérience mentionnée dans le CV',
                company: 'Parcours professionnel',
                start_date: '',
                end_date: '',
                is_current: false,
                description: cvText ? cvText.slice(0, 300).trim() + '...' : 'Détails du parcours disponibles sur le CV original.'
            }
        ]

    const matchAnalysis = [
        `Correspondance directe identifiée sur les compétences : ${highlightedSkills.slice(0, 3).join(', ') || 'Compétences clés du profil'}.`,
        `Parcours et réalisations orientés vers les missions principales de l'offre "${offerTitle}".`,
        `CV optimisé sans altération des faits réels pour faciliter l'évaluation par le recruteur de ${companyName}.`
    ]

    return {
        headline,
        summary,
        highlighted_skills: highlightedSkills,
        experiences,
        match_analysis: matchAnalysis
    }
}

serve(async (req) => {
    const origin = req.headers.get('origin')

    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: getCorsHeaders(origin) })
    }

    if (req.method !== 'POST') {
        return errorResponse('Method not allowed', 405, origin)
    }

    try {
        // ── 1. Auth check ──
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return errorResponse('Authorization required', 401, origin)
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const token = authHeader.replace(/^Bearer\s+/i, '').trim()
        let callerId: string | null = null

        // Try fetching user from auth token
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        })
        const { data: { user } } = await userClient.auth.getUser()

        if (user) {
            callerId = user.id
        } else {
            // Check if caller is service_role
            try {
                if (token === supabaseServiceKey) {
                    callerId = 'service_role'
                } else {
                    const parts = token.split('.')
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1]))
                        if (payload.role === 'service_role') {
                            callerId = 'service_role'
                        }
                    }
                }
            } catch (_) {
                // Ignore parse errors
            }
        }

        if (!callerId) {
            return errorResponse('Invalid or expired authentication token', 401, origin)
        }

        // Service client for elevated context fetching
        const adminClient = createClient(supabaseUrl, supabaseServiceKey)

        // ── 2. Parse Body ──
        const { offer_id, cv_text, student_id } = await req.json()

        const targetStudentId = callerId === 'service_role' ? (student_id || callerId) : callerId
        if (!offer_id) {
            return errorResponse('Missing required field: offer_id', 400, origin)
        }

        // ── 3. Fetch Context ──
        const [offerRes, studentRes, experiencesRes] = await Promise.all([
            adminClient
                .from('offers')
                .select('id, title, description, req_skills, company_id, companies!company_id(id, company_name, industry)')
                .eq('id', offer_id)
                .single(),
            adminClient
                .from('students')
                .select('id, display_name, headline, bio, location, skills, original_docx_url, cv_url')
                .eq('id', targetStudentId)
                .single(),
            adminClient
                .from('experiences')
                .select('job_title, company, start_date, end_date, is_current, description')
                .eq('student_id', targetStudentId)
                .order('start_date', { ascending: false })
        ])

        if (offerRes.error || !offerRes.data) {
            return errorResponse('Offer not found or inactive', 404, origin)
        }

        const offer = offerRes.data
        const student = studentRes.data || { id: targetStudentId, display_name: 'Candidat' }
        const existingExperiences = experiencesRes.data || []

        const cleanedCvText = (cv_text || '').trim()

        const apiKey = Deno.env.get('OPENROUTER_API_KEY')
        if (!apiKey) {
            console.warn('[personalize-cv] OPENROUTER_API_KEY is not configured; using deterministic fallback')
            const fallbackResult = buildDeterministicFallback(student, offer, cleanedCvText, existingExperiences)
            return jsonResponse({
                success: true,
                tailored_cv: fallbackResult,
                provider: 'local_fallback',
                warning: 'OPENROUTER_API_KEY is not configured'
            }, 200, origin)
        }

        // ── 4. Call AI Model with Strict Integrity Directives ──
        const systemPrompt = `You are an expert career consultant optimizing a student's CV for a specific job opportunity on MatchOp.

CRITICAL AND STRICT INTEGRITY DIRECTIVE:
Under NO circumstances are you allowed to invent, fabricate, assume, or hallucinate:
- New companies, jobs, or internships.
- New dates, degrees, certifications, or schools.
- New skills or achievements not found in the original CV.

YOUR OPTIMIZATION SCOPE IS EXCLUSIVELY:
1. Tailor the professional headline and summary to highlight how the candidate's actual qualifications address this specific job description.
2. Filter and prioritize the candidate's real skills that directly match the job's required skills.
3. Enhance bullet points and descriptions of the candidate's ACTUAL past experiences using strong action verbs and industry keywords relevant to the offer, without changing the factual truth of what they did.
4. Produce a concise "match_analysis" (3 bullet points) explaining how the candidate's profile was tailored for this role.

Return valid JSON strictly adhering to this schema:
{
  "headline": "string",
  "summary": "string",
  "highlighted_skills": ["string"],
  "experiences": [
    {
      "job_title": "string",
      "company": "string",
      "start_date": "string",
      "end_date": "string",
      "is_current": boolean,
      "description": "string"
    }
  ],
  "match_analysis": ["string"]
}`

        const userPrompt = `TARGET JOB OFFER:
Title: ${offer.title}
Company: ${offer.companies?.company_name || 'MatchOp Partner'}
Required Skills: ${Array.isArray(offer.req_skills) ? offer.req_skills.join(', ') : 'Non spécifié'}
Description:
${offer.description || 'Non spécifiée'}

CANDIDATE ORIGINAL PROFILE:
Name: ${student.display_name || 'Candidat'}
Current Headline: ${student.headline || 'Non renseigné'}
Current Bio: ${student.bio || 'Non renseignée'}
Recorded Skills: ${Array.isArray(student.skills) ? student.skills.join(', ') : 'Non renseigné'}
Existing Experiences in database:
${JSON.stringify(existingExperiences, null, 2)}

ORIGINAL CV TEXT EXTRACTED FROM DOCX:
"""
${cleanedCvText || 'Aucun texte DOCX fourni, utiliser les informations du profil ci-dessus.'}
"""

Optimize the candidate's CV specifically for this offer according to the system prompt instructions. Return ONLY valid JSON matching the schema.`

        const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://matchop.vercel.app',
                'X-Title': 'MatchOp CV Personalizer',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.3-70b-instruct',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' },
                max_tokens: 1500,
                temperature: 0.2, // Low temperature to minimize creative hallucination
            }),
        })

        if (!aiResponse.ok) {
            const errText = await aiResponse.text()
            console.error('[personalize-cv] OpenRouter error:', errText)
            const fallbackResult = buildDeterministicFallback(student, offer, cleanedCvText, existingExperiences)
            return jsonResponse({
                success: true,
                tailored_cv: fallbackResult,
                provider: 'local_fallback',
                warning: 'OpenRouter returned non-200'
            }, 200, origin)
        }

        const data = await aiResponse.json()
        const rawContent = data.choices?.[0]?.message?.content

        if (!rawContent) {
            throw new Error('Empty response from AI service')
        }

        let parsedJson: TailoredCV
        try {
            parsedJson = JSON.parse(rawContent)
        } catch {
            const cleaned = rawContent.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
            parsedJson = JSON.parse(cleaned)
        }

        return jsonResponse({
            success: true,
            tailored_cv: parsedJson,
            provider: 'openrouter'
        }, 200, origin)

    } catch (error) {
        console.error('[personalize-cv] Unexpected error:', error)
        return errorResponse(
            error instanceof Error ? error.message : 'An unexpected error occurred during CV personalization',
            500,
            origin
        )
    }
})
