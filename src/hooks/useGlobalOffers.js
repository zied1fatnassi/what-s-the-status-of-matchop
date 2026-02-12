import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const ITEMS_PER_PAGE = 24

/**
 * Hook for browsing all active offers (internal + external)
 * with search, category filters, sorting, and pagination.
 */
export function useGlobalOffers() {
    const [internalOffers, setInternalOffers] = useState([])
    const [externalJobs, setExternalJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [stats, setStats] = useState({ total: 0, companies: 0, categories: 0 })
    const isMounted = useRef(true)

    const [filters, setFilters] = useState({
        query: '',
        category: '',
        location: '',
        sort: 'newest' // newest | oldest | salary_high | salary_low | title_az
    })

    useEffect(() => {
        isMounted.current = true
        return () => { isMounted.current = false }
    }, [])

    // Reset page when filters change
    useEffect(() => {
        setPage(1)
    }, [filters.query, filters.category, filters.location, filters.sort])

    // Fetch stats once
    useEffect(() => {
        fetchStats()
    }, [])

    // Fetch data when page or filters change
    useEffect(() => {
        fetchOffers()
    }, [fetchOffers])

    async function fetchStats() {
        try {
            const [offersRes, extRes, companiesRes] = await Promise.all([
                supabase.from('offers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
                supabase.from('external_jobs').select('id', { count: 'exact', head: true }),
                supabase.from('companies').select('id', { count: 'exact', head: true })
            ])

            const totalOffers = (offersRes.count || 0) + (extRes.count || 0)
            if (isMounted.current) {
                setStats({
                    total: totalOffers,
                    companies: companiesRes.count || 0,
                    categories: 8 // approximate
                })
            }
        } catch (err) {
            console.error('[useGlobalOffers] Stats error:', err)
        }
    }

    const fetchOffers = useCallback(async () => {
        if (!isMounted.current) return
        setLoading(true)
        setError(null)

        try {
            const rangeStart = (page - 1) * ITEMS_PER_PAGE
            const rangeEnd = rangeStart + ITEMS_PER_PAGE - 1

            // Determine sort config
            let orderCol = 'created_at'
            let ascending = false
            if (filters.sort === 'oldest') { orderCol = 'created_at'; ascending = true }
            else if (filters.sort === 'title_az') { orderCol = 'title'; ascending = true }

            // ---- Internal offers ----
            let internalQuery = supabase
                .from('offers')
                .select('*, companies!company_id(id, company_name, logo_url, industry)', { count: 'exact' })
                .eq('status', 'active')
                .order(orderCol, { ascending })
                .range(rangeStart, rangeEnd)

            if (filters.query) {
                internalQuery = internalQuery.ilike('title', `%${filters.query}%`)
            }
            if (filters.location) {
                internalQuery = internalQuery.ilike('location', `%${filters.location}%`)
            }

            // ---- External jobs ----
            let externalQuery = supabase
                .from('external_jobs')
                .select('*', { count: 'exact' })
                .order('posted_at', { ascending })
                .range(rangeStart, rangeEnd)

            if (filters.query) {
                externalQuery = externalQuery.ilike('title', `%${filters.query}%`)
            }
            if (filters.location) {
                externalQuery = externalQuery.ilike('location', `%${filters.location}%`)
            }

            const [internalRes, externalRes] = await Promise.all([
                internalQuery,
                externalQuery
            ])

            if (internalRes.error) throw internalRes.error

            // Normalize internal offers
            const normalizedInternal = (internalRes.data || []).map(offer => ({
                id: offer.id,
                title: offer.title,
                description: offer.description,
                company: offer.companies?.company_name || 'Unknown Company',
                companyLogo: offer.companies?.logo_url || null,
                industry: offer.companies?.industry || '',
                salary: offer.salary_range || 'Competitive',
                skills: offer.req_skills || [],
                location: offer.location || 'Remote',
                status: offer.status,
                createdAt: offer.created_at,
                expiresAt: offer.updated_at, // approximate expiry
                isExternal: false,
                externalUrl: null
            }))

            // Normalize external jobs
            const normalizedExternal = (externalRes.data || []).map(job => ({
                id: `ext-${job.id}`,
                title: job.title,
                description: job.description || '',
                company: job.company_name || 'Company',
                companyLogo: job.logo_url || null,
                industry: job.industry || '',
                salary: job.salary || 'Competitive',
                skills: [],
                location: job.location || 'Remote',
                status: 'active',
                createdAt: job.posted_at || job.created_at,
                expiresAt: null,
                isExternal: true,
                externalUrl: job.original_url || job.apply_url || job.url || job.link,
                sourceWebsite: job.source_website
            }))

            const totalCombined = (internalRes.count || 0) + (externalRes.count || 0)

            if (isMounted.current) {
                setInternalOffers(normalizedInternal)
                setExternalJobs(normalizedExternal)
                setTotalCount(totalCombined)
            }
        } catch (err) {
            console.error('[useGlobalOffers] Fetch error:', err)
            if (isMounted.current) {
                setError(err.message || 'Failed to load offers')
            }
        } finally {
            if (isMounted.current) setLoading(false)
        }
    }, [page, filters])

    // Merge + client-side category filter + sort
    const offers = useMemo(() => {
        let merged = [...internalOffers, ...externalJobs]

        // Category filter (maps to industry)
        if (filters.category) {
            merged = merged.filter(o =>
                o.industry?.toLowerCase().includes(filters.category.toLowerCase())
            )
        }

        // Client-side sort for salary (needs parsing)
        if (filters.sort === 'salary_high') {
            merged.sort((a, b) => parseSalary(b.salary) - parseSalary(a.salary))
        } else if (filters.sort === 'salary_low') {
            merged.sort((a, b) => parseSalary(a.salary) - parseSalary(b.salary))
        }

        return merged
    }, [internalOffers, externalJobs, filters.category, filters.sort])

    const nextPage = useCallback(() => {
        if (!loading && page * ITEMS_PER_PAGE < totalCount) {
            setPage(p => p + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }, [loading, page, totalCount])

    const prevPage = useCallback(() => {
        if (!loading && page > 1) {
            setPage(p => p - 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }, [loading, page])

    const goToPage = useCallback((p) => {
        if (!loading && p >= 1 && p <= Math.ceil(totalCount / ITEMS_PER_PAGE)) {
            setPage(p)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }, [loading, totalCount])

    const refresh = useCallback(() => fetchOffers(), [fetchOffers])

    return {
        offers,
        loading,
        error,
        filters,
        setFilters,
        page,
        totalCount,
        totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE),
        nextPage,
        prevPage,
        goToPage,
        refresh,
        stats
    }
}

/** Extract a numeric value from salary strings like "1000-2000 TND", "$500", "Competitive" */
function parseSalary(salary) {
    if (!salary || salary === 'Competitive') return 0
    const nums = salary.match(/\d+/g)
    if (!nums || nums.length === 0) return 0
    // Take the average if range
    return nums.reduce((sum, n) => sum + parseInt(n, 10), 0) / nums.length
}
