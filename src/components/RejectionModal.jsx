import { useState } from 'react'
import { X, Send, AlertTriangle } from 'lucide-react'
import './RejectionModal.css'

const DEFAULT_REJECTION_MESSAGE = "Bonjour, merci pour l'intérêt que vous portez à notre entreprise. Malheureusement, nous ne pouvons donner une suite favorable à votre candidature pour ce poste. Nous vous souhaitons beaucoup de succès dans vos futures opportunités."

export function RejectionModal({
    isOpen,
    candidateName,
    onClose,
    onConfirm,
    isSubmitting = false
}) {
    const [message, setMessage] = useState(DEFAULT_REJECTION_MESSAGE)

    if (!isOpen) return null

    const handleConfirm = () => {
        onConfirm(message.trim() || DEFAULT_REJECTION_MESSAGE)
    }

    return (
        <div className="rejection-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="rejection-title">
            <div className="rejection-modal-backdrop" onClick={!isSubmitting ? onClose : undefined} />
            <div className="rejection-modal-card glass-card animate-scale-up">
                <div className="rejection-modal-header">
                    <div className="rejection-modal-icon-wrap">
                        <AlertTriangle size={22} className="text-warning" />
                    </div>
                    <div className="rejection-modal-title-wrap">
                        <h2 id="rejection-title">Rejeter la candidature</h2>
                        <p className="rejection-modal-subtitle">
                            {candidateName ? `Candidat : ${candidateName}` : 'Notification de refus'}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="rejection-modal-close"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="Fermer"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="rejection-modal-body">
                    <p className="rejection-modal-desc">
                        Un message d'information bienveillant sera envoyé au candidat avant de déplacer sa candidature dans vos archives :
                    </p>

                    <label htmlFor="rejection-msg-input" className="rejection-modal-label">
                        Message envoyé au candidat :
                    </label>
                    <textarea
                        id="rejection-msg-input"
                        className="rejection-modal-textarea"
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="Écrivez le message de refus..."
                    />

                    <div className="rejection-modal-note">
                        ℹ️ Le candidat sera archivé et pourra être récupéré à tout moment depuis la section <strong>Archives</strong>.
                    </div>
                </div>

                <div className="rejection-modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                    >
                        <Send size={16} />
                        <span>{isSubmitting ? 'Envoi en cours...' : 'Envoyer & Rejeter'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
