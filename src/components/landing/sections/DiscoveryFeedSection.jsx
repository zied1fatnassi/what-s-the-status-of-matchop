import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Send,
  X,
  Sparkles,
  MapPin,
  DollarSign,
  Clock,
  Info,
  RotateCcw,
  ShieldCheck,
  Crown,
  Coins,
  ChevronUp,
  ChevronDown,
  Bookmark,
  Check,
  Mouse
} from 'lucide-react'

import { TextReveal } from '../motion/TextReveal'
import { SectionReveal } from '../motion/SectionReveal'
import { useBilingualText } from '../../../lib/useBilingualText'

// Authentic mock opportunities for the landing vertical feed scrolling simulation
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
    matchScore: 0.98,
    is_exclusive: true,
    bounty_value: 500,
    skills: ['React', 'TypeScript', 'Next.js', 'GraphQL', 'TailwindCSS', 'Framer Motion'],
    description: 'Architect next-generation web platforms with high-scale architecture, micro-frontends, and accessible motion design.',
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
    matchScore: 0.95,
    is_exclusive: false,
    bounty_value: 0,
    skills: ['Python', 'PyTorch', 'Vector DBs', 'FastAPI', 'LLMs', 'Docker'],
    description: 'Design and train custom embedding pipelines, semantic clustering models, and retrieval-augmented reasoning agents.',
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
    matchScore: 0.92,
    is_exclusive: true,
    bounty_value: 300,
    skills: ['Figma', 'Design Systems', 'Prototyping', 'User Research', 'Web Accessibility'],
    description: 'Craft high-converting mobile and web fintech experiences, interactive data dashboards, and cohesive multi-theme design systems.',
  },
  {
    id: 'demo-4',
    title: 'Full-Stack Cloud Engineer',
    company: 'CloudScale Systems',
    companyVerified: true,
    companyVerificationMethod: 'domain',
    type: 'Full-time',
    location: 'Tunis / Lac 2',
    salary: '$2,500 - $3,400 / mo',
    duration: 'Permanent',
    department: 'Infrastructure',
    matchScore: 0.89,
    is_exclusive: false,
    bounty_value: 0,
    skills: ['Node.js', 'PostgreSQL', 'Docker', 'AWS', 'Redis', 'Kubernetes'],
    description: 'Build reliable microservices and distributed background workers handling millions of synchronized API transactions daily.',
  },
  {
    id: 'demo-5',
    title: 'Security & Cryptography Fellow',
    company: 'CipherShield',
    companyVerified: true,
    companyVerificationMethod: 'tax_id',
    type: 'Summer Internship',
    location: 'Remote',
    salary: '1,500 - 2,000 TND / mo',
    duration: '3 months',
    department: 'Cybersecurity',
    matchScore: 0.87,
    is_exclusive: true,
    bounty_value: 250,
    skills: ['Rust', 'Applied Cryptography', 'Zero-Knowledge', 'Web3', 'Security Audits'],
    description: 'Audit cryptographic protocols, evaluate zero-knowledge proof verification, and implement secure key-custody modules.',
  }
]

export function DiscoveryFeedSection() {
  const tr = useBilingualText()

  const [activeIndex, setActiveIndex] = useState(0)
  const [appliedIds, setAppliedIds] = useState(new Set())
  const [savedIds, setSavedIds] = useState(new Set())
  const [toastMessage, setToastMessage] = useState(null)
  const [selectedOfferForDetail, setSelectedOfferForDetail] = useState(null)

  const scrollContainerRef = useRef(null)
  const totalOffers = DEMO_OFFERS.length

  // Toast notification helper with auto-hide
  const showToast = useCallback((msg, type = 'info') => {
    setToastMessage({ text: msg, type })
    setTimeout(() => setToastMessage(null), 2500)
  }, [])

  // Handle smooth scroll to specific opportunity index
  const scrollToIndex = useCallback((targetIndex) => {
    const clampedIndex = Math.max(0, Math.min(totalOffers - 1, targetIndex))
    const container = scrollContainerRef.current
    if (container) {
      const cardHeight = container.clientHeight
      container.scrollTo({
        top: clampedIndex * cardHeight,
        behavior: 'smooth'
      })
      setActiveIndex(clampedIndex)
    }
  }, [totalOffers])

  // Track active index based on scroll position in the feed
  const handleFeedScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const cardHeight = container.clientHeight
    if (cardHeight === 0) return
    const newIndex = Math.round(container.scrollTop / cardHeight)
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < totalOffers) {
      setActiveIndex(newIndex)
    }
  }, [activeIndex, totalOffers])

  // Apply & Express Interest action handler
  const handleApply = useCallback((offer) => {
    setAppliedIds((prev) => {
      const next = new Set(prev)
      next.add(offer.id)
      return next
    })
    showToast(
      tr(
        `Interest Expressed for ${offer.company}! Added to your Matches.`,
        `Intérêt exprimé pour ${offer.company} ! Ajouté à vos matchs.`
      ),
      'success'
    )
  }, [showToast, tr])

  // Save / Bookmark action handler
  const handleToggleSave = useCallback((offer) => {
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (next.has(offer.id)) {
        next.delete(offer.id)
        showToast(
          tr('Removed from saved opportunities', 'Retiré des offres sauvegardées'),
          'info'
        )
      } else {
        next.add(offer.id)
        showToast(
          tr(`Saved ${offer.title} to your tracker`, `Offre enregistrée dans votre suivi`),
          'info'
        )
      }
      return next
    })
  }, [showToast, tr])

  // Keyboard navigation when user interacts with section
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is in an input or modal is open
      if (selectedOfferForDetail) return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'j') {
        e.preventDefault()
        scrollToIndex(activeIndex + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'k') {
        e.preventDefault()
        scrollToIndex(activeIndex - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, scrollToIndex, selectedOfferForDetail])

  // Dynamic ambient glow based on current active offer
  const ambientHue = useMemo(() => {
    const hues = [217, 260, 160, 200, 280]
    return hues[activeIndex % hues.length]
  }, [activeIndex])

  return (
    <section className="landing-feed-demo" id="discovery-demo">
      <div className="container landing-feed-demo__container">
        {/* Section Header */}
        <SectionReveal delay={0.1} yOffset={20} className="landing-section-header">
          <div className="landing-badge">
            <Sparkles size={14} className="landing-badge__icon" />
            <span className="landing-badge__text">
              {tr('Interactive Discovery Stream', 'Flux de découverte interactif')}
            </span>
          </div>

          <h2 className="landing-section-title">
            <TextReveal
              as="span"
              delay={0.2}
              serifWords={['Scroll', 'Discover', 'Connect', 'Défilez', 'Découvrez', 'Connectez']}
            >
              {tr(
                'Scroll. Discover. Connect.',
                'Défilez. Découvrez. Connectez.'
              )}
            </TextReveal>
          </h2>

          <p className="landing-section-subtitle">
            {tr(
              'Experience MatchOp’s vertical opportunity feed. Scroll smoothly through curated high-fit tech roles, review instant AI compatibility, and express interest in one click.',
              'Découvrez le flux vertical d’opportunités de MatchOp. Faites défiler les offres sélectionnées par l’IA, examinez la compatibilité et postulez en un clic.'
            )}
          </p>
        </SectionReveal>

        {/* Interactive Scrolling Feed Stage */}
        <SectionReveal delay={0.3} yOffset={30} className="landing-feed-demo-wrapper">
          <div className="landing-feed-simulator-stage">
            {/* Dynamic Toast Message */}
            {toastMessage && (
              <div
                className={`landing-feed-toast ${toastMessage.type === 'success' ? 'is-apply' : 'is-info'}`}
                role="status"
              >
                {toastMessage.type === 'success' ? <Check size={16} /> : <Bookmark size={16} />}
                <span>{toastMessage.text}</span>
              </div>
            )}

            {/* Smartphone Viewport Device Frame */}
            <div
              className="landing-feed-phone"
              style={{
                boxShadow: `0 28px 64px -12px hsla(${ambientHue}, 80%, 40%, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.08)`
              }}
            >
              {/* Device Notch & Top Speaker Bar */}
              <div className="landing-phone-header-bar">
                <div className="landing-phone-speaker" />
              </div>

              {/* In-Phone Header App Bar */}
              <div className="landing-phone-app-bar">
                <div className="landing-phone-clock">9:41</div>
                <div className="landing-phone-status-pill">
                  <span className="landing-phone-status-dot" />
                  <span>{tr('Live Opportunity Stream', 'Flux d’opportunités en direct')}</span>
                </div>
                <div className="landing-phone-counter">
                  {activeIndex + 1} / {totalOffers}
                </div>
              </div>

              {/* VERTICAL SCROLL FEED CONTAINER */}
              <div
                className="landing-feed-scroll-container"
                ref={scrollContainerRef}
                onScroll={handleFeedScroll}
                tabIndex={0}
                aria-label="Opportunity feed scroll container"
              >
                {DEMO_OFFERS.map((offer, idx) => {
                  const isApplied = appliedIds.has(offer.id)
                  const isSaved = savedIds.has(offer.id)

                  return (
                    <article
                      key={offer.id}
                      className={`landing-feed-card ${idx === activeIndex ? 'is-in-view' : ''}`}
                      id={`demo-feed-item-${idx}`}
                    >
                      <div className="landing-feed-card__inner">
                        {/* Top Metadata Row: Score + Badges + Info Button */}
                        <div className="landing-card-top-row">
                          <div className="landing-card-badges">
                            <span className="demo-card-score-badge">
                              <Sparkles size={13} />
                              <span>{Math.round(offer.matchScore * 100)}% {tr('Fit', 'Score')}</span>
                            </span>

                            {offer.is_exclusive && (
                              <span className="partner-badge badge-exclusive">
                                <Crown size={12} />
                                <span>{tr('Exclusive', 'Exclusif')}</span>
                              </span>
                            )}

                            {offer.bounty_value > 0 && (
                              <span className="partner-badge badge-bounty">
                                <Coins size={12} />
                                <span>+${offer.bounty_value}</span>
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            className="landing-card-info-btn"
                            onClick={() => setSelectedOfferForDetail(offer)}
                            aria-label={tr('View full role specs', 'Voir détails')}
                            title={tr('View role specifications', 'Voir détails')}
                          >
                            <Info size={15} />
                          </button>
                        </div>

                        {/* Company Identity */}
                        <div className="landing-feed-company-row">
                          <div className="landing-company-logo">
                            {offer.company.charAt(0)}
                          </div>
                          <div className="landing-company-meta">
                            <div className="landing-company-name-row">
                              <span className="landing-company-name">{offer.company}</span>
                              {offer.companyVerified && (
                                <span className="verification-badge-chip" title="Verified Tech Partner">
                                  <ShieldCheck size={14} />
                                </span>
                              )}
                            </div>
                            <span className="landing-offer-type-pill">{offer.type}</span>
                          </div>
                        </div>

                        {/* Role Details */}
                        <div className="landing-feed-job-body">
                          <h3 className="landing-feed-job-title">{offer.title}</h3>
                          <p className="landing-feed-job-desc">{offer.description}</p>

                          <div className="landing-feed-chips">
                            <div className="meta-item">
                              <MapPin size={13} />
                              <span>{offer.location}</span>
                            </div>
                            <div className="meta-item meta-item--salary">
                              <DollarSign size={13} />
                              <span>{offer.salary}</span>
                            </div>
                            <div className="meta-item">
                              <Clock size={13} />
                              <span>{offer.duration}</span>
                            </div>
                          </div>

                          {/* Skill Tags */}
                          <div className="landing-feed-skills">
                            {offer.skills.slice(0, 4).map((skill, sIdx) => (
                              <span key={sIdx} className="demo-skill-pill">{skill}</span>
                            ))}
                            {offer.skills.length > 4 && (
                              <span className="demo-skill-pill more">+{offer.skills.length - 4}</span>
                            )}
                          </div>
                        </div>

                        {/* Action Bar on Each Card */}
                        <div className="landing-feed-actions-bar">
                          {/* Save/Bookmark Button */}
                          <button
                            type="button"
                            className={`feed-action-btn feed-action-btn--bookmark ${isSaved ? 'is-saved' : ''}`}
                            onClick={() => handleToggleSave(offer)}
                            aria-label={isSaved ? tr('Saved', 'Enregistré') : tr('Save opportunity', 'Enregistrer')}
                            title={isSaved ? tr('Saved to tracker', 'Enregistré') : tr('Save for later', 'Enregistrer pour plus tard')}
                          >
                            <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
                          </button>

                          {/* Next Role Button (Scrolls down) */}
                          <button
                            type="button"
                            className="feed-action-btn feed-action-btn--next"
                            onClick={() => scrollToIndex(idx + 1)}
                            disabled={idx === totalOffers - 1}
                            aria-label={tr('Scroll to next opportunity', 'Offre suivante')}
                            title={tr('Next Opportunity (Down)', 'Opportunité suivante')}
                          >
                            <ChevronDown size={18} />
                            <span className="btn-label-text">{tr('Next', 'Suivant')}</span>
                          </button>

                          {/* Apply & Express Interest Button */}
                          <button
                            type="button"
                            className={`feed-action-btn feed-action-btn--apply ${isApplied ? 'is-applied' : ''}`}
                            onClick={() => handleApply(offer)}
                            aria-label={isApplied ? tr('Applied', 'Postulé') : tr('Express interest & apply', 'Exprimer mon intérêt')}
                          >
                            {isApplied ? (
                              <>
                                <Check size={18} />
                                <span className="btn-label-text">{tr('Applied ✓', 'Postulé ✓')}</span>
                              </>
                            ) : (
                              <>
                                <Send size={16} />
                                <span className="btn-label-text">{tr('Express Interest', 'Postuler')}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Scroll Cue Hint at bottom of card */}
                        <div className="landing-feed-scroll-hint">
                          {idx < totalOffers - 1 ? (
                            <button
                              type="button"
                              className="scroll-hint-btn"
                              onClick={() => scrollToIndex(idx + 1)}
                            >
                              <span>{tr('Scroll for next opportunity', 'Faites défiler pour la suite')}</span>
                              <ChevronDown size={14} className="scroll-hint-icon" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="scroll-hint-btn scroll-hint-btn--top"
                              onClick={() => scrollToIndex(0)}
                            >
                              <span>{tr('Back to top', 'Retour au début')}</span>
                              <ChevronUp size={14} className="scroll-hint-icon" />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>

            {/* Desktop Side Navigation Rail */}
            <aside className="landing-feed-side-nav" aria-label="Opportunity feed navigation controls">
              <button
                type="button"
                className="feed-rail-btn"
                onClick={() => scrollToIndex(activeIndex - 1)}
                disabled={activeIndex === 0}
                aria-label={tr('Scroll up to previous opportunity', 'Offre précédente')}
                title={tr('Previous (Arrow Up / Scroll Up)', 'Précédente (Flèche haut)')}
              >
                <ChevronUp size={18} />
              </button>

              <div className="feed-rail-dots" role="tablist" aria-label="Opportunity indicators">
                {DEMO_OFFERS.map((offer, idx) => (
                  <button
                    key={offer.id}
                    type="button"
                    role="tab"
                    aria-selected={idx === activeIndex}
                    className={`feed-rail-dot ${idx === activeIndex ? 'is-active' : ''}`}
                    onClick={() => scrollToIndex(idx)}
                    aria-label={`Scroll to ${offer.title} (${idx + 1}/${totalOffers})`}
                    title={`${offer.company} - ${offer.title}`}
                  />
                ))}
              </div>

              <button
                type="button"
                className="feed-rail-btn"
                onClick={() => scrollToIndex(activeIndex + 1)}
                disabled={activeIndex === totalOffers - 1}
                aria-label={tr('Scroll down to next opportunity', 'Offre suivante')}
                title={tr('Next (Arrow Down / Scroll Down)', 'Suivante (Flèche bas)')}
              >
                <ChevronDown size={18} />
              </button>

              <button
                type="button"
                className="feed-rail-btn feed-rail-btn--reset"
                onClick={() => scrollToIndex(0)}
                title={tr('Scroll back to top', 'Retourner en haut')}
                aria-label={tr('Scroll back to top', 'Retourner en haut')}
              >
                <RotateCcw size={15} />
              </button>

              <div className="feed-rail-hints">
                <div className="rail-mouse-cue">
                  <Mouse size={14} />
                  <span>{tr('Scroll', 'Défiler')}</span>
                </div>
                <span className="rail-hint-chip"><strong>↑/↓</strong> Nav</span>
              </div>
            </aside>
          </div>
        </SectionReveal>

        {/* Modal for Full Job Specs Details */}
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
                  aria-label="Close details"
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
                    handleApply(selectedOfferForDetail)
                    setSelectedOfferForDetail(null)
                  }}
                >
                  <Send size={18} />
                  <span>{tr('Express Interest & Apply', 'Postuler et exprimer mon intérêt')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// Export both names for maximum compatibility
export { DiscoveryFeedSection as DiscoverySwipeSection }
export default DiscoveryFeedSection
