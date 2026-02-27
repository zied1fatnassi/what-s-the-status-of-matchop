import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { detectSpam, sanitizeMessage, getSpamErrorMessage } from '../lib/spamDetection'
import { safeLogError, safeLogWarn } from '../lib/logger'
import {
    addNotification,
    NOTIFICATION_SCOPE_COMPANY,
    NOTIFICATION_SCOPE_STUDENT,
} from '../lib/notifications'

/**
 * Hook for real-time chat messages
 * Subscribes to new messages and provides send functionality
 */
export function useMessages(matchId) {
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const { user, isStudent, isCompany } = useAuth()
    const notificationScope = isCompany
        ? NOTIFICATION_SCOPE_COMPANY
        : (isStudent ? NOTIFICATION_SCOPE_STUDENT : null)

    const fetchMessages = useCallback(async () => {
        if (!matchId) {
            setMessages([])
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data, error: fetchError } = await supabase
                .from('messages')
                .select(`
                    *,
                    sender:sender_id (
                        name, avatar_url
                    )
                `)
                .eq('match_id', matchId)
                .order('created_at', { ascending: true })

            if (fetchError) {
                safeLogWarn('[useMessages] message fetch failed', { error: fetchError })
                setMessages([])
                return
            }

            setMessages(data || [])
        } catch (err) {
            setError(err.message)
            setMessages([])
        } finally {
            setLoading(false)
        }
    }, [matchId])

    useEffect(() => {
        if (!matchId) return

        // Fetch existing messages
        fetchMessages()

        // Subscribe to new messages (real-time)
        const channel = supabase
            .channel(`messages:${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `match_id=eq.${matchId}`
                },
                (payload) => {
                    setMessages(prev => [...prev, payload.new])
                    if (payload?.new?.sender_id !== user?.id && notificationScope) {
                        addNotification(notificationScope, {
                            title: 'New intro',
                            body: 'You received a new message intro.',
                            read: false,
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [matchId, fetchMessages, notificationScope, user?.id])

    const sendMessage = useCallback(async (content) => {
        if (!user?.id || !matchId || !content.trim()) {
            return { error: 'Invalid message' }
        }

        // Sanitize and check for spam
        const cleanContent = sanitizeMessage(content)
        const spamCheck = detectSpam(cleanContent)

        if (spamCheck.isSpam) {
            safeLogWarn('[useMessages] spam detected', {
                reason: spamCheck.reason,
                severity: spamCheck.severity,
            })
            return {
                error: getSpamErrorMessage(spamCheck.severity),
                isSpam: true,
                severity: spamCheck.severity
            }
        }

        try {
            const newMessage = {
                match_id: matchId,
                sender_id: user.id,
                content: cleanContent
            }

            const { data, error: sendError } = await supabase
                .from('messages')
                .insert(newMessage)
                .select()
                .single()

            if (sendError) {
                safeLogError('[useMessages] send failed', { error: sendError })
                return { error: sendError.message || 'Failed to send message' }
            }

            if (notificationScope) {
                addNotification(notificationScope, {
                    title: 'New intro',
                    body: 'Your intro message was sent.',
                    read: false,
                })
            }

            return { error: null, data }
        } catch (err) {
            return { error: err.message }
        }
    }, [matchId, user?.id])

    const markAsRead = useCallback(async () => {
        if (!matchId || !user?.id) return

        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('match_id', matchId)
            .neq('sender_id', user.id)
    }, [matchId, user?.id])

    return {
        messages,
        loading,
        error,
        sendMessage,
        markAsRead,
        refresh: fetchMessages
    }
}

export default useMessages
