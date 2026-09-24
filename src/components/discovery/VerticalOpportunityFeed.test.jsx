import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VerticalOpportunityFeed from './VerticalOpportunityFeed'

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, fallback) => fallback || key
    })
}))

const mockOffers = [
    {
        id: 'offer-1',
        title: 'Backend Engineer',
        company: 'CloudTunisia',
        companyLogo: null,
        location: 'Tunis',
        type: 'Full-time',
        salary: '3000 TND',
        description: 'Design robust APIs.',
        skills: ['Node.js', 'PostgreSQL'],
        matchScore: 0.9,
        isExternal: false
    },
    {
        id: 'offer-2',
        title: 'Product Designer',
        company: 'DesignHub',
        companyLogo: null,
        location: 'Remote',
        type: 'Internship',
        salary: '1500 TND',
        description: 'Create beautiful user flows.',
        skills: ['Figma', 'UI/UX'],
        matchScore: 0.85,
        isExternal: false
    }
]

describe('VerticalOpportunityFeed', () => {
    let onSwipeMock
    let onUndoMock
    let onViewDetailsMock

    beforeEach(() => {
        onSwipeMock = vi.fn()
        onUndoMock = vi.fn()
        onViewDetailsMock = vi.fn()
    })

    it('renders current opportunity and desktop side navigation rail', () => {
        render(
            <VerticalOpportunityFeed
                offers={mockOffers}
                currentIndex={0}
                canUndo={false}
                onSwipe={onSwipeMock}
                onUndo={onUndoMock}
                onViewDetails={onViewDetailsMock}
            />
        )

        expect(screen.getByText('Backend Engineer')).toBeInTheDocument()
        expect(screen.getByText('CloudTunisia')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /next job/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /previous job/i })).toBeInTheDocument()
    })

    it('navigates to next opportunity (ignore) on ArrowDown keypress', () => {
        render(
            <VerticalOpportunityFeed
                offers={mockOffers}
                currentIndex={0}
                canUndo={false}
                onSwipe={onSwipeMock}
                onUndo={onUndoMock}
                onViewDetails={onViewDetailsMock}
            />
        )

        fireEvent.keyDown(window, { key: 'ArrowDown' })
        expect(onSwipeMock).toHaveBeenCalledWith('left', mockOffers[0])
    })

    it('triggers apply on KeyA or Enter keypress', () => {
        render(
            <VerticalOpportunityFeed
                offers={mockOffers}
                currentIndex={0}
                canUndo={false}
                onSwipe={onSwipeMock}
                onUndo={onUndoMock}
                onViewDetails={onViewDetailsMock}
            />
        )

        fireEvent.keyDown(window, { key: 'a' })
        expect(onSwipeMock).toHaveBeenCalledWith('right', mockOffers[0])
    })

    it('triggers undo on ArrowUp keypress when canUndo is true', () => {
        render(
            <VerticalOpportunityFeed
                offers={mockOffers}
                currentIndex={1}
                canUndo={true}
                onSwipe={onSwipeMock}
                onUndo={onUndoMock}
                onViewDetails={onViewDetailsMock}
            />
        )

        fireEvent.keyDown(window, { key: 'ArrowUp' })
        expect(onUndoMock).toHaveBeenCalledTimes(1)
    })
})
