import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'



vi.mock('./components/Navbar', () => ({
    default: () => null
}))

vi.mock('./components/ScrollToTop', () => ({
    default: () => null
}))

vi.mock('./components/AuthToast', () => ({
    default: () => null
}))

vi.mock('./components/PremiumUpsellModal', () => ({
    default: () => null
}))

vi.mock('./components/Footer', () => ({
    default: () => null
}))

vi.mock('./context/ApplicationContext', () => ({
    useApplications: () => ({
        premiumUpsell: { isOpen: false, reason: null },
        closePremiumUpsell: vi.fn()
    })
}))

vi.mock('./context/AuthContext', () => ({
    useAuth: () => ({
        isLoading: false,
        isLoggedIn: true,
        user: { id: 'student-1', user_metadata: { type: 'student' } },
        profile: { id: 'student-1' }
    })
}))

vi.mock('./components/RouteGuards', () => ({
    ProtectedRoute: ({ children }) => children,
    PublicRoute: ({ children }) => children,
    AdminRoute: ({ children }) => children
}))

vi.mock('./pages/student/Referrals', () => ({
    default: () => <div>Student referrals page</div>
}))

vi.mock('./pages/company/ViewCandidates', () => ({
    default: () => <div>Company archived page</div>
}))

vi.mock('./pages/company/CompanyIntros', () => ({
    default: () => <div>Company intros page</div>
}))

vi.mock('./pages/student/StudentSignup', async () => {
    const React = await vi.importActual('react')
    const router = await vi.importActual('react-router-dom')

    return {
        default: () => {
            const location = router.useLocation()
            return React.createElement(
                'div',
                { 'data-testid': 'student-signup-route' },
                `${location.pathname}${location.search}`
            )
        }
    }
})

import App from './App'

describe('App referrals routing', () => {
    it('redirects /referrals to /student/referrals', async () => {
        render(
            <MemoryRouter initialEntries={['/referrals']}>
                <App />
            </MemoryRouter>
        )

        expect(await screen.findByText('Student referrals page')).toBeInTheDocument()
    })

    it('redirects /signup alias to /student/signup and preserves query params', async () => {
        render(
            <MemoryRouter initialEntries={['/signup?ref=MOP-ABCDEF12']}>
                <App />
            </MemoryRouter>
        )

        expect(await screen.findByTestId('student-signup-route')).toHaveTextContent('/student/signup?ref=MOP-ABCDEF12')
    })

    it('renders archived candidates page at /company/archived', async () => {
        render(
            <MemoryRouter initialEntries={['/company/archived']}>
                <App />
            </MemoryRouter>
        )

        expect(await screen.findByText('Company archived page')).toBeInTheDocument()
    })

    it('redirects /company/candidates to /company/intros', async () => {
        render(
            <MemoryRouter initialEntries={['/company/candidates']}>
                <App />
            </MemoryRouter>
        )

        expect(await screen.findByText('Company intros page')).toBeInTheDocument()
    })
})
