/**
 * ApplicationContext — DEPRECATED & REMOVED
 *
 * Previously this context tracked "applications" in localStorage only,
 * creating a fake "Application Sent!" illusion. In reality:
 *
 * - Internal offers: A right-swipe inserts into `student_swipes` (Supabase DB).
 *   That IS the real application/like. If the company also swipes right,
 *   a match is created via DB trigger. No separate "application" table needed.
 *
 * - External offers: A right-swipe opens the external URL in a new tab.
 *   The student applies on the external site; MatchOp has no tracking role.
 *
 * The toast notification is now managed directly in StudentSwipe.jsx,
 * with honest messaging ("Liked!" for internal, "Opening Job Page!" for external).
 *
 * If you need to query a student's swipe history, use:
 *   supabase.from('student_swipes').select('*').eq('student_id', userId)
 *
 * Kept as a stub so any lingering imports don't crash the app.
 */

import { createContext, useContext, useEffect } from 'react'

const ApplicationContext = createContext(null)

/** @deprecated No-op provider kept for backwards-compat. Remove from main.jsx when ready. */
export function ApplicationProvider({ children }) {
    // One-time cleanup: remove stale fake application data from localStorage
    useEffect(() => {
        localStorage.removeItem('matchop_applications')
    }, [])

    return (
        <ApplicationContext.Provider value={{}}>
            {children}
        </ApplicationContext.Provider>
    )
}

/** @deprecated Returns empty object. */
export function useApplications() {
    return useContext(ApplicationContext) || {}
}

export default ApplicationContext
