import { motion, useReducedMotion } from 'framer-motion'

/**
 * SectionReveal: Smooth viewport entry container with customizable stagger & direction
 */
export function SectionReveal({
  children,
  className = '',
  delay = 0,
  duration = 0.7,
  yOffset = 36,
  once = true,
  amount = 0.15,
  style = {},
  id,
}) {
  void motion
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return (
      <div id={id} className={`section-reveal ${className}`} style={style}>
        {children}
      </div>
    )
  }

  const variants = {
    hidden: {
      opacity: 0,
      y: yOffset,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1], // ease-out quint
      },
    },
  }

  return (
    <motion.div
      id={id}
      className={`section-reveal ${className}`}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: amount || 0.05, margin: '0px 0px -40px 0px' }}
      style={style}
    >
      {children}
    </motion.div>
  )
}

export default SectionReveal
