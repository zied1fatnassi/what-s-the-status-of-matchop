import { forwardRef, useImperativeHandle } from 'react'
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion'
import { MapPin, Briefcase, DollarSign, Clock, Info, Sparkles, ExternalLink, Crown, EyeOff, Coins } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import VerificationBadge from './VerificationBadge'
import './SwipeCard.css'

/**
 * Framer Motion powered swipe card for job offers
 * Smooth gesture-based animations like Tinder
 */
const SwipeCard = forwardRef(function SwipeCard({ offer, onSwipe, onSwipeStart, isTop, onViewDetails }, ref) {
    void motion

    const x = useMotionValue(0)
    const rotate = useTransform(x, [-200, 200], [-25, 25]) // Slightly reduced rotation for stability
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])

    // Like/Pass indicator opacity
    const likeOpacity = useTransform(x, [0, 100], [0, 1])
    const passOpacity = useTransform(x, [0, -100], [0, 1])

    const controls = useAnimation() // Initialize animation controls

    // Expose triggerSwipe so parent buttons can play the same fly-off animation
    useImperativeHandle(ref, () => ({
        triggerSwipe(direction) {
            const animX = direction === 'left' ? -500 : 500
            onSwipeStart?.(direction, offer)
            // Drive the motion value so indicators + rotate react instantly
            x.set(animX * 0.3)
            // Wait for animation to finish before notifying parent (otherwise the
            // parent unmounts this card immediately, killing the animation)
            controls
                .start({ x: animX, opacity: 0, transition: { duration: 2 } })
                .then(() => onSwipe(direction, offer))
        }
    }))

    const handleDragEnd = (_, info) => {
        const threshold = 150 // Increased from 100 for precision
        const velocity = info.velocity.x

        if (info.offset.x > threshold || velocity > 500) {
            onSwipeStart?.('right', offer)
            controls
                .start({ x: 500, opacity: 0, transition: { duration: 2 } })
                .then(() => onSwipe('right', offer))
        } else if (info.offset.x < -threshold || velocity < -500) {
            onSwipeStart?.('left', offer)
            controls
                .start({ x: -500, opacity: 0, transition: { duration: 2 } })
                .then(() => onSwipe('left', offer))
        } else {
            // Satisfying snap back
            controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } })
        }
    }

    if (!isTop) {
        // Background cards (not interactive)
        return (
            <div className="swipe-card swipe-card-background">
                <CardContent offer={offer} />
            </div>
        )
    }

    return (
        <motion.div
            className="swipe-card swipe-card-top"
            style={{
                x,
                rotate,
                opacity,
                cursor: 'grab'
            }}
            animate={controls}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5} // Stiffer resistance (was 0.7)
            onDragEnd={handleDragEnd}
            onClick={() => {
                // Only trigger if not dragging
                if (Math.abs(x.get()) < 5) onViewDetails?.(offer)
            }}
            whileTap={{ cursor: 'grabbing' }}
        >
            {/* Swipe Indicators */}
            <motion.div
                className={`swipe-indicator like ${offer.isExternal ? 'apply' : ''}`}
                style={{ opacity: likeOpacity }}
            >
                {offer.isExternal ? 'APPLY' : 'LIKE'}
            </motion.div>
            <motion.div
                className="swipe-indicator pass"
                style={{ opacity: passOpacity }}
            >
                PASS
            </motion.div>

            {/* View Details Hint */}
            <div className="view-details-hint">
                <Info size={14} />
                <span>Tap for details</span>
            </div>

            <CardContent offer={offer} />
        </motion.div>
    )
})

// Reusable card content component
function CardContent({ offer }) {
    const { t } = useTranslation()
    const matchPercent = offer.matchScore ? Math.round(offer.matchScore * 100) : null

    return (
        <>
            {/* Match Score Badge */}
            {matchPercent && (
                <div className="match-score-badge">
                    <Sparkles size={14} />
                    <span>{matchPercent}% Match</span>
                </div>
            )}

            {/* Partner-Model Badges */}
            <div className="partner-badges">
                {offer.is_exclusive && (
                    <div className="partner-badge badge-exclusive">
                        <Crown size={12} />
                        <span>{t('badges.exclusive')}</span>
                    </div>
                )}
                {offer.is_leak && (
                    <div className="partner-badge badge-leak">
                        <EyeOff size={12} />
                        <span>{t('badges.leak')}</span>
                    </div>
                )}
                {offer.bounty_value > 0 && (
                    <div className="partner-badge badge-bounty">
                        <Coins size={12} />
                        <span>{Number(offer.bounty_value).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</span>
                    </div>
                )}
            </div>

            {/* External Source Badge */}
            {offer.isExternal && (
                <div className="external-source-badge">
                    <ExternalLink size={12} />
                    <span>{offer.sourceWebsite || 'External'}</span>
                </div>
            )}

            {/* Company Logo */}
            <div className="card-header">
                <div className="company-logo">
                    {offer.companyLogo ? (
                        <img src={offer.companyLogo} alt={offer.company} />
                    ) : (
                        <span>{offer.company?.charAt(0) || 'C'}</span>
                    )}
                </div>
                <div className="company-info">
                    <h3 className="company-name">
                        {offer.company}
                        <VerificationBadge
                            verified={offer.companyVerified}
                            verificationMethod={offer.companyVerificationMethod}
                            size="xs"
                        />
                    </h3>
                    <span className="badge badge-primary">{offer.type || 'Full-time'}</span>
                </div>
            </div>

            {/* Job Details */}
            <div className="card-body">
                <h2 className="job-title">{offer.title}</h2>
                <p className="job-description">{offer.description || 'No description available'}</p>

                <div className="job-details">
                    <div className="detail-item">
                        <MapPin size={16} />
                        <span>{offer.location || 'Remote'}</span>
                    </div>
                    {offer.department && (
                        <div className="detail-item">
                            <Briefcase size={16} />
                            <span>{offer.department}</span>
                        </div>
                    )}
                    <div className="detail-item">
                        <DollarSign size={16} />
                        <span>{offer.salary || 'Competitive'}</span>
                    </div>
                    {offer.duration && (
                        <div className="detail-item">
                            <Clock size={16} />
                            <span>{offer.duration}</span>
                        </div>
                    )}
                </div>

                {/* Skills */}
                {offer.skills && offer.skills.length > 0 && (
                    <div className="skills-list">
                        {offer.skills.slice(0, 6).map((skill, index) => (
                            <span key={index} className="skill-tag">{skill}</span>
                        ))}
                        {offer.skills.length > 6 && (
                            <span className="skill-tag more">+{offer.skills.length - 6}</span>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}

export default SwipeCard
