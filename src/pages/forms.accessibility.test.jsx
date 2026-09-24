import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const signInMock = vi.fn()
const signUpMock = vi.fn()
const resendVerificationEmailMock = vi.fn()

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}))

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        signIn: (...args) => signInMock(...args),
        signUp: (...args) => signUpMock(...args),
        resendVerificationEmail: (...args) => resendVerificationEmailMock(...args),
        isLoading: false
    })
}))

vi.mock('../lib/useBilingualText', () => ({
    useBilingualText: () => (en) => en
}))

vi.mock('../lib/passwordReset', () => ({
    requestPasswordReset: vi.fn(async () => ({ error: null })),
    validateResetToken: vi.fn(async () => ({ valid: true })),
    executePasswordReset: vi.fn(async () => ({ success: true })),
    getResetParamsFromURL: vi.fn(() => ({
        token: 'test-token',
        email: 'user@example.com'
    }))
}))

import StudentLogin from './student/StudentLogin'
import CompanyLogin from './company/CompanyLogin'
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'
import CompanySignup from './company/CompanySignup'
import Contact from './Contact'

function renderWithRouter(component) {
    return render(
        <MemoryRouter>
            {component}
        </MemoryRouter>
    )
}

describe('Auth + Contact forms accessibility semantics', () => {
    beforeEach(() => {
        signInMock.mockReset()
        signUpMock.mockReset()
        resendVerificationEmailMock.mockReset()
        signInMock.mockResolvedValue({ data: null, error: null })
        signUpMock.mockResolvedValue({ data: null, error: null, needsEmailVerification: false })
        resendVerificationEmailMock.mockResolvedValue({ error: null })
    })

    it('student login associates labels and fields', () => {
        renderWithRouter(<StudentLogin />)

        const email = screen.getByLabelText('auth.studentLogin.emailLabel')
        const password = screen.getByLabelText('auth.studentLogin.passwordLabel')

        expect(email).toHaveAttribute('id', 'student-login-email')
        expect(email).toHaveAttribute('name', 'email')
        expect(email).toHaveAttribute('autocomplete', 'username')
        expect(password).toHaveAttribute('id', 'student-login-password')
        expect(password).toHaveAttribute('name', 'password')
        expect(password).toHaveAttribute('autocomplete', 'current-password')
    })

    it('company login associates labels and fields', () => {
        renderWithRouter(<CompanyLogin />)

        const email = screen.getByLabelText('auth.companyLogin.emailLabel')
        const password = screen.getByLabelText('auth.companyLogin.passwordLabel')

        expect(email).toHaveAttribute('id', 'company-login-email')
        expect(email).toHaveAttribute('name', 'email')
        expect(email).toHaveAttribute('autocomplete', 'username')
        expect(password).toHaveAttribute('id', 'company-login-password')
        expect(password).toHaveAttribute('name', 'password')
        expect(password).toHaveAttribute('autocomplete', 'current-password')
    })

    it('forgot password exposes email field with id/name/label association', () => {
        renderWithRouter(<ForgotPassword />)

        const email = screen.getByLabelText('Email Address')
        expect(email).toHaveAttribute('id', 'forgot-password-email')
        expect(email).toHaveAttribute('name', 'email')
        expect(email).toHaveAttribute('autocomplete', 'email')
    })

    it('reset password exposes named and associated password fields', () => {
        renderWithRouter(<ResetPassword />)

        const username = document.querySelector('input[name="username"]')
        const newPassword = screen.getByLabelText('New Password')
        const confirmPassword = screen.getByLabelText('Confirm Password')

        expect(username).not.toBeNull()
        expect(username).toHaveAttribute('name', 'username')
        expect(username).toHaveAttribute('autocomplete', 'username')
        expect(newPassword).toHaveAttribute('id', 'reset-password-new')
        expect(newPassword).toHaveAttribute('name', 'newPassword')
        expect(newPassword).toHaveAttribute('autocomplete', 'new-password')
        expect(confirmPassword).toHaveAttribute('id', 'reset-password-confirm')
        expect(confirmPassword).toHaveAttribute('name', 'confirmPassword')
        expect(confirmPassword).toHaveAttribute('autocomplete', 'new-password')
    })

    it('company signup step fields have explicit ids, names, and label associations', () => {
        renderWithRouter(<CompanySignup />)

        const companyName = screen.getByLabelText('auth.companySignup.companyNameLabel')
        const email = screen.getByLabelText('auth.companySignup.workEmailLabel')
        const password = screen.getByLabelText('auth.companySignup.passwordLabel')

        expect(companyName).toHaveAttribute('id', 'company-signup-company-name')
        expect(companyName).toHaveAttribute('name', 'companyName')
        expect(email).toHaveAttribute('id', 'company-signup-email')
        expect(email).toHaveAttribute('name', 'email')
        expect(password).toHaveAttribute('id', 'company-signup-password')
        expect(password).toHaveAttribute('name', 'password')

        fireEvent.change(companyName, { target: { value: 'Acme Labs' } })
        fireEvent.change(email, { target: { value: 'team@acme.com' } })
        fireEvent.change(password, { target: { value: 'StrongPass1!' } })
        fireEvent.click(screen.getByRole('button', { name: 'auth.companySignup.buttons.continue' }))

        const website = screen.getByLabelText('auth.companySignup.websiteOptionalLabel')
        const industry = screen.getByLabelText('auth.companySignup.industryLabel')
        const size = screen.getByLabelText('auth.companySignup.sizeLabel')

        expect(website).toHaveAttribute('id', 'company-signup-website')
        expect(website).toHaveAttribute('name', 'website')
        expect(industry).toHaveAttribute('id', 'company-signup-industry')
        expect(industry).toHaveAttribute('name', 'industry')
        expect(size).toHaveAttribute('id', 'company-signup-size')
        expect(size).toHaveAttribute('name', 'size')
    })

    it('contact form fields are labeled and include id/name/autocomplete', () => {
        renderWithRouter(<Contact />)

        const name = screen.getByLabelText('contactPage.form.nameLabel')
        const email = screen.getByLabelText('contactPage.form.emailLabel')
        const subject = screen.getByLabelText('contactPage.form.subjectLabel')
        const message = screen.getByLabelText('contactPage.form.messageLabel')

        expect(name).toHaveAttribute('id', 'contact-name')
        expect(name).toHaveAttribute('name', 'name')
        expect(name).toHaveAttribute('autocomplete', 'name')
        expect(email).toHaveAttribute('id', 'contact-email')
        expect(email).toHaveAttribute('name', 'email')
        expect(email).toHaveAttribute('autocomplete', 'email')
        expect(subject).toHaveAttribute('id', 'contact-subject')
        expect(subject).toHaveAttribute('name', 'subject')
        expect(subject).toHaveAttribute('autocomplete', 'off')
        expect(message).toHaveAttribute('id', 'contact-message')
        expect(message).toHaveAttribute('name', 'message')
        expect(message).toHaveAttribute('autocomplete', 'off')
    })
})
