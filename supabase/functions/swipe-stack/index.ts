import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

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

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const MAX_FETCH_WINDOW = 1000
const BASE_FETCH_WINDOW = 250

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 45
const rateLimitBuckets = new Map<string, { windowStart: number; count: number }>()

type Mode = 'standard' | 'premium'

type RequestBody = {
  mode: Mode
  limit?: number
  cursor?: string
}

type ParsedCursor = {
  offset: number
  mode: Mode
}

type Preferences = {
  remoteOnly: boolean
  visaSponsorship: boolean
  industries: string[]
  skillKeywords: string[]
}

type NormalizedOpportunity = {
  id: string
  title: string
  description: string
  company: string
  companyLogo: string | null
  industry: string
  location: string
  salary: string
  skills: string[]
  type: string
  isExternal: boolean
  externalUrl: string | null
  sourceWebsite: string | null
  isGlobal: boolean
  createdAt: string | null
  visaSponsorship: boolean | null
}

type RankedOpportunity = NormalizedOpportunity & {
  score: number
}

function jsonResponse(body: Record<string, unknown>, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

function getBearerToken(authHeader: string | null) {
  if (!authHeader) return null
  const [scheme, token] = authHeader.split(' ')
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null
  return token.trim()
}

function clampLimit(rawLimit: unknown) {
  const numeric = typeof rawLimit === 'number'
    ? rawLimit
    : (typeof rawLimit === 'string' ? Number(rawLimit) : DEFAULT_LIMIT)
  const parsed = Math.trunc(numeric)
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  if (parsed < 1) return 1
  if (parsed > MAX_LIMIT) return MAX_LIMIT
  return parsed
}

function parseMode(value: unknown): Mode | null {
  if (value === 'standard' || value === 'premium') return value
  return null
}

function encodeCursor(cursor: ParsedCursor) {
  return btoa(JSON.stringify(cursor))
}

function decodeCursor(rawCursor: string | undefined, expectedMode: Mode): number {
  if (!rawCursor) return 0

  try {
    const parsed = JSON.parse(atob(rawCursor)) as ParsedCursor
    if (parsed.mode !== expectedMode) {
      throw new Error('cursor mode mismatch')
    }
    if (!Number.isInteger(parsed.offset) || parsed.offset < 0) {
      throw new Error('cursor offset must be a non-negative integer')
    }
    return parsed.offset
  } catch {
    throw new Error('invalid cursor')
  }
}

function normalizeText(value: unknown) {
  return String(value ?? '').toLowerCase().trim()
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? '').trim())
      .filter((item) => item.length > 0)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  return []
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  return false
}

function parsePreferences(raw: unknown): Preferences {
  const prefs = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
  const industries = toStringArray(prefs.industries).map(normalizeText).filter(Boolean)

  const skillKeywordsRaw =
    prefs.skills_keywords ??
    prefs.skillsKeywords ??
    prefs.skills ??
    []
  const skillKeywords = toStringArray(skillKeywordsRaw).map(normalizeText).filter(Boolean)

  return {
    remoteOnly: toBoolean(prefs.remote_only ?? prefs.remoteOnly),
    visaSponsorship: toBoolean(prefs.visa_sponsorship ?? prefs.visaSponsorship),
    industries,
    skillKeywords,
  }
}

function isPremiumActive(profile: { is_premium?: boolean | null; premium_expires_at?: string | null } | null) {
  if (!profile?.is_premium) return false
  if (!profile.premium_expires_at) return true
  const expiresAt = Date.parse(profile.premium_expires_at)
  if (!Number.isFinite(expiresAt)) return false
  return expiresAt > Date.now()
}

function cleanupRateBuckets(now: number) {
  if (rateLimitBuckets.size < 1000) return
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitBuckets.delete(key)
    }
  }
}

function consumeRateLimit(key: string) {
  const now = Date.now()
  cleanupRateBuckets(now)

  const bucket = rateLimitBuckets.get(key)
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, { windowStart: now, count: 1 })
    return true
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  bucket.count += 1
  rateLimitBuckets.set(key, bucket)
  return true
}

function hasExpired(record: Record<string, unknown>) {
  const expiryCandidates = ['expires_at', 'expiresAt', 'deadline', 'valid_until', 'validUntil']
  for (const key of expiryCandidates) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue
    const raw = record[key]
    if (raw == null) continue
    const ts = Date.parse(String(raw))
    if (Number.isFinite(ts) && ts <= Date.now()) {
      return true
    }
  }
  return false
}

function isRemoteOpportunity(opportunity: Pick<NormalizedOpportunity, 'title' | 'description' | 'location' | 'type'>) {
  const haystack = normalizeText(
    `${opportunity.title} ${opportunity.description} ${opportunity.location} ${opportunity.type}`,
  )

  return (
    haystack.includes('remote') ||
    haystack.includes('work from home') ||
    haystack.includes('wfh')
  )
}

function locationTokens(location: string | null | undefined) {
  const normalized = normalizeText(location)
  if (!normalized) return []

  return normalized
    .split(/[\s,/-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .slice(0, 8)
}

function passesStandardLocalConstraints(
  opportunity: NormalizedOpportunity,
  studentLocationTokens: string[],
) {
  if (opportunity.isGlobal) return false
  if (studentLocationTokens.length === 0) return true
  if (isRemoteOpportunity(opportunity)) return true

  const haystack = normalizeText(opportunity.location)
  return studentLocationTokens.some((token) => haystack.includes(token))
}

function matchesIndustry(industry: string, preferredIndustries: string[]) {
  if (preferredIndustries.length === 0) return true
  const normalizedIndustry = normalizeText(industry)
  if (!normalizedIndustry) return true

  return preferredIndustries.some((pref) => (
    normalizedIndustry.includes(pref) || pref.includes(normalizedIndustry)
  ))
}

function matchesSkillKeywords(
  opportunity: NormalizedOpportunity,
  keywords: string[],
) {
  if (keywords.length === 0) return true
  const haystack = normalizeText(
    `${opportunity.title} ${opportunity.description} ${opportunity.skills.join(' ')}`,
  )
  return keywords.some((keyword) => haystack.includes(keyword))
}

function passesPremiumPreferenceFilters(opportunity: NormalizedOpportunity, prefs: Preferences) {
  if (prefs.remoteOnly && !isRemoteOpportunity(opportunity)) return false
  if (prefs.visaSponsorship && opportunity.visaSponsorship === false) return false
  if (!matchesIndustry(opportunity.industry, prefs.industries)) return false
  if (!matchesSkillKeywords(opportunity, prefs.skillKeywords)) return false
  return true
}

function recencyBonus(createdAt: string | null) {
  if (!createdAt) return 0
  const ts = Date.parse(createdAt)
  if (!Number.isFinite(ts)) return 0

  const ageDays = (Date.now() - ts) / 86_400_000
  if (ageDays <= 3) return 15
  if (ageDays <= 7) return 10
  if (ageDays <= 30) return 5
  return 0
}

function scoreOpportunity(
  opportunity: NormalizedOpportunity,
  studentSkills: Set<string>,
  prefs: Preferences,
) {
  const normalizedOpportunitySkills = new Set(
    opportunity.skills.map(normalizeText).filter(Boolean),
  )

  let overlapCount = 0
  for (const skill of studentSkills) {
    if (normalizedOpportunitySkills.has(skill)) {
      overlapCount += 1
    }
  }

  const content = normalizeText(`${opportunity.title} ${opportunity.description}`)
  const keywordMatches = prefs.skillKeywords.reduce((acc, keyword) => {
    return content.includes(keyword) ? acc + 1 : acc
  }, 0)

  const skillOverlap = Math.min(60, overlapCount * 15 + keywordMatches * 8)

  let industryMatch = 0
  if (prefs.industries.length > 0 && matchesIndustry(opportunity.industry, prefs.industries)) {
    industryMatch = 20
  }

  let remoteVisaFit = 0
  const remote = isRemoteOpportunity(opportunity)

  if (prefs.remoteOnly) {
    remoteVisaFit += remote ? 20 : -20
  } else if (remote) {
    remoteVisaFit += 5
  }

  if (prefs.visaSponsorship) {
    if (opportunity.visaSponsorship === true) remoteVisaFit += 10
    if (opportunity.visaSponsorship === false) remoteVisaFit -= 10
  }

  const score = Math.max(0, skillOverlap + industryMatch + remoteVisaFit + recencyBonus(opportunity.createdAt))
  return score
}

function shortUserTag(userId: string) {
  return `${userId.slice(0, 8)}...`
}

async function fetchOffers(
  supabase: ReturnType<typeof createClient>,
  mode: Mode,
  fetchWindow: number,
) {
  const baseSelect =
    'id, company_id, title, description, req_skills, location, salary_range, status, created_at, is_global, companies!company_id(company_name, logo_url, industry)'

  let query = supabase
    .from('offers')
    .select(baseSelect)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(fetchWindow)

  if (mode === 'standard') {
    query = query.eq('is_global', false)
  }

  let data: Array<Record<string, unknown>> = []
  let error: { message?: string } | null = null

  const firstAttempt = await query
  data = firstAttempt.data as Array<Record<string, unknown>> || []
  error = firstAttempt.error

  // Fallback path for databases where is_global does not exist yet.
  if (error && error.message?.toLowerCase().includes('is_global')) {
    let fallbackQuery = supabase
      .from('offers')
      .select('id, company_id, title, description, req_skills, location, salary_range, status, created_at, companies!company_id(company_name, logo_url, industry)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(fetchWindow)

    const fallback = await fallbackQuery
    data = fallback.data as Array<Record<string, unknown>> || []
    error = fallback.error
  }

  if (error) {
    throw new Error(`failed to fetch offers: ${error.message ?? 'unknown error'}`)
  }

  return data
}

async function fetchExternalJobs(
  supabase: ReturnType<typeof createClient>,
  mode: Mode,
  fetchWindow: number,
) {
  let query = supabase
    .from('external_jobs')
    .select('id, title, description, company_name, location, job_type, salary_range, posted_at, created_at, source_website, original_url, tags, is_global')
    .order('posted_at', { ascending: false })
    .limit(fetchWindow)

  if (mode === 'standard') {
    query = query.eq('is_global', false)
  }

  const firstAttempt = await query
  let data = firstAttempt.data as Array<Record<string, unknown>> || []
  let error = firstAttempt.error

  // If column missing, retry without is_global.
  if (error && error.message?.toLowerCase().includes('is_global')) {
    const fallback = await supabase
      .from('external_jobs')
      .select('id, title, description, company_name, location, job_type, salary_range, posted_at, created_at, source_website, original_url, tags')
      .order('posted_at', { ascending: false })
      .limit(fetchWindow)

    data = fallback.data as Array<Record<string, unknown>> || []
    error = fallback.error
  }

  // external_jobs can be absent in some deployments; treat as optional.
  if (error && !error.message?.toLowerCase().includes('external_jobs')) {
    throw new Error(`failed to fetch external_jobs: ${error.message ?? 'unknown error'}`)
  }

  return data
}

serve(async (req) => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ code: 'METHOD_NOT_ALLOWED', message: 'Use POST' }, 405, origin)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseServiceRoleKey?.trim()) {
      return jsonResponse({ code: 'SERVER_MISCONFIG', message: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, 500, origin)
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ code: 'SERVER_MISCONFIG', message: 'Supabase env vars are missing' }, 500, origin)
    }

    const token = getBearerToken(req.headers.get('Authorization'))
    if (!token) {
      return jsonResponse({ code: 'UNAUTHORIZED', message: 'Authorization bearer token required' }, 401, origin)
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return jsonResponse({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' }, 401, origin)
    }

    if (!consumeRateLimit(user.id)) {
      return jsonResponse({ code: 'RATE_LIMITED', message: 'Too many requests. Please retry in a minute.' }, 429, origin)
    }

    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'Invalid JSON body' }, 400, origin)
    }

    const mode = parseMode(body?.mode)
    if (!mode) {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'mode must be "standard" or "premium"' }, 400, origin)
    }

    const limit = clampLimit(body.limit)

    let offset = 0
    try {
      offset = decodeCursor(body.cursor, mode)
    } catch {
      return jsonResponse({ code: 'BAD_REQUEST', message: 'Invalid cursor' }, 400, origin)
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const serviceSanityRes = await adminClient
      .from('profiles')
      .select('id')
      .limit(1)

    if (serviceSanityRes.error) {
      console.error(`[swipe-stack] service client sanity failed: ${serviceSanityRes.error.message}`)
    }

    let studentProfileIds: string[] = []
    let defaultProfileId: string | null = null

    const userProfilesRes = await adminClient
      .from('user_profiles')
      .select('id, profile_type, is_default')
      .eq('user_id', user.id)

    if (userProfilesRes.error) {
      if (!userProfilesRes.error.message?.toLowerCase().includes('user_profiles')) {
        return jsonResponse({ code: 'DB_ERROR', message: 'Failed to load user profile links' }, 500, origin)
      }
      // Fallback for legacy deployments without user_profiles.
      studentProfileIds = [user.id]
      defaultProfileId = user.id
    } else if (userProfilesRes.data && userProfilesRes.data.length > 0) {
      const userProfiles = userProfilesRes.data as Array<{ id: string; profile_type: string; is_default?: boolean | null }>
      const studentsOnly = userProfiles.filter((profile) => profile.profile_type === 'student')
      studentProfileIds = studentsOnly.map((profile) => profile.id)

      const defaultStudent = studentsOnly.find((profile) => profile.is_default)
      defaultProfileId = defaultStudent?.id ?? studentsOnly[0]?.id ?? null

      if (studentsOnly.length === 0) {
        return jsonResponse({ code: 'FORBIDDEN', message: 'Swipe stack is only available for student profiles' }, 403, origin)
      }
    } else {
      // Fallback when no link rows are found.
      studentProfileIds = [user.id]
      defaultProfileId = user.id
    }

    const candidateProfileIds = Array.from(
      new Set([user.id, defaultProfileId, ...studentProfileIds].filter(Boolean) as string[]),
    )

    const userId = user.id
    const profilesRes = await adminClient
      .from('profiles')
      .select('id, email, is_premium, premium_expires_at, preferences')
      .eq('id', userId)
      .maybeSingle()

    if (profilesRes.error) {
      console.error(
        `[swipe-stack] profiles lookup failed uid=${userId.slice(0, 8)} err=${profilesRes.error.message}`,
      )
      return jsonResponse(
        { code: 'DB_ERROR', message: 'profiles lookup failed', details: profilesRes.error.message },
        500,
      )
    }

    if (!profilesRes.data) {
      return jsonResponse({ code: 'NO_PROFILE', message: 'No profile found for authenticated user' }, 409, origin)
    }

    const primaryProfile = profilesRes.data as {
      id: string
      email?: string | null
      is_premium?: boolean | null
      premium_expires_at?: string | null
      preferences?: unknown
    }

    const preferences = parsePreferences(primaryProfile.preferences)
    const effectivePlan: Mode = isPremiumActive(primaryProfile) ? 'premium' : 'standard'

    if (mode === 'premium' && effectivePlan !== 'premium') {
      return jsonResponse(
        {
          code: 'PAYWALL',
          message: 'Premium mode requires an active premium subscription.',
          upgrade_hint: true,
        },
        403,
      )
    }

    const studentRes = await adminClient
      .from('students')
      .select('id, skills, location')
      .in('id', candidateProfileIds)

    let studentSkills = new Set<string>()
    let studentLocation = ''

    if (!studentRes.error && studentRes.data && studentRes.data.length > 0) {
      const students = studentRes.data as Array<{ id: string; skills?: unknown; location?: string | null }>
      const primaryStudent =
        students.find((student) => student.id === defaultProfileId) ??
        students.find((student) => student.id === user.id) ??
        students[0]

      studentSkills = new Set(toStringArray(primaryStudent.skills).map(normalizeText).filter(Boolean))
      studentLocation = primaryStudent.location ?? ''
    }

    const swipesRes = await adminClient
      .from('student_swipes')
      .select('offer_id')
      .in('student_id', candidateProfileIds)

    const swipedOfferIds = new Set<string>(
      (!swipesRes.error && swipesRes.data)
        ? (swipesRes.data as Array<{ offer_id: string }>).map((row) => row.offer_id)
        : [],
    )

    const fetchWindow = Math.min(
      MAX_FETCH_WINDOW,
      Math.max(BASE_FETCH_WINDOW, offset + limit * 5),
    )

    const [offersRaw, externalJobsRaw] = await Promise.all([
      fetchOffers(adminClient, mode, fetchWindow),
      fetchExternalJobs(adminClient, mode, fetchWindow),
    ])

    const localTokens = locationTokens(studentLocation)
    const scoringPrefs: Preferences = mode === 'premium'
      ? preferences
      : { remoteOnly: false, visaSponsorship: false, industries: [], skillKeywords: [] }

    const ranked: RankedOpportunity[] = []

    for (const offer of offersRaw) {
      const offerId = String(offer.id ?? '')
      if (!offerId || swipedOfferIds.has(offerId)) continue
      if (hasExpired(offer)) continue

      const company = (offer.companies as Record<string, unknown> | null) ?? {}
      const normalized: NormalizedOpportunity = {
        id: offerId,
        title: String(offer.title ?? ''),
        description: String(offer.description ?? ''),
        company: String(company.company_name ?? 'Unknown Company'),
        companyLogo: company.logo_url ? String(company.logo_url) : null,
        industry: String(company.industry ?? ''),
        location: String(offer.location ?? ''),
        salary: String(offer.salary_range ?? 'Competitive'),
        skills: toStringArray(offer.req_skills),
        type: 'Full-time',
        isExternal: false,
        externalUrl: null,
        sourceWebsite: null,
        isGlobal: Boolean(offer.is_global),
        createdAt: offer.created_at ? String(offer.created_at) : null,
        visaSponsorship: typeof offer.visa_sponsorship === 'boolean' ? offer.visa_sponsorship : null,
      }

      if (mode === 'standard' && !passesStandardLocalConstraints(normalized, localTokens)) {
        continue
      }

      if (mode === 'premium' && !passesPremiumPreferenceFilters(normalized, preferences)) {
        continue
      }

      ranked.push({
        ...normalized,
        score: scoreOpportunity(normalized, studentSkills, scoringPrefs),
      })
    }

    for (const job of externalJobsRaw) {
      const baseId = String(job.id ?? '')
      if (!baseId) continue
      if (hasExpired(job)) continue

      const normalized: NormalizedOpportunity = {
        id: `ext-${baseId}`,
        title: String(job.title ?? ''),
        description: String(job.description ?? ''),
        company: String(job.company_name ?? 'Company'),
        companyLogo: null,
        industry: '',
        location: String(job.location ?? ''),
        salary: String(job.salary_range ?? 'Competitive'),
        skills: toStringArray(job.tags),
        type: String(job.job_type ?? 'Full-time'),
        isExternal: true,
        externalUrl: job.original_url ? String(job.original_url) : null,
        sourceWebsite: job.source_website ? String(job.source_website) : null,
        isGlobal: Boolean(job.is_global),
        createdAt: job.posted_at ? String(job.posted_at) : (job.created_at ? String(job.created_at) : null),
        visaSponsorship: typeof job.visa_sponsorship === 'boolean' ? job.visa_sponsorship : null,
      }

      if (mode === 'standard' && !passesStandardLocalConstraints(normalized, localTokens)) {
        continue
      }

      if (mode === 'premium' && !passesPremiumPreferenceFilters(normalized, preferences)) {
        continue
      }

      ranked.push({
        ...normalized,
        score: scoreOpportunity(normalized, studentSkills, scoringPrefs),
      })
    }

    ranked.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0
      if (bTime !== aTime) return bTime - aTime
      return a.id.localeCompare(b.id)
    })

    const page = ranked.slice(offset, offset + limit)
    const hasMore = offset + limit < ranked.length
    const nextCursor = hasMore
      ? encodeCursor({ offset: offset + limit, mode })
      : null

    console.log(
      `[swipe-stack] user=${shortUserTag(user.id)} mode=${mode} plan=${effectivePlan} offset=${offset} limit=${limit} returned=${page.length}`,
    )

    return jsonResponse({
      items: page,
      next_cursor: nextCursor,
      meta: {
        mode,
        effective_plan: effectivePlan,
        count: page.length,
      },
    }, 200, origin)
  } catch (error) {
    console.error('[swipe-stack] unhandled error', error)
    return jsonResponse({ code: 'INTERNAL_ERROR', message: 'Failed to build swipe stack' }, 500, origin)
  }
})
