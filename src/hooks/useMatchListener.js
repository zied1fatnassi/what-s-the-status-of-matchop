import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Hook to listen for new matches in real-time
 * Subscribes to the matches table and notifies when a new match is created
 */
const isMatchDebugEnabled = import.meta.env.DEV && import.meta.env.VITE_DEBUG_MATCHES === 'true'
const debugLog = (...args) => {
    if (isMatchDebugEnabled) console.log(...args)
}

export function useMatchListener() {
    const { user } = useAuth()
    const [newMatch, setNewMatch] = useState(null)

    const clearMatch = useCallback(() => {
        setNewMatch(null)
    }, [])

    useEffect(() => {
        if (!user) return

        debugLog('[useMatchListener] Setting up real-time subscription for user:', user.id)

        // Subscribe to new matches for this student
        const channel = supabase
            .channel('matches-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'matches',
                    filter: `student_id=eq.${user.id}`
                },
                (payload) => {
                    debugLog('[useMatchListener] New match detected!', payload)

                    // Fetch full match details with company info
                    fetchMatchDetails(payload.new.id)
                }
            )
            .subscribe()

        const fetchMatchDetails = async (matchId) => {
            const { data, error } = await supabase
                .from('matches')
                .select(`
                    *,
                    offers!offer_id (
                        id,
                        title,
                        companies!company_id (
                            id,
                            company_name,
                            logo_url
                        )
                    )
                `)
                .eq('id', matchId)
                .single()

            if (!error && data) {
                setNewMatch({
                    id: data.id,
                    companyName: data.offers?.companies?.company_name || 'Company',
                    companyLogo: data.offers?.companies?.logo_url,
                    offerTitle: data.offers?.title || 'Job Offer',
                    matchedAt: data.matched_at
                })
            }
        }

        return () => {
            debugLog('[useMatchListener] Cleaning up real-time subscription')
            supabase.removeChannel(channel)
        }
    }, [user])

    return { newMatch, clearMatch }
}

export default useMatchListener
