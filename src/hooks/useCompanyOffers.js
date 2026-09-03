import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { safeLogWarn } from '../lib/logger'

const DAY_MS = 24 * 60 * 60 * 1000
const TREND_WINDOW_DAYS = 30
const DEFAULT_PAGE_SIZE = 8
const ALLOWED_STATUSES = new Set(['active', 'closed'])

const createEmptyOfferMetrics = () => ({
    lifetime: {
        right_swipes: 0,
        pending_intros: 0,
        accepted_intros: 0,
        matches: 0,
        match_rate: 0
    },
    last30d: {
        right_swipes: 0,
        pending_intros: 0,
        accepted_intros: 0,
        matches: 0,
        match_rate: 0
    }
})

const createEmptyAnalytics = () => ({
    lifetime: {
        offers_total: 0,
        offers_active: 0,
        offers_closed: 0,
        right_swipes: 0,
        pending_intros: 0,
        accepted_intros: 0,
        matches: 0,
        match_rate: 0,
        close_rate: 0
    },
    last30d: {
        right_swipes: 0,
        pending_intros: 0,
        accepted_intros: 0,
        matches: 0,
        match_rate: 0
    }
})

function toDateKey(value) {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toISOString().slice(0, 10)
}

function isWithinLast30Days(value, cutoffDate) {
    if (!value) return false
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return false
    return date >= cutoffDate
}

function toPercent(numerator, denominator) {
    if (!denominator) return 0
    return Number(((numerator / denominator) * 100).toFixed(1))
}

function createTrendSkeleton() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const points = []

    for (let offset = TREND_WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
        const day = new Date(today.getTime() - (offset * DAY_MS))
        const date = day.toISOString().slice(0, 10)
        const label = `${day.getMonth() + 1}/${day.getDate()}`
        points.push({
            date,
            label,
            right_swipes: 0,
            pending_intros: 0,
            accepted_intros: 0,
            matches: 0
        })
    }

    return points
}

function normalizeSkills(input) {
    if (!Array.isArray(input)) return []

    const unique = new Set()
    input.forEach((item) => {
        const value = String(item || '').trim()
        if (value) unique.add(value)
    })

    return Array.from(unique)
}

function normalizeOffers(offers) {
    return (offers || []).map((offer) => ({
        ...offer,
        req_skills: normalizeSkills(offer.req_skills),
        status: ALLOWED_STATUSES.has(offer.status) ? offer.status : 'active'
    }))
}

function computeAnalyticsAndMetrics({ offers, swipes, intros, matches }) {
    const analytics = createEmptyAnalytics()
    const trendPoints = createTrendSkeleton()
    const trendMap = new Map(trendPoints.map((point) => [point.date, point]))
    const offerMetrics = new Map()

    offers.forEach((offer) => {
        offerMetrics.set(offer.id, createEmptyOfferMetrics())
    })

    analytics.lifetime.offers_total = offers.length
    analytics.lifetime.offers_active = offers.filter((offer) => offer.status === 'active').length
    analytics.lifetime.offers_closed = offers.filter((offer) => offer.status === 'closed').length
    analytics.lifetime.close_rate = toPercent(analytics.lifetime.offers_closed, analytics.lifetime.offers_total)

    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setDate(cutoff.getDate() - (TREND_WINDOW_DAYS - 1))

    swipes.forEach((swipe) => {
        const metrics = offerMetrics.get(swipe.offer_id)
        if (!metrics) return

        metrics.lifetime.right_swipes += 1
        analytics.lifetime.right_swipes += 1

        const isRecent = isWithinLast30Days(swipe.created_at, cutoff)
        if (!isRecent) return

        metrics.last30d.right_swipes += 1
        analytics.last30d.right_swipes += 1

        const key = toDateKey(swipe.created_at)
        const point = key ? trendMap.get(key) : null
        if (point) {
            point.right_swipes += 1
        }
    })

    intros.forEach((intro) => {
        const metrics = offerMetrics.get(intro.offer_id)
        if (!metrics) return

        if (intro.status === 'pending') {
            metrics.lifetime.pending_intros += 1
            analytics.lifetime.pending_intros += 1
        } else if (intro.status === 'accepted') {
            metrics.lifetime.accepted_intros += 1
            analytics.lifetime.accepted_intros += 1
        }

        const isRecent = isWithinLast30Days(intro.created_at, cutoff)
        if (!isRecent) return

        const key = toDateKey(intro.created_at)
        const point = key ? trendMap.get(key) : null

        if (intro.status === 'pending') {
            metrics.last30d.pending_intros += 1
            analytics.last30d.pending_intros += 1
            if (point) point.pending_intros += 1
        } else if (intro.status === 'accepted') {
            metrics.last30d.accepted_intros += 1
            analytics.last30d.accepted_intros += 1
            if (point) point.accepted_intros += 1
        }
    })

    matches.forEach((match) => {
        const metrics = offerMetrics.get(match.offer_id)
        if (!metrics) return

        metrics.lifetime.matches += 1
        analytics.lifetime.matches += 1

        const timestamp = match.matched_at || match.created_at
        const isRecent = isWithinLast30Days(timestamp, cutoff)
        if (!isRecent) return

        metrics.last30d.matches += 1
        analytics.last30d.matches += 1

        const key = toDateKey(timestamp)
        const point = key ? trendMap.get(key) : null
        if (point) {
            point.matches += 1
        }
    })

    offerMetrics.forEach((metrics) => {
        metrics.lifetime.match_rate = toPercent(metrics.lifetime.matches, metrics.lifetime.right_swipes)
        metrics.last30d.match_rate = toPercent(metrics.last30d.matches, metrics.last30d.right_swipes)
    })

    analytics.lifetime.match_rate = toPercent(analytics.lifetime.matches, analytics.lifetime.right_swipes)
    analytics.last30d.match_rate = toPercent(analytics.last30d.matches, analytics.last30d.right_swipes)

    return {
        analytics,
        trends30d: trendPoints,
        offerMetrics
    }
}

export function useCompanyOffers() {
    const { user } = useAuth()
    const [offers, setOffers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filtersState, setFiltersState] = useState({
        search: '',
        status: 'all'
    })
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        total: 0,
        totalPages: 1
    })
    const [analytics, setAnalytics] = useState(createEmptyAnalytics())
    const [trends30d, setTrends30d] = useState(createTrendSkeleton())
    const isMounted = useRef(true)

    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
        }
    }, [])

    const fetchOffers = useCallback(async () => {
        if (!user?.id) {
            if (isMounted.current) {
                setOffers([])
                setLoading(false)
                setError(null)
                setAnalytics(createEmptyAnalytics())
                setTrends30d(createTrendSkeleton())
                setPagination((prev) => ({
                    ...prev,
                    total: 0,
                    totalPages: 1,
                    page: 1
                }))
            }
            return
        }

        if (isMounted.current) {
            setLoading(true)
            setError(null)
        }

        try {
            let offersQuery = supabase
                .from('offers')
                .select('id, company_id, title, description, req_skills, location, salary_range, status, created_at, updated_at')
                .eq('company_id', user.id)
                .order('created_at', { ascending: false })

            const searchValue = filtersState.search.trim()
            if (searchValue) {
                offersQuery = offersQuery.ilike('title', `%${searchValue}%`)
            }

            if (filtersState.status !== 'all') {
                offersQuery = offersQuery.eq('status', filtersState.status)
            }

            const { data: allOffers, error: offersError } = await offersQuery
            if (offersError) throw offersError

            const normalizedOffers = normalizeOffers(allOffers)
            const offerIds = normalizedOffers.map((offer) => offer.id)

            let swipes = []
            let intros = []
            let matches = []

            if (offerIds.length > 0) {
                const [
                    swipesResult,
                    introsResult,
                    matchesResult
                ] = await Promise.all([
                    supabase
                        .from('student_swipes')
                        .select('offer_id, direction, created_at')
                        .in('offer_id', offerIds)
                        .eq('direction', 'right'),
                    supabase
                        .from('intros')
                        .select('offer_id, status, created_at')
                        .in('offer_id', offerIds)
                        .in('status', ['pending', 'accepted']),
                    supabase
                        .from('matches')
                        .select('offer_id, matched_at, created_at')
                        .in('offer_id', offerIds)
                ])

                if (swipesResult.error) {
                    safeLogWarn('[useCompanyOffers] swipes query warning:', { error: swipesResult.error })
                }
                if (introsResult.error) {
                    safeLogWarn('[useCompanyOffers] intros query warning:', { error: introsResult.error })
                }
                if (matchesResult.error) {
                    safeLogWarn('[useCompanyOffers] matches query warning:', { error: matchesResult.error })
                }

                swipes = swipesResult.data || []
                intros = introsResult.data || []
                matches = matchesResult.data || []
            }

            const {
                analytics: nextAnalytics,
                trends30d: nextTrends30d,
                offerMetrics
            } = computeAnalyticsAndMetrics({
                offers: normalizedOffers,
                swipes,
                intros,
                matches
            })

            const total = normalizedOffers.length
            const nextTotalPages = Math.max(1, Math.ceil(total / pagination.pageSize))
            const currentPage = Math.min(pagination.page, nextTotalPages)
            const start = (currentPage - 1) * pagination.pageSize
            const end = start + pagination.pageSize

            const pageOffers = normalizedOffers.slice(start, end).map((offer) => ({
                ...offer,
                metrics: offerMetrics.get(offer.id) || createEmptyOfferMetrics()
            }))

            if (isMounted.current) {
                setOffers(pageOffers)
                setAnalytics(nextAnalytics)
                setTrends30d(nextTrends30d)
                setPagination((prev) => ({
                    ...prev,
                    page: currentPage,
                    total,
                    totalPages: nextTotalPages
                }))
                setLoading(false)
                setError(null)
            }
        } catch (err) {
            console.error('[useCompanyOffers] Failed to fetch offers:', err)
            if (isMounted.current) {
                setError(err.message || 'Failed to load offers')
                setOffers([])
                setAnalytics(createEmptyAnalytics())
                setTrends30d(createTrendSkeleton())
                setLoading(false)
            }
        }
    }, [user, filtersState.search, filtersState.status, pagination.page, pagination.pageSize])

    useEffect(() => {
        fetchOffers()
    }, [fetchOffers])

    const setFilters = useCallback((nextFilters) => {
        setFiltersState((prev) => {
            const resolved = typeof nextFilters === 'function'
                ? nextFilters(prev)
                : { ...prev, ...nextFilters }

            return {
                search: resolved.search ?? '',
                status: resolved.status ?? 'all'
            }
        })

        setPagination((prev) => ({
            ...prev,
            page: 1
        }))
    }, [])

    const setPage = useCallback((nextPage) => {
        setPagination((prev) => ({
            ...prev,
            page: Math.max(1, Math.min(nextPage, prev.totalPages || 1))
        }))
    }, [])

    const setPageSize = useCallback((nextPageSize) => {
        const parsed = Number(nextPageSize)
        const safeSize = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_PAGE_SIZE
        setPagination((prev) => ({
            ...prev,
            pageSize: safeSize,
            page: 1
        }))
    }, [])

    const updateOffer = useCallback(async (offerId, updates) => {
        if (!user?.id) return { error: 'Not authenticated' }
        if (!offerId) return { error: 'Offer ID is required' }

        const payload = {}

        if (Object.hasOwn(updates || {}, 'title')) {
            const title = String(updates.title || '').trim()
            if (!title) return { error: 'Offer title is required' }
            payload.title = title
        }

        if (Object.hasOwn(updates || {}, 'description')) {
            payload.description = String(updates.description || '').trim()
        }

        if (Object.hasOwn(updates || {}, 'req_skills')) {
            payload.req_skills = normalizeSkills(updates.req_skills)
        }

        if (Object.hasOwn(updates || {}, 'location')) {
            const value = String(updates.location || '').trim()
            payload.location = value || null
        }

        if (Object.hasOwn(updates || {}, 'salary_range')) {
            const value = String(updates.salary_range || '').trim()
            payload.salary_range = value || null
        }

        if (Object.hasOwn(updates || {}, 'status')) {
            const status = String(updates.status || '')
            if (!ALLOWED_STATUSES.has(status)) {
                return { error: 'Invalid status value' }
            }
            payload.status = status
        }

        payload.updated_at = new Date().toISOString()

        const { error: updateError } = await supabase
            .from('offers')
            .update(payload)
            .eq('id', offerId)
            .eq('company_id', user.id)

        if (updateError) return { error: updateError.message || 'Failed to update offer' }

        await fetchOffers()
        return { error: null }
    }, [user, fetchOffers])

    const toggleStatus = useCallback(async (offerId, nextStatus) => {
        if (!ALLOWED_STATUSES.has(nextStatus)) {
            return { error: 'Invalid status value' }
        }

        return updateOffer(offerId, { status: nextStatus })
    }, [updateOffer])

    const deleteOffer = useCallback(async (offerId) => {
        if (!user?.id) return { error: 'Not authenticated' }
        if (!offerId) return { error: 'Offer ID is required' }

        const { error: deleteError } = await supabase
            .from('offers')
            .delete()
            .eq('id', offerId)
            .eq('company_id', user.id)

        if (deleteError) return { error: deleteError.message || 'Failed to delete offer' }

        await fetchOffers()
        return { error: null }
    }, [user, fetchOffers])

    const stableFilters = useMemo(() => filtersState, [filtersState])

    return {
        offers,
        loading,
        error,
        filters: stableFilters,
        setFilters,
        pagination,
        setPage,
        setPageSize,
        analytics,
        trends30d,
        refresh: fetchOffers,
        updateOffer,
        toggleStatus,
        deleteOffer
    }
}

export default useCompanyOffers
