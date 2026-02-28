import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockAuthState
let mockThemeState
let mockUnreadCount = 0
let mockLanguage = 'en'

const mockSignOut = vi.fn(async () => {})
const mockOpenPremiumUpsell = vi.fn()
const mockSetTheme = vi.fn()
const mockChangeLanguage = vi.fn((code) => {
    mockLanguage = code
})

const translations = {
    'nav.discover': 'Discover',
    'nav.matches': 'Matches',
    'nav.personalizedPlan': 'Personalized Plan',
    'nav.referrals': 'Referrals',
    'nav.payments': 'Payments',
    'nav.language': 'Language',
    'nav.theme': 'Theme',
    'nav.notifications': 'Notifications',
    'nav.profile': 'Profile',
    'nav.newCandidates': 'Candidates',
    'nav.archived': 'Archived',
    'nav.myOffers': 'My Offers',
    'nav.postJob': 'Post Job',
    'nav.logout': 'Logout',
    'footer.theme.dark': 'Dark',
    'footer.theme.light': 'Light',
    'landing.ctaStudent': 'Student Sign Up',
    'landing.ctaCompany': 'Company Sign Up',
}

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => translations[key] || key,
        i18n: {
            language: mockLanguage,
            changeLanguage: mockChangeLanguage,
        },
    }),
}))

vi.mock('../context/AuthContext', () => ({
    useAuth: () => mockAuthState,
}))

vi.mock('../context/ApplicationContext', () => ({
    useApplications: () => ({
        openPremiumUpsell: mockOpenPremiumUpsell,
    }),
}))

vi.mock('../context/ThemeContext', () => ({
    useTheme: () => mockThemeState,
}))

vi.mock('../lib/premiumEntitlements', () => ({
    getEntitlements: () => ({ premiumActive: false }),
}))

vi.mock('../lib/notifications', () => ({
    NOTIFICATION_SCOPE_COMPANY: 'company',
    NOTIFICATION_SCOPE_STUDENT: 'student',
    NOTIFICATIONS_UPDATED_EVENT: 'matchop:notifications-updated',
    getNotificationStorageKey: (scope) => `notifications-${scope}`,
    getUnreadNotificationCount: () => mockUnreadCount,
    migrateLegacyNotifications: vi.fn(),
}))

vi.mock('./Logo', () => ({
    default: () => <div>MatchOp</div>,
}))

import Navbar from './Navbar'

function renderNavbar({ path = '/student/swipe', role = 'student' } = {}) {
    const baseUser = {
        id: `${role}-1`,
        email: `${role}@matchop.test`,
        user_metadata: {
            type: role,
            name: role === 'company' ? 'Acme Labs' : 'Student Example',
        },
    }

    mockAuthState = {
        isLoggedIn: true,
        isStudent: role === 'student',
        isCompany: role === 'company',
        isLoading: false,
        signOut: mockSignOut,
        user: baseUser,
        profile: role === 'company'
            ? { companies: { company_name: 'Acme Labs', logo_url: null } }
            : { students: { display_name: 'Student Example', avatar_url: null } },
    }

    return render(
        <MemoryRouter initialEntries={[path]}>
            <Navbar />
        </MemoryRouter>
    )
}

describe('Navbar desktop IA', () => {
    beforeEach(() => {
        mockUnreadCount = 0
        mockLanguage = 'en'
        mockSignOut.mockClear()
        mockOpenPremiumUpsell.mockClear()
        mockSetTheme.mockClear()
        mockChangeLanguage.mockClear()

        mockThemeState = {
            theme: 'light',
            setTheme: mockSetTheme,
        }
    })

    it('shows only Discover and Matches as student primary links', () => {
        const { container } = renderNavbar({ role: 'student', path: '/student/swipe' })
        const primary = container.querySelector('.navbar-primary')

        expect(primary).toBeTruthy()
        expect(within(primary).getByRole('link', { name: 'Discover' })).toBeInTheDocument()
        expect(within(primary).getByRole('link', { name: 'Matches' })).toBeInTheDocument()
        expect(within(primary).queryByRole('link', { name: 'Payments' })).toBeNull()
        expect(within(primary).queryByRole('link', { name: 'Referrals' })).toBeNull()
    })

    it('shows student profile menu with secondary items', () => {
        renderNavbar({ role: 'student', path: '/student/swipe' })

        const trigger = screen.getByRole('button', { name: 'Open profile menu' })
        fireEvent.click(trigger)

        const menu = screen.getByRole('menu')
        const profileLink = within(menu).getByRole('menuitem', { name: 'Profile' })
        expect(profileLink).toBeInTheDocument()
        expect(profileLink).toHaveAttribute('href', '/student/profile')
        expect(within(menu).getByRole('menuitem', { name: 'Personalized Plan' })).toBeInTheDocument()
        expect(within(menu).getByRole('menuitem', { name: 'Payments' })).toBeInTheDocument()
        expect(within(menu).getByRole('menuitem', { name: 'Referrals' })).toBeInTheDocument()
        expect(within(menu).queryByRole('menuitem', { name: 'Settings' })).toBeNull()
        expect(within(menu).getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument()
    })

    it('shows Candidates, Matches, and My Offers as company primary links', () => {
        const { container } = renderNavbar({ role: 'company', path: '/company/intros' })
        const primary = container.querySelector('.navbar-primary')

        expect(primary).toBeTruthy()
        expect(within(primary).getByRole('link', { name: 'Candidates' })).toBeInTheDocument()
        expect(within(primary).getByRole('link', { name: 'Matches' })).toBeInTheDocument()
        expect(within(primary).getByRole('link', { name: 'My Offers' })).toBeInTheDocument()
        expect(within(primary).queryByRole('link', { name: 'Post Job' })).toBeNull()
    })

    it('shows company profile menu with secondary actions', () => {
        renderNavbar({ role: 'company', path: '/company/intros' })

        const trigger = screen.getByRole('button', { name: 'Open profile menu' })
        fireEvent.click(trigger)

        const menu = screen.getByRole('menu')
        const profileLink = within(menu).getByRole('menuitem', { name: 'Profile' })
        expect(profileLink).toBeInTheDocument()
        expect(profileLink).toHaveAttribute('href', '/company/profile')
        expect(within(menu).getByRole('menuitem', { name: 'Post Job' })).toBeInTheDocument()
        expect(within(menu).getByRole('menuitem', { name: 'Archived' })).toBeInTheDocument()
        expect(within(menu).queryByRole('menuitem', { name: 'Settings' })).toBeNull()
        expect(within(menu).getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument()
    })

    it('supports Enter to open and Escape to close profile menu with focus return', async () => {
        renderNavbar({ role: 'student', path: '/student/swipe' })

        const trigger = screen.getByRole('button', { name: 'Open profile menu' })
        trigger.focus()

        fireEvent.keyDown(trigger, { key: 'Enter' })
        expect(await screen.findByRole('menu')).toBeInTheDocument()

        fireEvent.keyDown(document, { key: 'Escape' })

        await waitFor(() => {
            expect(screen.queryByRole('menu')).toBeNull()
        })

        await waitFor(() => {
            expect(document.activeElement).toBe(trigger)
        })
    })

    it('renders notifications badge with unread count', async () => {
        mockUnreadCount = 5
        const { container } = renderNavbar({ role: 'student', path: '/student/swipe' })

        await waitFor(() => {
            const badge = container.querySelector('.navbar-notification-badge--utility')
            expect(badge).toBeTruthy()
            expect(badge?.textContent).toBe('5')
        })

        expect(screen.getByRole('link', { name: 'Notifications, 5 unread' })).toBeInTheDocument()
    })

    it('does not render duplicate desktop logout button outside profile menu', () => {
        const { container } = renderNavbar({ role: 'student', path: '/student/swipe' })

        expect(container.querySelector('.logout-btn--desktop')).toBeNull()
    })
})
