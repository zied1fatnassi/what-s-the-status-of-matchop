import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * FloatingCard: Premium glassmorphic card with subtle 3D tilt and ambient levitation
 */
export function FloatingCard({
  children,
  className = '',
  enableTilt = true,
  floatAnimation = true,
  floatDuration = 6,
  floatDistance = 8,
  glowEffect = false,
  style = {},
  onClick,
}) {
  void motion
  const cardRef = useRef(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  const handleMouseMove = (e) => {
    if (!enableTilt || shouldReduceMotion || !cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotX = ((y - centerY) / centerY) * -6 // Max 6 deg
    const rotY = ((x - centerX) / centerX) * 6

    setRotateX(rotX)
    setRotateY(rotY)
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotateX(0)
    setRotateY(0)
  }

  if (shouldReduceMotion) {
    return (
      <div
        className={`floating-card ${className} ${glowEffect ? 'has-glow' : ''}`}
        style={style}
        onClick={onClick}
      >
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={cardRef}
      className={`floating-card ${className} ${glowEffect ? 'has-glow' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={
        floatAnimation && !isHovered
          ? {
              y: [0, -floatDistance, 0],
              transition: {
                duration: floatDuration,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }
          : {
              y: isHovered ? -4 : 0,
            }
      }
      style={{
        transformStyle: 'preserve-3d',
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out, y 0.3s ease-out',
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}

export default FloatingCard
