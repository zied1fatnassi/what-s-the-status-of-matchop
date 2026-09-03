import { useEffect, useState } from 'react'
import { X, MapPin, DollarSign, Clock, Building2, Briefcase, Flag } from 'lucide-react'
import ReportModal from './ReportModal'
import { lockOverlayScroll, unlockOverlayScroll } from '../lib/overlayLock'
import { useBilingualText } from '../lib/useBilingualText'
import './OfferDetailModal.css'

/**
 * Modal showing full job offer details when clicking on a swipe card
 */
function OfferDetailModal({ offer, onClose, onApply }) {
    const tr = useBilingualText()
    const [showReport, setShowReport] = useState(false)

    useEffect(() => {
        if (!offer) return undefined

        const handleEsc = (event) => {
            if (event.key === 'Escape') onClose()
        }

        lockOverlayScroll()
        document.addEventListener('keydown', handleEsc)
        return () => {
            unlockOverlayScroll()
            document.removeEventListener('keydown', handleEsc)
        }
    }, [offer, onClose])

    if (!offer) return null

    // Extract company info for reporting
    const companyProfile = {
        id: offer.company_id,
        name: offer.company || offer.companies?.company_name,
        type: 'company'
    }

    return (
        <div className="offer-modal-overlay" onClick={onClose}>
            <div className="offer-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={24} />
                </button>

                {/* Header */}
                <div className="offer-modal-header">
                    <div className="company-logo">
                        {offer.logo ? (
                            <img src={offer.logo} alt={offer.company} />
                        ) : (
                            <span>{offer.company?.charAt(0) || 'C'}</span>
                        )}
                    </div>
                    <div className="company-info">
                        <h3 className="company-name">{offer.company}</h3>
                        <span className="offer-type-badge">{offer.type}</span>
                    </div>
                </div>

                {/* Title */}
                <h2 className="offer-title">{offer.title}</h2>

                {/* Quick Info */}
                <div className="offer-quick-info">
                    <div className="info-item">
                        <MapPin size={18} />
                        <span>{offer.location}</span>
                    </div>
                    <div className="info-item">
                        <Building2 size={18} />
                        <span>{offer.department || tr('General', 'General')}</span>
                    </div>
                    <div className="info-item">
                        <DollarSign size={18} />
                        <span>{offer.salary}</span>
                    </div>
                    <div className="info-item">
                        <Clock size={18} />
                        <span>{offer.duration}</span>
                    </div>
                </div>

                {/* Description */}
                <div className="offer-section">
                    <h4>{tr('About the Role', 'A propos du poste')}</h4>
                    <p>{offer.description}</p>
                </div>

                {/* Requirements */}
                {offer.requirements && (
                    <div className="offer-section">
                        <h4>{tr('Requirements', 'Exigences')}</h4>
                        <p>{offer.requirements}</p>
                    </div>
                )}

                {/* Skills */}
                <div className="offer-section">
                    <h4>{tr('Required Skills', 'Competences requises')}</h4>
                    <div className="offer-skills">
                        {offer.skills?.map((skill, i) => (
                            <span key={i} className="skill-tag">{skill}</span>
                        ))}
                    </div>
                </div>

                {/* About Company */}
                <div className="offer-section">
                    <h4>{tr(`About ${offer.company}`, `A propos de ${offer.company}`)}</h4>
                    <p>{offer.companyDescription || tr(
                        'A leading company in the industry, committed to innovation and growth.',
                        "Une entreprise leader dans son secteur, engagee pour l'innovation et la croissance."
                    )}</p>
                </div>

                {/* Actions */}
                <div className="offer-modal-actions">
                    <button
                        className="btn btn-text report-btn"
                        onClick={() => setShowReport(true)}
                        title={tr('Report this job posting', 'Signaler cette offre')}
                    >
                        <Flag size={18} />
                        {tr('Report', 'Signaler')}
                    </button>
                    <div className="action-buttons">
                        <button className="btn btn-secondary" onClick={onClose}>
                            {tr('Close', 'Fermer')}
                        </button>

                        {offer.isExternal ? (
                            <a
                                href={offer.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                onClick={() => {
                                    onApply?.(offer)
                                }}
                            >
                                <Briefcase size={18} />
                                {tr('Visit Website', 'Visiter le site')}
                            </a>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                    onApply?.(offer)
                                    onClose()
                                }}
                            >
                                <Briefcase size={18} />
                                {tr('Apply Now', 'Postuler maintenant')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Report Modal */}
                {showReport && (
                    <ReportModal
                        reportedUser={companyProfile}
                        onClose={() => setShowReport(false)}
                    />
                )}
            </div>
        </div>
    )
}

export default OfferDetailModal
