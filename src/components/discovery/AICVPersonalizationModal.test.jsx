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
const supabaseUpdateMock = vi.fn()
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
            select: (...args) => supabaseSelectMock(...args),
            update: (...args) => supabaseUpdateMock(...args)
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
                    data: { original_docx_url: 'student-123/original_cv.docx', cv_url: 'student-123/original_cv.docx' },
                    error: null
                })
            })
        })
        supabaseUpdateMock.mockReturnValue({
            eq: vi.fn().mockReturnValue(Promise.resolve({ error: null }))
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

    it('activates generate button immediately without extra upload when original_docx_url is present', async () => {
        supabaseSelectMock.mockReturnValue({
            eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                    data: { original_docx_url: 'student-123/master_cv.docx', cv_url: 'student-123/master_cv.docx' },
                    error: null
                })
            })
        })

        render(
            <AICVPersonalizationModal
                isOpen={true}
                offer={mockOffer}
                onClose={vi.fn()}
                onConfirmSend={vi.fn()}
            />
        )

        await screen.findByText('CV de votre profil prêt')
        const generateBtn = screen.getByRole('button', { name: /Générer mon CV optimisé/i })
        expect(generateBtn).not.toBeDisabled()
    })

    it('allows optimizing from MatchOp profile without requiring docx when only cv_url (.pdf) is present', async () => {
        supabaseSelectMock.mockReturnValue({
            eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                    data: { original_docx_url: null, cv_url: 'student-123/profile.pdf' },
                    error: null
                })
            })
        })

        supabaseFunctionsInvokeMock.mockImplementation((funcName) => {
            if (funcName === 'personalize-cv') {
                return Promise.resolve({
                    data: {
                        success: true,
                        tailored_cv: {
                            headline: 'Profil Synchronisé MatchOp',
                            summary: 'Optimisé à partir du profil',
                            highlighted_skills: ['React'],
                            experiences: [],
                            match_analysis: ['Adapté à partir du profil']
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

        render(
            <AICVPersonalizationModal
                isOpen={true}
                offer={mockOffer}
                onClose={vi.fn()}
                onConfirmSend={vi.fn()}
            />
        )

        await screen.findByText('CV de votre profil prêt')
        expect(screen.getByText(/CV profil \(\.pdf\)/i)).toBeInTheDocument()

        const generateBtn = screen.getByRole('button', { name: /Générer mon CV optimisé/i })
        expect(generateBtn).not.toBeDisabled()

        fireEvent.click(generateBtn)

        await screen.findByText('Profil Synchronisé MatchOp')
        expect(supabaseFunctionsInvokeMock).toHaveBeenCalledWith('personalize-cv', {
            body: {
                offer_id: 'offer-456',
                cv_text: '',
                student_id: 'student-123'
            }
        })
    })

    it('triggers onConfirmSend directly with existing CV path when clicking "Postuler avec mon CV actuel"', async () => {
        supabaseSelectMock.mockReturnValue({
            eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                    data: { original_docx_url: null, cv_url: 'student-123/existing_cv.pdf' },
                    error: null
                })
            })
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

        await screen.findByText('CV de votre profil prêt')
        const directApplyBtn = screen.getByRole('button', { name: /Postuler avec mon CV actuel/i })
        expect(directApplyBtn).toBeInTheDocument()

        fireEvent.click(directApplyBtn)

        expect(handleConfirmSend).toHaveBeenCalledTimes(1)
        expect(handleConfirmSend).toHaveBeenCalledWith('student-123/existing_cv.pdf')
        expect(supabaseFunctionsInvokeMock).not.toHaveBeenCalledWith('personalize-cv', expect.anything())
    })

    it('updates students.original_docx_url and cv_url in database after uploading a new docx', async () => {
        supabaseSelectMock.mockReturnValue({
            eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                    data: { original_docx_url: null, cv_url: null },
                    error: null
                })
            })
        })

        const updateEqMock = vi.fn().mockResolvedValue({ error: null })
        supabaseUpdateMock.mockReturnValue({ eq: updateEqMock })

        supabaseFunctionsInvokeMock.mockImplementation((funcName) => {
            if (funcName === 'personalize-cv') {
                return Promise.resolve({
                    data: {
                        success: true,
                        tailored_cv: {
                            headline: 'Nouveau Profil Développeur',
                            summary: 'Texte résumé',
                            match_analysis: ['Profil adapté']
                        }
                    },
                    error: null
                })
            }
            if (funcName === 'generate-pdf') {
                return Promise.resolve({
                    data: {
                        success: true,
                        storage_path: 'student-123/personalized.pdf',
                        signed_url: 'https://example.com/p.pdf'
                    },
                    error: null
                })
            }
            return Promise.resolve({ data: {}, error: null })
        })

        const { container } = render(
            <AICVPersonalizationModal
                isOpen={true}
                offer={mockOffer}
                onClose={vi.fn()}
                onConfirmSend={vi.fn()}
            />
        )

        await screen.findByText('Profil MatchOp synchronisé')

        // Click toggle to reveal file input
        const toggleBtn = screen.getByRole('button', { name: /Utiliser un autre fichier Word/i })
        fireEvent.click(toggleBtn)

        const testDocx = new File(['mock binary content'], 'custom_resume.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        })
        testDocx.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8))

        const fileInput = container.querySelector('input[type="file"]')
        expect(fileInput).toBeInTheDocument()

        fireEvent.change(fileInput, { target: { files: [testDocx] } })

        const matchingElements = await screen.findAllByText(/custom_resume\.docx/i)
        expect(matchingElements.length).toBeGreaterThan(0)

        const generateBtn = screen.getByRole('button', { name: /Générer mon CV optimisé/i })
        fireEvent.click(generateBtn)

        await screen.findByText('Nouveau Profil Développeur')

        expect(supabaseUpdateMock).toHaveBeenCalledWith({
            original_docx_url: 'student-123/original_cv.docx',
            cv_url: 'student-123/original_cv.docx'
        })
        expect(updateEqMock).toHaveBeenCalledWith('id', 'student-123')
    })
})
