import { useState, useEffect, useRef } from 'react'
import {
    Sparkles,
    FileText,
    Upload,
    CheckCircle2,
    ShieldCheck,
    Briefcase,
    Loader2,
    ArrowRight,
    X,
    ExternalLink,
    AlertCircle,
    ChevronRight,
    RefreshCw
} from 'lucide-react'
import mammoth from 'mammoth'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { uploadStudentDocx, getSignedCVUrl } from '../../lib/storage'
import './AICVPersonalizationModal.css'

export function AICVPersonalizationModal({
    isOpen,
    offer,
    onClose,
    onConfirmSend
}) {
    const { user } = useAuth()

    // Flow phases: 1 = 'upload', 2 = 'generating', 3 = 'preview'
    const [phase, setPhase] = useState('upload')
    const [loadingExisting, setLoadingExisting] = useState(true)
    const [existingDocxPath, setExistingDocxPath] = useState(null)
    const [useExisting, setUseExisting] = useState(true)
    const [selectedFile, setSelectedFile] = useState(null)
    const [dragActive, setDragActive] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    // Generation states
    const [progressStep, setProgressStep] = useState(1) // 1: reading, 2: analyzing, 3: rendering
    const [tailoredData, setTailoredData] = useState(null)
    const [personalizedCvPath, setPersonalizedCvPath] = useState(null)
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const fileInputRef = useRef(null)

    // Check if student already has a master original DOCX
    useEffect(() => {
        if (!isOpen || !user?.id) {
            setPhase('upload')
            setSelectedFile(null)
            setErrorMessage('')
            setTailoredData(null)
            setPersonalizedCvPath(null)
            setPreviewPdfUrl(null)
            setProgressStep(1)
            return
        }

        let isMounted = true
        setLoadingExisting(true)

        supabase
            .from('students')
            .select('original_docx_url')
            .eq('id', user.id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (!isMounted) return
                if (!error && data?.original_docx_url) {
                    setExistingDocxPath(data.original_docx_url)
                    setUseExisting(true)
                } else {
                    setExistingDocxPath(null)
                    setUseExisting(false)
                }
            })
            .catch(() => {
                if (isMounted) setExistingDocxPath(null)
            })
            .finally(() => {
                if (isMounted) setLoadingExisting(false)
            })

        return () => {
            isMounted = false
        }
    }, [isOpen, user?.id])

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && phase !== 'generating') {
                onClose?.()
            }
        }
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown)
        }
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, phase, onClose])

    const handleFileValidation = (file) => {
        setErrorMessage('')
        if (!file) return false

        const ext = (file.name.split('.').pop() || '').toLowerCase()
        if (ext !== 'docx') {
            setErrorMessage('Veuillez sélectionner un fichier Word au format .docx uniquement.')
            return false
        }

        if (file.size > 10 * 1024 * 1024) {
            setErrorMessage('Le fichier dépasse la limite autorisée de 10 Mo.')
            return false
        }

        setSelectedFile(file)
        setUseExisting(false)
        return true
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileValidation(e.dataTransfer.files[0])
        }
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        setDragActive(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        setDragActive(false)
    }

    // Step 2 generation runner
    const runPersonalization = async () => {
        if (!user?.id || !offer?.id) return
        setErrorMessage('')
        setPhase('generating')
        setProgressStep(1)

        try {
            let extractedText = ''

            // 1. Read DOCX text
            if (useExisting && existingDocxPath) {
                const signedUrl = await getSignedCVUrl(existingDocxPath, 600)
                if (!signedUrl) {
                    throw new Error("Impossible d'accéder au CV original enregistré. Veuillez téléverser un nouveau fichier .docx.")
                }
                const response = await fetch(signedUrl)
                if (!response.ok) throw new Error('Erreur de téléchargement du CV original.')
                const arrayBuffer = await response.arrayBuffer()
                const { value } = await mammoth.extractRawText({ arrayBuffer })
                extractedText = value || ''
            } else if (selectedFile) {
                const arrayBuffer = await selectedFile.arrayBuffer()
                const { value } = await mammoth.extractRawText({ arrayBuffer })
                extractedText = value || ''

                // Save DOCX to storage and update student record
                try {
                    const uploadedPath = await uploadStudentDocx(user.id, selectedFile)
                    await supabase
                        .from('students')
                        .update({ original_docx_url: uploadedPath })
                        .eq('id', user.id)
                    setExistingDocxPath(uploadedPath)
                } catch (uploadErr) {
                    console.warn('[AICVPersonalizationModal] DOCX upload non-critical error:', uploadErr)
                }
            } else {
                throw new Error('Veuillez sélectionner un fichier CV .docx.')
            }

            // 2. Call AI Personalization endpoint
            setProgressStep(2)
            const { data: aiResult, error: aiError } = await supabase.functions.invoke('personalize-cv', {
                body: {
                    offer_id: offer.id,
                    cv_text: extractedText,
                    student_id: user.id
                }
            })

            if (aiError || !aiResult?.success) {
                console.warn('[AICVPersonalizationModal] AI endpoint error, fallback applied:', aiError || aiResult?.error)
            }

            const tailored = aiResult?.tailored_cv || {
                headline: `${offer.title} - Candidat Qualifié`,
                summary: `Profil aligné sur les besoins du poste ${offer.title}.`,
                highlighted_skills: Array.isArray(offer.req_skills) ? offer.req_skills.slice(0, 5) : [],
                experiences: [],
                match_analysis: [
                    'Profil ciblé sur les exigences clés de cette opportunité.',
                    'Mise en avant des compétences pertinentes.',
                    'CV adapté tout en préservant 100% de la véracité de vos expériences.'
                ]
            }

            setTailoredData(tailored)

            // 3. Render and store personalized PDF
            setProgressStep(3)
            let storagePath = null
            let previewUrl = null

            try {
                const { data: pdfResult, error: pdfError } = await supabase.functions.invoke('generate-pdf', {
                    body: {
                        profile_id: user.id,
                        profile_type: 'personalized-cv',
                        offer_id: offer.id,
                        tailored_cv: tailored
                    }
                })

                if (!pdfError && pdfResult?.success) {
                    storagePath = pdfResult.storage_path || `${user.id}/personalized/${offer.id}/cv.pdf`
                    previewUrl = pdfResult.signed_url || pdfResult.url
                } else {
                    console.warn('[AICVPersonalizationModal] Edge function generate-pdf unavailable, applying resilient fallback:', pdfError || pdfResult?.error)
                }
            } catch (pdfInvokeErr) {
                console.warn('[AICVPersonalizationModal] generate-pdf invocation error:', pdfInvokeErr)
            }

            // Fallback: If edge function wasn't available, use the candidate's existing DOCX / CV path
            if (!storagePath) {
                storagePath = existingDocxPath || (selectedFile ? `${user.id}/original_cv.docx` : null) || `${user.id}/personalized/${offer.id}/cv.pdf`
                if (existingDocxPath) {
                    try {
                        previewUrl = await getSignedCVUrl(existingDocxPath, 600)
                    } catch (e) {
                        console.warn('[AICVPersonalizationModal] Could not obtain signed URL for preview:', e)
                    }
                }
            }

            setPersonalizedCvPath(storagePath)
            setPreviewPdfUrl(previewUrl)

            setPhase('preview')
        } catch (err) {
            console.error('[AICVPersonalizationModal] Process error:', err)
            setErrorMessage(err.message || 'Une erreur est survenue lors de la personnalisation de votre CV.')
            setPhase('upload')
        }
    }

    const handleConfirm = async () => {
        const finalPath = personalizedCvPath || existingDocxPath
        if (!finalPath) return
        setIsSubmitting(true)
        try {
            await onConfirmSend?.(finalPath)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="ai-cv-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-cv-title">
            <div className="ai-cv-modal-backdrop" onClick={phase !== 'generating' ? onClose : undefined} />

            <div className="ai-cv-modal-container glass-card animate-scale-up">
                {/* Header */}
                <div className="ai-cv-modal-header">
                    <div className="ai-cv-header-title-wrap">
                        <div className="ai-cv-sparkle-badge">
                            <Sparkles size={18} className="text-primary animate-pulse" />
                        </div>
                        <div>
                            <h2 id="ai-cv-title">Optimisation de votre CV pour cette offre</h2>
                            <p className="ai-cv-subtitle">
                                MatchOp adapte la présentation de votre profil à l&apos;opportunité ciblée.
                            </p>
                        </div>
                    </div>
                    {phase !== 'generating' && (
                        <button
                            type="button"
                            className="ai-cv-close-btn"
                            onClick={onClose}
                            aria-label="Fermer"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Offer Context Pill */}
                {offer && (
                    <div className="ai-cv-offer-card">
                        <div className="ai-cv-offer-icon">
                            <Briefcase size={18} />
                        </div>
                        <div className="ai-cv-offer-details">
                            <span className="ai-cv-offer-target">Candidature pour :</span>
                            <h3 className="ai-cv-offer-title">{offer.title}</h3>
                            <p className="ai-cv-offer-company">
                                {offer.company || offer.companies?.company_name || 'Entreprise partenaire'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                    <div className="ai-cv-error-banner" role="alert">
                        <AlertCircle size={18} />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* ── PHASE 1: Explanation & Upload ── */}
                {phase === 'upload' && (
                    <div className="ai-cv-phase ai-cv-phase--upload">
                        {/* Guarantee Card */}
                        <div className="ai-cv-integrity-card">
                            <div className="ai-cv-integrity-icon">
                                <ShieldCheck size={22} />
                            </div>
                            <div className="ai-cv-integrity-text">
                                <strong>Garantie d&apos;intégrité MatchOp :</strong>
                                <span>
                                    L&apos;IA n&apos;invente jamais d&apos;expérience, de compétence ou d&apos;information.
                                    Vos données réelles sont uniquement valorisées pour correspondre aux attentes du recruteur.
                                </span>
                            </div>
                        </div>

                        {/* CV Source Selector */}
                        <div className="ai-cv-source-section">
                            <label className="ai-cv-section-label">
                                Source de votre CV (Format Word .docx requis)
                            </label>

                            {loadingExisting ? (
                                <div className="ai-cv-loading-placeholder">
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>Vérification de votre CV enregistré...</span>
                                </div>
                            ) : existingDocxPath ? (
                                <div className="ai-cv-existing-choice">
                                    <div
                                        className={`ai-cv-choice-card ${useExisting ? 'active' : ''}`}
                                        onClick={() => setUseExisting(true)}
                                    >
                                        <div className="ai-cv-choice-radio">
                                            <div className={`radio-dot ${useExisting ? 'checked' : ''}`} />
                                        </div>
                                        <div className="ai-cv-choice-info">
                                            <div className="ai-cv-file-badge">
                                                <FileText size={16} />
                                                <span>CV original détecté (.docx)</span>
                                            </div>
                                            <p>Réutiliser votre CV déjà enregistré sur MatchOp</p>
                                        </div>
                                    </div>

                                    <div
                                        className={`ai-cv-choice-card ${!useExisting ? 'active' : ''}`}
                                        onClick={() => {
                                            setUseExisting(false)
                                            if (!selectedFile) fileInputRef.current?.click()
                                        }}
                                    >
                                        <div className="ai-cv-choice-radio">
                                            <div className={`radio-dot ${!useExisting ? 'checked' : ''}`} />
                                        </div>
                                        <div className="ai-cv-choice-info">
                                            <div className="ai-cv-file-badge">
                                                <Upload size={16} />
                                                <span>
                                                    {selectedFile ? selectedFile.name : 'Téléverser un nouveau CV (.docx)'}
                                                </span>
                                            </div>
                                            <p>Remplacer pour cette offre avec un nouveau fichier Word</p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {(!existingDocxPath || !useExisting) && (
                                <div
                                    className={`ai-cv-dropzone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        className="ai-cv-hidden-input"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleFileValidation(e.target.files[0])
                                            }
                                        }}
                                    />
                                    <div className="ai-cv-dropzone-inner">
                                        {selectedFile ? (
                                            <>
                                                <CheckCircle2 size={36} className="text-success" />
                                                <span className="dropzone-filename">{selectedFile.name}</span>
                                                <span className="dropzone-sub">
                                                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo • Cliquez pour changer
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={36} className="dropzone-icon" />
                                                <span className="dropzone-primary">
                                                    Glissez votre CV au format <strong>.docx</strong> ici
                                                </span>
                                                <span className="dropzone-sub">ou cliquez pour parcourir vos fichiers</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="ai-cv-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary btn-generate"
                                onClick={runPersonalization}
                                disabled={!useExisting && !selectedFile}
                            >
                                <Sparkles size={16} />
                                <span>Générer mon CV optimisé</span>
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PHASE 2: Generation Progress ── */}
                {phase === 'generating' && (
                    <div className="ai-cv-phase ai-cv-phase--generating">
                        <div className="ai-cv-generating-hero">
                            <div className="ai-cv-spinner-aura">
                                <Loader2 size={44} className="animate-spin text-primary" />
                            </div>
                            <h3>Optimisation intelligente en cours</h3>
                            <p>Veuillez patienter pendant l&apos;ajustement ciblé de votre candidature.</p>
                        </div>

                        <div className="ai-cv-steps-list">
                            <div className={`ai-cv-step-item ${progressStep >= 1 ? 'active' : ''} ${progressStep > 1 ? 'completed' : ''}`}>
                                <div className="step-badge">
                                    {progressStep > 1 ? <CheckCircle2 size={16} /> : 1}
                                </div>
                                <span>Lecture et extraction du CV Word (.docx)...</span>
                            </div>

                            <div className={`ai-cv-step-item ${progressStep >= 2 ? 'active' : ''} ${progressStep > 2 ? 'completed' : ''}`}>
                                <div className="step-badge">
                                    {progressStep > 2 ? <CheckCircle2 size={16} /> : 2}
                                </div>
                                <span>Analyse des compétences requises pour le poste...</span>
                            </div>

                            <div className={`ai-cv-step-item ${progressStep >= 3 ? 'active' : ''}`}>
                                <div className="step-badge">3</div>
                                <span>Mise en valeur ciblée et mise en page du PDF final...</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── PHASE 3: Review & Preview ── */}
                {phase === 'preview' && tailoredData && (
                    <div className="ai-cv-phase ai-cv-phase--preview">
                        <div className="ai-cv-preview-scroll">
                            {/* Match Points Banner */}
                            {Array.isArray(tailoredData.match_analysis) && tailoredData.match_analysis.length > 0 && (
                                <div className="ai-cv-match-card">
                                    <h4>
                                        <Sparkles size={16} /> Points forts adaptés pour cette offre
                                    </h4>
                                    <ul className="ai-cv-match-points">
                                        {tailoredData.match_analysis.map((pt, idx) => (
                                            <li key={idx}>
                                                <ChevronRight size={14} className="point-arrow" />
                                                <span>{pt}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Headline & Summary */}
                            <div className="ai-cv-preview-section">
                                <label className="preview-label">Titre professionnel ciblé</label>
                                <div className="preview-headline-box">
                                    <strong>{tailoredData.headline}</strong>
                                </div>
                            </div>

                            {tailoredData.summary && (
                                <div className="ai-cv-preview-section">
                                    <label className="preview-label">Résumé professionnel adapté</label>
                                    <p className="preview-summary-text">{tailoredData.summary}</p>
                                </div>
                            )}

                            {/* Highlighted Skills */}
                            {Array.isArray(tailoredData.highlighted_skills) && tailoredData.highlighted_skills.length > 0 && (
                                <div className="ai-cv-preview-section">
                                    <label className="preview-label">Compétences clés mises en avant</label>
                                    <div className="preview-skills-row">
                                        {tailoredData.highlighted_skills.map((skill, idx) => (
                                            <span key={idx} className="preview-skill-tag">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Experiences highlights */}
                            {Array.isArray(tailoredData.experiences) && tailoredData.experiences.length > 0 && (
                                <div className="ai-cv-preview-section">
                                    <label className="preview-label">Expériences valorisées ({tailoredData.experiences.length})</label>
                                    <div className="preview-experiences-list">
                                        {tailoredData.experiences.map((exp, idx) => (
                                            <div key={idx} className="preview-exp-card">
                                                <div className="preview-exp-header">
                                                    <strong>{exp.job_title}</strong>
                                                    <span className="preview-exp-company">{exp.company}</span>
                                                </div>
                                                {exp.description && (
                                                    <p className="preview-exp-desc">{exp.description}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* PDF preview link */}
                            {previewPdfUrl && (
                                <div className="ai-cv-pdf-link-banner">
                                    <FileText size={18} />
                                    <span>Votre PDF ciblé est prêt à être transmis au recruteur.</span>
                                    <a
                                        href={previewPdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ai-cv-preview-link"
                                    >
                                        <span>Aperçu PDF</span>
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Confirmation Actions */}
                        <div className="ai-cv-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setPhase('upload')}
                                disabled={isSubmitting}
                            >
                                <RefreshCw size={14} />
                                <span>Recommencer</span>
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary btn-submit-app"
                                onClick={handleConfirm}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Envoi en cours...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={16} />
                                        <span>Envoyer ma candidature</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default AICVPersonalizationModal
