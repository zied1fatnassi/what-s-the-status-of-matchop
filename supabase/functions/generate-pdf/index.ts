// ─── generate-pdf Edge Function ──────────────────────────────────────
// Generates a branded, searchable PDF CV for a student profile.
// Accepts: POST { profile_id, profile_type, offer_id, tailored_cv }
// Returns: { url: signedUrl, storage_path: string, success: true }
// Supports:
//   - 'student-cv': standard profile export -> pdf-exports bucket
//   - 'personalized-cv': offer-tailored CV -> cvs bucket (personalized/${studentId}/${offerId}/cv.pdf)
// ─────────────────────────────────────────────────────────────────────

// @deno-types="https://esm.sh/v135/@types/react@18.2.0/index.d.ts"
import React from 'https://esm.sh/react@18.2.0'
import { renderToBuffer } from 'https://esm.sh/@react-pdf/renderer@3.4.5'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { StudentCV } from './templates/StudentCV.tsx'

// ─── CORS ────────────────────────────────────────────────────────────
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

// ─── Main Handler ────────────────────────────────────────────────────
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
        // ── 1. Parse Input ──
        const { profile_id, profile_type, offer_id, tailored_cv } = await req.json()

        if (!profile_id) {
            return errorResponse('Missing required field: profile_id', 400, origin)
        }

        // Default to student-cv
        const pdfType = profile_type || (tailored_cv ? 'personalized-cv' : 'student-cv')

        if (pdfType !== 'student-cv' && pdfType !== 'personalized-cv') {
            return errorResponse(`Unsupported profile_type: "${pdfType}". Supported: "student-cv", "personalized-cv".`, 400, origin)
        }

        if (pdfType === 'personalized-cv' && !offer_id) {
            return errorResponse('Missing required field for personalized-cv: offer_id', 400, origin)
        }

        // ── 2. Create Service-Role Client (bypasses RLS for data fetch + upload) ──
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        if (!supabaseUrl || !supabaseServiceKey) {
            return errorResponse('Server configuration error: missing Supabase credentials', 500, origin)
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // ── 3. Fetch Profile + Student Data ──
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, type, created_at')
            .eq('id', profile_id)
            .single()

        if (profileError || !profile) {
            console.error('Profile fetch error:', profileError)
            return errorResponse('Profile not found', 404, origin)
        }

        // Verify this is a student profile
        const userType = profile.type || profile.role
        if (userType !== 'student') {
            return errorResponse('PDF generation is currently only supported for student profiles', 400, origin)
        }

        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('display_name, bio, location, skills, avatar_url, headline, linkedin_url, github_url, portfolio_url, behance_url')
            .eq('id', profile_id)
            .single()

        if (studentError || !student) {
            console.error('Student fetch error:', studentError)
            return errorResponse('Student profile data not found', 404, origin)
        }

        // ── 4. Fetch Related Data (experiences, education, certifications) ──
        const [experiencesRes, educationRes, certificationsRes] = await Promise.all([
            supabase
                .from('experiences')
                .select('job_title, company, start_date, end_date, is_current, description')
                .eq('student_id', profile_id)
                .order('is_current', { ascending: false })
                .order('start_date', { ascending: false }),
            supabase
                .from('education')
                .select('institution, degree, field_of_study, start_date, end_date, is_current, grade')
                .eq('student_id', profile_id)
                .order('is_current', { ascending: false })
                .order('start_date', { ascending: false }),
            supabase
                .from('certifications')
                .select('name, issuing_organization, issue_date, expiry_date, credential_url')
                .eq('student_id', profile_id)
                .order('issue_date', { ascending: false }),
        ])

        const baseExperiences = experiencesRes.data || []
        const education = educationRes.data || []
        const certifications = certificationsRes.data || []

        // Apply tailored overrides if generating personalized CV
        const studentToRender = { ...student }
        let experiencesToRender = baseExperiences

        if (pdfType === 'personalized-cv' && tailored_cv) {
            if (tailored_cv.headline) {
                studentToRender.headline = tailored_cv.headline
            }
            if (tailored_cv.summary) {
                studentToRender.bio = tailored_cv.summary
            }
            if (Array.isArray(tailored_cv.highlighted_skills) && tailored_cv.highlighted_skills.length > 0) {
                studentToRender.skills = tailored_cv.highlighted_skills
            }
            if (Array.isArray(tailored_cv.experiences) && tailored_cv.experiences.length > 0) {
                experiencesToRender = tailored_cv.experiences.map((exp: any) => ({
                    job_title: exp.job_title || 'Poste',
                    company: exp.company || 'Entreprise',
                    start_date: exp.start_date || '',
                    end_date: exp.end_date || '',
                    is_current: Boolean(exp.is_current),
                    description: exp.description || ''
                }))
            }
        }

        // ── 5. Render PDF ──
        const generatedAt = new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })

        console.log(`[generate-pdf] Rendering PDF (${pdfType}) for ${student.display_name} (${profile_id})`)

        const pdfBuffer = await renderToBuffer(
            React.createElement(StudentCV, {
                profile: studentToRender,
                email: profile.email,
                experiences: experiencesToRender,
                education,
                certifications,
                generatedAt,
            })
        )

        const pdfBytes = new Uint8Array(pdfBuffer)

        // ── 6. Storage Destination ──
        const targetBucket = pdfType === 'personalized-cv' ? 'cvs' : 'pdf-exports'
        const storagePath = pdfType === 'personalized-cv'
            ? `personalized/${profile_id}/${offer_id}/cv.pdf`
            : `profiles/${profile_id}/cv.pdf`

        const { error: uploadError } = await supabase.storage
            .from(targetBucket)
            .upload(storagePath, pdfBytes, {
                contentType: 'application/pdf',
                cacheControl: '300',
                upsert: true,
            })

        if (uploadError) {
            console.error('Storage upload error:', uploadError)
            return errorResponse(`Failed to upload PDF: ${uploadError.message}`, 500, origin)
        }

        // ── 7. Create Signed URL (3600 seconds = 1 hour) ──
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from(targetBucket)
            .createSignedUrl(storagePath, 3600)

        if (signedUrlError || !signedUrlData?.signedUrl) {
            console.error('Signed URL error:', signedUrlError)
            return errorResponse('Failed to create download link', 500, origin)
        }

        console.log(`[generate-pdf] ✅ PDF generated and uploaded to ${targetBucket}/${storagePath}`)

        // ── 8. Return ──
        return jsonResponse({
            success: true,
            url: signedUrlData.signedUrl,
            signed_url: signedUrlData.signedUrl,
            storage_path: storagePath,
            path: storagePath,
            expires_in: 3600,
            profile_name: student.display_name,
        }, 200, origin)

    } catch (error) {
        console.error('[generate-pdf] Unexpected error:', error)
        return errorResponse(
            error instanceof Error ? error.message : 'An unexpected error occurred',
            500,
            origin,
        )
    }
})
