import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { isPremiumActive } from '../lib/premiumEntitlements'
import {
    applyMatchStatusOverrides,
    readMatchStatusOverrides,
    setMatchStatusOverride,
} from '../lib/companyMatchIntelligence'
import { safeLogError, safeLogWarn } from '../lib/logger'

async function fetchPremiumFlags(studentIds) {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return new Map()
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, is_premium, premium_expires_at')
        .in('id', studentIds)

    if (error) {
        safeLogWarn('[useMatches] premium flags lookup failed', { error })
        return new Map()
    }

    return new Map(
        (data || []).map((profile) => [profile.id, isPremiumActive(profile)])
    )
}

// User-scoped in-memory cache for matches
// Map<`${userId}:${role}`  →  { data, timestamp }>
const matchesCacheMap = new Map()
const CACHE_TTL = 30000 // 30 seconds

function getCacheEntry(userId, role) {
    return matchesCacheMap.get(`${userId}:${role}`) || { data: null, timestamp: 0 }
}
function setCacheEntry(userId, role, data) {
    matchesCacheMap.set(`${userId}:${role}`, { data, timestamp: Date.now() })
}
function invalidateCache(userId, role) {
    const entry = matchesCacheMap.get(`${userId}:${role}`)
    if (entry) entry.timestamp = 0
}

/**
 * Hook for fetching and managing matches
 * Works for both students and companies
 * Implements caching with stale-while-revalidate pattern
 */
export function useMatches() {
    const [matches, setMatches] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const { user, profile, isStudent, isCompany } = useAuth()
    const isMounted = useRef(true)

    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
            // Cancel any in-flight fetch when the component unmounts
            if (abortRef.current) abortRef.current.abort()
        }
    }, [])

    // AbortController to prevent race conditions when user/profile changes mid-fetch
    const abortRef = useRef(null)

    const fetchMatches = useCallback(async (forceRefresh = false) => {
        // No user or profile - stop loading
        if (!user || !profile) {
            if (isMounted.current) {
                setLoading(false)
                setMatches([])
            }
            return
        }

        // Abort any in-flight request before starting a new one
        if (abortRef.current) {
            abortRef.current.abort()
        }
        const controller = new AbortController()
        abortRef.current = controller

        const role = isStudent ? 'student' : 'company'
        const cache = getCacheEntry(user.id, role)
        const now = Date.now()
        const cacheValid = cache.data && (now - cache.timestamp) < CACHE_TTL

        // Return cached data immediately (stale-while-revalidate)
        if (cacheValid && !forceRefresh) {
            if (isMounted.current) {
                setMatches(cache.data)
                setLoading(false)
            }
            return
        }

        if (isMounted.current) {
            setLoading(true)
            setError(null)
        }

        try {
            let query = supabase
                .from('matches')
                .select(`
                    *,
                    offers!offer_id (
                        id, title, description, location,
                        companies!company_id (
                            id, logo_url, industry, company_name
                        )
                    ),
                    students!student_id (
                        id, display_name, skills
                    )
                `)
                .order('matched_at', { ascending: false })
                .abortSignal(controller.signal)

            if (isStudent) {
                query = query.eq('student_id', user.id)
            } else if (isCompany) {
                query = query.eq('company_id', user.id)
            }

            const { data, error: fetchError } = await query

            // If aborted, bail silently
            if (controller.signal.aborted) return

            if (fetchError) {
                safeLogError('[useMatches] matches query failed', { error: fetchError })
                if (isMounted.current) {
                    setError(`Failed to load matches: ${fetchError.message} (code: ${fetchError.code})`)
                    setMatches([])
                    setLoading(false)
                }
                return
            }

            let normalizedMatches = data || []

            if (isCompany && normalizedMatches.length > 0) {
                const studentIds = Array.from(
                    new Set(
                        normalizedMatches
                            .map((match) => match.student_id)
                            .filter(Boolean)
                    )
                )

                const premiumFlags = await fetchPremiumFlags(studentIds)
                normalizedMatches = normalizedMatches.map((match) => ({
                    ...match,
                    candidate: {
                        ...(match.candidate || {}),
                        id: match.student_id,
                        is_premium_active: premiumFlags.get(match.student_id) === true
                    }
                }))
            }

            if (normalizedMatches.length > 0) {
                const statusOverrides = readMatchStatusOverrides()
                normalizedMatches = applyMatchStatusOverrides(normalizedMatches, statusOverrides)
            }

            // Update user-scoped cache
            setCacheEntry(user.id, role, normalizedMatches)

            if (isMounted.current) {
                setMatches(normalizedMatches)
                setError(null)
                setLoading(false)
            }
        } catch (err) {
            if (err.name === 'AbortError') return // expected, ignore
            safeLogError('[useMatches] unexpected exception', { error: err })
            if (isMounted.current) {
                setError(err.message || 'Failed to load matches')
                setMatches([])
                setLoading(false)
            }
        }
    }, [user, profile, isStudent, isCompany])

    useEffect(() => {
        fetchMatches()
    }, [fetchMatches])

    const archiveMatch = useCallback(async (matchId) => {
        const { error } = await supabase
            .from('matches')
            .update({ status: 'archived' })
            .eq('id', matchId)

        if (!error) {
            setMatchStatusOverride(matchId, 'archived')
            setMatches(prev => prev.filter(m => m.id !== matchId))
            // Invalidate user-scoped cache
            invalidateCache(user?.id, isStudent ? 'student' : 'company')
        }

        return { error }
    }, [isStudent])

    return {
        matches,
        loading,
        error,
        refresh: () => fetchMatches(true),
        archiveMatch
    }
}

export default useMatches
