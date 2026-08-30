import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowUp, Zap } from 'lucide-react'
import { useBilingualText } from '../../../lib/useBilingualText'

export function LandingFloatingDock() {
  void motion
  const tr = useBilingualText()
  const shouldReduceMotion = useReducedMotion()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show dock after scrolling down 400px
      if (window.scrollY > 400) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="landing-floating-dock-wrapper"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, x: '-50%' }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, x: '-50%' }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, x: '-50%' }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          role="navigation"
          aria-label="Quick Landing Actions"
        >
          <div className="landing-floating-dock">
            {/* Scroll back to top */}
            <button
              type="button"
              className="dock-item dock-item--icon"
              onClick={scrollToTop}
              title="Scroll to Top"
              aria-label="Scroll to Top"
            >
              <ArrowUp size={16} />
            </button>

            <div className="dock-divider" aria-hidden="true" />

            {/* Quick section jumps */}
            <a href="#problem" className="dock-item dock-item--link">
              <span>{tr('Problem', 'Constat')}</span>
            </a>

            <a href="#ai-matching" className="dock-item dock-item--link">
              <span>{tr('AI Engine', 'Moteur IA')}</span>
            </a>

            <a href="#discovery-demo" className="dock-item dock-item--link">
              <span>{tr('Live Demo', 'Démo')}</span>
            </a>

            <a href="#for-both" className="dock-item dock-item--link">
              <span>{tr('Features', 'Fonctionnalités')}</span>
            </a>

            <div className="dock-divider" aria-hidden="true" />

            {/* Primary Action */}
            <Link to="/student/signup" className="dock-btn dock-btn--primary">
              <Zap size={14} />
              <span>{tr('Get Started', 'Commencer')}</span>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default LandingFloatingDock
