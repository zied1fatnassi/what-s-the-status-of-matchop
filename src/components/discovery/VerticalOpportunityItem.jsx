import { useState, useMemo } from 'react'
import {
    MapPin,
    Briefcase,
    DollarSign,
    Clock,
    Sparkles,
    ExternalLink,
    Crown,
    EyeOff,
    Coins,
    RotateCcw,
    Info,
    X,
    ChevronDown,
    ChevronUp,
    Send
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import VerificationBadge from '../VerificationBadge'
import { useBilingualText } from '../../lib/useBilingualText'
import './VerticalOpportunityItem.css'

function VerticalOpportunityItem({
    offer,
    onApply,
    onIgnore,
    onUndo,
    canUndo = false,
    onViewDetails,
    dragProgress = 0, // 0 to 1 as user drags up toward threshold
    isDragging = false,
    isActive = true
}) {
    const { t } = useTranslation()
    const tr = useBilingualText()
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

    const matchPercent = offer?.matchScore ? Math.round(offer.matchScore * 100) : null
    const isExternal = offer?.isExternal === true
    const sourceWebsite = offer?.sourceWebsite || (isExternal ? tr('External', 'Externe') : null)

    // Dynamic brand color derived from company name or type for ambient backdrop
    const ambientGradient = useMemo(() => {
        const hash = (offer?.company || offer?.title || 'MatchOp').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        const hues = [217, 250, 190, 280, 200, 230]
        const selectedHue = hues[hash % hues.length]
        return `radial-gradient(circle at 50% 25%, hsla(${selectedHue}, 80%, 55%, 0.18) 0%, hsla(${selectedHue}, 70%, 40%, 0.05) 55%, transparent 80%)`
    }, [offer?.company, offer?.title])

    // Compute ignore button dynamic activation fill (0 to 100%)
    const ignoreFillPercent = Math.min(100, Math.max(0, Math.round(dragProgress * 100)))
    const isIgnoreActivated = dragProgress >= 0.85

    const toggleDescription = (e) => {
        e.stopPropagation()
        setIsDescriptionExpanded((prev) => !prev)
    }

    const handleApplyClick = (e) => {
        e.stopPropagation()
        if (isExternal && offer?.externalUrl) {
            window.open(offer.externalUrl, '_blank', 'noopener,noreferrer')
        }
        onApply?.(offer)
    }

    const handleIgnoreClick = (e) => {
        e.stopPropagation()
        onIgnore?.(offer)
    }

    const handleUndoClick = (e) => {
        e.stopPropagation()
        onUndo?.()
    }

    const handleDetailsClick = (e) => {
        e.stopPropagation()
        onViewDetails?.(offer)
    }

    if (!offer) return null

    return (
        <div className={`vertical-opportunity-item ${isActive ? 'is-active' : ''} ${isDragging ? 'is-dragging' : ''}`}>
            {/* Atmospheric Background Layer */}
            <div className="opportunity-atmosphere" aria-hidden="true">
                <div className="opportunity-atmosphere__ambient" style={{ background: ambientGradient }} />
                {offer.companyLogo ? (
                    <div
                        className="opportunity-atmosphere__logo-backdrop"
                        style={{ backgroundImage: `url(${offer.companyLogo})` }}
                    />
                ) : (
                    <div className="opportunity-atmosphere__fallback-mesh" />
                )}
                <div className="opportunity-atmosphere__overlay" />
                <div className="opportunity-atmosphere__vignette" />
            </div>

            {/* Gesture Ignore Feedback Overlay */}
            {dragProgress > 0.1 && (
                <div
                    className="opportunity-gesture-dismiss"
                    style={{ opacity: Math.min(1, dragProgress * 1.3) }}
                    aria-hidden="true"
                >
                    <div className={`opportunity-gesture-dismiss__badge ${isIgnoreActivated ? 'is-activated' : ''}`}>
                        <X size={24} />
                        <span>{tr('PASS OPPORTUNITY', 'IGNORER L’OFFRE')}</span>
                    </div>
                </div>
            )}

            {/* Main Content Container */}
            <div className="opportunity-viewport-content">
                {/* Header Metadata Cluster */}
                <div className="opportunity-header">
                    <div className="opportunity-header__badges">
                        {matchPercent && (
                            <div className="opportunity-badge badge-match">
                                <Sparkles size={13} className="badge-icon-sparkle" />
                                <span>{matchPercent}% {tr('Match', 'Compatibilité')}</span>
                            </div>
                        )}

                        {offer.is_exclusive && (
                            <div className="opportunity-badge badge-exclusive">
                                <Crown size={12} />
                                <span>{t('badges.exclusive', 'Exclusive')}</span>
                            </div>
                        )}

                        {offer.is_leak && (
                            <div className="opportunity-badge badge-leak">
                                <EyeOff size={12} />
                                <span>{t('badges.leak', 'Fast Track')}</span>
                            </div>
                        )}

                        {offer.bounty_value > 0 && (
                            <div className="opportunity-badge badge-bounty">
                                <Coins size={12} />
                                <span>
                                    {Number(offer.bounty_value).toLocaleString(undefined, {
                                        style: 'currency',
                                        currency: 'USD',
                                        maximumFractionDigits: 0
                                    })}
                                </span>
                            </div>
                        )}

                        {isExternal && (
                            <div className="opportunity-badge badge-external">
                                <ExternalLink size={12} />
                                <span>{tr('External', 'Externe')} · {sourceWebsite}</span>
                            </div>
                        )}
                    </div>

                    {/* Company identity card */}
                    <div className="opportunity-company-card">
                        <div className="opportunity-company-logo">
                            {offer.companyLogo ? (
                                <img
                                    src={offer.companyLogo}
                                    alt={offer.company || 'Company logo'}
                                    loading="eager"
                                />
                            ) : (
                                <span className="opportunity-company-initial">
                                    {offer.company?.charAt(0)?.toUpperCase() || 'C'}
                                </span>
                            )}
                        </div>

                        <div className="opportunity-company-details">
                            <div className="opportunity-company-title-row">
                                <h3 className="opportunity-company-name">{offer.company || tr('Confidential Company', 'Entreprise Confidentielle')}</h3>
                                <VerificationBadge
                                    verified={offer.companyVerified}
                                    verificationMethod={offer.companyVerificationMethod}
                                    size="xs"
                                />
                            </div>
                            <span className="opportunity-type-pill">
                                {offer.type || tr('Full-time', 'Temps plein')}
                            </span>
                        </div>

                        <button
                            type="button"
                            className="opportunity-info-btn"
                            onClick={handleDetailsClick}
                            aria-label={tr('View opportunity details', 'Voir les détails de l’offre')}
                            title={tr('View full details', 'Voir tous les détails')}
                        >
                            <Info size={18} />
                        </button>
                    </div>
                </div>

                {/* Opportunity Core Information */}
                <div className="opportunity-body">
                    <h1 className="opportunity-title">{offer.title}</h1>

                    {/* Quick Metadata Chips */}
                    <div className="opportunity-meta-chips">
                        <div className="meta-chip">
                            <MapPin size={15} />
                            <span>{offer.location || tr('Remote', 'À distance')}</span>
                        </div>

                        {offer.department && (
                            <div className="meta-chip">
                                <Briefcase size={15} />
                                <span>{offer.department}</span>
                            </div>
                        )}

                        <div className="meta-chip meta-chip--highlight">
                            <DollarSign size={15} />
                            <span>{offer.salary || tr('Competitive Salary', 'Rémunération compétitive')}</span>
                        </div>

                        {offer.duration && (
                            <div className="meta-chip">
                                <Clock size={15} />
                                <span>{offer.duration}</span>
                            </div>
                        )}
                    </div>

                    {/* Structured Description */}
                    <div className="opportunity-description-box">
                        <p className={`opportunity-description ${isDescriptionExpanded ? 'is-expanded' : ''}`}>
                            {offer.description || tr('Exciting role with direct impact on strategic projects.', 'Opportunité passionnante avec impact direct sur des projets stratégiques.')}
                        </p>

                        {(offer.description && offer.description.length > 140) && (
                            <button
                                type="button"
                                className="opportunity-expand-toggle"
                                onClick={toggleDescription}
                                aria-expanded={isDescriptionExpanded}
                            >
                                <span>{isDescriptionExpanded ? tr('Show less', 'Afficher moins') : tr('Read more', 'Lire la suite')}</span>
                                {isDescriptionExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                        )}
                    </div>

                    {/* Key Skills */}
                    {offer.skills && offer.skills.length > 0 && (
                        <div className="opportunity-skills-cluster" aria-label="Required skills">
                            {offer.skills.slice(0, 5).map((skill, index) => (
                                <span key={index} className="opportunity-skill-pill">
                                    {skill}
                                </span>
                            ))}
                            {offer.skills.length > 5 && (
                                <span className="opportunity-skill-pill more">
                                    +{offer.skills.length - 5}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Primary Interaction Bar */}
                <div className="opportunity-actions-bar">
                    {/* Secondary Undo Control */}
                    <button
                        type="button"
                        className="action-btn undo action-btn-undo"
                        onClick={handleUndoClick}
                        disabled={!canUndo}
                        aria-label={tr('Previous opportunity', 'Opportunité précédente')}
                        title={tr('Go back to previous', 'Revenir en arrière')}
                    >
                        <RotateCcw size={20} />
                    </button>

                    {/* Primary IGNORE Action (reacts dynamically to vertical drag progress) */}
                    <button
                        type="button"
                        className={`action-btn pass action-btn-ignore ${isIgnoreActivated ? 'is-active-fill' : ''}`}
                        onClick={handleIgnoreClick}
                        aria-label={tr('Ignore opportunity', 'Ignorer l’opportunité')}
                        style={{
                            '--ignore-fill-percent': `${ignoreFillPercent}%`
                        }}
                    >
                        <span className="action-btn-ignore__fill" style={{ height: `${ignoreFillPercent}%` }} />
                        <span className="action-btn-ignore__content">
                            <X size={26} className="action-icon" />
                            <span className="action-label">{tr('IGNORE', 'IGNORER')}</span>
                        </span>
                    </button>

                    {/* Primary APPLY Action */}
                    <button
                        type="button"
                        className={`action-btn like action-btn-apply ${isExternal ? 'action-btn-apply--external' : ''}`}
                        onClick={handleApplyClick}
                        aria-label={isExternal ? tr('Apply on external site', 'Postuler sur le site externe') : tr('Apply for this job', 'Postuler à cette offre')}
                    >
                        <span className="action-btn-apply__content">
                            {isExternal ? (
                                <>
                                    <ExternalLink size={24} className="action-icon" />
                                    <span className="action-label">
                                        {tr('APPLY', 'POSTULER')}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Send size={24} className="action-icon" />
                                    <span className="action-label">{tr('APPLY', 'POSTULER')}</span>
                                </>
                            )}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default VerticalOpportunityItem
