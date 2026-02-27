import { useState } from 'react'
import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useBilingualText } from '../lib/useBilingualText'

const CANDIDATES = [
    { name: 'Karim Beguir', match: 97, image: '/karim beguir.jpg' },
    { name: 'Yahya Bouhlel', match: 96, image: '/yahya bouhlel.jpg' },
    { name: 'Aziz Jlassi', match: 95, image: '/aziz jlassi.jpg' },
    { name: 'Iheb Massabi', match: 94, image: '/iheb massabi.png' },
    { name: 'Ayoub Ferchichi', match: 93, image: '/ayoub ferchichi.png' },
    { name: 'Hama Harbi', match: 92, image: '/hama harbi.png' },
    { name: 'Bilel Ouersighi', match: 91, image: '/bilel ouersighi.jpg' },
    { name: 'Malek Gharbi', match: 90, image: '/malek gharbi.jpg' },
    { name: 'Sami Chefi', match: 89, image: '/sami chefi.jpg' },
    { name: 'Shady Nasri', match: 88, image: '/shady nasri.jpg' },
]

const ORBIT_RADIUS = 172
const NODE_SIZE = 96
const LOOP_DURATION_SECONDS = 30

function getPathOffset(index) {
    return index / CANDIDATES.length
}

function PipelineNodeCard({ candidate }) {
    return (
        <div className="pipeline-node-card" title={`${candidate.name} - ${candidate.match}% Match`}>
            <img
                src={candidate.image}
                alt={candidate.name}
                className="pipeline-node-photo"
                draggable={false}
                loading="lazy"
                decoding="async"
            />
        </div>
    )
}

function PipelineNode({
    index,
    progress,
    shouldReduceMotion,
    isHovered,
    onHoverStart,
    onHoverEnd,
}) {
    const candidate = CANDIDATES[index]
    const pathOffset = useTransform(progress, (value) => (getPathOffset(index) + value) % 1)

    const x = useTransform(pathOffset, (offset) => {
        const angle = (offset % 1) * Math.PI * 2
        return Math.cos(angle) * ORBIT_RADIUS
    })

    const y = useTransform(pathOffset, (offset) => {
        const angle = (offset % 1) * Math.PI * 2
        return Math.sin(angle) * ORBIT_RADIUS
    })

    const staticAngle = getPathOffset(index) * Math.PI * 2

    return (
        <motion.div
            className={`pipeline-node${isHovered ? ' is-hovered' : ''}`}
            style={{
                width: NODE_SIZE,
                height: NODE_SIZE,
                left: `calc(50% - ${NODE_SIZE / 2}px)`,
                top: `calc(50% - ${NODE_SIZE / 2}px)`,
                x: shouldReduceMotion ? Math.cos(staticAngle) * ORBIT_RADIUS : x,
                y: shouldReduceMotion ? Math.sin(staticAngle) * ORBIT_RADIUS : y,
            }}
            onMouseEnter={onHoverStart}
            onMouseLeave={onHoverEnd}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                duration: 0.7,
                delay: index * 0.08 + 0.2,
                ease: 'easeOut',
            }}
        >
            <PipelineNodeCard candidate={candidate} />
        </motion.div>
    )
}

function CandidatePipelineLoop() {
    const tr = useBilingualText()
    const progress = useMotionValue(0)
    const shouldReduceMotion = useReducedMotion()
    const [hoverCount, setHoverCount] = useState(0)
    const [hoveredIndex, setHoveredIndex] = useState(null)
    const isPaused = hoverCount > 0

    useAnimationFrame((_, delta) => {
        if (shouldReduceMotion || isPaused) {
            return
        }

        const increment = delta / (LOOP_DURATION_SECONDS * 1000)
        progress.set((progress.get() + increment) % 1)
    })

    const handleHoverStart = () => setHoverCount((count) => count + 1)
    const handleHoverEnd = () => setHoverCount((count) => Math.max(0, count - 1))
    void motion

    return (
        <div className="mock-candidates pipeline-loop">
            <div className={`pipeline-orbit${isPaused ? ' is-paused' : ''}`}>
                {Array.from({ length: CANDIDATES.length }).map((_, index) => (
                    <PipelineNode
                        index={index}
                        key={CANDIDATES[index].name}
                        progress={progress}
                        shouldReduceMotion={shouldReduceMotion}
                        isHovered={hoveredIndex === index}
                        onHoverStart={() => {
                            setHoveredIndex(index)
                            handleHoverStart()
                        }}
                        onHoverEnd={() => {
                            setHoveredIndex((previous) => (previous === index ? null : previous))
                            handleHoverEnd()
                        }}
                    />
                ))}

                <div className="pipeline-core">
                    <span className="pipeline-core-label">{tr('Candidate Pipeline', 'Pipeline candidats')}</span>
                    <span className="pipeline-core-value">{tr('Live Profiles', 'Profils en direct')}</span>
                </div>
            </div>
        </div>
    )
}

export default CandidatePipelineLoop
