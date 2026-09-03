import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles, Heart, RotateCcw, CheckCircle, ShieldCheck } from 'lucide-react'
import { TextReveal } from '../motion/TextReveal'
import { SectionReveal } from '../motion/SectionReveal'
import { useBilingualText } from '../../../lib/useBilingualText'

export function MatchMomentSection() {
  void motion
  const tr = useBilingualText()
  const shouldReduceMotion = useReducedMotion()

  const [matchState, setMatchState] = useState('matched') // 'idle', 'matching', 'matched'

  const triggerAnimation = () => {
    setMatchState('matching')
    setTimeout(() => {
      setMatchState('matched')
    }, 1400)
  }

  return (
    <section className="landing-match-moment" id="match-moment">
      <div className="container landing-match-moment__container">
        {/* Section Header */}
        <SectionReveal delay={0.1} yOffset={20} className="landing-section-header">
          <div className="landing-badge landing-badge--accent">
            <Heart size={14} className="landing-badge__icon" />
            <span className="landing-badge__text">
              {tr('The Culmination', 'L’instant décisif')}
            </span>
          </div>

          <h2 className="landing-section-title">
            <TextReveal
              as="span"
              delay={0.2}
              serifWords={['Convergence', 'Match', 'Moment', 'Momentum']}
            >
              {tr(
                'When talent meets opportunity.',
                'Quand le talent rencontre l’opportunité.'
              )}
            </TextReveal>
          </h2>

          <p className="landing-section-subtitle">
            {tr(
              'No gatekeepers. When both parties confirm mutual value, MatchOp initiates a high-priority direct connection.',
              'Zéro barrière. Dès que l’alignement est mutuel, MatchOp déclenche une mise en relation directe prioritaire.'
            )}
          </p>
        </SectionReveal>

        {/* Cinematic Match Arena */}
        <SectionReveal delay={0.3} yOffset={30} className="landing-match-arena">
          <div className="landing-match-stage">
            {/* Ambient Background Aura */}
            <div className={`landing-match-glow ${matchState === 'matched' ? 'is-active' : ''}`} aria-hidden="true" />

            {/* Candidate Card (Left) */}
            <motion.div
              className="match-entity match-entity--candidate"
              animate={
                shouldReduceMotion
                  ? {}
                  : matchState === 'matching'
                  ? {
                      x: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : [0, 45, 0],
                      y: typeof window !== 'undefined' && window.innerWidth < 768 ? [0, 15, 0] : 0,
                      scale: [1, 1.04, 1],
                    }
                  : { x: 0, y: 0, scale: 1 }
              }
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="match-entity__card">
                <div className="match-entity__avatar match-entity__avatar--student">
                  <span>AB</span>
                </div>
                <div className="match-entity__info">
                  <h4 className="match-entity__name">Ahmed Ben Ali</h4>
                  <p className="match-entity__role">{tr('Full-Stack Engineer', 'Ingénieur Full-Stack')}</p>
                  <div className="match-entity__tags">
                    <span>React</span>
                    <span>TypeScript</span>
                    <span>AI</span>
                  </div>
                </div>
                <span className="match-entity__status-badge">
                  <CheckCircle size={13} />
                  <span>{tr('Applied', 'A postulé')}</span>
                </span>
              </div>
            </motion.div>

            {/* Central Convergence Diamond Symbol */}
            <div className="match-centerpiece">
              <motion.div
                className="match-diamond-core"
                animate={
                  shouldReduceMotion
                    ? {}
                    : matchState === 'matched'
                    ? {
                        scale: [0.85, 1.2, 1],
                        rotate: [0, 90, 45],
                        boxShadow: [
                          '0 0 0 rgba(59, 130, 246, 0)',
                          '0 0 45px rgba(59, 130, 246, 0.7)',
                          '0 0 25px rgba(59, 130, 246, 0.4)',
                        ],
                      }
                    : { scale: 0.9, rotate: 45 }
                }
                transition={{ duration: 1.4, ease: 'easeOut' }}
              >
                <div className="match-diamond-inner">
                  <Sparkles size={26} className="match-diamond-icon" />
                </div>
              </motion.div>

              {/* Match Announcement Banner */}
              {matchState === 'matched' && (
                <motion.div
                  className="match-banner"
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 15, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
                >
                  <span className="match-banner__text">
                    {tr("IT'S A MATCH!", 'MATCH CONFIRMÉ !')}
                  </span>
                  <span className="match-banner__sub">
                    97% Compatibility Index
                  </span>
                </motion.div>
              )}
            </div>

            {/* Company Card (Right) */}
            <motion.div
              className="match-entity match-entity--company"
              animate={
                shouldReduceMotion
                  ? {}
                  : matchState === 'matching'
                  ? {
                      x: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : [0, -45, 0],
                      y: typeof window !== 'undefined' && window.innerWidth < 768 ? [0, -15, 0] : 0,
                      scale: [1, 1.04, 1],
                    }
                  : { x: 0, y: 0, scale: 1 }
              }
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="match-entity__card">
                <div className="match-entity__avatar match-entity__avatar--company">
                  <span>VL</span>
                </div>
                <div className="match-entity__info">
                  <h4 className="match-entity__name">
                    Veloce Labs
                    <ShieldCheck size={14} className="verified-icon" />
                  </h4>
                  <p className="match-entity__role">{tr('Lead Web Platform', 'Plateforme Web Lead')}</p>
                  <div className="match-entity__tags">
                    <span>Remote</span>
                    <span>$3.8k/mo</span>
                    <span>Verified</span>
                  </div>
                </div>
                <span className="match-entity__status-badge match-entity__status-badge--company">
                  <CheckCircle size={13} />
                  <span>{tr('Accepted Intro', 'A validé')}</span>
                </span>
              </div>
            </motion.div>
          </div>

          {/* Replay action */}
          <div className="landing-match-actions">
            <button
              type="button"
              className="match-replay-btn"
              onClick={triggerAnimation}
              disabled={matchState === 'matching'}
            >
              <RotateCcw size={16} />
              <span>{tr('Replay Match Sequence', 'Rejouer l’animation de Match')}</span>
            </button>
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}

export default MatchMomentSection
