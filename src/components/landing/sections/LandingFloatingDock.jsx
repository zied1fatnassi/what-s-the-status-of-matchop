import { useEffect, useState, useRef, useCallback } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowUp, Zap } from 'lucide-react'
import { useBilingualText } from '../../../lib/useBilingualText'

const DOCK_SECTIONS = [
  { id: 'problem', en: 'Problem', fr: 'Constat' },
  { id: 'ai-matching', en: 'AI Engine', fr: 'Moteur IA' },
  { id: 'discovery-demo', en: 'Live Demo', fr: 'Démo' },
  { id: 'for-both', en: 'Features', fr: 'Fonctionnalités' },
]

const SECTION_MAPPINGS = [
  { tabId: 'problem', elementIds: ['problem', 'how-it-works'] },
  { tabId: 'ai-matching', elementIds: ['ai-matching'] },
  { tabId: 'discovery-demo', elementIds: ['discovery-demo', 'match-moment', 'chat-connection'] },
  { tabId: 'for-both', elementIds: ['for-both', 'cta'] },
]

export function LandingFloatingDock() {
  const tr = useBilingualText()
  const shouldReduceMotion = useReducedMotion()
  const [isVisible, setIsVisible] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const isClickScrollingRef = useRef(false)
  const clickTimeoutRef = useRef(null)

  // Real-time scroll detection to highlight sections as user scrolls
  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY
          const innerHeight = window.innerHeight
          const scrollHeight = document.documentElement.scrollHeight

          // Show dock once user scrolls past 80px
          setIsVisible(scrollY > 80)

          // If programmatic click-scrolling is ongoing, keep that tab active
          if (isClickScrollingRef.current) {
            ticking = false
            return
          }

          // If scrolled near bottom of page, activate last section
          if (scrollY + innerHeight >= scrollHeight - 70) {
            setActiveSection('for-both')
            ticking = false
            return
          }

          // Primary focus line: 42% down the viewport
          const viewportMid = innerHeight * 0.42

          let current = ''
          for (const group of SECTION_MAPPINGS) {
            for (const elId of group.elementIds) {
              const el = document.getElementById(elId)
              if (el) {
                const rect = el.getBoundingClientRect()
                if (rect.top <= viewportMid && rect.bottom >= viewportMid) {
                  current = group.tabId
                  break
                }
              }
            }
            if (current) break
          }

          // Milestone fallback if between sections
          if (!current && scrollY > 200) {
            for (let i = 0; i < DOCK_SECTIONS.length; i++) {
              const el = document.getElementById(DOCK_SECTIONS[i].id)
              if (el) {
                const rect = el.getBoundingClientRect()
                if (rect.top <= innerHeight * 0.5) {
                  current = DOCK_SECTIONS[i].id
                }
              }
            }
          }

          setActiveSection(current)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
      }
    }
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setActiveSection('')
  }, [])

  const scrollToSection = useCallback((e, sectionId) => {
    e.preventDefault()
    const element = document.getElementById(sectionId)
    if (!element) return

    // Immediately highlight active tab for instant response
    setActiveSection(sectionId)

    // Lock scrollspy briefly during programmatic smooth scroll
    isClickScrollingRef.current = true
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
    }
    clickTimeoutRef.current = setTimeout(() => {
      isClickScrollingRef.current = false
    }, 850)

    const navOffset = 70
    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.pageYOffset - navOffset

    window.scrollTo({
      top: Math.max(0, offsetPosition),
      behavior: 'smooth',
    })
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="landing-floating-dock-wrapper"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, x: '-50%' }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, x: '-50%' }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, x: '-50%' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          role="navigation"
          aria-label="Landing page sections"
        >
          <div className="landing-floating-dock">
            {/* Scroll back to top (Desktop) */}
            <button
              type="button"
              className="dock-item dock-item--icon"
              onClick={scrollToTop}
              title={tr('Scroll to Top', 'Haut de page')}
              aria-label={tr('Scroll to Top', 'Haut de page')}
            >
              <ArrowUp size={16} />
            </button>

            <div className="dock-divider" aria-hidden="true" />

            {/* Quick section jumps */}
            <div className="landing-floating-dock-nav">
              {DOCK_SECTIONS.map((section) => {
                const isActive = activeSection === section.id
                const label = tr(section.en, section.fr)
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={(e) => scrollToSection(e, section.id)}
                    className={`dock-item dock-item--link ${isActive ? 'dock-item--active' : ''}`}
                    aria-current={isActive ? 'location' : undefined}
                    aria-label={label}
                  >
                    {isActive && (
                      <motion.span
                        layoutId={shouldReduceMotion ? undefined : 'dockActivePill'}
                        className="dock-item__active-bg"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    <span className="dock-item__text">
                      {isActive && <span className="dock-active-dot" aria-hidden="true" />}
                      {label}
                    </span>
                  </a>
                )
              })}
            </div>

            <div className="dock-divider" aria-hidden="true" />

            {/* Primary Action (Desktop) */}
            <Link
              to="/student/signup"
              className="dock-btn dock-btn--primary"
              aria-label={tr('Get Started', 'Commencer')}
            >
              <Zap size={14} className="dock-btn__icon" />
              <span className="dock-btn__text">{tr('Get Started', 'Commencer')}</span>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default LandingFloatingDock
