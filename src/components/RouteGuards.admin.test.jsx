import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

let mockAuthState

vi.mock('../context/AuthContext', () => ({
    useAuth: () => mockAuthState
}))

import { AdminRoute } from './RouteGuards'

function AdminRouteHarness() {
    return (
        <MemoryRouter initialEntries={['/admin/payments']}>
            <Routes>
                <Route
                    path="/admin/payments"
                    element={(
                        <AdminRoute>
                            <div>Admin Payments Page</div>
                        </AdminRoute>
                    )}
                />
                <Route path="/student/swipe" element={<div>Student Swipe Page</div>} />
                <Route path="/company/intros" element={<div>Company Candidates Page</div>} />
                <Route path="/student/login" element={<div>Student Login Page</div>} />
            </Routes>
        </MemoryRouter>
    )
}

describe('AdminRoute', () => {
    let container = null
    let root = null

    beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
    })

    afterEach(async () => {
        if (root) {
            await act(async () => {
                root.unmount()
            })
        }

        if (container && container.parentNode) {
            container.parentNode.removeChild(container)
        }
    })

    it('redirects non-admin students away from admin pages', async () => {
        mockAuthState = {
            isLoggedIn: true,
            isLoading: false,
            isAdmin: false,
            isStudent: true,
            isCompany: false,
            user: { id: 'student-1' },
            authError: null
        }

        await act(async () => {
            root.render(<AdminRouteHarness />)
        })

        expect(container.textContent).toContain('Student Swipe Page')
        expect(container.textContent).not.toContain('Admin Payments Page')
    })

    it('shows loading state first, then renders admin content when role resolves', async () => {
        mockAuthState = {
            isLoggedIn: true,
            isLoading: true,
            isAdmin: false,
            isStudent: false,
            isCompany: false,
            user: { id: 'admin-1' },
            authError: null
        }

        await act(async () => {
            root.render(<AdminRouteHarness />)
        })

        expect(container.textContent).toContain('Checking access...')

        mockAuthState = {
            isLoggedIn: true,
            isLoading: false,
            isAdmin: true,
            isStudent: false,
            isCompany: false,
            user: { id: 'admin-1', user_metadata: { type: 'admin' } },
            authError: null
        }

        await act(async () => {
            root.render(<AdminRouteHarness />)
        })

        expect(container.textContent).toContain('Admin Payments Page')
    })

    it('renders session-expired notice when auth token is invalid', async () => {
        mockAuthState = {
            isLoggedIn: false,
            isLoading: false,
            isAdmin: false,
            isStudent: false,
            isCompany: false,
            user: null,
            authError: { message: 'JWT expired' }
        }

        await act(async () => {
            root.render(<AdminRouteHarness />)
        })

        expect(container.textContent).toContain('Session expired')
        expect(container.textContent).toContain('Go to login')
        expect(container.textContent).not.toContain('Admin Payments Page')
        const loginLink = container.querySelector('a[href="/student/login"]')
        expect(loginLink).toBeTruthy()
    })
})
