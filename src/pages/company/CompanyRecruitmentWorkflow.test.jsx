import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

const mockMatchesState = vi.fn()
const mockClosedItemsState = vi.fn()

vi.mock('../../hooks/useMatches', () => ({
    useMatches: () => mockMatchesState()
}))

vi.mock('../../hooks/useCompanyClosedItems', () => ({
    useCompanyClosedItems: () => mockClosedItemsState()
}))

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'company-user-123' }
    })
}))

vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            update: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
    }
}))

vi.mock('../../features/conversations/CandidateProfileModal', () => ({
    CandidateProfileModal: ({ studentId, isOpen }) =>
        isOpen ? <div data-testid="candidate-profile-modal">Profile for {studentId}</div> : null
}))

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: { language: 'fr' },
        t: (key, fallback) => (typeof fallback === 'string' ? fallback : key)
    })
}))

import CompanyMatches from './CompanyMatches'
import ViewCandidates from './ViewCandidates'

describe('Company Recruitment Workflow', () => {
    let container
    let root

    beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
    })

    afterEach(() => {
        act(() => {
            root?.unmount()
        })
        container?.remove()
        vi.clearAllMocks()
    })

    it('renders Voir le profil, Accepter, and Rejeter on matches triage without a Message button', () => {
        mockMatchesState.mockReturnValue({
            matches: [
                {
                    id: 'match-1',
                    status: 'matched',
                    student_id: 'student-42',
                    students: {
                        id: 'student-42',
                        display_name: 'Alexandre Dupont',
                        skills: ['React', 'TypeScript'],
                        bio: 'Passionné de frontend'
                    }
                }
            ],
            loading: false,
            error: null,
            refresh: vi.fn()
        })

        act(() => {
            root.render(
                <MemoryRouter>
                    <CompanyMatches />
                </MemoryRouter>
            )
        })

        const textContent = container.textContent

        // Candidate name and details are shown
        expect(textContent).toContain('Alexandre Dupont')
        expect(textContent).toContain('Voir le profil')
        expect(textContent).toContain('Accepter')
        expect(textContent).toContain('companyWorkflow.matches.actions.reject')

        // Crucial requirement: No message button on pending triage card
        const buttons = Array.from(container.querySelectorAll('button'))
        const buttonTexts = buttons.map((b) => b.textContent)
        expect(buttonTexts.some((txt) => txt.includes('Message'))).toBe(false)
    })

    it('opens rejection modal with polite message when Rejeter is clicked', () => {
        mockMatchesState.mockReturnValue({
            matches: [
                {
                    id: 'match-1',
                    status: 'matched',
                    student_id: 'student-42',
                    students: {
                        id: 'student-42',
                        display_name: 'Alexandre Dupont',
                        skills: ['React']
                    }
                }
            ],
            loading: false,
            error: null,
            refresh: vi.fn()
        })

        act(() => {
            root.render(
                <MemoryRouter>
                    <CompanyMatches />
                </MemoryRouter>
            )
        })

        const rejectButton = Array.from(container.querySelectorAll('button')).find((b) =>
            b.getAttribute('aria-label')?.includes('Alexandre Dupont') &&
            b.className.includes('btn-danger')
        )
        expect(rejectButton).toBeDefined()

        act(() => {
            rejectButton.click()
        })

        // Rejection modal should open
        expect(container.textContent).toContain('Rejeter la candidature')
        expect(container.textContent).toContain('Alexandre Dupont')
        expect(container.textContent).toContain('Envoyer & Rejeter')
    })

    it('renders restore button and profile button in archived candidates page', () => {
        mockClosedItemsState.mockReturnValue({
            items: [
                {
                    id: 'archived-1',
                    type: 'match',
                    matchId: 'match-99',
                    studentId: 'student-88',
                    status: 'archived',
                    candidateName: 'Camille Martin',
                    candidateSkills: ['Python', 'SQL'],
                    offerTitle: 'Data Analyst'
                }
            ],
            loading: false,
            error: null,
            refresh: vi.fn()
        })

        act(() => {
            root.render(
                <MemoryRouter>
                    <ViewCandidates />
                </MemoryRouter>
            )
        })

        const textContent = container.textContent
        expect(textContent).toContain('Camille Martin')
        expect(textContent).toContain('Voir le profil')
        expect(textContent).toContain('Récupérer / Contacter')
    })

    it('does not duplicate candidate cards in archived view when deduplicated item is provided', () => {
        mockClosedItemsState.mockReturnValue({
            items: [
                {
                    id: 'match-1',
                    type: 'match',
                    matchId: 'match-1',
                    introId: 'intro-1',
                    studentId: 'student-massabi',
                    status: 'archived',
                    candidateName: 'Massabi Iheb',
                    candidateSkills: ['AR/VR Development'],
                    offerTitle: 'tetetetete'
                }
            ],
            loading: false,
            error: null,
            refresh: vi.fn()
        })

        act(() => {
            root.render(
                <MemoryRouter>
                    <ViewCandidates />
                </MemoryRouter>
            )
        })

        const candidateArticles = container.querySelectorAll('article.archived-card')
        expect(candidateArticles.length).toBe(1)
        expect(container.textContent).toContain('Massabi Iheb')
    })

    it('opens permanent delete modal when trash button is clicked in archived view', () => {
        mockClosedItemsState.mockReturnValue({
            items: [
                {
                    id: 'match-1',
                    type: 'match',
                    matchId: 'match-1',
                    studentId: 'student-massabi',
                    status: 'archived',
                    candidateName: 'Massabi Iheb',
                    candidateSkills: ['AR/VR Development'],
                    offerTitle: 'tetetetete'
                }
            ],
            loading: false,
            error: null,
            refresh: vi.fn()
        })

        act(() => {
            root.render(
                <MemoryRouter>
                    <ViewCandidates />
                </MemoryRouter>
            )
        })

        const trashButton = Array.from(container.querySelectorAll('button')).find((b) =>
            b.getAttribute('aria-label')?.includes('Supprimer définitivement')
        )
        expect(trashButton).toBeDefined()

        act(() => {
            trashButton.click()
        })

        // Delete confirmation modal should open
        expect(container.textContent).toContain('Supprimer définitivement')
        expect(container.textContent).toContain('Cette action est irréversible')
        expect(container.textContent).toContain('Massabi Iheb')
    })
})
