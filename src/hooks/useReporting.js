import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Hook for reporting users (spam, fake profiles, harassment)
 */
export function useReporting() {
    const [isReporting, setIsReporting] = useState(false)
    const [error, setError] = useState(null)
    const { user } = useAuth()

    const reportUser = async (reportedId, reason, details = '') => {
        if (!user) {
            throw new Error('Must be logged in to report users')
        }

        if (reportedId === user.id) {
            throw new Error('Cannot report yourself')
        }

        setIsReporting(true)
        setError(null)

        // Verify active session exists
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
            setIsReporting(false)
            throw new Error('No active Supabase session. Please log out and log back in.')
        }

        try {
            const { data, error: insertError } = await supabase
                .from('reported_users')
                .insert({
                    reporter_id: user.id,
                    reported_id: reportedId,
                    reason,
                    details: details.trim()
                })
                .select()
                .single()

            if (insertError) {
                // Check if already reported (unique constraint violation)
                if (insertError.code === '23505') {
                    throw new Error('You have already reported this user')
                }
                throw insertError
            }

            return { success: true, data }
        } catch (err) {
            console.error('Report failed:', err)
            setError(err.message)
            return { success: false, error: err.message }
        } finally {
            setIsReporting(false)
        }
    }

    const getMyReports = async () => {
        if (!user) return []

        try {
            const { data, error: fetchError } = await supabase
                .from('reported_users')
                .select(`
                    *,
                    reported:profiles!reported_id(id, name, avatar_url, type)
                `)
                .eq('reporter_id', user.id)
                .order('created_at', { ascending: false })

            if (fetchError) throw fetchError
            return data || []
        } catch (err) {
            console.error('Failed to fetch reports:', err)
            setError(err.message)
            return []
        }
    }

    const getReportStats = async (userId) => {
        try {
            const { count, error: countError } = await supabase
                .from('reported_users')
                .select('*', { count: 'exact', head: true })
                .eq('reported_id', userId)
                .in('status', ['pending', 'reviewed'])

            if (countError) throw countError
            return count || 0
        } catch (err) {
            console.error('Failed to get report stats:', err)
            return 0
        }
    }

    return {
        reportUser,
        getMyReports,
        getReportStats,
        isReporting,
        error
    }
}
