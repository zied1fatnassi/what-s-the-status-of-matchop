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
        closedAt: row.reviewed_at || row.created_at || null,
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
        closedAt: row.updated_at || row.matched_at || row.created_at || null,
        matchId: row.id,
        lastMessage: row.last_message || null
    }
}

function isMissingColumnError(error, columnName) {
    const rawMessage = String(error?.message || '').toLowerCase()
    const rawDetails = String(error?.details || '').toLowerCase()
    const code = String(error?.code || '').toLowerCase()
    const needle = String(columnName || '').toLowerCase()

    const message = `${rawMessage} ${rawDetails}`
    return (
        (code === '42703' || message.includes('does not exist') || message.includes('unknown column')) &&
        message.includes(needle)
    )
}

async function fetchArchivedMatches(companyId, includeUpdatedAt = true) {
    const updatedAtSegment = includeUpdatedAt ? '\n                        updated_at,' : ''
    return supabase
        .from('matches')
        .select(`
                        id,
                        status,
                        matched_at,${updatedAtSegment}
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
        .eq('company_id', companyId)
        .eq('status', 'archived')
        .order('matched_at', { ascending: false })
        .limit(200)
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
            const [introRes, initialMatchRes] = await Promise.all([
                supabase
                    .from('intros')
                    .select(`
                        id,
                        status,
                        created_at,
                        reviewed_at,
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
                fetchArchivedMatches(user.id, true)
            ])

            let matchRes = initialMatchRes

            if (matchRes.error && isMissingColumnError(matchRes.error, 'updated_at')) {
                matchRes = await fetchArchivedMatches(user.id, false)
            }

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
