import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const openPremiumUpsellMock = vi.fn()
const setModeMock = vi.fn()
const swipeMock = vi.fn()
const clearPaywallMock = vi.fn()
const useJobOffersStateMock = vi.fn()
const entitlementsMock = vi.fn()

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}))

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'student-1', email: 'student@example.com' },
        profile: {},
        isLoading: false
    })
}))

vi.mock('../../context/ApplicationContext', () => ({
    useApplications: () => ({
        openPremiumUpsell: (...args) => openPremiumUpsellMock(...args)
    })
}))

vi.mock('../../hooks/useMatchListener', () => ({
    useMatchListener: () => ({
        newMatch: null,
        clearMatch: vi.fn()
    })
}))

vi.mock('../../hooks/useJobOffers', () => ({
    useJobOffers: () => useJobOffersStateMock()
}))

vi.mock('../../lib/premiumEntitlements', () => ({
    getEntitlements: (...args) => entitlementsMock(...args)
}))

import StudentSwipe from './StudentSwipe'

function renderSwipe() {
    return render(
        <MemoryRouter>
            <StudentSwipe />
        </MemoryRouter>
    )
}

describe('StudentSwipe discovery controls', () => {
    beforeEach(() => {
        localStorage.clear()
        openPremiumUpsellMock.mockReset()
        setModeMock.mockReset()
        swipeMock.mockReset()
        clearPaywallMock.mockReset()
        entitlementsMock.mockReset()
    })

    it('renders segmented scope toggle with always-visible preferences button', () => {
        entitlementsMock.mockReturnValue({
            premiumStatusLabel: 'Premium',
            premiumActive: true
        })

        useJobOffersStateMock.mockReturnValue({
            offers: [],
            loading: false,
            error: '',
            notice: '',
            paywall: null,
            mode: 'standard',
            setMode: setModeMock,
            effectivePlan: 'premium',
            dailySwipeUsage: { reached: false },
            isSwipeStackV2Enabled: true,
            swipe: swipeMock,
            refresh: vi.fn(),
            clearPaywall: clearPaywallMock
        })

        renderSwipe()

        expect(screen.getByTestId('offer-scope-local')).toBeInTheDocument()
        expect(screen.getByTestId('offer-scope-global')).toBeInTheDocument()
        expect(screen.getByTestId('preferences-button')).toBeInTheDocument()
        expect(screen.queryByText('referrals.cta.title')).toBeNull()
    })

    it('keeps local selected and opens upgrade modal when free user clicks global', () => {
        entitlementsMock.mockReturnValue({
            premiumStatusLabel: 'Free',
            premiumActive: false
        })

        useJobOffersStateMock.mockReturnValue({
            offers: [],
            loading: false,
            error: '',
            notice: '',
            paywall: null,
            mode: 'standard',
            setMode: setModeMock,
            effectivePlan: 'standard',
            dailySwipeUsage: { reached: false },
            isSwipeStackV2Enabled: true,
            swipe: swipeMock,
            refresh: vi.fn(),
            clearPaywall: clearPaywallMock
        })

        renderSwipe()

        fireEvent.click(screen.getByTestId('offer-scope-global'))

        expect(setModeMock).not.toHaveBeenCalledWith('premium')
        expect(openPremiumUpsellMock).toHaveBeenCalledWith(
            'premium_discovery_controls',
            expect.objectContaining({
                actionName: 'switch_global_scope',
                premiumStatusLabel: 'Free'
            })
        )
    })
})
