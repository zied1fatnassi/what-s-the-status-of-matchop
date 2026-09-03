import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronUp, ChevronDown } from 'lucide-react'
import VerticalOpportunityItem from './VerticalOpportunityItem'
import { useBilingualText } from '../../lib/useBilingualText'
import './VerticalOpportunityFeed.css'

const DRAG_THRESHOLD = 120
const VELOCITY_THRESHOLD = 450
const WHEEL_COOLDOWN_MS = 600

function VerticalOpportunityFeed({
    offers = [],
    currentIndex = 0,
    canUndo = false,
    onSwipe,
    onUndo,
    onViewDetails
}) {
    void motion
    const tr = useBilingualText()
    const shouldReduceMotion = useReducedMotion()

    const [dragProgress, setDragProgress] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [slideDirection, setSlideDirection] = useState('up') // 'up' (next) or 'down' (prev)
    const isWheelLockedRef = useRef(false)
    const containerRef = useRef(null)

    const currentOffer = offers[currentIndex]
    const totalOffers = offers.length

    const handleApply = useCallback((offer) => {
        setSlideDirection('up')
        onSwipe?.('right', offer)
    }, [onSwipe])

    const handleIgnore = useCallback((offer) => {
        setSlideDirection('up')
        onSwipe?.('left', offer)
    }, [onSwipe])

    const handleUndo = useCallback(() => {
        if (!canUndo) return
        setSlideDirection('down')
        onUndo?.()
    }, [canUndo, onUndo])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore keystrokes if focused inside an input/textarea/select
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return

            if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'x' || e.key === 'i') {
                e.preventDefault()
                if (currentOffer) handleIgnore(currentOffer)
            } else if ((e.key === 'ArrowUp' || e.key === 'k' || e.key === 'z') && canUndo) {
                e.preventDefault()
                handleUndo()
            } else if (e.key === 'a' || e.key === 'Enter') {
                e.preventDefault()
                if (currentOffer) handleApply(currentOffer)
            } else if (e.key === 'd') {
                e.preventDefault()
                if (currentOffer) onViewDetails?.(currentOffer)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [currentOffer, canUndo, handleApply, handleIgnore, handleUndo, onViewDetails])

    // Mouse wheel / trackpad scroll handling
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleWheel = (e) => {
            // Don't intercept if user is scrolling inside an expanded description box
            if (e.target.closest('.opportunity-description.is-expanded')) return

            if (isWheelLockedRef.current) return
            if (Math.abs(e.deltaY) < 30) return

            e.preventDefault()
            isWheelLockedRef.current = true

            if (e.deltaY > 0) {
                // Scroll down -> Next (Ignore)
                if (currentOffer) handleIgnore(currentOffer)
            } else if (e.deltaY < 0 && canUndo) {
                // Scroll up -> Previous (Undo)
                handleUndo()
            }

            setTimeout(() => {
                isWheelLockedRef.current = false
            }, WHEEL_COOLDOWN_MS)
        }

        container.addEventListener('wheel', handleWheel, { passive: false })
        return () => container.removeEventListener('wheel', handleWheel)
    }, [currentOffer, canUndo, handleIgnore, handleUndo])

    // Touch gesture handlers
    const handleDrag = (_event, info) => {
        setIsDragging(true)
        if (info.offset.y < 0) {
            // Dragging upward -> compute progress toward Ignore threshold
            const progress = Math.min(1, Math.max(0, -info.offset.y / DRAG_THRESHOLD))
            setDragProgress(progress)
        } else {
            setDragProgress(0)
        }
    }

    const handleDragEnd = (_event, info) => {
        setIsDragging(false)
        setDragProgress(0)

        const offsetY = info.offset.y
        const velocityY = info.velocity.y

        if (offsetY < -DRAG_THRESHOLD || velocityY < -VELOCITY_THRESHOLD) {
            // Swiped UP -> Ignore current opportunity & move to next
            if (currentOffer) handleIgnore(currentOffer)
        } else if ((offsetY > DRAG_THRESHOLD || velocityY > VELOCITY_THRESHOLD) && canUndo) {
            // Swiped DOWN -> Go back to previous opportunity
            handleUndo()
        }
    }

    // Motion variants for spring vertical transition
    const variants = {
        initial: (direction) => ({
            y: shouldReduceMotion ? 0 : direction === 'up' ? '100%' : '-100%',
            opacity: shouldReduceMotion ? 0 : 0.6,
            scale: shouldReduceMotion ? 1 : 0.96
        }),
        animate: {
            y: '0%',
            opacity: 1,
            scale: 1,
            transition: shouldReduceMotion
                ? { duration: 0.15 }
                : {
                    type: 'spring',
                    stiffness: 380,
                    damping: 32,
                    mass: 0.8
                }
        },
        exit: (direction) => ({
            y: shouldReduceMotion ? 0 : direction === 'up' ? '-100%' : '100%',
            opacity: 0,
            scale: shouldReduceMotion ? 1 : 0.94,
            transition: shouldReduceMotion
                ? { duration: 0.1 }
                : { duration: 0.24, ease: [0.32, 0.72, 0, 1] }
        })
    }

    if (!currentOffer) return null

    // Compute progress dots for discovery session
    const totalDots = Math.min(7, Math.max(1, totalOffers))
    const activeDotIndex = totalDots > 0 ? currentIndex % totalDots : 0

    return (
        <div className="vertical-opportunity-feed" ref={containerRef}>
            {/* Desktop Side Controls & Indicator */}
            <aside className="feed-desktop-controls" aria-label="Desktop discovery navigation">
                <button
                    type="button"
                    className="feed-nav-arrow"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    aria-label={tr('Previous job', 'Offre précédente')}
                    title={tr('Previous (Arrow Up)', 'Précédente (Flèche haut)')}
                >
                    <ChevronUp size={22} />
                </button>

                <div className="feed-progress-indicator" aria-hidden="true">
                    {Array.from({ length: totalDots }).map((_, idx) => (
                        <span
                            key={idx}
                            className={`feed-progress-dot ${idx === activeDotIndex ? 'is-active' : ''}`}
                        />
                    ))}
                </div>

                <button
                    type="button"
                    className="feed-nav-arrow"
                    onClick={() => currentOffer && handleIgnore(currentOffer)}
                    aria-label={tr('Next job', 'Offre suivante')}
                    title={tr('Next (Arrow Down)', 'Suivante (Flèche bas)')}
                >
                    <ChevronDown size={22} />
                </button>

                <div className="feed-keyboard-hints">
                    <span className="key-hint"><strong>↑/↓</strong> Nav</span>
                    <span className="key-hint"><strong>A</strong> Apply</span>
                    <span className="key-hint"><strong>X</strong> Ignore</span>
                </div>
            </aside>

            {/* Opportunity Container with Framer Motion vertical gestures */}
            <AnimatePresence initial={false} custom={slideDirection} mode="wait">
                <motion.div
                    key={currentOffer.id || currentIndex}
                    custom={slideDirection}
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="opportunity-slide-stage"
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={shouldReduceMotion ? 0.1 : 0.4}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                >
                    <VerticalOpportunityItem
                        offer={currentOffer}
                        onApply={handleApply}
                        onIgnore={handleIgnore}
                        onUndo={handleUndo}
                        canUndo={canUndo}
                        onViewDetails={onViewDetails}
                        dragProgress={dragProgress}
                        isDragging={isDragging}
                        isActive={true}
                    />
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

export default VerticalOpportunityFeed
