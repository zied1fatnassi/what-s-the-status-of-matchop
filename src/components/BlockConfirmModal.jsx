import { useEffect } from 'react'
import { UserX, AlertTriangle } from 'lucide-react'
import { lockOverlayScroll, unlockOverlayScroll } from '../lib/overlayLock'
import './ReportModal.css'

/**
 * Confirmation modal for blocking users
 */
function BlockConfirmModal({ user, onConfirm, onCancel, isBlocking }) {
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') onCancel()
        }

        lockOverlayScroll()
        document.addEventListener('keydown', handleEsc)
        return () => {
            unlockOverlayScroll()
            document.removeEventListener('keydown', handleEsc)
        }
    }, [onCancel])

    return (
        <div className="report-modal-overlay" onClick={onCancel}>
            <div className="report-modal-dialog block-confirm-modal" onClick={e => e.stopPropagation()}>
                <div className="report-modal-header">
                    <div className="report-modal-header-content">
                        <UserX size={24} className="warning-icon" />
                        <h2>Block {user.name}?</h2>
                    </div>
                </div>

                <div className="block-warning">
                    <AlertTriangle size={20} />
                    <div>
                        <p><strong>Blocking this user will:</strong></p>
                        <ul>
                            <li>Remove them from your swipe deck</li>
                            <li>Hide all existing matches with them</li>
                            <li>Prevent them from seeing your profile</li>
                            <li>Stop all message notifications</li>
                        </ul>
                        <p className="note">You can unblock them anytime from your settings.</p>
                    </div>
                </div>

                <div className="report-modal-actions">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn btn-secondary"
                        disabled={isBlocking}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="btn btn-danger"
                        disabled={isBlocking}
                    >
                        <UserX size={18} />
                        {isBlocking ? 'Blocking...' : 'Block User'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default BlockConfirmModal
