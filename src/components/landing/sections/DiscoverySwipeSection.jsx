import { useState } from 'react'
import { motion, useMotionValue, useTransform, useAnimation, useReducedMotion } from 'framer-motion'
import { Heart, X, Sparkles, MapPin, DollarSign, Clock, Info, RotateCcw, ShieldCheck, Crown, Coins } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TextReveal } from '../motion/TextReveal'
import { SectionReveal } from '../motion/SectionReveal'
import { useBilingualText } from '../../../lib/useBilingualText'

// Authentic mock opportunities for the landing experience
const DEMO_OFFERS = [
  {
    id: 'demo-1',
    title: 'Senior Frontend Architect',
    company: 'Veloce Labs',
    companyVerified: true,
    companyVerificationMethod: 'tax_id',
    type: 'Full-time',
    location: 'Tunis / Remote',
    salary: '$3,200 - $4,500 / mo',
    duration: 'Permanent',
    department: 'Engineering',
    matchScore: 0.97,
    is_exclusive: true,
    bounty_value: 500,
    skills: ['React', 'TypeScript', 'Next.js', 'GraphQL', 'TailwindCSS', 'Framer Motion'],
    description: 'Lead next-generation web platforms with high-scale architecture and modern UX patterns.',
  },
  {
    id: 'demo-2',
    title: 'AI Research & ML Engineer',
    company: 'Cortex Neural',
    companyVerified: true,
    companyVerificationMethod: 'domain',
    type: 'End-of-Studies Internship',
    location: 'Hybrid / Ariana',
    salary: '1,800 - 2,400 TND / mo',
    duration: '6 months',
    department: 'AI & Innovation',
    matchScore: 0.94,
    is_exclusive: false,
    bounty_value: 0,
    skills: ['Python', 'PyTorch', 'Vector DBs', 'FastAPI', 'LLMs', 'Docker'],
    description: 'Design and train custom embedding pipelines and retrieval-augmented reasoning engines.',
  },
  {
    id: 'demo-3',
    title: 'Product Designer (UI/UX)',
    company: 'FinTech Horizons',
    companyVerified: true,
    companyVerificationMethod: 'manual',
    type: 'Full-time',
    location: 'Remote',
    salary: '$2,800 - $3,600 / mo',
    duration: 'Permanent',
    department: 'Design & Product',
    matchScore: 0.91,
    is_exclusive: true,
    bounty_value: 300,
    skills: ['Figma', 'Design Systems', 'Prototyping', 'User Research', 'Web Design'],
    description: 'Craft intuitive mobile and web fintech experiences used by thousands of businesses daily.',
  },
]

export function DiscoverySwipeSection() {
  void motion
  const { t } = useTranslation()
  const tr = useBilingualText()
  const shouldReduceMotion = useReducedMotion()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [lastAction, setLastAction] = useState(null)
  const [selectedOfferForDetail, setSelectedOfferForDetail] = useState(null)

  const activeOffer = DEMO_OFFERS[currentIndex % DEMO_OFFERS.length]
  const nextOffer = DEMO_OFFERS[(currentIndex + 1) % DEMO_OFFERS.length]

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-18, 18])
  const opacity = useTransform(x, [-200, -140, 0, 140, 200], [0, 1, 1, 1, 0])
  const likeOpacity = useTransform(x, [0, 80], [0, 1])
  const passOpacity = useTransform(x, [0, -80], [0, 1])

  const controls = useAnimation()

  const handleSwipe = (direction) => {
    const animX = direction === 'right' ? 450 : -450
    setLastAction(direction === 'right' ? 'liked' : 'passed')

    controls
      .start({
        x: animX,
        opacity: 0,
        transition: shouldReduceMotion ? { duration: 0.05 } : { duration: 0.28, ease: 'easeOut' },
      })
      .then(() => {
        x.set(0)
        controls.set({ x: 0, opacity: 1 })
        setCurrentIndex((prev) => prev + 1)
        setTimeout(() => setLastAction(null), 1200)
      })
  }

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 100 || info.velocity.x > 400) {
      handleSwipe('right')
    } else if (info.offset.x < -100 || info.velocity.x < -400) {
      handleSwipe('left')
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 450, damping: 25 } })
    }
  }

  const resetStack = () => {
    setCurrentIndex(0)
    setLastAction(null)
    x.set(0)
    controls.set({ x: 0, opacity: 1 })
  }

  return (
    <section className="landing-swipe-demo" id="discovery-demo">
      <div className="container landing-swipe-demo__container">
        {/* Section Header */}
        <SectionReveal delay={0.1} yOffset={20} className="landing-section-header">
          <div className="landing-badge">
            <Sparkles size={14} className="landing-badge__icon" />
            <span className="landing-badge__text">
              {tr('Interactive Product Demo', 'Démonstration interactive')}
            </span>
          </div>

          <h2 className="landing-section-title">
            <TextReveal
              as="span"
              delay={0.2}
              serifWords={['Swipe', 'Discover', 'Intention', 'Accélérer']}
            >
              {tr(
                'Swipe. Discover. Accelerate.',
                'Swipez. Découvrez. Accélérez.'
              )}
            </TextReveal>
          </h2>

          <p className="landing-section-subtitle">
            {tr(
              'Test the actual MatchOp opportunity card experience. Drag right to express interest, drag left to pass, or tap for full role details.',
              'Testez l’expérience réelle des cartes MatchOp. Glissez à droite pour liker, à gauche pour passer, ou cliquez pour voir les détails.'
            )}
          </p>
        </SectionReveal>

        {/* Interactive Deck Simulation */}
        <SectionReveal delay={0.3} yOffset={30} className="landing-swipe-deck-wrapper">
          <div className="landing-swipe-stage">
            {/* Status Toast / Action Banner */}
            {lastAction && (
              <div className={`landing-swipe-toast ${lastAction === 'liked' ? 'is-like' : 'is-pass'}`}>
                {lastAction === 'liked' ? (
                  <>
                    <Heart size={16} fill="currentColor" />
                    <span>{tr('Interest Sent! Saved to Matches', 'Intérêt envoyé ! Ajouté aux sélections')}</span>
                  </>
                ) : (
                  <>
                    <X size={16} />
                    <span>{tr('Passed. Next opportunity loaded', 'Passé. Opportunité suivante chargée')}</span>
                  </>
                )}
              </div>
            )}

            {/* Background Card (Shadow / Preview of Next Card) */}
            <div className="demo-card-layer demo-card-layer--back" aria-hidden="true">
              <div className="demo-card-inner">
                <div className="demo-card-header">
                  <div className="demo-card-logo">
                    {nextOffer.company.charAt(0)}
                  </div>
                  <div>
                    <h3 className="demo-card-company">{nextOffer.company}</h3>
                    <span className="badge badge-primary">{nextOffer.type}</span>
                  </div>
                </div>
                <div className="demo-card-body">
                  <h4 className="demo-card-title">{nextOffer.title}</h4>
                  <p className="demo-card-desc">{nextOffer.description}</p>
                </div>
              </div>
            </div>

            {/* Top Interactive Motion Card */}
            <motion.div
              className="demo-card-layer demo-card-layer--top"
              style={{ x, rotate, opacity, cursor: 'grab' }}
              animate={controls}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              onDragEnd={handleDragEnd}
              whileTap={{ cursor: 'grabbing' }}
            >
              {/* Swipe Indicators */}
              <motion.div className="demo-swipe-indicator demo-swipe-indicator--like" style={{ opacity: likeOpacity }}>
                {tr('LIKE', "J'AIME")}
              </motion.div>
              <motion.div className="demo-swipe-indicator demo-swipe-indicator--pass" style={{ opacity: passOpacity }}>
                {tr('PASS', 'PASSER')}
              </motion.div>

              {/* View details prompt */}
              <button
                type="button"
                className="demo-card-detail-hint"
                onClick={() => setSelectedOfferForDetail(activeOffer)}
              >
                <Info size={13} />
                <span>{tr('Tap for full job specs', 'Détails du poste')}</span>
              </button>

              <div className="demo-card-inner">
                {/* Match percentage badge */}
                <div className="demo-card-score-badge">
                  <Sparkles size={13} />
                  <span>{Math.round(activeOffer.matchScore * 100)}% {tr('Match', 'Compatibilité')}</span>
                </div>

                {/* Badges row */}
                <div className="demo-card-badges">
                  {activeOffer.is_exclusive && (
                    <div className="partner-badge badge-exclusive">
                      <Crown size={12} />
                      <span>{t('badges.exclusive', 'Exclusive')}</span>
                    </div>
                  )}
                  {activeOffer.bounty_value > 0 && (
                    <div className="partner-badge badge-bounty">
                      <Coins size={12} />
                      <span>${activeOffer.bounty_value} {tr('Bonus', 'Prime')}</span>
                    </div>
                  )}
                </div>

                {/* Company header */}
                <div className="demo-card-header">
                  <div className="demo-card-logo">
                    {activeOffer.company.charAt(0)}
                  </div>
                  <div className="demo-card-info">
                    <h3 className="demo-card-company">
                      {activeOffer.company}
                      {activeOffer.companyVerified && (
                        <span className="verification-badge-chip" title="Verified Employer">
                          <ShieldCheck size={14} className="verification-badge-icon" />
                        </span>
                      )}
                    </h3>
                    <span className="badge badge-primary">{activeOffer.type}</span>
                  </div>
                </div>

                {/* Job Title & Details */}
                <div className="demo-card-body">
                  <h3 className="demo-card-title">{activeOffer.title}</h3>
                  <p className="demo-card-desc">{activeOffer.description}</p>

                  <div className="demo-card-meta-grid">
                    <div className="meta-item">
                      <MapPin size={15} />
                      <span>{activeOffer.location}</span>
                    </div>
                    <div className="meta-item">
                      <DollarSign size={15} />
                      <span>{activeOffer.salary}</span>
                    </div>
                    <div className="meta-item">
                      <Clock size={15} />
                      <span>{activeOffer.duration}</span>
                    </div>
                  </div>

                  {/* Skills Pills */}
                  <div className="demo-card-skills">
                    {activeOffer.skills.slice(0, 5).map((skill, idx) => (
                      <span key={idx} className="demo-skill-pill">{skill}</span>
                    ))}
                    {activeOffer.skills.length > 5 && (
                      <span className="demo-skill-pill more">+{activeOffer.skills.length - 5}</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Interactive Controls Bar */}
          <div className="landing-swipe-controls">
            <button
              type="button"
              className="swipe-action-btn swipe-action-btn--pass"
              onClick={() => handleSwipe('left')}
              aria-label="Pass offer"
            >
              <X size={24} />
            </button>

            <button
              type="button"
              className="swipe-action-btn swipe-action-btn--info"
              onClick={() => setSelectedOfferForDetail(activeOffer)}
              aria-label="View offer details"
            >
              <Info size={20} />
            </button>

            <button
              type="button"
              className="swipe-action-btn swipe-action-btn--reset"
              onClick={resetStack}
              aria-label="Reset stack"
              title="Reset stack"
            >
              <RotateCcw size={18} />
            </button>

            <button
              type="button"
              className="swipe-action-btn swipe-action-btn--like"
              onClick={() => handleSwipe('right')}
              aria-label="Like offer"
            >
              <Heart size={24} fill="currentColor" />
            </button>
          </div>
        </SectionReveal>

        {/* Modal for Job Specs Detail Preview */}
        {selectedOfferForDetail && (
          <div className="landing-detail-modal-overlay" onClick={() => setSelectedOfferForDetail(null)}>
            <div className="landing-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="landing-detail-modal__header">
                <div>
                  <span className="badge badge-primary">{selectedOfferForDetail.type}</span>
                  <h3 className="modal-job-title">{selectedOfferForDetail.title}</h3>
                  <p className="modal-job-company">{selectedOfferForDetail.company} • {selectedOfferForDetail.location}</p>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setSelectedOfferForDetail(null)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="landing-detail-modal__body">
                <div className="modal-section">
                  <h4>{tr('Role Overview', 'Aperçu du poste')}</h4>
                  <p>{selectedOfferForDetail.description}</p>
                </div>

                <div className="modal-section">
                  <h4>{tr('Compensation & Structure', 'Rémunération & Format')}</h4>
                  <div className="modal-meta-grid">
                    <div><strong>{tr('Compensation:', 'Rémunération :')}</strong> {selectedOfferForDetail.salary}</div>
                    <div><strong>{tr('Duration:', 'Durée :')}</strong> {selectedOfferForDetail.duration}</div>
                    <div><strong>{tr('Department:', 'Département :')}</strong> {selectedOfferForDetail.department}</div>
                  </div>
                </div>

                <div className="modal-section">
                  <h4>{tr('Required Competencies', 'Compétences requises')}</h4>
                  <div className="modal-skills-list">
                    {selectedOfferForDetail.skills.map((skill, idx) => (
                      <span key={idx} className="demo-skill-pill">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="landing-detail-modal__footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedOfferForDetail(null)
                    handleSwipe('right')
                  }}
                >
                  <Heart size={18} fill="currentColor" />
                  <span>{tr('Express Interest (Swipe Right)', 'Exprimer mon intérêt (Swiper à droite)')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default DiscoverySwipeSection
