import { useState, useEffect, useCallback } from 'react'
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
        console.warn('[useCandidates] premium flags lookup failed:', error.message)
        return new Map()
    }

    return new Map(
        (data || []).map((profile) => [profile.id, isPremiumActive(profile)])
    )
}

/**
 * Hook to fetch students who swiped right on company's offers
 * Returns list of candidates with their information
 */
export function useCandidates() {
    const { user } = useAuth()
    const [candidates, setCandidates] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filters, setFilters] = useState({
        skills: [],
        location: ''
    })

    const fetchCandidates = useCallback(async () => {
        if (!user) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            // Get all offers from this company
            const { data: companyOffers, error: offersError } = await supabase
                .from('offers')
                .select('id')
                .eq('company_id', user.id)
                .eq('status', 'active')

            if (offersError) throw offersError

            const offerIds = companyOffers.map(o => o.id)

            if (offerIds.length === 0) {
                setCandidates([])
                setLoading(false)
                return
            }

            // Get students who swiped right on ANY of our offers
            const { data: swipes, error: swipesError } = await supabase
                .from('student_swipes')
                .select(`
                    student_id,
                    offer_id,
                    direction,
                    created_at,
                    students!student_id (
                        id,
                        display_name,
                        skills,
                        location
                    ),
                    offers!offer_id (
                        id,
                        title
                    )
                `)
                .in('offer_id', offerIds)
                .eq('direction', 'right')
                .order('created_at', { ascending: false })

            if (swipesError) throw swipesError

            // Check which students the company already swiped on
            const { data: companySwipes } = await supabase
                .from('company_swipes')
                .select('student_id, direction')
                .eq('company_id', user.id)

            const companySwipedMap = new Map(
                companySwipes?.map(s => [s.student_id, s.direction]) || []
            )

            // Transform data and filter duplicates
            const uniqueStudents = new Map()

            swipes?.forEach(swipe => {
                const student = swipe.students
                if (!student) return

                const studentId = student.id

                // Skip if already in map or if company already swiped
                if (uniqueStudents.has(studentId) || companySwipedMap.has(studentId)) {
                    return
                }

                uniqueStudents.set(studentId, {
                    id: student.id,
                    name: student.display_name || 'Student',
                    skills: student.skills || [],
                    location: student.location || 'Unknown',
                    offerTitle: swipe.offers?.title || 'Job Offer',
                    offerId: swipe.offer_id,
                    swipedAt: swipe.created_at,
                    hasLiked: true // They swiped right
                })
            })

            const premiumFlags = await fetchPremiumFlags(Array.from(uniqueStudents.keys()))

            let candidatesList = Array.from(uniqueStudents.values()).map((candidate) => ({
                ...candidate,
                is_premium_active: premiumFlags.get(candidate.id) === true
            }))

            // Apply filters
            if (filters.skills.length > 0) {
                candidatesList = candidatesList.filter(c =>
                    filters.skills.some(skill =>
                        c.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
                    )
                )
            }

            if (filters.location) {
                candidatesList = candidatesList.filter(c =>
                    c.location.toLowerCase().includes(filters.location.toLowerCase())
                )
            }

            setCandidates(candidatesList)
        } catch (err) {
            console.error('[useCandidates] Error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [user, filters])

    useEffect(() => {
        fetchCandidates()
    }, [fetchCandidates])

    const swipeOnCandidate = useCallback(async (candidateId, direction, offerId) => {
        if (!user) return { error: 'Not authenticated' }

        const { error } = await supabase
            .from('company_swipes')
            .insert({
                company_id: user.id,
                student_id: candidateId,
                offer_id: offerId,
                direction
            })

        if (!error) {
            // Remove from local list
            setCandidates(prev => prev.filter(c => c.id !== candidateId))
        }

        return { error }
    }, [user])

    return {
        candidates,
        loading,
        error,
        filters,
        setFilters,
        swipeOnCandidate,
        refresh: fetchCandidates
    }
}

export default useCandidates
