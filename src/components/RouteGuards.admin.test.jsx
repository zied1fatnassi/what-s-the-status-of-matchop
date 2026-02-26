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
                <Route path="/company/candidates" element={<div>Company Candidates Page</div>} />
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
            user: { id: 'student-1' }
        }

        await act(async () => {
            root.render(<AdminRouteHarness />)
        })

        expect(container.textContent).toContain('Student Swipe Page')
        expect(container.textContent).not.toContain('Admin Payments Page')
    })
})
