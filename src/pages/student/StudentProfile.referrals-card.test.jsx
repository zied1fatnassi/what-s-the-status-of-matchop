import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReferralsCard from '../../components/ReferralsCard'

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}))

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'student-1', email: 'student@example.com' }
    })
}))

vi.mock('../../lib/referrals', () => ({
    resolveMyReferralCode: () => 'MOP-TEST1234',
    buildReferralInviteLink: () => 'https://matchop.test/student/signup?ref=MOP-TEST1234'
}))

describe('StudentProfile referrals card', () => {
    it('renders compact rewards and referrals card content', () => {
        render(
            <MemoryRouter>
                <ReferralsCard compact emphasized />
            </MemoryRouter>
        )

        expect(screen.getByText('studentProfile.referrals.title')).toBeInTheDocument()
        expect(screen.getByText('studentProfile.referrals.subtitle')).toBeInTheDocument()
        expect(screen.getByText(/MOP-TEST1234/i)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'studentProfile.referrals.openReferrals' })).toHaveAttribute('href', '/student/referrals')
    })
})
