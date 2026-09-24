import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const openPremiumUpsellMock = vi.fn()
const setModeMock = vi.fn()
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

describe('StudentSwipe premium gating', () => {
    beforeEach(() => {
        localStorage.clear()
        openPremiumUpsellMock.mockReset()
        setModeMock.mockReset()
        entitlementsMock.mockReset()
    })

    it('opens upgrade modal when free user clicks preferences', () => {
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
            swipe: vi.fn(),
            refresh: vi.fn(),
            clearPaywall: vi.fn()
        })

        renderSwipe()
        fireEvent.click(screen.getByTestId('preferences-button'))

        expect(openPremiumUpsellMock).toHaveBeenCalledWith(
            'premium_discovery_controls',
            expect.objectContaining({
                actionName: 'open_preferences'
            })
        )
    })

    it('allows premium user to switch scope and open preferences modal', () => {
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
            swipe: vi.fn(),
            refresh: vi.fn(),
            clearPaywall: vi.fn()
        })

        renderSwipe()

        fireEvent.click(screen.getByTestId('offer-scope-global'))
        expect(setModeMock).toHaveBeenCalledWith('premium')
        expect(openPremiumUpsellMock).not.toHaveBeenCalled()

        fireEvent.click(screen.getByTestId('preferences-button'))
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('studentSwipe.preferences.title')).toBeInTheDocument()
    })
})
