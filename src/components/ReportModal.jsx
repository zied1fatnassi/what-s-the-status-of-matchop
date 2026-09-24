import { useEffect, useState } from 'react'
import { X, AlertTriangle, CheckCircle } from 'lucide-react'
import { useReporting } from '../hooks/useReporting'
import { lockOverlayScroll, unlockOverlayScroll } from '../lib/overlayLock'
import { useBilingualText } from '../lib/useBilingualText'
import './ReportModal.css'

/**
 * Modal for reporting users (spam, fake profiles, harassment)
 */
function ReportModal({ reportedUser, onClose }) {
    const tr = useBilingualText()
    const [reason, setReason] = useState('')
    const [details, setDetails] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const { reportUser, isReporting } = useReporting()

    const reasons = [
        {
            value: 'spam',
            label: tr('Spam or Unwanted Messages', 'Spam ou messages non desires'),
            description: tr('Sending unsolicited or repetitive messages', 'Envoi de messages repetitifs ou non sollicites')
        },
        {
            value: 'fake_profile',
            label: tr('Fake Profile or Impersonation', 'Faux profil ou usurpation'),
            description: tr('Pretending to be someone else or using fake information', 'Pretendre etre quelqu un d autre ou utiliser de fausses infos')
        },
        {
            value: 'harassment',
            label: tr('Harassment or Bullying', 'Harcelement ou intimidation'),
            description: tr('Threatening, abusive, or offensive behavior', 'Comportement menacant, abusif ou offensant')
        },
        {
            value: 'inappropriate_content',
            label: tr('Inappropriate Content', 'Contenu inapproprie'),
            description: tr('Sharing explicit, violent, or offensive content', 'Partage de contenu explicite, violent ou offensant')
        },
        {
            value: 'other',
            label: tr('Other', 'Autre'),
            description: tr('Any other concern not listed above', 'Toute autre raison non listee')
        }
    ]

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') onClose()
        }

        lockOverlayScroll()
        document.addEventListener('keydown', handleEsc)
        return () => {
            unlockOverlayScroll()
            document.removeEventListener('keydown', handleEsc)
        }
    }, [onClose])

    const handleSubmit = async (e) => {
        e.preventDefault()

        const result = await reportUser(reportedUser.id, reason, details)

        if (result.success) {
            setSubmitted(true)
            setTimeout(() => onClose(), 2500)
        } else {
            alert(tr(`Failed to submit report: ${result.error}`, `Echec de soumission du signalement : ${result.error}`))
        }
    }

    if (submitted) {
        return (
            <div className="report-modal-overlay" onClick={onClose}>
                <div className="report-modal-dialog report-modal" onClick={e => e.stopPropagation()}>
                    <div className="report-success">
                        <CheckCircle size={64} className="success-icon" />
                        <h2>{tr('Report Submitted', 'Signalement envoye')}</h2>
                        <p>{tr(
                            'Thank you for helping keep MatchOp safe. Our team will review this report.',
                            "Merci de nous aider a garder MatchOp sur. Notre equipe examinera ce signalement."
                        )}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="report-modal-overlay" onClick={onClose}>
            <div className="report-modal-dialog report-modal" onClick={e => e.stopPropagation()}>
                <div className="report-modal-header">
                    <div className="report-modal-header-content">
                        <AlertTriangle size={24} className="warning-icon" />
                        <h2>{tr(`Report ${reportedUser.name}`, `Signaler ${reportedUser.name}`)}</h2>
                    </div>
                    <button onClick={onClose} className="report-modal-close-btn" aria-label={tr('Close', 'Fermer')}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="report-form">
                    <div className="report-form-group">
                        <label>{tr('Why are you reporting this user?', 'Pourquoi signalez-vous cet utilisateur ?')}</label>
                        <div className="reason-options">
                            {reasons.map(r => (
                                <label
                                    key={r.value}
                                    className={`reason-option ${reason === r.value ? 'selected' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={r.value}
                                        checked={reason === r.value}
                                        onChange={e => setReason(e.target.value)}
                                        required
                                    />
                                    <div className="reason-content">
                                        <span className="reason-label">{r.label}</span>
                                        <span className="reason-description">{r.description}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="report-form-group">
                        <label htmlFor="details">{tr('Additional Details (Optional)', 'Details supplementaires (optionnel)')}</label>
                        <textarea
                            id="details"
                            value={details}
                            onChange={e => setDetails(e.target.value)}
                            placeholder={tr(
                                'Provide any additional context that might help our review...',
                                "Ajoutez tout contexte supplementaire qui peut aider l'equipe."
                            )}
                            rows={4}
                            maxLength={500}
                        />
                        <small className="char-count">{details.length}/500 {tr('characters', 'caracteres')}</small>
                    </div>

                    <div className="report-disclaimer">
                        <p>
                            <strong>{tr('Note:', 'Note :')}</strong> {tr(
                                'False reports may result in action against your account. All reports are reviewed by our moderation team.',
                                'Les faux signalements peuvent entrainer des mesures sur votre compte. Tous les signalements sont verifies par la moderation.'
                            )}
                        </p>
                    </div>

                    <div className="report-modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                            disabled={isReporting}
                        >
                            {tr('Cancel', 'Annuler')}
                        </button>
                        <button
                            type="submit"
                            className="btn btn-danger"
                            disabled={isReporting || !reason}
                        >
                            {isReporting
                                ? tr('Submitting...', 'Envoi...')
                                : tr('Submit Report', 'Envoyer le signalement')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ReportModal
