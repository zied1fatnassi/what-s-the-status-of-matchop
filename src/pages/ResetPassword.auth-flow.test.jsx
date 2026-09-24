import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ResetPassword from './ResetPassword'
import { supabase } from '../lib/supabase'
import * as passwordResetLib from '../lib/passwordReset'

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            updateUser: vi.fn()
        }
    }
}))

vi.mock('../lib/passwordReset', () => ({
    getResetParamsFromURL: vi.fn(),
    validateResetToken: vi.fn(),
    executePasswordReset: vi.fn()
}))

vi.mock('../lib/useBilingualText', () => {
    const staticTr = (en) => en
    return {
        useBilingualText: () => staticTr
    }
})

describe('ResetPassword component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    })

    it('validates URL token and submits password reset successfully', async () => {
        passwordResetLib.getResetParamsFromURL.mockReturnValue({
            token: 'valid-reset-token-123',
            email: 'student@esprit.tn'
        })
        passwordResetLib.validateResetToken.mockResolvedValueOnce({ valid: true, error: null })
        passwordResetLib.executePasswordReset.mockResolvedValueOnce({ success: true, error: null })

        render(
            <MemoryRouter>
                <ResetPassword />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument()
        })

        const passwordInput = screen.getByLabelText(/New Password/i)
        const confirmInput = screen.getByLabelText(/Confirm Password/i)

        fireEvent.change(passwordInput, { target: { value: 'SuperSecret123!' } })
        fireEvent.change(confirmInput, { target: { value: 'SuperSecret123!' } })

        const submitButton = document.querySelector('button[type="submit"]')
        expect(submitButton).not.toBeDisabled()
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(passwordResetLib.executePasswordReset).toHaveBeenCalledWith(
                'valid-reset-token-123',
                'student@esprit.tn',
                'SuperSecret123!'
            )
        })

        await waitFor(() => {
            expect(screen.getByText(/Password Changed Successfully/i)).toBeInTheDocument()
        })
    })

    it('shows error message when passwords do not match', async () => {
        passwordResetLib.getResetParamsFromURL.mockReturnValue({
            token: 'valid-reset-token-123',
            email: 'student@esprit.tn'
        })
        passwordResetLib.validateResetToken.mockResolvedValueOnce({ valid: true, error: null })

        render(
            <MemoryRouter>
                <ResetPassword />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument()
        })

        const passwordInput = screen.getByLabelText(/New Password/i)
        const confirmInput = screen.getByLabelText(/Confirm Password/i)

        fireEvent.change(passwordInput, { target: { value: 'SuperSecret123!' } })
        fireEvent.change(confirmInput, { target: { value: 'DifferentPass123!' } })

        const submitButton = document.querySelector('button[type="submit"]')
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
        })
    })

    it('handles active Supabase auth session recovery flow', async () => {
        supabase.auth.getSession.mockResolvedValueOnce({
            data: {
                session: {
                    user: { id: 'user-recovery', email: 'verified@esprit.tn' }
                }
            },
            error: null
        })
        supabase.auth.updateUser.mockResolvedValueOnce({ data: { user: {} }, error: null })

        render(
            <MemoryRouter>
                <ResetPassword />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument()
        })

        const passwordInput = screen.getByLabelText(/New Password/i)
        const confirmInput = screen.getByLabelText(/Confirm Password/i)

        fireEvent.change(passwordInput, { target: { value: 'NewSuperPass123!' } })
        fireEvent.change(confirmInput, { target: { value: 'NewSuperPass123!' } })

        const submitButton = document.querySelector('button[type="submit"]')
        expect(submitButton).not.toBeDisabled()
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'NewSuperPass123!' })
        })

        await waitFor(() => {
            expect(screen.getByText(/Password Changed Successfully/i)).toBeInTheDocument()
        })
    })
})
