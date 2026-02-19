import { useEffect, useState, useRef } from 'react'
import Logo from './Logo'
import './LoadingScreen.css'

/**
 * Full-screen loading animation with MatchOp logo
 * Uses grace period approach - only shows if load exceeds threshold
 * @param {Object} props
 * @param {number} props.gracePeriod - Delay before showing loader (default 300ms)
 * @param {Function} props.onComplete - Callback when loading completes
 */
function LoadingScreen({ gracePeriod = 300, onComplete }) {
    const [isVisible, setIsVisible] = useState(false)
    const [isFading, setIsFading] = useState(false)
    const hasExitedRef = useRef(false)
    const startTimeRef = useRef(performance.now())

    // Grace period timer - shows loader if load is slow
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!hasExitedRef.current) {
                setIsVisible(true)
            }
        }, gracePeriod)

        return () => clearTimeout(timer)
    }, [gracePeriod])

    // Listen for app ready signal
    useEffect(() => {
        const handleAppReady = () => {
            if (hasExitedRef.current) return
            hasExitedRef.current = true

            const elapsed = performance.now() - startTimeRef.current

            if (elapsed < gracePeriod) {
                // Fast load - dismiss without showing
                setIsVisible(false)
                sessionStorage.setItem('matchop-loaded', 'true')
                if (onComplete) onComplete()
            } else if (isVisible) {
                // Already visible - fade out
                setIsFading(true)
                setTimeout(() => {
                    setIsVisible(false)
                    sessionStorage.setItem('matchop-loaded', 'true')
                    if (onComplete) onComplete()
                }, 400)
            } else {
                // Was about to show but app ready now - skip showing
                sessionStorage.setItem('matchop-loaded', 'true')
                if (onComplete) onComplete()
            }
        }

        window.addEventListener('matchop-app-ready', handleAppReady)
        return () => window.removeEventListener('matchop-app-ready', handleAppReady)
    }, [gracePeriod, onComplete, isVisible])

    if (!isVisible) return null

    return (
        <div className={`loading-screen ${isFading ? 'fading' : ''}`}>
            <div className="loading-content">
                <Logo size="large" showText={true} animated={true} />
                <div className="loading-bar">
                    <div className="loading-progress"></div>
                </div>
            </div>
        </div>
    )
}

export default LoadingScreen
