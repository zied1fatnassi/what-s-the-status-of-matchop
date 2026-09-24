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
    const [existingCvPath, setExistingCvPath] = useState(null)
    const [detectedSource, setDetectedSource] = useState('saved_docx') // 'saved_docx' | 'profile_data'
    const [useExisting, setUseExisting] = useState(true)
    const [showUploadZone, setShowUploadZone] = useState(false)
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

    // Check student's registered CV (docx or other) and profile data
    useEffect(() => {
        if (!isOpen || !user?.id) {
            setPhase('upload')
            setSelectedFile(null)
            setErrorMessage('')
            setTailoredData(null)
            setPersonalizedCvPath(null)
            setPreviewPdfUrl(null)
            setProgressStep(1)
            setShowUploadZone(false)
            return
        }

        let isMounted = true
        setLoadingExisting(true)

        supabase
            .from('students')
            .select('original_docx_url, cv_url')
            .eq('id', user.id)
            .maybeSingle()
            .then(({ data }) => {
                if (!isMounted) return
                const docxUrl = data?.original_docx_url || ''
                const cvUrl = data?.cv_url || ''

                if (docxUrl) {
                    setDetectedSource('saved_docx')
                    setExistingDocxPath(docxUrl)
                    setExistingCvPath(docxUrl)
                    setUseExisting(true)
                } else if (cvUrl && cvUrl.toLowerCase().endsWith('.docx')) {
                    setDetectedSource('saved_docx')
                    setExistingDocxPath(cvUrl)
                    setExistingCvPath(cvUrl)
                    setUseExisting(true)
                    // Update original_docx_url in background
                    supabase
                        .from('students')
                        .update({ original_docx_url: cvUrl })
                        .eq('id', user.id)
                        .then(() => {})
                        .catch(() => {})
                } else if (cvUrl) {
                    setDetectedSource('profile_data')
                    setExistingDocxPath(null)
                    setExistingCvPath(cvUrl)
                    setUseExisting(true)
                } else {
                    setDetectedSource('profile_data')
                    setExistingDocxPath(null)
                    setExistingCvPath(null)
                    setUseExisting(true)
                }
            })
            .catch(() => {
                if (isMounted) {
                    setDetectedSource('profile_data')
                    setExistingDocxPath(null)
                    setExistingCvPath(null)
                    setUseExisting(true)
                }
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
        setShowUploadZone(true)
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

    // Direct apply with existing CV without AI personalization step
    const handleDirectApply = () => {
        const directPath = existingCvPath || existingDocxPath
        if (directPath) {
            onConfirmSend?.(directPath)
        }
    }

    // Step 2 generation runner
    const runPersonalization = async () => {
        if (!user?.id || !offer?.id) return
        setErrorMessage('')
        setPhase('generating')
        setProgressStep(1)

        try {
            let extractedText = ''

            // 1. Read DOCX text or fallback to profile data
            if (selectedFile) {
                const arrayBuffer = await selectedFile.arrayBuffer()
                const { value } = await mammoth.extractRawText({ arrayBuffer })
                extractedText = value || ''

                // Save DOCX to storage and update student record with both original_docx_url and cv_url
                try {
                    const uploadedPath = await uploadStudentDocx(user.id, selectedFile)
                    await supabase
                        .from('students')
                        .update({
                            original_docx_url: uploadedPath,
                            cv_url: uploadedPath
                        })
                        .eq('id', user.id)
                    setExistingDocxPath(uploadedPath)
                    setExistingCvPath(uploadedPath)
                } catch (uploadErr) {
                    console.warn('[AICVPersonalizationModal] DOCX upload non-critical error:', uploadErr)
                }
            } else if (existingDocxPath && detectedSource === 'saved_docx') {
                try {
                    const signedUrl = await getSignedCVUrl(existingDocxPath, 600)
                    if (signedUrl) {
                        const response = await fetch(signedUrl)
                        if (response.ok) {
                            const arrayBuffer = await response.arrayBuffer()
                            const { value } = await mammoth.extractRawText({ arrayBuffer })
                            extractedText = value || ''
                        }
                    }
                } catch (readErr) {
                    console.warn('[AICVPersonalizationModal] Could not extract text from existing docx, will fallback to profile data:', readErr)
                    extractedText = ''
                }
            } else {
                // Profile data mode or PDF: do not run mammoth, pass empty string to let edge function use profile
                extractedText = ''
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

            // Fallback: If edge function wasn't available, use candidate's existing CV / DOCX path
            if (!storagePath) {
                storagePath = existingDocxPath || existingCvPath || (selectedFile ? `${user.id}/original_cv.docx` : null) || `${user.id}/personalized/${offer.id}/cv.pdf`
                const pathToPreview = existingCvPath || existingDocxPath
                if (pathToPreview) {
                    try {
                        previewUrl = await getSignedCVUrl(pathToPreview, 600)
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
        const finalPath = personalizedCvPath || existingDocxPath || existingCvPath
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

                        {/* CV Source Ready Card */}
                        <div className="ai-cv-source-section">
                            {loadingExisting ? (
                                <div className="ai-cv-loading-placeholder">
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>Vérification de votre profil et CV...</span>
                                </div>
                            ) : (
                                <>
                                    <div className="ai-cv-ready-card">
                                        <div className="ai-cv-ready-icon">
                                            <Sparkles size={20} />
                                        </div>
                                        <div className="ai-cv-ready-info">
                                            <div className="ai-cv-ready-title-row">
                                                <strong>
                                                    {existingDocxPath || existingCvPath
                                                        ? 'CV de votre profil prêt'
                                                        : 'Profil MatchOp synchronisé'}
                                                </strong>
                                                {existingDocxPath ? (
                                                    <span className="ai-cv-badge ai-cv-badge--docx">
                                                        <FileText size={13} /> CV original détecté (.docx)
                                                    </span>
                                                ) : existingCvPath ? (
                                                    <span className="ai-cv-badge ai-cv-badge--pdf">
                                                        <FileText size={13} /> CV profil (.pdf)
                                                    </span>
                                                ) : (
                                                    <span className="ai-cv-badge ai-cv-badge--profile">
                                                        <CheckCircle2 size={13} /> Profil MatchOp
                                                    </span>
                                                )}
                                            </div>
                                            <p className="ai-cv-ready-subtitle">
                                                L&apos;IA adaptera votre profil aux exigences de ce poste.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Selected File Banner */}
                                    {selectedFile && (
                                        <div className="ai-cv-selected-file-banner">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 size={16} className="text-success" />
                                                <span>Fichier Word de remplacement : <strong>{selectedFile.name}</strong></span>
                                            </div>
                                            <button
                                                type="button"
                                                className="ai-cv-clear-file-btn"
                                                onClick={() => {
                                                    setSelectedFile(null)
                                                    setUseExisting(true)
                                                    if (fileInputRef.current) fileInputRef.current.value = ''
                                                }}
                                                title="Annuler ce fichier"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Discreet Toggle */}
                                    <div className="ai-cv-replace-toggle-wrap">
                                        <button
                                            type="button"
                                            className="ai-cv-toggle-upload-btn"
                                            onClick={() => setShowUploadZone((prev) => !prev)}
                                        >
                                            {showUploadZone ? '✕ Masquer le téléversement' : 'Utiliser un autre fichier Word...'}
                                        </button>
                                    </div>

                                    {(showUploadZone || selectedFile) && (
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
                                                            Glissez un fichier CV au format <strong>.docx</strong> ici
                                                        </span>
                                                        <span className="dropzone-sub">ou cliquez pour parcourir vos fichiers</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
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
                            {(existingCvPath || existingDocxPath) && (
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-direct-apply"
                                    onClick={handleDirectApply}
                                    disabled={isSubmitting}
                                >
                                    <FileText size={16} />
                                    <span>Postuler avec mon CV actuel</span>
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn-primary btn-generate"
                                onClick={runPersonalization}
                                disabled={isSubmitting || (!useExisting && !selectedFile)}
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
                                <span>
                                    {selectedFile || (existingDocxPath && detectedSource === 'saved_docx')
                                        ? 'Lecture et extraction du CV Word (.docx)...'
                                        : 'Synchronisation et analyse de votre profil MatchOp...'}
                                </span>
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
