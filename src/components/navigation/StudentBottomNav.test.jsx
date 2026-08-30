import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import StudentBottomNav from './StudentBottomNav'

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, fallback) => fallback || key
    })
}))

describe('StudentBottomNav', () => {
    it('renders all four primary student product tabs', () => {
        render(
            <MemoryRouter initialEntries={['/student/swipe']}>
                <StudentBottomNav unreadMatches={2} unreadMessages={0} />
            </MemoryRouter>
        )

        const discoverLink = screen.getByRole('link', { name: 'Discover' })
        const matchesLink = screen.getByRole('link', { name: 'Matches' })
        const chatLink = screen.getByRole('link', { name: 'Chat' })
        const profileLink = screen.getByRole('link', { name: 'Profile' })

        expect(discoverLink).toBeInTheDocument()
        expect(discoverLink).toHaveAttribute('href', '/student/swipe')
        expect(discoverLink).toHaveClass('is-active')

        expect(matchesLink).toBeInTheDocument()
        expect(matchesLink).toHaveAttribute('href', '/student/matches')
        expect(screen.getByText('2')).toBeInTheDocument() // unread matches badge

        expect(chatLink).toBeInTheDocument()
        expect(profileLink).toBeInTheDocument()
        expect(profileLink).toHaveAttribute('href', '/student/profile')
    })
})
