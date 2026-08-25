import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const trackMock = vi.fn()
const signUpMock = vi.fn()
const resendVerificationEmailMock = vi.fn()
const writeTextMock = vi.fn()

import i18n from '../../lib/i18n'

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, options = {}) => {
            if (key === 'referrals.signupApplied') {
                return `Referral code ${options.ref} was applied to your signup.`
            }
            if (key === 'referrals.signupFlow.invitedTitle') {
                return 'You were invited by a friend'
            }
            if (key === 'referrals.signupFlow.invitedSubtitle') {
                return 'Complete signup to unlock your referral benefit (Preview)'
            }
            if (key === 'referrals.signupFlow.dismissAria') {
                return 'Dismiss referral invitation banner'
            }
            if (key === 'referrals.signupFlow.followupTitle') {
                return 'Invite your friends too'
            }
            if (key === 'referrals.signupFlow.followupSubtitle') {
                return 'Share your invite link to unlock referral benefits (Preview).'
            }
            if (key === 'referrals.signupFlow.openReferrals') {
                return 'Open Referrals'
            }
            if (key === 'referrals.signupFlow.copyInviteLink') {
                return 'Copy invite link'
            }
            if (key === 'referrals.toast.copyLinkSuccess') {
                return 'Invite link copied.'
            }
            if (key === 'referrals.toast.copyFailed') {
                return 'Unable to copy right now. Please try again.'
            }
            return i18n.t(key, options)
        }
    })
}))

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        signUp: (...args) => signUpMock(...args),
        resendVerificationEmail: (...args) => resendVerificationEmailMock(...args)
    })
}))

vi.mock('../../lib/analytics', () => ({
    track: (...args) => trackMock(...args)
}))

import StudentSignup from './StudentSignup'

function renderSignup(entry = '/student/signup?ref=MOP-ABCDEFGH') {
    return render(
        <MemoryRouter initialEntries={[entry]}>
            <Routes>
                <Route path="/student/signup" element={<StudentSignup />} />
                <Route path="/signup" element={<StudentSignup />} />
            </Routes>
        </MemoryRouter>
    )
}

function fillValidSignupForm(container) {
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Alice Example' } })
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPass1!' } })

    const universitySelect = container.querySelector('#student-signup-university')
    const firstUniversityOption = universitySelect?.querySelectorAll('option')?.[1]?.value
    fireEvent.change(universitySelect, { target: { value: firstUniversityOption } })

    fireEvent.change(screen.getByLabelText('Major'), { target: { value: 'Computer Science' } })
    fireEvent.change(screen.getByLabelText('Graduation Year'), { target: { value: '2026' } })
}

describe('StudentSignup referral flow', () => {
    beforeEach(() => {
        localStorage.clear()
        trackMock.mockReset()
        signUpMock.mockReset()
        resendVerificationEmailMock.mockReset()
        writeTextMock.mockReset()
        writeTextMock.mockResolvedValue(undefined)

        signUpMock.mockResolvedValue({
            data: null,
            error: null,
            needsEmailVerification: true
        })

        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: writeTextMock },
            configurable: true
        })
    })

    it('shows referral card when ref query param exists', async () => {
        renderSignup()

        expect(await screen.findByText(/You were invited by a friend/i)).toBeInTheDocument()

        await waitFor(() => {
            expect(trackMock).toHaveBeenCalledWith('referral_signup_attributed', { ref: 'MOP-ABCDEFGH' })
        })
        expect(localStorage.getItem('matchop_referral_code')).toBe('MOP-ABCDEFGH')
        expect(typeof localStorage.getItem('matchop_referral_seen_at')).toBe('string')
    })

    it('hides referral card after dismiss and keeps inbound attribution code', async () => {
        renderSignup()
        const dismissButton = await screen.findByLabelText('Dismiss referral invitation banner')
        fireEvent.click(dismissButton)

        expect(screen.queryByText(/You were invited by a friend/i)).not.toBeInTheDocument()
        expect(localStorage.getItem('matchop_referral_code')).toBe('MOP-ABCDEFGH')
    })

    it('hides referral card after 24 hours from seen timestamp', async () => {
        const oldIso = new Date(Date.now() - (25 * 60 * 60 * 1000)).toISOString()
        localStorage.setItem('matchop_referral_code', 'MOP-ABCDEFGH')
        localStorage.setItem('matchop_referral_seen_at', oldIso)
        renderSignup()

        expect(screen.queryByText(/You were invited by a friend/i)).not.toBeInTheDocument()
    })

    it('shows referral card again when a different referral code is used later', async () => {
        renderSignup('/student/signup?ref=MOP-ABCDEFGH')
        fireEvent.click(await screen.findByLabelText('Dismiss referral invitation banner'))

        renderSignup('/student/signup?ref=MOP-HIJKLMN1')
        expect(await screen.findByText(/You were invited by a friend/i)).toBeInTheDocument()
        expect(localStorage.getItem('matchop_referral_code')).toBe('MOP-HIJKLMN1')
    })

    it('does not show referral card when mounted on the /signup alias', async () => {
        renderSignup('/signup?ref=MOP-ABCDEFGH')

        await waitFor(() => {
            expect(trackMock).not.toHaveBeenCalled()
        })
        expect(screen.queryByText(/You were invited by a friend/i)).not.toBeInTheDocument()
    })

    it('clears inbound referral storage on signup success', async () => {
        const { container } = renderSignup()
        fillValidSignupForm(container)

        fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

        await waitFor(() => {
            expect(signUpMock).toHaveBeenCalled()
        })

        expect(localStorage.getItem('matchop_referral_code')).toBeNull()
        expect(localStorage.getItem('matchop_referral_seen_at')).toBeNull()
    })

    it('copies invite link with correct URL format', async () => {
        localStorage.setItem('matchop_my_referral_code', 'MOP-ABCDEF12')

        const { container } = renderSignup()
        fillValidSignupForm(container)

        fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

        const copyButton = await screen.findByRole('button', { name: 'Copy invite link' })
        fireEvent.click(copyButton)

        await waitFor(() => {
            expect(writeTextMock).toHaveBeenCalledWith(`${window.location.origin}/student/signup?ref=MOP-ABCDEF12`)
        })
    })
})
