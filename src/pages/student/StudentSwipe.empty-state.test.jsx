import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const openPremiumUpsellMock = vi.fn()
const refreshMock = vi.fn()
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

describe('StudentSwipe empty state', () => {
    beforeEach(() => {
        localStorage.clear()
        openPremiumUpsellMock.mockReset()
        refreshMock.mockReset()
        setModeMock.mockReset()
        swipeMock.mockReset()
        clearPaywallMock.mockReset()
        entitlementsMock.mockReset()
    })

    it('renders empty local state with Adjust preferences and Switch to Global actions', () => {
        entitlementsMock.mockReturnValue({
            premiumStatusLabel: 'Active',
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
            refresh: refreshMock,
            clearPaywall: clearPaywallMock
        })

        renderSwipe()

        expect(screen.getByText('No offers nearby.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Adjust preferences/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Switch to Global/i })).toBeInTheDocument()
    })

    it('renders premium lock block when global mode is locked', () => {
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
            refresh: refreshMock,
            clearPaywall: clearPaywallMock
        })

        renderSwipe()

        expect(screen.getByText('Global is Premium')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Unlock Premium/i })).toBeInTheDocument()
    })
})
