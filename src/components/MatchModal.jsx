import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, X, Calendar, Video, Mail, Clock, CheckCircle } from 'lucide-react'
import { lockOverlayScroll, unlockOverlayScroll } from '../lib/overlayLock'
import { useBilingualText } from '../lib/useBilingualText'
import './MatchModal.css'

function MatchModal({ match, onClose, userType }) {
    const tr = useBilingualText()
    const [isVisible, setIsVisible] = useState(false)
    const [confettiPieces, setConfettiPieces] = useState([])

    useEffect(() => {
        // Delay animation start
        const animationTimer = setTimeout(() => setIsVisible(true), 100)

        // Create confetti effect
        const colors = ['#2196f3', '#42a5f5', '#64b5f6', '#90caf9', '#1976d2']
        setConfettiPieces(
            Array.from({ length: 50 }, (_, index) => ({
                id: index,
                left: `${Math.random() * 100}%`,
                backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${Math.random() * 2 + 3}s`
            }))
        )

        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        lockOverlayScroll()
        document.addEventListener('keydown', handleEsc)

        return () => {
            clearTimeout(animationTimer)
            unlockOverlayScroll()
            document.removeEventListener('keydown', handleEsc)
        }
    }, [onClose])

    const chatLink = userType === 'student'
        ? `/student/chat/${match?.id}`
        : `/company/chat/${match?.id}`

    // Mock interview details (in production, this would come from the company)
    const interviewDetails = {
        contactPerson: 'HR Team',
        contactEmail: match?.email || `hr@${match?.company?.toLowerCase().replace(/\s+/g, '')}.com`,
        interviewType: tr('Video Call', 'Appel video'),
        responseTime: tr('Within 5 business days', 'Sous 5 jours ouvrables'),
        nextSteps: [
            tr('Our HR team will review your profile', 'Notre equipe RH examinera votre profil'),
            tr('You will receive an email with interview details', 'Vous recevrez un email avec les details'),
            tr('Prepare your portfolio and questions', 'Preparez votre portfolio et vos questions')
        ]
    }

    return (
        <div className={`match-modal-overlay ${isVisible ? 'visible' : ''}`}>
            {confettiPieces.map(piece => (
                <div
                    key={piece.id}
                    className="confetti"
                    style={{
                        left: piece.left,
                        backgroundColor: piece.backgroundColor,
                        animationDelay: piece.animationDelay,
                        animationDuration: piece.animationDuration
                    }}
                />
            ))}
            <div className="match-modal match-modal-expanded">
                <button className="close-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="match-content">
                    <div className="match-hearts">
                        <Heart className="heart heart-1" size={32} fill="#42a5f5" />
                        <Heart className="heart heart-2" size={48} fill="#42a5f5" />
                        <Heart className="heart heart-3" size={32} fill="#42a5f5" />
                    </div>

                    <h1 className="match-title">{tr("It's a Match!", 'Match reussi !')}</h1>
                    <p className="match-subtitle">
                        {userType === 'student'
                            ? tr(
                                `${match?.company} is interested in hiring you!`,
                                `${match?.company} est interessee par votre profil !`
                            )
                            : tr(
                                `${match?.name} is interested in your offer!`,
                                `${match?.name} est interesse(e) par votre offre !`
                            )
                        }
                    </p>

                    <div className="match-profiles">
                        <div className="match-avatar">
                            <div className="avatar-placeholder">{tr('You', 'Vous')}</div>
                        </div>
                        <div className="match-heart-connector">
                            <Heart size={32} fill="#42a5f5" color="#42a5f5" />
                        </div>
                        <div className="match-avatar">
                            <div className="avatar-placeholder">
                                {userType === 'student' ? match?.company?.charAt(0) : match?.name?.charAt(0)}
                            </div>
                        </div>
                    </div>

                    {/* Interview Details Section - Only for students */}
                    {userType === 'student' && (
                        <div className="interview-details">
                            <h3 className="interview-title">
                                <Calendar size={18} />
                                {tr("What's Next?", 'Et ensuite ?')}
                            </h3>

                            <div className="interview-info">
                                <div className="interview-item">
                                    <Video size={16} />
                                    <span><strong>{tr('Interview Type:', "Type d'entretien :")}</strong> {interviewDetails.interviewType}</span>
                                </div>
                                <div className="interview-item">
                                    <Clock size={16} />
                                    <span><strong>{tr('Response:', 'Reponse :')}</strong> {interviewDetails.responseTime}</span>
                                </div>
                                <div className="interview-item">
                                    <Mail size={16} />
                                    <span><strong>{tr('Contact:', 'Contact :')}</strong> {interviewDetails.contactEmail}</span>
                                </div>
                            </div>

                            <div className="next-steps">
                                <h4>{tr('Next Steps:', 'Prochaines etapes :')}</h4>
                                <ul>
                                    {interviewDetails.nextSteps.map((step, idx) => (
                                        <li key={idx}>
                                            <CheckCircle size={14} />
                                            {step}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="match-actions">
                        <Link to={chatLink} className="btn btn-primary btn-lg" onClick={onClose}>
                            <MessageCircle size={20} />
                            {tr('Send a Message', 'Envoyer un message')}
                        </Link>
                        <button className="btn btn-secondary" onClick={onClose}>
                            {tr('Keep Exploring', 'Continuer à explorer')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MatchModal
