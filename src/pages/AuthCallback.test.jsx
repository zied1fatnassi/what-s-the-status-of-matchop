import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthCallback from './AuthCallback'
import { supabase } from '../lib/supabase'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate
    }
})

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            exchangeCodeForSession: vi.fn(),
            onAuthStateChange: vi.fn()
        }
    }
}))

const staticTr = (en) => en

vi.mock('../lib/useBilingualText', () => ({
    useBilingualText: () => staticTr
}))

describe('AuthCallback component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        supabase.auth.getSession.mockResolvedValue({
            data: { session: null },
            error: null
        })
        supabase.auth.onAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } }
        })
    })

    it('exchanges PKCE code for session and redirects to /dashboard for signup verification', async () => {
        window.history.pushState({}, '', '/auth/callback?code=pkce-auth-code-123')

        supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
            data: {
                session: {
                    user: { id: 'user-123', email: 'student@example.com' }
                }
            },
            error: null
        })

        render(
            <MemoryRouter>
                <AuthCallback />
            </MemoryRouter>
        )

        expect(screen.getByText(/Verifying your email/i)).toBeInTheDocument()

        await waitFor(() => {
            expect(screen.getByText(/Email Verified!/i)).toBeInTheDocument()
        }, { timeout: 3000 })

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
        }, { timeout: 3000 })
    })

    it('redirects to /reset-password when type is recovery', async () => {
        window.history.pushState({}, '', '/auth/callback?code=pkce-recovery-code&type=recovery')

        supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
            data: {
                session: {
                    user: { id: 'user-123', email: 'user@example.com' }
                }
            },
            error: null
        })

        render(
            <MemoryRouter>
                <AuthCallback />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByText(/Recovery Confirmed!/i)).toBeInTheDocument()
        }, { timeout: 3000 })

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/reset-password', { replace: true })
        }, { timeout: 3000 })
    })

    it('renders error message when exchange fails and no session is found', async () => {
        window.history.pushState({}, '', '/auth/callback?error=access_denied&error_description=Token+expired')

        render(
            <MemoryRouter>
                <AuthCallback />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByText(/Verification Failed/i)).toBeInTheDocument()
        }, { timeout: 3000 })

        expect(screen.getByRole('button', { name: /Go to Login/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Sign Up Again/i })).toBeInTheDocument()
    })

    it('renders recovery error with Request New Link button when recovery flow fails', async () => {
        window.history.pushState({}, '', '/auth/callback?error=access_denied&error_description=Token+expired&type=recovery')

        render(
            <MemoryRouter>
                <AuthCallback />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByText(/Recovery Failed/i)).toBeInTheDocument()
        }, { timeout: 3000 })

        expect(screen.getByRole('button', { name: /Go to Login/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Request New Link/i })).toBeInTheDocument()
    })
})
