import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const trackMock = vi.fn()
const writeTextMock = vi.fn()
const fetchProfileMock = vi.fn()

const getReferralDashboardMock = vi.fn()
const claimReferralRewardMock = vi.fn()

vi.mock('../../lib/referralService', () => ({
    getReferralDashboard: (...args) => getReferralDashboardMock(...args),
    claimReferralReward: (...args) => claimReferralRewardMock(...args)
}))

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: {
            id: 'abcdef12-1234-4567-8abc-1234567890ef'
        },
        fetchProfile: fetchProfileMock
    })
}))

vi.mock('../../lib/analytics', () => ({
    track: (...args) => trackMock(...args)
}))

import Referrals from './Referrals'

describe('Referrals (Server-Authoritative)', () => {
    beforeEach(() => {
        trackMock.mockReset()
        writeTextMock.mockReset()
        writeTextMock.mockResolvedValue(undefined)
        fetchProfileMock.mockReset()
        getReferralDashboardMock.mockReset()
        claimReferralRewardMock.mockReset()

        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: writeTextMock },
            configurable: true
        })

        // Default mock dashboard state
        getReferralDashboardMock.mockResolvedValue({
            ok: true,
            referralCode: 'MOP-ABCDEF12',
            totalReferrals: 1,
            qualifyingReferrals: 1,
            pendingReferrals: 0,
            requiredReferrals: 3,
            rewardDays: 7,
            milestoneStatus: 'in_progress',
            isEligible: false,
            isClaimed: false,
            claimedAt: null,
            premium: {
                isPremium: false,
                premiumExpiresAt: null
            }
        })
    })

    it('renders server-provided referral code and invite link', async () => {
        render(
            <MemoryRouter>
                <Referrals />
            </MemoryRouter>
        )

        expect(await screen.findByTestId('referral-code-value')).toHaveTextContent('MOP-ABCDEF12')
        expect(screen.getByTestId('referral-link-value'))
            .toHaveTextContent(`${window.location.origin}/student/signup?ref=MOP-ABCDEF12`)

        await waitFor(() => {
            expect(trackMock).toHaveBeenCalledWith('referral_viewed', { code: 'MOP-ABCDEF12' })
        })
    })

    it('copies code and link with telemetry', async () => {
        render(
            <MemoryRouter>
                <Referrals />
            </MemoryRouter>
        )

        const copyCodeBtn = await screen.findByTestId('copy-code-button')
        fireEvent.click(copyCodeBtn)

        const copyLinkBtn = screen.getByTestId('copy-link-button')
        fireEvent.click(copyLinkBtn)

        await waitFor(() => {
            expect(writeTextMock).toHaveBeenCalledWith('MOP-ABCDEF12')
            expect(writeTextMock).toHaveBeenCalledWith(`${window.location.origin}/student/signup?ref=MOP-ABCDEF12`)
        })

        expect(trackMock).toHaveBeenCalledWith('referral_copied', { type: 'code' })
        expect(trackMock).toHaveBeenCalledWith('referral_copied', { type: 'link' })
    })

    it('shows progress and does not render claim button when under goal', async () => {
        render(
            <MemoryRouter>
                <Referrals />
            </MemoryRouter>
        )

        expect(await screen.findByText(/1\/3/i)).toBeInTheDocument()
        expect(screen.queryByTestId('claim-reward-button')).not.toBeInTheDocument()
        expect(screen.queryByTestId('reward-claimed-state')).not.toBeInTheDocument()
    })

    it('shows claim button when server reports 3 qualifying referrals and claims successfully', async () => {
        getReferralDashboardMock.mockResolvedValue({
            ok: true,
            referralCode: 'MOP-ABCDEF12',
            totalReferrals: 3,
            qualifyingReferrals: 3,
            pendingReferrals: 0,
            requiredReferrals: 3,
            rewardDays: 7,
            milestoneStatus: 'eligible',
            isEligible: true,
            isClaimed: false,
            claimedAt: null,
            premium: {
                isPremium: false,
                premiumExpiresAt: null
            }
        })

        claimReferralRewardMock.mockResolvedValue({
            ok: true,
            alreadyClaimed: false,
            status: 'claimed',
            rewardDays: 7,
            premiumExpiresAt: '2026-03-25T10:00:00.000Z',
            isPremium: true
        })

        render(
            <MemoryRouter>
                <Referrals />
            </MemoryRouter>
        )

        const claimButton = await screen.findByTestId('claim-reward-button')
        expect(claimButton).toBeInTheDocument()

        fireEvent.click(claimButton)

        await waitFor(() => {
            expect(claimReferralRewardMock).toHaveBeenCalledWith('invite_3_premium_7d')
            expect(fetchProfileMock).toHaveBeenCalled()
            expect(screen.getByTestId('reward-claimed-state')).toBeInTheDocument()
        })
    })

    it('renders claimed state directly when server reports already claimed', async () => {
        getReferralDashboardMock.mockResolvedValue({
            ok: true,
            referralCode: 'MOP-ABCDEF12',
            totalReferrals: 3,
            qualifyingReferrals: 3,
            pendingReferrals: 0,
            requiredReferrals: 3,
            rewardDays: 7,
            milestoneStatus: 'claimed',
            isEligible: false,
            isClaimed: true,
            claimedAt: '2026-03-01T10:00:00.000Z',
            premium: {
                isPremium: true,
                premiumExpiresAt: '2026-03-25T10:00:00.000Z'
            }
        })

        render(
            <MemoryRouter>
                <Referrals />
            </MemoryRouter>
        )

        expect(await screen.findByTestId('reward-claimed-state')).toBeInTheDocument()
        expect(screen.queryByTestId('claim-reward-button')).not.toBeInTheDocument()
    })
})
