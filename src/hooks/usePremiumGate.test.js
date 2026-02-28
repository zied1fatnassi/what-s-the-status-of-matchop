import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePremiumGate } from './usePremiumGate'

const openPremiumUpsellMock = vi.fn()
const trackMock = vi.fn()
const getEntitlementsMock = vi.fn()
const authStateMock = {
    profile: {}
}

vi.mock('../context/AuthContext', () => ({
    useAuth: () => authStateMock
}))

vi.mock('../context/ApplicationContext', () => ({
    useApplications: () => ({
        openPremiumUpsell: (...args) => openPremiumUpsellMock(...args)
    })
}))

vi.mock('../lib/premiumEntitlements', () => ({
    getEntitlements: (...args) => getEntitlementsMock(...args)
}))

vi.mock('../lib/analytics', () => ({
    track: (...args) => trackMock(...args)
}))

describe('usePremiumGate', () => {
    beforeEach(() => {
        openPremiumUpsellMock.mockReset()
        trackMock.mockReset()
        getEntitlementsMock.mockReset()
    })

    it('runs allowed callback when user is premium', () => {
        getEntitlementsMock.mockReturnValue({
            premiumActive: true,
            premiumStatusLabel: 'Premium'
        })

        const { result } = renderHook(() => usePremiumGate({ source: 'student_swipe' }))
        const onAllowed = vi.fn()
        const allowed = result.current.requirePremium('open_preferences', onAllowed)

        expect(allowed).toBe(true)
        expect(onAllowed).toHaveBeenCalledTimes(1)
        expect(openPremiumUpsellMock).not.toHaveBeenCalled()
        expect(trackMock).not.toHaveBeenCalled()
    })

    it('tracks and opens upgrade modal when user is blocked', () => {
        getEntitlementsMock.mockReturnValue({
            premiumActive: false,
            premiumStatusLabel: 'Free'
        })

        const { result } = renderHook(() => usePremiumGate({ source: 'student_swipe' }))
        const onAllowed = vi.fn()
        const allowed = result.current.requirePremium('switch_global_scope', onAllowed, {
            reason: 'premium_discovery_controls'
        })

        expect(allowed).toBe(false)
        expect(onAllowed).not.toHaveBeenCalled()
        expect(trackMock).toHaveBeenCalledWith('premium_action_blocked', {
            actionName: 'switch_global_scope',
            source: 'student_swipe',
            premiumStatusLabel: 'Free'
        })
        expect(openPremiumUpsellMock).toHaveBeenCalledWith('premium_discovery_controls', {
            actionName: 'switch_global_scope',
            source: 'student_swipe',
            premiumStatusLabel: 'Free'
        })
    })
})
