import { useEffect } from 'react'
import { X, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { lockOverlayScroll, unlockOverlayScroll } from '../lib/overlayLock'
import { useBilingualText } from '../lib/useBilingualText'
import './MatchToast.css'

/**
 * Toast notification for new matches
 * Shows when a mutual match is detected in real-time
 */
function MatchToast({ match, onClose }) {
    const tr = useBilingualText()

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        lockOverlayScroll()
        document.addEventListener('keydown', handleEsc)

        // Auto-dismiss after 8 seconds
        const timer = setTimeout(onClose, 8000)
        return () => {
            clearTimeout(timer)
            unlockOverlayScroll()
            document.removeEventListener('keydown', handleEsc)
        }
    }, [onClose])

    if (!match) return null

    return (
        <div className="match-toast-overlay" onClick={onClose}>
            <div className="match-toast animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <button className="toast-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="toast-icon">
                    <Heart size={48} className="heart-pulse" />
                </div>

                <h2 className="toast-title">{tr("It's a Match!", 'Match reussi !')}</h2>

                <div className="toast-company">
                    {match.companyLogo ? (
                        <img
                            src={match.companyLogo}
                            alt={match.companyName}
                            className="toast-logo"
                        />
                    ) : (
                        <div className="toast-logo-placeholder">
                            {match.companyName.charAt(0)}
                        </div>
                    )}
                    <div className="toast-info">
                        <h3>{match.companyName}</h3>
                        <p>{match.offerTitle}</p>
                    </div>
                </div>

                <p className="toast-message">
                    {tr(
                        'You both swiped right! Start chatting now.',
                        'Vous avez tous les deux swipe a droite ! Commencez la conversation.'
                    )}
                </p>

                <div className="toast-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        {tr('Keep Swiping', 'Continuer a swiper')}
                    </button>
                    <Link
                        to={`/student/chat/${match.id}`}
                        className="btn btn-primary"
                    >
                        {tr('Send Message', 'Envoyer un message')}
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default MatchToast
