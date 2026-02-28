import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useExternalJobs() {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const ITEMS_PER_PAGE = 24

    const [filters, setFilters] = useState({
        query: '',
        location: '',
        jobType: ''
    })

    useEffect(() => {
        // Reset to page 1 when filters change
        setPage(1)
        fetchJobs(1)
    }, [filters])

    useEffect(() => {
        fetchJobs(page)
    }, [page])

    async function fetchJobs(pageNum) {
        setLoading(true)
        try {
            const rangeStart = (pageNum - 1) * ITEMS_PER_PAGE
            const rangeEnd = rangeStart + ITEMS_PER_PAGE - 1

            let query = supabase
                .from('external_jobs_public')
                .select('*', { count: 'exact' })
                .order('posted_at', { ascending: false })
                .range(rangeStart, rangeEnd)

            if (filters.query) {
                query = query.ilike('title', `%${filters.query}%`)
            }
            if (filters.location) {
                query = query.ilike('location', `%${filters.location}%`)
            }

            const { data, count, error } = await query

            if (error) throw error

            setJobs(data || [])
            setTotalCount(count || 0)

        } catch (err) {
            console.error('Error fetching external jobs:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const nextPage = () => {
        if (!loading && (page * ITEMS_PER_PAGE < totalCount)) {
            setPage(prev => prev + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const prevPage = () => {
        if (!loading && page > 1) {
            setPage(prev => prev - 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    return {
        jobs,
        loading,
        error,
        filters,
        setFilters,
        page,
        totalCount,
        totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE),
        nextPage,
        prevPage,
        refresh: () => fetchJobs(page)
    }
}
