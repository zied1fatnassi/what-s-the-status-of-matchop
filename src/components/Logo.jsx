import { useEffect, useRef, useState } from 'react'
import { useBilingualText } from '../lib/useBilingualText'
import './Logo.css'

/**
 * MatchOp animated logo component
 * Features animated intro with shapes sliding in and diamond pulsing
 */
function Logo({ size = 'default', showText = true, animated = false, className = '' }) {
    const tr = useBilingualText()
    const logoRef = useRef(null)
    const [hasAnimated, setHasAnimated] = useState(false)

    useEffect(() => {
        const logo = logoRef.current
        if (!logo) return

        // Trigger animation on mount if animated prop is true
        if (animated && !hasAnimated) {
            logo.classList.add('animate-intro')
            setHasAnimated(true)
        }

        const handleEnter = () => {
            logo.classList.add('hover')
        }

        const handleLeave = () => {
            logo.classList.remove('hover')
        }

        logo.addEventListener('mouseenter', handleEnter)
        logo.addEventListener('mouseleave', handleLeave)

        return () => {
            logo.removeEventListener('mouseenter', handleEnter)
            logo.removeEventListener('mouseleave', handleLeave)
        }
    }, [animated, hasAnimated])

    const sizeClass = size === 'small' ? 'logo-sm' : size === 'large' ? 'logo-lg' : ''

    return (
        <div className={`matchop-logo ${sizeClass} ${className}`} ref={logoRef}>
            <div className="logo-icon">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="diamond"></div>
            </div>
            {showText && (
                <div className="logo-text">
                    <span className="brand-name">MatchOp</span>
                    {size !== 'small' && (
                        <span className="tagline">{tr('Match the Opportunity', "Reliez talent et opportunite")}</span>
                    )}
                </div>
            )}
        </div>
    )
}

export default Logo
