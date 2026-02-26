import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { isPremiumActive } from '../lib/premiumEntitlements'

async function fetchPremiumFlags(studentIds) {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return new Map()
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, is_premium, premium_expires_at')
        .in('id', studentIds)

    if (error) {
        console.warn('[useMatches] premium flags lookup failed:', error.message)
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
        console.log('[useMatches] fetchMatches called:', {
            userId: user?.id,
            hasProfile: !!profile,
            isStudent,
            isCompany,
            forceRefresh
        })

        // No user or profile - stop loading
        if (!user || !profile) {
            console.log('[useMatches] No user or profile, setting loading=false')
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
            console.log('[useMatches] Using cached data, setting loading=false')
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
            // Build query based on user type
            console.log('[useMatches] Building query for:', role, 'id:', user.id)

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

            console.log('[useMatches] Executing matches query...')
            const { data, error: fetchError } = await query

            // If aborted, bail silently
            if (controller.signal.aborted) return

            console.log('[useMatches] Matches query result:', {
                data: data,
                error: fetchError,
                count: data?.length
            })

            if (fetchError) {
                console.error('[useMatches] Matches query ERROR:', fetchError.code, fetchError.message)
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

            // Update user-scoped cache
            setCacheEntry(user.id, role, normalizedMatches)

            console.log('[useMatches] Success, found', normalizedMatches.length || 0, 'matches, setting loading=false')

            if (isMounted.current) {
                setMatches(normalizedMatches)
                setError(null)
                setLoading(false)
            }
        } catch (err) {
            if (err.name === 'AbortError') return // expected, ignore
            console.error('[useMatches] Unexpected exception:', err)
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
        console.log('[useMatches] archiveMatch called:', matchId)

        const { error } = await supabase
            .from('matches')
            .update({ status: 'archived' })
            .eq('id', matchId)

        console.log('[useMatches] archiveMatch result:', { error })

        if (!error) {
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
