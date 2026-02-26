import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function normalizeIntroItem(row) {
    const student = row.students
    const offer = row.offers
    return {
        id: `intro-${row.id}`,
        sourceId: row.id,
        type: 'intro',
        status: row.status || 'declined',
        candidateName: student?.display_name || null,
        candidateSkills: Array.isArray(student?.skills) ? student.skills : [],
        candidateLocation: student?.location || null,
        offerTitle: offer?.title || null,
        closedAt: row.updated_at || row.created_at || null,
        matchId: null,
        lastMessage: null
    }
}

function normalizeArchivedMatch(row) {
    const student = row.students
    const offer = row.offers
    return {
        id: `match-${row.id}`,
        sourceId: row.id,
        type: 'match',
        status: row.status || 'archived',
        candidateName: student?.display_name || null,
        candidateSkills: Array.isArray(student?.skills) ? student.skills : [],
        candidateLocation: null,
        offerTitle: offer?.title || null,
        closedAt: row.updated_at || row.matched_at || null,
        matchId: row.id,
        lastMessage: row.last_message || null
    }
}

export function useCompanyClosedItems() {
    const { user } = useAuth()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const loadClosedItems = useCallback(async () => {
        if (!user?.id) {
            setItems([])
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const [introRes, matchRes] = await Promise.all([
                supabase
                    .from('intros')
                    .select(`
                        id,
                        status,
                        created_at,
                        updated_at,
                        students:student_id (
                            id,
                            display_name,
                            skills,
                            location
                        ),
                        offers:offer_id (
                            id,
                            title
                        )
                    `)
                    .eq('company_id', user.id)
                    .in('status', ['declined', 'expired'])
                    .order('created_at', { ascending: false })
                    .limit(200),
                supabase
                    .from('matches')
                    .select(`
                        id,
                        status,
                        matched_at,
                        updated_at,
                        last_message,
                        students:student_id (
                            id,
                            display_name,
                            skills
                        ),
                        offers:offer_id (
                            id,
                            title
                        )
                    `)
                    .eq('company_id', user.id)
                    .eq('status', 'archived')
                    .order('matched_at', { ascending: false })
                    .limit(200)
            ])

            if (introRes.error) throw introRes.error
            if (matchRes.error) throw matchRes.error

            const introItems = (introRes.data || []).map(normalizeIntroItem)
            const matchItems = (matchRes.data || []).map(normalizeArchivedMatch)

            const combined = [...introItems, ...matchItems].sort((a, b) => {
                const aTime = Date.parse(a.closedAt || 0)
                const bTime = Date.parse(b.closedAt || 0)
                return bTime - aTime
            })

            setItems(combined)
        } catch (err) {
            setError(err.message || 'Failed to load closed items')
            setItems([])
        } finally {
            setLoading(false)
        }
    }, [user?.id])

    useEffect(() => {
        loadClosedItems()
    }, [loadClosedItems])

    return {
        items,
        loading,
        error,
        refresh: loadClosedItems
    }
}

export default useCompanyClosedItems
