import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function normalizeIntroItem(row) {
    const student = row.students
    const offer = row.offers
    return {
        id: `intro-${row.id}`,
        sourceId: row.id,
        studentId: student?.id || row.student_id || null,
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
        studentId: student?.id || row.student_id || null,
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
                        student_id,
                        status,
                        matched_at,${updatedAtSegment}
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
        .eq('company_id', companyId)
        .eq('status', 'archived')
        .order('matched_at', { ascending: false })
        .limit(200)
}

function mergeClosedItems(introItems, matchItems) {
    const map = new Map()

    // 1. Process match items first (they hold matchId, chat channel and direct restore capability)
    for (const match of matchItems) {
        const key = match.studentId
            ? `${match.studentId}_${match.offerTitle || match.offerId || ''}`
            : match.id
        map.set(key, { ...match })
    }

    // 2. Process intro items: merge if candidate + offer already exists, or add if unique
    for (const intro of introItems) {
        const key = intro.studentId
            ? `${intro.studentId}_${intro.offerTitle || intro.offerId || ''}`
            : intro.id

        if (map.has(key)) {
            const existing = map.get(key)
            map.set(key, {
                ...existing,
                candidateLocation: existing.candidateLocation || intro.candidateLocation,
                candidateSkills: (existing.candidateSkills && existing.candidateSkills.length > 0)
                    ? existing.candidateSkills
                    : intro.candidateSkills,
                offerTitle: existing.offerTitle || intro.offerTitle,
                introId: intro.sourceId,
                // Keep the most recent closure timestamp
                closedAt: (!existing.closedAt || (intro.closedAt && new Date(intro.closedAt) > new Date(existing.closedAt)))
                    ? intro.closedAt
                    : existing.closedAt
            })
        } else {
            map.set(key, { ...intro })
        }
    }

    return Array.from(map.values()).sort((a, b) => {
        const aTime = Date.parse(a.closedAt || 0)
        const bTime = Date.parse(b.closedAt || 0)
        return bTime - aTime
    })
}

const DELETED_STORAGE_KEY = 'matchop_deleted_archived_candidates_v1'

export function getDeletedArchivedIds() {
    try {
        const raw = localStorage.getItem(DELETED_STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

export function addDeletedArchivedId(idOrKey) {
    if (!idOrKey) return
    try {
        const current = getDeletedArchivedIds()
        const stringId = String(idOrKey)
        if (!current.includes(stringId)) {
            current.push(stringId)
            localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(current))
        }
    } catch (e) {
        console.error('Failed to save deleted archive id:', e)
    }
}

export function clearDeletedArchivedId(idOrKey) {
    if (!idOrKey) return
    try {
        const current = getDeletedArchivedIds()
        const stringId = String(idOrKey)
        const next = current.filter((id) => id !== stringId)
        localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(next))
    } catch (e) {
        console.error('Failed to clear deleted archive id:', e)
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

            const merged = mergeClosedItems(introItems, matchItems)
            const deletedIds = new Set(getDeletedArchivedIds().map(String))

            const filtered = merged.filter((item) => {
                if (deletedIds.has(String(item.id))) return false
                if (item.matchId && deletedIds.has(String(item.matchId))) return false
                if (item.introId && deletedIds.has(String(item.introId))) return false
                if (item.sourceId && deletedIds.has(String(item.sourceId))) return false
                if (item.studentId && deletedIds.has(String(item.studentId))) return false
                const compositeKey = item.studentId ? `${item.studentId}_${item.offerTitle || item.offerId || ''}` : null
                if (compositeKey && deletedIds.has(compositeKey)) return false
                return true
            })

            setItems(filtered)
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
