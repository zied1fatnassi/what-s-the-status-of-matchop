import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VerticalOpportunityItem from './VerticalOpportunityItem'

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, fallback) => fallback || key
    })
}))

const mockOffer = {
    id: 'offer-1',
    title: 'Senior Frontend Engineer',
    company: 'TechCorp',
    companyLogo: 'https://example.com/logo.png',
    companyVerified: true,
    companyVerificationMethod: 'domain',
    location: 'Tunis, Tunisia',
    type: 'Full-time',
    salary: '3500 TND / month',
    duration: 'Permanent',
    department: 'Engineering',
    description: 'We are seeking a talented Senior Frontend Engineer with extensive React experience to lead our web application architecture and deliver world-class user experiences across multiple platforms.',
    skills: ['React', 'TypeScript', 'CSS', 'Framer Motion', 'GraphQL'],
    matchScore: 0.94,
    is_exclusive: true,
    is_leak: false,
    bounty_value: 500,
    isExternal: false
}

const mockExternalOffer = {
    id: 'ext-99',
    title: 'Data Science Intern',
    company: 'AI Labs',
    companyLogo: null,
    location: 'Remote',
    type: 'Internship',
    salary: 'Competitive',
    description: 'Work with machine learning models and BigQuery data pipelines.',
    skills: ['Python', 'SQL'],
    matchScore: 0.88,
    isExternal: true,
    externalUrl: 'https://linkedin.com/jobs/view/12345',
    sourceWebsite: 'LinkedIn'
}

describe('VerticalOpportunityItem', () => {
    let onApplyMock
    let onIgnoreMock
    let onUndoMock
    let onViewDetailsMock

    beforeEach(() => {
        onApplyMock = vi.fn()
        onIgnoreMock = vi.fn()
        onUndoMock = vi.fn()
        onViewDetailsMock = vi.fn()
    })

    it('renders all key opportunity information and badges correctly', () => {
        render(
            <VerticalOpportunityItem
                offer={mockOffer}
                onApply={onApplyMock}
                onIgnore={onIgnoreMock}
                onUndo={onUndoMock}
                onViewDetails={onViewDetailsMock}
            />
        )

        expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
        expect(screen.getByText('TechCorp')).toBeInTheDocument()
        expect(screen.getByText('94% Match')).toBeInTheDocument()
        expect(screen.getByText('Exclusive')).toBeInTheDocument()
        expect(screen.getByText('Tunis, Tunisia')).toBeInTheDocument()
        expect(screen.getByText('Engineering')).toBeInTheDocument()
        expect(screen.getByText('3500 TND / month')).toBeInTheDocument()
        expect(screen.getByText('React')).toBeInTheDocument()
        expect(screen.getByText('TypeScript')).toBeInTheDocument()
    })

    it('triggers onApply when Apply button is clicked', () => {
        render(
            <VerticalOpportunityItem
                offer={mockOffer}
                onApply={onApplyMock}
                onIgnore={onIgnoreMock}
                onUndo={onUndoMock}
                onViewDetails={onViewDetailsMock}
            />
        )

        const applyBtn = screen.getByRole('button', { name: /apply/i })
        fireEvent.click(applyBtn)
        expect(onApplyMock).toHaveBeenCalledWith(mockOffer)
    })

    it('triggers onIgnore when Ignore button is clicked', () => {
        render(
            <VerticalOpportunityItem
                offer={mockOffer}
                onApply={onApplyMock}
                onIgnore={onIgnoreMock}
                onUndo={onUndoMock}
                onViewDetails={onViewDetailsMock}
            />
        )

        const ignoreBtn = screen.getByRole('button', { name: /ignore/i })
        fireEvent.click(ignoreBtn)
        expect(onIgnoreMock).toHaveBeenCalledWith(mockOffer)
    })

    it('triggers onViewDetails when details info button is clicked', () => {
        render(
            <VerticalOpportunityItem
                offer={mockOffer}
                onApply={onApplyMock}
                onIgnore={onIgnoreMock}
                onUndo={onUndoMock}
                onViewDetails={onViewDetailsMock}
            />
        )

        const infoBtn = screen.getByRole('button', { name: /view/i })
        fireEvent.click(infoBtn)
        expect(onViewDetailsMock).toHaveBeenCalledWith(mockOffer)
    })

    it('displays external opportunity badge and handles external apply', () => {
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

        render(
            <VerticalOpportunityItem
                offer={mockExternalOffer}
                onApply={onApplyMock}
                onIgnore={onIgnoreMock}
                onUndo={onUndoMock}
                onViewDetails={onViewDetailsMock}
            />
        )

        expect(screen.getByText(/External · LinkedIn/i)).toBeInTheDocument()

        const applyBtn = screen.getByRole('button', { name: /apply/i })
        fireEvent.click(applyBtn)

        expect(openSpy).toHaveBeenCalledWith('https://linkedin.com/jobs/view/12345', '_blank', 'noopener,noreferrer')
        expect(onApplyMock).toHaveBeenCalledWith(mockExternalOffer)

        openSpy.mockRestore()
    })

    it('supports expanding and collapsing long descriptions', () => {
        render(
            <VerticalOpportunityItem
                offer={mockOffer}
                onApply={onApplyMock}
                onIgnore={onIgnoreMock}
                onUndo={onUndoMock}
                onViewDetails={onViewDetailsMock}
            />
        )

        const toggleBtn = screen.getByRole('button', { name: /read more/i })
        expect(toggleBtn).toBeInTheDocument()

        fireEvent.click(toggleBtn)
        expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument()
    })
})
