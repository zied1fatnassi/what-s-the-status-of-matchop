import { useEffect, useState } from 'react'
import { X, AlertTriangle, CheckCircle } from 'lucide-react'
import { useReporting } from '../hooks/useReporting'
import { lockOverlayScroll, unlockOverlayScroll } from '../lib/overlayLock'
import './ReportModal.css'

/**
 * Modal for reporting users (spam, fake profiles, harassment)
 */
function ReportModal({ reportedUser, onClose }) {
    const [reason, setReason] = useState('')
    const [details, setDetails] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const { reportUser, isReporting } = useReporting()

    const reasons = [
        { value: 'spam', label: 'Spam or Unwanted Messages', description: 'Sending unsolicited or repetitive messages' },
        { value: 'fake_profile', label: 'Fake Profile or Impersonation', description: 'Pretending to be someone else or using fake information' },
        { value: 'harassment', label: 'Harassment or Bullying', description: 'Threatening, abusive, or offensive behavior' },
        { value: 'inappropriate_content', label: 'Inappropriate Content', description: 'Sharing explicit, violent, or offensive content' },
        { value: 'other', label: 'Other', description: 'Any other concern not listed above' }
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
            alert(`Failed to submit report: ${result.error}`)
        }
    }

    if (submitted) {
        return (
            <div className="report-modal-overlay" onClick={onClose}>
                <div className="report-modal-dialog report-modal" onClick={e => e.stopPropagation()}>
                    <div className="report-success">
                        <CheckCircle size={64} className="success-icon" />
                        <h2>Report Submitted</h2>
                        <p>Thank you for helping keep MatchOp safe. Our team will review this report.</p>
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
                        <h2>Report {reportedUser.name}</h2>
                    </div>
                    <button onClick={onClose} className="report-modal-close-btn" aria-label="Close">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="report-form">
                    <div className="report-form-group">
                        <label>Why are you reporting this user?</label>
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
                        <label htmlFor="details">Additional Details (Optional)</label>
                        <textarea
                            id="details"
                            value={details}
                            onChange={e => setDetails(e.target.value)}
                            placeholder="Provide any additional context that might help our review..."
                            rows={4}
                            maxLength={500}
                        />
                        <small className="char-count">{details.length}/500 characters</small>
                    </div>

                    <div className="report-disclaimer">
                        <p>
                            <strong>Note:</strong> False reports may result in action against your account.
                            All reports are reviewed by our moderation team.
                        </p>
                    </div>

                    <div className="report-modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                            disabled={isReporting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-danger"
                            disabled={isReporting || !reason}
                        >
                            {isReporting ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ReportModal
