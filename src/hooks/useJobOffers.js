import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'


// User-scoped in-memory cache for job offers
// Map<userId -> { data, timestamp, swipedIds }>
const offersCacheMap = new Map()
const CACHE_TTL = 60000 // 60 seconds
const FETCH_TIMEOUT = 15000 // 15 second timeout
const EDGE_FUNCTION_TIMEOUT_MS = 8000 // 8s then fall back to direct query
const isOffersDebugEnabled = import.meta.env.DEV && import.meta.env.VITE_DEBUG_OFFERS === 'true'
const debugLog = (...args) => {
    if (isOffersDebugEnabled) console.log(...args)
}

function getOffersCache(userId) {
    if (!offersCacheMap.has(userId)) {
        offersCacheMap.set(userId, { data: null, timestamp: 0, swipedIds: new Set() })
    }
    return offersCacheMap.get(userId)
}

/**
 * Hook for fetching and managing job offers
 * Filters out already-swiped offers and provides swipe functionality
 * Implements caching with stale-while-revalidate pattern
 */
export function useJobOffers() {
    const [offers, setOffers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const { user, isStudent } = useAuth()
    const isMounted = useRef(true)


    useEffect(() => {
        isMounted.current = true
        return () => { isMounted.current = false }
    }, [])

    const fetchOffers = useCallback(async (forceRefresh = false) => {
        debugLog('[useJobOffers] fetchOffers called, user:', user?.id, 'forceRefresh:', forceRefresh)

        if (!user) {
            if (isMounted.current) {
                setLoading(false)
                setOffers([])
            }
            return
        }

        const now = Date.now()
        const cache = getOffersCache(user.id)
        const cacheValid = cache.data && (now - cache.timestamp) < CACHE_TTL

        if (cacheValid && !forceRefresh) {
            debugLog('[useJobOffers] Using cached data')
            const cachedOffers = cache.data.filter(
                o => !cache.swipedIds.has(o.id)
            )
            if (isMounted.current) {
                setOffers(cachedOffers)
                setLoading(false)
            }
            return
        }

        if (isMounted.current) {
            setLoading(true)
            setError(null)
        }

        const timeoutId = setTimeout(() => {
            if (isMounted.current) {
                setLoading(false)
                setError('Request timed out. Please try again.')
            }
        }, 30000)

        try {
            // ==========================================
            // PART 1: Internal Offers (Prioritized)
            // ==========================================
            let internalOffers = []
            let swipedOfferIds = []

            // Get swipes first
            const swipeResult = await supabase
                .from('student_swipes')
                .select('offer_id')
                .eq('student_id', user.id)

            if (!swipeResult.error) {
                swipedOfferIds = swipeResult.data?.map(s => s.offer_id) || []
                getOffersCache(user.id).swipedIds = new Set(swipedOfferIds)
            }

            // Try Semantic Search (with timeout so we don't hang if edge function is missing/slow)
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
            } catch (e) {
                matchError = e
            }

            if (!matchError && matchedData?.success && matchedData?.offers?.length > 0) {
                internalOffers = matchedData.offers
                    .filter(o => !getOffersCache(user.id).swipedIds.has(o.id))
                    .map(o => ({ ...o, isExternal: false, externalUrl: null }))
            } else {
                // Fallback Query
                const offersResult = await supabase
                    .from('offers')
                    .select('*, companies!company_id(id, company_name, logo_url, industry)')
                    .eq('status', 'active')
                    .limit(20)

                if (!offersResult.error) {
                    internalOffers = (offersResult.data || [])
                        .filter(o => !swipedOfferIds.includes(o.id))
                        .map(offer => ({
                            ...offer,
                            company: offer.companies?.company_name || 'Unknown Company',
                            companyLogo: offer.companies?.logo_url,
                            industry: offer.companies?.industry,
                            salary: offer.salary_range || 'Competitive',
                            skills: offer.req_skills || [],
                            matchScore: null,
                            isExternal: false,
                            externalUrl: null
                        }))
                }
            }

            // ==========================================
            // PART 2: External Jobs (Secondary)
            // ==========================================
            let externalOffers = []
            try {
                const { data: extData } = await supabase
                    .from('external_jobs')
                    .select('*')
                    .order('posted_at', { ascending: false })
                    .limit(20)

                if (extData) {
                    externalOffers = extData.map(job => ({
                        id: `ext-${job.id}`,
                        title: job.title,
                        company: job.company_name,
                        companyLogo: job.logo_url || job.logo, // Handle both potential field names
                        location: job.location,
                        type: job.job_type || job.type || 'Full-time', // Handle variations
                        salary: job.salary_range || 'Competitive',
                        description: job.description,
                        skills: [],
                        isExternal: true,
                        externalUrl: job.original_url, // Direct link to job posting
                        sourceWebsite: job.source_website,
                        matchScore: null
                    }))
                }
            } catch (extErr) {
                debugLog('[useJobOffers] Failed to fetch external jobs:', extErr)
            }

            // ==========================================
            // MERGE: Internal First, then External
            // Internal offers are real MatchOp listings (swipeable, matchable).
            // External offers are scraped job links (opens external site).
            // They are separated in the array: all internals first, then externals.
            // Each offer carries isExternal/externalUrl so the UI can differentiate.
            // ==========================================
            const finalOffers = [...internalOffers, ...externalOffers]

            const userCache = getOffersCache(user.id)
            userCache.data = finalOffers
            userCache.timestamp = now

            clearTimeout(timeoutId)
            if (isMounted.current) {
                setOffers(finalOffers)
                setError(null)
                setLoading(false)
            }

        } catch (err) {
            console.error('[useJobOffers] Unexpected error:', err)
            clearTimeout(timeoutId)
            if (isMounted.current) {
                setError(err.message || 'Failed to load offers')
                setLoading(false)
            }
        }
    }, [user])

    useEffect(() => {
        fetchOffers()
    }, [fetchOffers])

    const swipe = useCallback(async (offerId, direction) => {
        if (!user?.id) return { error: 'Not authenticated' }
        const normalizedDirection = direction === 'super' ? 'right' : direction

        // Optimistically remove from view
        setOffers(prev => prev.filter(o => o.id !== offerId))
        getOffersCache(user.id).swipedIds.add(offerId)

        // For External jobs, we don't save to DB (yet)
        if (typeof offerId === 'string' && offerId.startsWith('ext-')) {
            debugLog('[useJobOffers] Swiped external job:', offerId, direction)
            return { error: null }
        }

        // Record the swipe (for feed exclusion)
        const { error: swipeError } = await supabase
            .from('student_swipes')
            .insert({
                student_id: user.id,
                offer_id: offerId,
                direction: normalizedDirection
            })

        if (swipeError) {
            console.error('[useJobOffers] Swipe insert ERROR:', swipeError)
            return { error: swipeError.message }
        }

        // On RIGHT swipe: also create an Intro (Handshake System)
        // This makes the student's interest visible to the company immediately
        if (normalizedDirection === 'right') {
            const { data: introResult, error: introError } = await supabase
                .rpc('create_intro_from_swipe', {
                    p_student_id: user.id,
                    p_offer_id: offerId
                })

            if (introError) {
                console.warn('[useJobOffers] Intro creation warning:', introError.message)
                // Non-fatal: swipe is already recorded, intro is a bonus
            } else {
                debugLog('[useJobOffers] Intro created:', introResult)
            }
        }

        return { error: null }

    }, [user])

    return {
        offers,
        loading,
        error,
        swipe,
        refresh: () => fetchOffers(true)
    }
}

export default useJobOffers
