import { useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApplications } from '../context/ApplicationContext'
import { getEntitlements } from '../lib/premiumEntitlements'
import { track } from '../lib/analytics'

export function usePremiumGate({ source = 'unknown', premiumEnabled = true } = {}) {
    const { profile } = useAuth()
    const { openPremiumUpsell } = useApplications()
    const entitlements = getEntitlements(profile)
    const isPremium = premiumEnabled && entitlements.premiumActive
    const premiumStatusLabel = entitlements.premiumStatusLabel

    const requirePremium = useCallback((actionName, onAllowed, options = {}) => {
        if (!premiumEnabled) return false

        const reason = options.reason || 'premium_discovery_controls'
        const payload = options.payload && typeof options.payload === 'object'
            ? options.payload
            : {}
        const allowed = typeof options.isPremiumOverride === 'boolean'
            ? options.isPremiumOverride
            : isPremium

        if (allowed) {
            if (typeof onAllowed === 'function') onAllowed()
            return true
        }

        track('premium_action_blocked', {
            actionName,
            source,
            premiumStatusLabel
        })

        openPremiumUpsell(reason, {
            actionName,
            source,
            premiumStatusLabel,
            ...payload
        })
        return false
    }, [isPremium, openPremiumUpsell, premiumEnabled, premiumStatusLabel, source])

    return {
        isPremium,
        premiumStatusLabel,
        requirePremium
    }
}

export default usePremiumGate
