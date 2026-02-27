import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockAuthState

vi.mock('@vercel/speed-insights/react', () => ({
    SpeedInsights: () => null
}))

vi.mock('@vercel/analytics/react', () => ({
    Analytics: () => null
}))

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
    useAuth: () => mockAuthState
}))

vi.mock('./pages/company/CompanyMatches', () => ({
    default: () => <div>Company matches page</div>
}))

vi.mock('./pages/company/CompanyLogin', () => ({
    default: () => <div>Company login page</div>
}))

import App from './App'

describe('App company chat alias routing', () => {
    beforeEach(() => {
        mockAuthState = {
            isLoggedIn: true,
            isLoading: false,
            isStudent: false,
            isCompany: true,
            isAdmin: false,
            user: { id: 'company-1', user_metadata: { type: 'company' } },
            profile: { id: 'company-1' },
            authError: null
        }
    })

    it('redirects /company/chat to /company/matches for company users', async () => {
        render(
            <MemoryRouter initialEntries={['/company/chat']}>
                <App />
            </MemoryRouter>
        )

        expect(await screen.findByText('Company matches page')).toBeInTheDocument()
    })

    it('redirects logged-out users from /company/chat to /company/login', async () => {
        mockAuthState = {
            isLoggedIn: false,
            isLoading: false,
            isStudent: false,
            isCompany: false,
            isAdmin: false,
            user: null,
            profile: null,
            authError: null
        }

        render(
            <MemoryRouter initialEntries={['/company/chat']}>
                <App />
            </MemoryRouter>
        )

        expect(await screen.findByText('Company login page')).toBeInTheDocument()
    })
})
