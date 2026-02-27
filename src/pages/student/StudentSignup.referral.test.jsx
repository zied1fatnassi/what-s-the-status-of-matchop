import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const trackMock = vi.fn()
const signUpMock = vi.fn()
const resendVerificationEmailMock = vi.fn()

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, options = {}) => {
            if (key === 'referrals.signupAttribution') {
                return `Referral code detected: ${options.ref}`
            }
            if (key === 'referrals.signupApplied') {
                return `Referral code ${options.ref} was applied to your signup.`
            }
            return key
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

describe('StudentSignup referral attribution', () => {
    beforeEach(() => {
        localStorage.clear()
        trackMock.mockReset()
        signUpMock.mockReset()
        resendVerificationEmailMock.mockReset()
        signUpMock.mockResolvedValue({
            data: null,
            error: null,
            needsEmailVerification: true
        })
    })

    it('captures valid ref query and tracks telemetry', async () => {
        render(
            <MemoryRouter initialEntries={['/student/signup?ref=MOP-ABCDEFGH']}>
                <Routes>
                    <Route path="/student/signup" element={<StudentSignup />} />
                </Routes>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(trackMock).toHaveBeenCalledWith('referral_signup_attributed', { ref: 'MOP-ABCDEFGH' })
        })

        const stored = JSON.parse(localStorage.getItem('matchop_referral_attribution'))
        expect(stored.ref).toBe('MOP-ABCDEFGH')
        expect(typeof stored.capturedAt).toBe('string')
    })

    it('shows non-blocking referral confirmation after successful signup submit', async () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/student/signup?ref=MOP-ABCDEFGH']}>
                <Routes>
                    <Route path="/student/signup" element={<StudentSignup />} />
                </Routes>
            </MemoryRouter>
        )

        fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Alice Example' } })
        fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'alice@example.com' } })
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPass1!' } })

        const universitySelect = container.querySelector('#student-signup-university')
        const firstUniversityOption = universitySelect?.querySelectorAll('option')?.[1]?.value
        fireEvent.change(universitySelect, { target: { value: firstUniversityOption } })

        fireEvent.change(screen.getByLabelText('Major'), { target: { value: 'Computer Science' } })
        fireEvent.change(screen.getByLabelText('Graduation Year'), { target: { value: '2026' } })

        fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

        await waitFor(() => {
            expect(signUpMock).toHaveBeenCalledWith(
                'alice@example.com',
                'StrongPass1!',
                'student',
                expect.objectContaining({
                    referralCode: 'MOP-ABCDEFGH'
                })
            )
        })

        expect(await screen.findByText('Referral code MOP-ABCDEFGH was applied to your signup.')).toBeInTheDocument()
    })
})
