import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

/**
 * ParallaxWrapper: Subtle scroll-driven Y-translation for layered depth
 * @param {number} speed - Parallax speed factor (negative moves up faster, positive moves down slower)
 */
export function ParallaxWrapper({
  children,
  className = '',
  speed = 0.2, // standard subtle speed
  style = {},
  as = 'div',
}) {
  void motion
  const ref = useRef(null)
  const shouldReduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // Calculate pixel offset range based on speed factor
  const yOffset = speed * 100
  const y = useTransform(scrollYProgress, [0, 1], [-yOffset, yOffset])

  if (shouldReduceMotion) {
    const Component = as
    return (
      <Component className={`parallax-wrapper ${className}`} style={style}>
        {children}
      </Component>
    )
  }

  const MotionComponent = motion[as] || motion.div

  return (
    <div ref={ref} className={`parallax-container ${className}`} style={{ overflow: 'visible' }}>
      <MotionComponent
        className="parallax-inner"
        style={{
          y,
          ...style,
        }}
      >
        {children}
      </MotionComponent>
    </div>
  )
}

export default ParallaxWrapper
