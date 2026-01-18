import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'


// Simple in-memory cache for job offers
const offersCache = {
    data: null,
    timestamp: 0,
    swipedIds: new Set(),
}
const CACHE_TTL = 60000 // 60 seconds
const FETCH_TIMEOUT = 15000 // 15 second timeout

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
        console.log('[useJobOffers] fetchOffers called, user:', user?.id, 'forceRefresh:', forceRefresh)

        if (!user) {
            if (isMounted.current) {
                setLoading(false)
                setOffers([])
            }
            return
        }

        const now = Date.now()
        const cacheValid = offersCache.data && (now - offersCache.timestamp) < CACHE_TTL

        if (cacheValid && !forceRefresh) {
            console.log('[useJobOffers] Using cached data')
            const cachedOffers = offersCache.data.filter(
                o => !offersCache.swipedIds.has(o.id)
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
                offersCache.swipedIds = new Set(swipedOfferIds)
            }

            // Try Semantic Search
            const { data: matchedData, error: matchError } = await supabase.functions.invoke('get-matched-jobs')

            if (!matchError && matchedData?.success && matchedData?.offers?.length > 0) {
                internalOffers = matchedData.offers.filter(o => !offersCache.swipedIds.has(o.id))
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
                            matchScore: null
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
                console.warn('Failed to fetch external jobs:', extErr)
            }

            // ==========================================
            // MERGE: Internal First, then External
            // ==========================================
            const finalOffers = [...internalOffers, ...externalOffers]

            offersCache.data = finalOffers
            offersCache.timestamp = now

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

        // Optimistically remove from view
        setOffers(prev => prev.filter(o => o.id !== offerId))
        offersCache.swipedIds.add(offerId)

        // For External jobs, we don't save to DB (yet)
        if (typeof offerId === 'string' && offerId.startsWith('ext-')) {
            console.log('[useJobOffers] Swiped external job:', offerId, direction)
            return { error: null }
        }

        const { data, error: swipeError } = await supabase
            .from('student_swipes')
            .insert({
                student_id: user.id,
                offer_id: offerId,
                direction
            })

        if (swipeError) {
            console.error('[useJobOffers] Swipe insert ERROR:', swipeError)
        }

        return { error: swipeError?.message || null }

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
