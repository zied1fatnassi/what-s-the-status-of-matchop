import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fetchSwipeStack, isNoProfileError, isPaywallError } from '../lib/swipeStackApi'
import { recordSwipeAction, isSwipeLimitReachedError } from '../lib/swipeActionApi'
import {
    DEFAULT_STANDARD_DAILY_SWIPE_LIMIT,
    resolveStandardDailySwipeLimit,
    normalizeSwipeLimitUsage,
    isLimitReachedCode,
    isPremiumProfileActive
} from '../lib/swipeLimit'
import { resolveOpportunityType } from '../lib/opportunityTaxonomy'
import { safeLogDebug, safeLogError, safeLogWarn } from '../lib/logger'

const CACHE_TTL = 60000 // 60 seconds
const EDGE_FUNCTION_TIMEOUT_MS = 8000
const FETCH_LIMIT = 20
const STANDARD_DAILY_SWIPE_LIMIT = resolveStandardDailySwipeLimit(
    import.meta.env.VITE_STANDARD_DAILY_SWIPE_LIMIT,
    DEFAULT_STANDARD_DAILY_SWIPE_LIMIT
)

const isOffersDebugEnabled = import.meta.env.DEV && import.meta.env.VITE_DEBUG_OFFERS === 'true'
const isSwipeStackV2Enabled = import.meta.env.VITE_SWIPE_STACK_V2 === 'true'
const debugLog = (...args) => {
    if (isOffersDebugEnabled) safeLogDebug('[useJobOffers]', args)
}

// Map<`${userId}:${mode}` -> { data, timestamp, nextCursor, effectivePlan }>
const offersCacheMap = new Map()
// Map<userId -> Set<offerId>>
const swipedIdsCacheMap = new Map()
// Map<userId -> Set<externalOfferId>>
const savedExternalOfferIdsCacheMap = new Map()

function createDefaultSwipeUsage() {
    return {
        limit: STANDARD_DAILY_SWIPE_LIMIT,
        used: 0,
        remaining: STANDARD_DAILY_SWIPE_LIMIT,
        reached: false
    }
}

function getLocalDayKey() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function getStartOfTodayIso() {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now.toISOString()
}

function getOffersCache(userId, mode) {
    const key = `${userId}:${mode}`
    if (!offersCacheMap.has(key)) {
        offersCacheMap.set(key, {
            data: null,
            timestamp: 0,
            nextCursor: null,
            effectivePlan: 'standard'
        })
    }
    return offersCacheMap.get(key)
}

function getSwipedIdsCache(userId) {
    if (!swipedIdsCacheMap.has(userId)) {
        swipedIdsCacheMap.set(userId, new Set())
    }
    return swipedIdsCacheMap.get(userId)
}

function getSavedExternalOfferIdsCache(userId) {
    if (!savedExternalOfferIdsCacheMap.has(userId)) {
        savedExternalOfferIdsCacheMap.set(userId, new Set())
    }
    return savedExternalOfferIdsCacheMap.get(userId)
}

function extractExternalJobId(offerId) {
    if (typeof offerId !== 'string' || !offerId.startsWith('ext-')) return null
    return offerId.slice(4) || null
}

function resolveExternalOfferId(externalJobId) {
    if (externalJobId == null) return null
    const normalizedJobId = String(externalJobId).trim()
    return normalizedJobId ? `ext-${normalizedJobId}` : null
}

function resolveSourceWebsite(sourceWebsite, externalUrl) {
    if (typeof sourceWebsite === 'string' && sourceWebsite.trim()) {
        return sourceWebsite.trim()
    }

    if (typeof externalUrl === 'string' && externalUrl.trim()) {
        try {
            return new URL(externalUrl).hostname.replace(/^www\./, '')
        } catch {
            return null
        }
    }

    return null
}

function isMissingExternalMatchesTableError(error) {
    const code = String(error?.code || '').toUpperCase()
    if (code === '42P01' || code === 'PGRST205') {
        return true
    }

    const message = String(error?.message || '').toLowerCase()
    return message.includes('external_matches')
        && (message.includes('does not exist') || message.includes('could not find the table'))
}

function logOffersDebugSummary(nextOffers) {
    if (!isOffersDebugEnabled) return

    const normalizedOffers = Array.isArray(nextOffers) ? nextOffers : []
    const externalCount = normalizedOffers.filter((offer) => offer?.isExternal === true).length

    console.log({
        mode: isSwipeStackV2Enabled ? 'V2' : 'legacy',
        offersCount: normalizedOffers.length,
        externalCount
    })
}

function normalizeEdgeOffer(offer) {
    const offerId = typeof offer?.id === 'string'
        ? offer.id
        : String(offer?.id ?? '')
    const rawScore = Number(offer?.score ?? 0)
    const normalizedScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : 0

    return {
        id: offerId,
        title: offer.title,
        description: offer.description || '',
        company: offer.company || 'Unknown Company',
        companyLogo: offer.companyLogo || null,
        industry: offer.industry || '',
        salary: offer.salary || 'Competitive',
        skills: Array.isArray(offer.skills) ? offer.skills : [],
        location: offer.location || 'Remote',
        type: offer.type || resolveOpportunityType(offer).labelEn,
        companyLocation: offer.companyLocation || null,
        createdAt: offer.createdAt || null,
        isExternal: Boolean(offer.isExternal),
        externalJobId: offer.isExternal ? extractExternalJobId(offerId) : null,
        externalUrl: offer.externalUrl || null,
        sourceWebsite: resolveSourceWebsite(offer.sourceWebsite, offer.externalUrl),
        is_global: Boolean(offer.isGlobal),
        matchScore: normalizedScore / 100,
        score: normalizedScore,
        hasMatched: false
    }
}

function isInternalOfferId(offerId) {
    return typeof offerId === 'string' && !offerId.startsWith('ext-')
}

function filterAvailableOffers(userId, offers) {
    const swipedIds = getSwipedIdsCache(userId)
    const savedExternalIds = getSavedExternalOfferIdsCache(userId)

    return (offers || []).filter((offer) => {
        if (isInternalOfferId(offer?.id)) {
            return !swipedIds.has(offer.id)
        }
        return !savedExternalIds.has(offer?.id)
    })
}

function buildExternalMatchPayload(studentId, offer) {
    const externalJobId = offer?.externalJobId || extractExternalJobId(offer?.id)
    if (!studentId || !externalJobId) return null

    return {
        student_id: studentId,
        external_job_id: externalJobId,
        source_website: resolveSourceWebsite(offer?.sourceWebsite, offer?.externalUrl),
        original_url: offer?.externalUrl || null,
        title: offer?.title || null,
        company_name: offer?.company || null
    }
}

function removeOfferFromAllUserCaches(userId, offerId) {
    for (const [cacheKey, cacheValue] of offersCacheMap.entries()) {
        if (!cacheKey.startsWith(`${userId}:`) || !cacheValue?.data) continue
        cacheValue.data = cacheValue.data.filter((offer) => offer.id !== offerId)
        offersCacheMap.set(cacheKey, cacheValue)
    }
}

async function fetchSwipedOfferIds(userId) {
    const swipeResult = await supabase
        .from('student_swipes')
        .select('offer_id')
        .eq('student_id', userId)

    if (swipeResult.error) {
        return Array.from(getSwipedIdsCache(userId))
    }

    const swipedOfferIds = (swipeResult.data || []).map((row) => row.offer_id)
    swipedIdsCacheMap.set(userId, new Set(swipedOfferIds))
    return swipedOfferIds
}

async function fetchSavedExternalOfferIds(userId) {
    const savedResult = await supabase
        .from('external_matches')
        .select('external_job_id')
        .eq('student_id', userId)

    if (savedResult.error) {
        if (isMissingExternalMatchesTableError(savedResult.error)) {
            safeLogWarn('[useJobOffers] external_matches unavailable during saved lookup; continuing without external tracking', {
                error: savedResult.error
            })
        }
        return Array.from(getSavedExternalOfferIdsCache(userId))
    }

    const savedOfferIds = (savedResult.data || [])
        .map((row) => resolveExternalOfferId(row?.external_job_id))
        .filter(Boolean)

    savedExternalOfferIdsCacheMap.set(userId, new Set(savedOfferIds))
    return savedOfferIds
}

async function fetchLegacyOffers(userId) {
    let internalOffers = []
    const swipedOfferIds = new Set(await fetchSwipedOfferIds(userId))
    const savedExternalOfferIds = new Set(await fetchSavedExternalOfferIds(userId))

    let matchedData = null
    let matchError = null

    try {
        const result = await Promise.race([
            supabase.functions.invoke('get-matched-jobs'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('get-matched-jobs timeout')), EDGE_FUNCTION_TIMEOUT_MS)
            )
        ])

        if (result && typeof result === 'object') {
            matchedData = result.data
            matchError = result.error
        }
    } catch (error) {
        matchError = error
    }

    if (!matchError && matchedData?.success && matchedData?.offers?.length > 0) {
        internalOffers = matchedData.offers
            .filter((offer) => !swipedOfferIds.has(offer.id))
            .map((offer) => ({ ...offer, isExternal: false, externalUrl: null }))
    } else {
        const offersResult = await supabase
            .from('offers')
            .select('*, companies!company_id(id, company_name, logo_url, industry, location)')
            .eq('status', 'active')
            .limit(FETCH_LIMIT)

        if (!offersResult.error) {
            internalOffers = (offersResult.data || [])
                .filter((offer) => !swipedOfferIds.has(offer.id))
                .map((offer) => ({
                    ...offer,
                    type: offer.type || resolveOpportunityType(offer).labelEn,
                    company: offer.companies?.company_name || 'Unknown Company',
                    companyLogo: offer.companies?.logo_url || null,
                    companyLocation: offer.companies?.location || null,
                    industry: offer.companies?.industry || '',
                    salary: offer.salary_range || 'Competitive',
                    skills: offer.req_skills || [],
                    matchScore: null,
                    isExternal: false,
                    externalUrl: null
                }))
        }
    }

        let externalOffers = []
        try {
            const { data: extData } = await supabase
                .from('external_jobs_public')
                .select('*')
                .order('posted_at', { ascending: false })
                .limit(FETCH_LIMIT)

        if (extData) {
            externalOffers = extData.map((job) => ({
                id: `ext-${job.id}`,
                externalJobId: job.id ? String(job.id) : null,
                title: job.title,
                company: job.company_name,
                companyLogo: job.logo_url || job.logo || null,
                companyLocation: null,
                location: job.location,
                type: job.job_type || job.type || resolveOpportunityType(job).labelEn,
                salary: job.salary_range || 'Competitive',
                description: job.description || '',
                skills: [],
                isExternal: true,
                externalUrl: job.original_url || null,
                sourceWebsite: resolveSourceWebsite(job.source_website, job.original_url),
                matchScore: null,
                createdAt: job.posted_at || job.created_at || null
            })).filter((offer) => !savedExternalOfferIds.has(offer.id))
        }
    } catch (error) {
        debugLog('[useJobOffers] Failed to fetch external jobs:', error)
    }

    return [...internalOffers, ...externalOffers]
}

/**
 * Hook for fetching and managing job offers.
 * If VITE_SWIPE_STACK_V2=true, it uses the swipe-stack edge function.
 * Otherwise, it falls back to the existing direct query behavior.
 */
export function useJobOffers() {
    const { t } = useTranslation(undefined, { useSuspense: false })
    const [offers, setOffers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [notice, setNotice] = useState(null)
    const [mode, setMode] = useState('standard')
    const [effectivePlan, setEffectivePlan] = useState('standard')
    const [paywall, setPaywall] = useState(null)
    const [dailySwipeUsage, setDailySwipeUsage] = useState(createDefaultSwipeUsage())
    const { user, profile } = useAuth()
    const isMounted = useRef(true)
    const dailyUsageRef = useRef({
        dayKey: null,
        usage: createDefaultSwipeUsage()
    })

    useEffect(() => {
        isMounted.current = true
        return () => { isMounted.current = false }
    }, [])

    const isPremiumUser = isPremiumProfileActive(profile) || effectivePlan === 'premium'

    const syncDailyUsage = useCallback((usage, dayKey = getLocalDayKey()) => {
        dailyUsageRef.current = { dayKey, usage }
        if (isMounted.current) {
            setDailySwipeUsage(usage)
        }
    }, [])

    const getDailyUsage = useCallback(async ({ forceRefresh = false } = {}) => {
        if (!user) return createDefaultSwipeUsage()

        if (isPremiumProfileActive(profile)) {
            const premiumUsage = {
                effectivePlan: 'premium',
                limit: null,
                used: 0,
                remaining: null,
                reached: false
            }
            syncDailyUsage(premiumUsage)
            return premiumUsage
        }

        const dayKey = getLocalDayKey()
        if (!forceRefresh && dailyUsageRef.current.dayKey === dayKey) {
            return dailyUsageRef.current.usage
        }

        const rpcResult = await supabase.rpc('get_swipe_limit_status', {
            p_user_id: user.id
        })

        if (!rpcResult.error && rpcResult.data) {
            const statusPayload = Array.isArray(rpcResult.data)
                ? rpcResult.data[0]
                : rpcResult.data
            const usage = normalizeSwipeLimitUsage(statusPayload, STANDARD_DAILY_SWIPE_LIMIT)
            syncDailyUsage(usage, dayKey)
            return usage
        }

        const { count, error: countError } = await supabase
            .from('student_swipes')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', user.id)
            .gte('created_at', getStartOfTodayIso())

        if (countError) return dailyUsageRef.current.usage

        const used = Number.isFinite(count) ? count : 0
        const fallbackUsage = normalizeSwipeLimitUsage({
            effective_plan: 'standard',
            daily_count: used,
            limit_count: STANDARD_DAILY_SWIPE_LIMIT,
            reached: used >= STANDARD_DAILY_SWIPE_LIMIT,
            code: used >= STANDARD_DAILY_SWIPE_LIMIT ? 'LIMIT_REACHED' : 'OK'
        }, STANDARD_DAILY_SWIPE_LIMIT)

        syncDailyUsage(fallbackUsage, dayKey)
        return fallbackUsage
    }, [user, profile, syncDailyUsage])

    const fetchOffersForMode = useCallback(async ({ targetMode, forceRefresh = false }) => {
        if (!user) return null

        await Promise.all([
            fetchSwipedOfferIds(user.id),
            fetchSavedExternalOfferIds(user.id)
        ])

        const cache = getOffersCache(user.id, targetMode)
        const now = Date.now()
        const cacheValid = cache.data && (now - cache.timestamp) < CACHE_TTL

        if (!forceRefresh && cacheValid) {
            return {
                offers: filterAvailableOffers(user.id, cache.data),
                effectivePlan: cache.effectivePlan
            }
        }

        const result = await Promise.race([
            fetchSwipeStack({
                mode: targetMode,
                limit: FETCH_LIMIT,
                cursor: null
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('swipe-stack timeout')), EDGE_FUNCTION_TIMEOUT_MS)
            )
        ])

        const normalized = (result.items || []).map(normalizeEdgeOffer)
        const nextCursor = result.next_cursor || null
        const resolvedPlan = result.meta?.effective_plan || 'standard'

        const freshCache = getOffersCache(user.id, targetMode)
        freshCache.data = normalized
        freshCache.timestamp = now
        freshCache.nextCursor = nextCursor
        freshCache.effectivePlan = resolvedPlan

        return {
            offers: filterAvailableOffers(user.id, normalized),
            effectivePlan: resolvedPlan
        }
    }, [user])

    const fetchOffers = useCallback(async (forceRefresh = false) => {
        debugLog('[useJobOffers] fetchOffers called', {
            userId: user?.id,
            forceRefresh,
            mode,
            edge: isSwipeStackV2Enabled
        })

        if (!user) {
            if (isMounted.current) {
                setLoading(false)
                setOffers([])
                setError(null)
                setNotice(null)
                setPaywall(null)
                const defaultUsage = createDefaultSwipeUsage()
                dailyUsageRef.current = { dayKey: null, usage: defaultUsage }
                setDailySwipeUsage(defaultUsage)
            }
            return
        }

        if (isMounted.current) {
            setLoading(true)
            setError(null)
            setPaywall(null)
        }

        try {
            if (!isSwipeStackV2Enabled) {
                const legacyOffers = await fetchLegacyOffers(user.id)
                const cache = getOffersCache(user.id, 'standard')
                cache.data = legacyOffers
                cache.timestamp = Date.now()
                cache.effectivePlan = 'standard'
                logOffersDebugSummary(legacyOffers)

                if (isMounted.current) {
                    setOffers(legacyOffers)
                    setEffectivePlan('standard')
                    setNotice(null)
                    setLoading(false)
                }
                await getDailyUsage({ forceRefresh })
                return
            }

            const primaryResult = await fetchOffersForMode({
                targetMode: mode,
                forceRefresh
            })
            logOffersDebugSummary(primaryResult?.offers || [])

            if (isMounted.current) {
                setOffers(primaryResult?.offers || [])
                setEffectivePlan(primaryResult?.effectivePlan || 'standard')
                setNotice(null)
                setLoading(false)
            }
            await getDailyUsage({ forceRefresh })
        } catch (err) {
            if (isNoProfileError(err)) {
                if (isMounted.current) {
                    setError(t('useJobOffers.profilePreparingError'))
                    setNotice(t('useJobOffers.profilePreparingNotice'))
                    setLoading(false)
                }
                return
            }

            if (isPaywallError(err)) {
                if (isMounted.current) {
                    setPaywall({
                        message: err.message || t('useJobOffers.premiumUpgradeRequired'),
                        upgradeHint: Boolean(err.upgradeHint)
                    })
                    setLoading(false)
                }
                return
            }

            if (isSwipeStackV2Enabled && mode === 'premium') {
                try {
                    const fallback = await fetchOffersForMode({
                        targetMode: 'standard',
                        forceRefresh: true
                    })
                    logOffersDebugSummary(fallback?.offers || [])

                    if (isMounted.current) {
                        setOffers(fallback?.offers || [])
                        setEffectivePlan(fallback?.effectivePlan || 'standard')
                        setMode('standard')
                        setNotice(t('useJobOffers.personalizedUnavailableNotice'))
                        setError(null)
                        setLoading(false)
                    }
                    return
                } catch (fallbackError) {
                    safeLogError('[useJobOffers] premium->standard fallback failed', { error: fallbackError })
                }
            }

            safeLogError('[useJobOffers] fetch error', { error: err })
            if (isMounted.current) {
                setError(err.message || t('useJobOffers.loadOffersFailed'))
                setLoading(false)
            }
        }
    }, [user, mode, fetchOffersForMode, getDailyUsage, t])

    useEffect(() => {
        fetchOffers()
    }, [fetchOffers])

    const swipe = useCallback(async (offerOrId, direction, { personalizedCvUrl = null } = {}) => {
        if (!user?.id) return { error: t('useJobOffers.notAuthenticated') }

        const offer = offerOrId && typeof offerOrId === 'object'
            ? offerOrId
            : null
        const offerId = offer?.id || offerOrId
        const normalizedDirection = direction === 'super' ? 'right' : direction
        const isExternalOffer = offer?.isExternal === true || !isInternalOfferId(offerId)
        const isInternalOffer = !isExternalOffer

        if (isInternalOffer && mode === 'standard' && !isPremiumUser) {
            const usage = await getDailyUsage({ forceRefresh: true })
            if (usage.reached) {
                return {
                    error: t('useJobOffers.dailyLimitReached'),
                    code: 'LIMIT_REACHED',
                    usage
                }
            }
        }

        if (isExternalOffer) {
            if (normalizedDirection === 'right') {
                const externalMatchPayload = buildExternalMatchPayload(user.id, offer)

                if (!externalMatchPayload) {
                    return { error: t('useJobOffers.saveExternalMatchFailed') }
                }

                const { error: saveError } = await supabase
                    .from('external_matches')
                    .upsert(externalMatchPayload, {
                        onConflict: 'student_id,external_job_id'
                    })

                if (saveError) {
                    if (isMissingExternalMatchesTableError(saveError)) {
                        safeLogWarn('[useJobOffers] external_matches unavailable; continuing without external tracking', {
                            error: saveError
                        })
                        getSavedExternalOfferIdsCache(user.id).add(offerId)
                        removeOfferFromAllUserCaches(user.id, offerId)
                        return {
                            error: null,
                            externalMatchSaved: false,
                            externalTrackingSkipped: true
                        }
                    }

                    safeLogWarn('[useJobOffers] external match save warning', { error: saveError })
                    return { error: saveError.message || t('useJobOffers.saveExternalMatchFailed') }
                }

                getSavedExternalOfferIdsCache(user.id).add(offerId)
                removeOfferFromAllUserCaches(user.id, offerId)
                debugLog('[useJobOffers] Saved external opportunity:', offerId)

                return {
                    error: null,
                    externalMatchSaved: true,
                    sourceWebsite: externalMatchPayload.source_website
                }
            }

            removeOfferFromAllUserCaches(user.id, offerId)
            debugLog('[useJobOffers] Swiped external opportunity:', offerId, direction)
            return { error: null, externalMatchSaved: false }
        }

        let swipePayload = null
        try {
            swipePayload = await recordSwipeAction({
                offerId,
                direction: normalizedDirection,
                studentId: user.id
            })
        } catch (error) {
            if (isSwipeLimitReachedError(error) || isLimitReachedCode(error?.code)) {
                const usage = error?.usage
                    ? normalizeSwipeLimitUsage(error.usage, STANDARD_DAILY_SWIPE_LIMIT)
                    : await getDailyUsage({ forceRefresh: true })

                syncDailyUsage(usage)

                return {
                    error: error.message || t('useJobOffers.dailyLimitReached'),
                    code: 'LIMIT_REACHED',
                    usage
                }
            }

            return { error: error.message || t('useJobOffers.recordSwipeFailed') }
        }

        if (swipePayload?.usage) {
            syncDailyUsage(
                normalizeSwipeLimitUsage(swipePayload.usage, STANDARD_DAILY_SWIPE_LIMIT)
            )
        } else if (mode === 'standard' && !isPremiumUser) {
            await getDailyUsage({ forceRefresh: true })
        }

        removeOfferFromAllUserCaches(user.id, offerId)
        getSwipedIdsCache(user.id).add(offerId)

        if (normalizedDirection === 'right') {
            const { data: introResult, error: introError } = await supabase
                .rpc('create_intro_from_swipe', {
                    p_student_id: user.id,
                    p_offer_id: offerId,
                    p_icebreaker: null,
                    p_personalized_cv_url: personalizedCvUrl
                })

            if (introError) {
                safeLogWarn('[useJobOffers] intro creation warning', { error: introError })
            } else {
                debugLog('[useJobOffers] Intro created:', introResult)
            }
        }

        return { error: null, externalMatchSaved: false }
    }, [user, mode, isPremiumUser, getDailyUsage, syncDailyUsage, t])

    const switchMode = useCallback((nextMode) => {
        if (nextMode !== 'standard' && nextMode !== 'premium') return
        setPaywall(null)
        setNotice(null)
        setMode(nextMode)
    }, [])

    return {
        offers,
        loading,
        error,
        notice,
        paywall,
        mode,
        setMode: switchMode,
        effectivePlan,
        dailySwipeUsage,
        isSwipeStackV2Enabled,
        swipe,
        refresh: () => fetchOffers(true),
        clearPaywall: () => setPaywall(null)
    }
}

export default useJobOffers
