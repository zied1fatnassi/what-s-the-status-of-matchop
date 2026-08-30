import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'

/**
 * MagneticButton: Tactile button with subtle magnetic pull and smooth spring return
 */
export function MagneticButton({
  children,
  to,
  onClick,
  className = '',
  variant = 'primary', // 'primary', 'secondary', 'pill', 'outline'
  size = 'md', // 'sm', 'md', 'lg', 'xl'
  pullStrength = 0.25,
  style = {},
  ariaLabel,
}) {
  void motion
  const btnRef = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const shouldReduceMotion = useReducedMotion()

  const handleMouseMove = (e) => {
    if (shouldReduceMotion || !btnRef.current) return

    const { clientX, clientY } = e
    const { left, top, width, height } = btnRef.current.getBoundingClientRect()

    const centerX = left + width / 2
    const centerY = top + height / 2

    const moveX = (clientX - centerX) * pullStrength
    const moveY = (clientY - centerY) * pullStrength

    setPosition({ x: moveX, y: moveY })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  const classes = `magnetic-btn magnetic-btn--${variant} magnetic-btn--${size} ${className}`

  if (to) {
    return (
      <motion.div
        ref={btnRef}
        className="magnetic-btn-anchor"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{ x: position.x, y: position.y }}
        transition={{ type: 'spring', stiffness: 350, damping: 20, mass: 0.5 }}
      >
        <Link
          to={to}
          className={classes}
          style={style}
          aria-label={ariaLabel}
          onClick={onClick}
        >
          <span className="magnetic-btn__content">{children}</span>
          <span className="magnetic-btn__sheen" aria-hidden="true" />
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.button
      ref={btnRef}
      type="button"
      className={classes}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 350, damping: 20, mass: 0.5 }}
      style={style}
      aria-label={ariaLabel}
    >
      <span className="magnetic-btn__content">{children}</span>
      <span className="magnetic-btn__sheen" aria-hidden="true" />
    </motion.button>
  )
}

export default MagneticButton
