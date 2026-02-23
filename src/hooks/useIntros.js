import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Hook for company-side intro triage (Handshake System)
 * 
 * Fetches pending intros (students who swiped right on company's offers),
 * allows batch accept/decline, and manages intro lifecycle.
 * 
 * When a company accepts an intro, the DB trigger automatically creates
 * a match record and opens a chat channel.
 */

// Cache for intros
const introsCacheMap = new Map()
const CACHE_TTL = 15000 // 15 seconds (shorter than matches since intros are time-sensitive)

function getCacheEntry(companyId, status) {
    return introsCacheMap.get(`${companyId}:${status}`) || { data: null, timestamp: 0 }
}
function setCacheEntry(companyId, status, data) {
    introsCacheMap.set(`${companyId}:${status}`, { data, timestamp: Date.now() })
}

export function useIntros(statusFilter = 'pending') {
    const { user } = useAuth()
    const [intros, setIntros] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [stats, setStats] = useState({ pending: 0, accepted: 0, declined: 0, expired: 0 })
    const isMounted = useRef(true)

    useEffect(() => {
        isMounted.current = true
        return () => { isMounted.current = false }
    }, [])

    // Fetch intros for the company
    const fetchIntros = useCallback(async (forceRefresh = false) => {
        if (!user) {
            if (isMounted.current) {
                setLoading(false)
                setIntros([])
            }
            return
        }

        const cache = getCacheEntry(user.id, statusFilter)
        const cacheValid = cache.data && (Date.now() - cache.timestamp) < CACHE_TTL

        if (cacheValid && !forceRefresh) {
            if (isMounted.current) {
                setIntros(cache.data)
                setLoading(false)
            }
            return
        }

        if (isMounted.current) {
            setLoading(true)
            setError(null)
        }

        try {
            // Fetch intros via RPC for rich data
            const { data, error: rpcError } = await supabase
                .rpc('get_company_intros', {
                    p_company_id: user.id,
                    p_status: statusFilter,
                    p_limit: 50,
                    p_offset: 0
                })

            if (rpcError) throw rpcError

            // Format data for the UI
            const formattedIntros = (data || []).map(intro => ({
                id: intro.intro_id,
                studentId: intro.student_id,
                offerId: intro.offer_id,
                studentName: intro.student_name || 'Student',
                studentSkills: intro.student_skills || [],
                studentLocation: intro.student_location || 'Unknown',
                studentAvatar: intro.student_avatar,
                studentBio: intro.student_bio,
                offerTitle: intro.offer_title || 'Job Offer',
                matchScore: intro.match_score,
                icebreaker: intro.icebreaker,
                status: intro.status,
                createdAt: intro.created_at,
                expiresAt: intro.expires_at,
                // Time remaining in human-readable format
                timeRemaining: getTimeRemaining(intro.expires_at)
            }))

            setCacheEntry(user.id, statusFilter, formattedIntros)

            if (isMounted.current) {
                setIntros(formattedIntros)
                setError(null)
                setLoading(false)
            }

            // Also fetch stats (counts per status)
            fetchStats()

        } catch (err) {
            console.error('[useIntros] Error:', err)
            if (isMounted.current) {
                setError(err.message || 'Failed to load intros')
                setIntros([])
                setLoading(false)
            }
        }
    }, [user, statusFilter])

    // Fetch counts per status for the tabs
    const fetchStats = useCallback(async () => {
        if (!user) return

        try {
            const { data, error: countError } = await supabase
                .from('intros')
                .select('status')
                .eq('company_id', user.id)

            if (countError) throw countError

            const counts = { pending: 0, accepted: 0, declined: 0, expired: 0 }
            data?.forEach(row => {
                if (Object.hasOwn(counts, row.status)) {
                    counts[row.status]++
                }
            })

            if (isMounted.current) {
                setStats(counts)
            }
        } catch (err) {
            console.error('[useIntros] Stats error:', err)
        }
    }, [user])

    useEffect(() => {
        fetchIntros()
    }, [fetchIntros])

    // Accept a single intro — triggers DB match creation
    const acceptIntro = useCallback(async (introId) => {
        if (!user) return { error: 'Not authenticated' }

        const { error: updateError } = await supabase
            .from('intros')
            .update({ status: 'accepted' })
            .eq('id', introId)
            .eq('company_id', user.id)

        if (!updateError) {
            setIntros(prev => prev.filter(i => i.id !== introId))
            // Invalidate caches
            introsCacheMap.clear()
        }

        return { error: updateError?.message || null }
    }, [user])

    // Decline a single intro (silent — student sees "pending" → eventually "expired")
    const declineIntro = useCallback(async (introId) => {
        if (!user) return { error: 'Not authenticated' }

        const { error: updateError } = await supabase
            .from('intros')
            .update({ status: 'declined' })
            .eq('id', introId)
            .eq('company_id', user.id)

        if (!updateError) {
            setIntros(prev => prev.filter(i => i.id !== introId))
            introsCacheMap.clear()
        }

        return { error: updateError?.message || null }
    }, [user])

    // Batch accept multiple intros
    const batchAccept = useCallback(async (introIds) => {
        if (!user || !introIds.length) return { error: 'Invalid input' }

        const { error: updateError } = await supabase
            .from('intros')
            .update({ status: 'accepted' })
            .in('id', introIds)
            .eq('company_id', user.id)

        if (!updateError) {
            setIntros(prev => prev.filter(i => !introIds.includes(i.id)))
            introsCacheMap.clear()
        }

        return { error: updateError?.message || null }
    }, [user])

    // Batch decline multiple intros
    const batchDecline = useCallback(async (introIds) => {
        if (!user || !introIds.length) return { error: 'Invalid input' }

        const { error: updateError } = await supabase
            .from('intros')
            .update({ status: 'declined' })
            .in('id', introIds)
            .eq('company_id', user.id)

        if (!updateError) {
            setIntros(prev => prev.filter(i => !introIds.includes(i.id)))
            introsCacheMap.clear()
        }

        return { error: updateError?.message || null }
    }, [user])

    return {
        intros,
        loading,
        error,
        stats,
        acceptIntro,
        declineIntro,
        batchAccept,
        batchDecline,
        refresh: () => fetchIntros(true)
    }
}

// Helper: calculate time remaining until expiry
function getTimeRemaining(expiresAt) {
    if (!expiresAt) return 'Unknown'
    const now = new Date()
    const expires = new Date(expiresAt)
    const diffMs = expires - now

    if (diffMs <= 0) return 'Expired'

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
}

export default useIntros
