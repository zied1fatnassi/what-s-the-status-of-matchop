import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'

/**
 * Application UI context.
 * Stores global front-end UI state that can be triggered from any route.
 */
const ApplicationContext = createContext(null)

const DEFAULT_UPSELL_STATE = {
    isOpen: false,
    reason: null,
    payload: null
}

export function ApplicationProvider({ children }) {
    const [premiumUpsell, setPremiumUpsell] = useState(DEFAULT_UPSELL_STATE)

    useEffect(() => {
        localStorage.removeItem('matchop_applications')
    }, [])

    const openPremiumUpsell = useCallback((reason = 'generic', payload = null) => {
        setPremiumUpsell({
            isOpen: true,
            reason,
            payload
        })
    }, [])

    const closePremiumUpsell = useCallback(() => {
        setPremiumUpsell((prev) => ({
            ...prev,
            isOpen: false
        }))
    }, [])

    const contextValue = useMemo(() => ({
        premiumUpsell,
        openPremiumUpsell,
        closePremiumUpsell,
        isPremiumUpsellOpen: premiumUpsell.isOpen
    }), [premiumUpsell, openPremiumUpsell, closePremiumUpsell])

    return (
        <ApplicationContext.Provider value={contextValue}>
            {children}
        </ApplicationContext.Provider>
    )
}

export function useApplications() {
    const context = useContext(ApplicationContext)
    if (!context) {
        return {
            premiumUpsell: DEFAULT_UPSELL_STATE,
            openPremiumUpsell: () => {},
            closePremiumUpsell: () => {},
            isPremiumUpsellOpen: false
        }
    }
    return context
}

export default ApplicationContext
