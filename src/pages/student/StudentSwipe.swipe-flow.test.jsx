import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const openPremiumUpsellMock = vi.fn()
const useJobOffersStateMock = vi.fn()

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}))

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'student-1', email: 'student@example.com', user_metadata: { name: 'Student One' } },
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
    getEntitlements: () => ({
        premiumStatusLabel: 'Free',
        premiumActive: false
    })
}))



vi.mock('../../components/MatchModal', () => ({
    default: () => null
}))

vi.mock('../../components/OfferDetailModal', () => ({
    default: () => null
}))

vi.mock('../../components/ApplicationToast', () => ({
    default: () => null
}))

vi.mock('../../components/MatchToast', () => ({
    default: () => null
}))

vi.mock('../../components/discovery/AICVPersonalizationModal', () => ({
    default: ({ isOpen, onConfirmSend }) => {
        if (!isOpen) return null
        return (
            <div data-testid="ai-cv-modal">
                <button
                    data-testid="confirm-send-cv"
                    onClick={() => onConfirmSend('personalized/test/cv.pdf')}
                >
                    Send CV
                </button>
            </div>
        )
    }
}))

import StudentSwipe from './StudentSwipe'

function renderSwipe() {
    return render(
        <MemoryRouter>
            <StudentSwipe />
        </MemoryRouter>
    )
}

describe('StudentSwipe swipe flow', () => {
    beforeEach(() => {
        localStorage.clear()
        openPremiumUpsellMock.mockReset()
        useJobOffersStateMock.mockReset()
    })

    it('advances immediately without waiting for the swipe promise to resolve', async () => {
        let resolveSwipe
        const swipeMock = vi.fn(() => new Promise((resolve) => {
            resolveSwipe = resolve
        }))

        useJobOffersStateMock.mockReturnValue({
            offers: [
                { id: 'offer-1', title: 'Offer One', isExternal: false },
                { id: 'offer-2', title: 'Offer Two', isExternal: false }
            ],
            loading: false,
            error: null,
            notice: null,
            paywall: null,
            mode: 'standard',
            setMode: vi.fn(),
            effectivePlan: 'standard',
            dailySwipeUsage: { reached: false },
            isSwipeStackV2Enabled: false,
            swipe: swipeMock,
            refresh: vi.fn(),
            clearPaywall: vi.fn()
        })

        const { container } = renderSwipe()
        await screen.findByText('Offer One')
        const likeButton = container.querySelector('.action-btn.like')

        expect(likeButton).not.toBeNull()

        fireEvent.click(likeButton)

        const confirmBtn = await screen.findByTestId('confirm-send-cv')
        fireEvent.click(confirmBtn)

        expect(swipeMock).toHaveBeenCalledTimes(1)

        await waitFor(() => {
            expect(screen.queryByText('Offer One')).not.toBeInTheDocument()
            expect(screen.getByText('Offer Two')).toBeInTheDocument()
        })

        await act(async () => {
            resolveSwipe({ error: null, externalMatchSaved: false })
        })
    })
})
