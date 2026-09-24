import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion'

/**
 * ScrollProgress: Ambient top progress indicator for Fixa-style storytelling scroll
 */
export function ScrollProgress({ className = '' }) {
  void motion
  const shouldReduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  if (shouldReduceMotion) return null

  return (
    <motion.div
      className={`landing-scroll-progress ${className}`}
      style={{
        scaleX,
        transformOrigin: '0%',
      }}
      aria-hidden="true"
    />
  )
}

export default ScrollProgress
