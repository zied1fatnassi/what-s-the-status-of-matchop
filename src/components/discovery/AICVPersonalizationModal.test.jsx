import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import AICVPersonalizationModal from './AICVPersonalizationModal'

const mockUser = { id: 'student-123', email: 'student@example.com' }
const mockOffer = {
    id: 'offer-456',
    title: 'Développeur Fullstack React / Node',
    company: 'TechCorp Paris',
    req_skills: ['React', 'Node.js', 'PostgreSQL'],
    isExternal: false
}

const supabaseSelectMock = vi.fn()
const supabaseFunctionsInvokeMock = vi.fn()

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser,
        isLoading: false
    })
}))

vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: () => ({
            select: (...args) => supabaseSelectMock(...args)
        }),
        functions: {
            invoke: (...args) => supabaseFunctionsInvokeMock(...args)
        }
    }
}))

vi.mock('../../lib/storage', () => ({
    uploadStudentDocx: vi.fn().mockResolvedValue('student-123/original_cv.docx'),
    getSignedCVUrl: vi.fn().mockResolvedValue('https://example.com/signed-cv.docx')
}))

vi.mock('mammoth', () => ({
    default: {
        extractRawText: vi.fn().mockResolvedValue({
            value: 'John Doe. Experienced frontend developer proficient in React and JavaScript.'
        })
    }
}))

describe('AICVPersonalizationModal', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        supabaseSelectMock.mockReturnValue({
            eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                    data: { original_docx_url: 'student-123/original_cv.docx' },
                    error: null
                })
            })
        })
    })

    it('does not render when isOpen is false', () => {
        const { container } = render(
            <AICVPersonalizationModal
                isOpen={false}
                offer={mockOffer}
                onClose={vi.fn()}
                onConfirmSend={vi.fn()}
            />
        )
        expect(container.firstChild).toBeNull()
    })

    it('renders offer context and strict integrity disclaimer when open', async () => {
        render(
            <AICVPersonalizationModal
                isOpen={true}
                offer={mockOffer}
                onClose={vi.fn()}
                onConfirmSend={vi.fn()}
            />
        )

        expect(await screen.findByText('Optimisation de votre CV pour cette offre')).toBeInTheDocument()
        expect(screen.getByText('Développeur Fullstack React / Node')).toBeInTheDocument()
        expect(screen.getByText('TechCorp Paris')).toBeInTheDocument()
        expect(screen.getByText(/Garantie d'intégrité MatchOp :/i)).toBeInTheDocument()
        expect(screen.getByText(/L'IA n'invente jamais d'expérience/i)).toBeInTheDocument()
    })

    it('detects existing DOCX and allows generating the optimized CV', async () => {
        supabaseFunctionsInvokeMock.mockImplementation((funcName) => {
            if (funcName === 'personalize-cv') {
                return Promise.resolve({
                    data: {
                        success: true,
                        tailored_cv: {
                            headline: 'Développeur Fullstack React expérimenté',
                            summary: 'Développeur passionné par les architectures réactives.',
                            highlighted_skills: ['React', 'Node.js'],
                            experiences: [
                                {
                                    job_title: 'Développeur Frontend',
                                    company: 'Startup Lab',
                                    description: 'Conception de composants React haute performance.'
                                }
                            ],
                            match_analysis: [
                                'Maîtrise prouvée de React',
                                'Compétences alignées sur le backend Node.js',
                                'Historique professionnel 100% vérifié'
                            ]
                        }
                    },
                    error: null
                })
            }
            if (funcName === 'generate-pdf') {
                return Promise.resolve({
                    data: {
                        success: true,
                        storage_path: 'personalized/student-123/offer-456/cv.pdf',
                        signed_url: 'https://example.com/personalized-cv.pdf'
                    },
                    error: null
                })
            }
            return Promise.resolve({ data: {}, error: null })
        })

        // Mock global fetch for fetching the docx buffer
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
        })

        const handleConfirmSend = vi.fn()

        render(
            <AICVPersonalizationModal
                isOpen={true}
                offer={mockOffer}
                onClose={vi.fn()}
                onConfirmSend={handleConfirmSend}
            />
        )

        // Wait for existing docx detection
        await screen.findByText(/CV original détecté/i)

        const generateBtn = screen.getByRole('button', { name: /Générer mon CV optimisé/i })
        expect(generateBtn).not.toBeDisabled()

        fireEvent.click(generateBtn)

        // Wait for phase 3: Preview
        await screen.findByText('Points forts adaptés pour cette offre')
        expect(screen.getByText('Développeur Fullstack React expérimenté')).toBeInTheDocument()
        expect(screen.getByText('Développeur passionné par les architectures réactives.')).toBeInTheDocument()

        const sendBtn = screen.getByRole('button', { name: /Envoyer ma candidature/i })
        fireEvent.click(sendBtn)

        expect(handleConfirmSend).toHaveBeenCalledTimes(1)
        expect(handleConfirmSend).toHaveBeenCalledWith('personalized/student-123/offer-456/cv.pdf')
    })

    it('triggers onClose when cancel button is clicked', async () => {
        const handleClose = vi.fn()

        render(
            <AICVPersonalizationModal
                isOpen={true}
                offer={mockOffer}
                onClose={handleClose}
                onConfirmSend={vi.fn()}
            />
        )

        await screen.findByText('Optimisation de votre CV pour cette offre')
        const cancelBtn = screen.getByRole('button', { name: 'Annuler' })
        fireEvent.click(cancelBtn)

        expect(handleClose).toHaveBeenCalledTimes(1)
    })
})
