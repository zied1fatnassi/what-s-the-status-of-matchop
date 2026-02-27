import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const trackMock = vi.fn()
const writeTextMock = vi.fn()

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, options = {}) => {
            const dictionary = {
                'referrals.title': 'Refer friends',
                'referrals.subtitle': 'Share your referral code and invite link to unlock rewards.',
                'referrals.labels.referralCode': 'Your referral code',
                'referrals.labels.inviteLink': 'Your invite link',
                'referrals.labels.share': 'Share with friends',
                'referrals.labels.loadingCode': 'Generating referral code...',
                'referrals.labels.loadingLink': 'Invite link will appear once your code is ready.',
                'referrals.actions.copyCode': 'Copy code',
                'referrals.actions.copyLink': 'Copy link',
                'referrals.actions.shareWhatsApp': 'Share on WhatsApp',
                'referrals.actions.shareEmail': 'Share by Email',
                'referrals.actions.increaseInvite': '+ Invite',
                'referrals.actions.decreaseInvite': '- Invite',
                'referrals.share.whatsappTemplate': 'Join me on MatchOp with code {{code}}. Sign up here: {{link}}',
                'referrals.share.emailSubject': 'Join me on MatchOp',
                'referrals.share.emailBody': 'Use my referral code {{code}} to join MatchOp.\n\nSign up here: {{link}}',
                'referrals.rewards.title': 'Rewards',
                'referrals.rewards.body': 'Invite 3 friends and unlock 7 days Premium.',
                'referrals.progress.current': '{{invites}}/{{goal}} invites',
                'referrals.progress.hint': 'Demo progress is saved locally on this device.',
                'referrals.toast.copyCodeSuccess': 'Referral code copied.',
                'referrals.toast.copyLinkSuccess': 'Invite link copied.',
                'referrals.toast.copyFailed': 'Unable to copy right now. Please try again.'
            }

            let resolved = dictionary[key] || key
            Object.entries(options).forEach(([optionKey, value]) => {
                resolved = resolved.replace(`{{${optionKey}}}`, String(value))
            })
            return resolved
        }
    })
}))

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: {
            id: 'abcdef12-1234-4567-8abc-1234567890ef'
        }
    })
}))

vi.mock('../../lib/analytics', () => ({
    track: (...args) => trackMock(...args)
}))

import Referrals from './Referrals'

describe('Referrals', () => {
    beforeEach(() => {
        localStorage.clear()
        trackMock.mockReset()
        writeTextMock.mockReset()
        writeTextMock.mockResolvedValue(undefined)
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: writeTextMock },
            configurable: true
        })
    })

    it('renders deterministic code and invite link', async () => {
        render(
            <MemoryRouter>
                <Referrals />
            </MemoryRouter>
        )

        expect(screen.getByTestId('referral-code-value')).toHaveTextContent('MOP-ABCDEF12')
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

        fireEvent.click(screen.getByTestId('copy-code-button'))
        fireEvent.click(screen.getByTestId('copy-link-button'))

        await waitFor(() => {
            expect(writeTextMock).toHaveBeenCalledWith('MOP-ABCDEF12')
            expect(writeTextMock).toHaveBeenCalledWith(`${window.location.origin}/student/signup?ref=MOP-ABCDEF12`)
        })

        expect(trackMock).toHaveBeenCalledWith('referral_copied', { type: 'code' })
        expect(trackMock).toHaveBeenCalledWith('referral_copied', { type: 'link' })
    })
})
