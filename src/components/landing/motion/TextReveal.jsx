import { motion, useReducedMotion } from 'framer-motion'

/**
 * TextReveal: Fixa-style kinetic typography reveal
 * Animates words or lines with clip masks, vertical translation, and opacity
 */
export function TextReveal({
  children,
  className = '',
  as = 'div',
  delay = 0,
  stagger = 0.04,
  duration = 0.6,
  once = true,
  serifWords = [],
}) {
  void motion
  const shouldReduceMotion = useReducedMotion()
  const Tag = as

  if (typeof children !== 'string') {
    return (
      <Tag className={`kinetic-text-wrapper ${className}`}>
        {children}
      </Tag>
    )
  }

  const words = children.split(' ')

  if (shouldReduceMotion) {
    return (
      <Tag className={`kinetic-text-wrapper ${className}`}>
        {children}
      </Tag>
    )
  }

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  }

  const wordVariants = {
    hidden: {
      opacity: 0,
      y: '100%',
      rotate: 2,
    },
    visible: {
      opacity: 1,
      y: '0%',
      rotate: 0,
      transition: {
        duration,
        ease: [0.16, 1, 0.3, 1], // cinematic bezier
      },
    },
  }

  return (
    <Tag className={`kinetic-text-wrapper ${className}`}>
      <motion.span
        className="kinetic-text-container"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, margin: '-30px' }}
      >
        {words.map((word, idx) => {
          const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
          const isSerif = serifWords.some(sw => sw.toLowerCase() === cleanWord)
          return (
            <span key={idx} className="kinetic-word-slot">
              <motion.span
                variants={wordVariants}
                className={isSerif ? 'font-serif-accent kinetic-word-inner' : 'kinetic-word-inner'}
                style={{
                  fontFamily: isSerif ? 'var(--font-serif)' : 'inherit',
                  fontStyle: isSerif ? 'italic' : 'normal',
                }}
              >
                {word}
              </motion.span>
            </span>
          )
        })}
      </motion.span>
    </Tag>
  )
}

export default TextReveal
