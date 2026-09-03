import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const FALLBACK_NAMES = {
    student: 'Candidate',
    company: 'Company'
}

function toTimestamp(value) {
    if (!value) return 0
    const parsed = new Date(value).getTime()
    return Number.isFinite(parsed) ? parsed : 0
}

function buildParticipant(match, role) {
    if (role === 'student') {
        const companyFromOffer = match?.offers?.companies || {}
        const companyInline = match?.companies || {}
        return {
            id: match?.company_id || companyFromOffer?.id || companyInline?.id || null,
            name:
                companyFromOffer?.company_name ||
                companyInline?.company_name ||
                FALLBACK_NAMES.company,
            avatarUrl: companyFromOffer?.logo_url || companyInline?.logo_url || null
        }
    }

    return {
        id: match?.student_id || null,
        name: match?.students?.display_name || FALLBACK_NAMES.student,
        avatarUrl: match?.students?.avatar_url || null
    }
}

function toThread(match, role, latestMessage, unreadCount) {
    return {
        id: match.id,
        offerId: match.offer_id,
        offerTitle: match?.offers?.title || 'Offer',
        participant: buildParticipant(match, role),
        lastMessage: latestMessage?.content || '',
        lastActivityAt: latestMessage?.created_at || match?.matched_at || match?.created_at || null,
        unreadCount: unreadCount || 0,
        archived: match?.status === 'archived',
        status: match?.status || 'active',
        studentId: match?.student_id || null,
        companyId: match?.company_id || null
    }
}

export function useConversationThreads(role = 'student') {
    const { user } = useAuth()
    const [allThreads, setAllThreads] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const fetchThreads = useCallback(async () => {
        if (!user?.id) {
            setAllThreads([])
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            let matchesQuery = supabase
                .from('matches')
                .select(`
                    id,
                    status,
                    company_id,
                    student_id,
                    offer_id,
                    matched_at,
                    created_at,
                    companies (
                        id,
                        company_name,
                        logo_url
                    ),
                    offers:offer_id (
                        id,
                        title,
                        companies:company_id (
                            id,
                            company_name,
                            logo_url
                        )
                    ),
                    students:student_id (
                        id,
                        display_name,
                        avatar_url
                    )
                `)
                .order('matched_at', { ascending: false })
                .order('created_at', { ascending: false })

            matchesQuery = role === 'student'
                ? matchesQuery.eq('student_id', user.id)
                : matchesQuery.eq('company_id', user.id)

            const { data: matchRows, error: matchesError } = await matchesQuery
            if (matchesError) throw matchesError

            const matches = Array.isArray(matchRows) ? matchRows : []
            if (matches.length === 0) {
                setAllThreads([])
                setLoading(false)
                return
            }

            const matchIds = matches.map((match) => match.id)
            const { data: messageRows, error: messagesError } = await supabase
                .from('messages')
                .select('id, match_id, sender_id, content, created_at, is_read')
                .in('match_id', matchIds)
                .order('created_at', { ascending: false })

            if (messagesError && !String(messagesError.message || '').toLowerCase().includes('does not exist')) {
                throw messagesError
            }

            const latestByMatch = new Map()
            const unreadByMatch = new Map()

            ;(messageRows || []).forEach((message) => {
                if (!latestByMatch.has(message.match_id)) {
                    latestByMatch.set(message.match_id, message)
                }
                if (message.is_read === false && message.sender_id !== user.id) {
                    unreadByMatch.set(message.match_id, (unreadByMatch.get(message.match_id) || 0) + 1)
                }
            })

            const threads = matches
                .map((match) => toThread(
                    match,
                    role,
                    latestByMatch.get(match.id),
                    unreadByMatch.get(match.id) || 0
                ))
                .sort((a, b) => toTimestamp(b.lastActivityAt) - toTimestamp(a.lastActivityAt))

            setAllThreads(threads)
        } catch (err) {
            setError(err?.message || 'Failed to load conversations')
            setAllThreads([])
        } finally {
            setLoading(false)
        }
    }, [role, user?.id])

    useEffect(() => {
        fetchThreads()
    }, [fetchThreads])

    const threads = useMemo(() => {
        let filtered = allThreads

        if (statusFilter === 'active') {
            filtered = filtered.filter((thread) => !thread.archived)
        } else if (statusFilter === 'archived') {
            filtered = filtered.filter((thread) => thread.archived)
        }

        const query = search.trim().toLowerCase()
        if (!query) return filtered

        return filtered.filter((thread) => {
            const haystack = `${thread.participant?.name || ''} ${thread.offerTitle || ''} ${thread.lastMessage || ''}`.toLowerCase()
            return haystack.includes(query)
        })
    }, [allThreads, search, statusFilter])

    return {
        threads,
        allThreads,
        loading,
        error,
        search,
        statusFilter,
        setSearch,
        setStatusFilter,
        refresh: fetchThreads
    }
}

export default useConversationThreads
