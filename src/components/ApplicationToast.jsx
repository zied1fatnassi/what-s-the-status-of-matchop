import { useEffect, useState } from 'react'
import { Send, CheckCircle, ExternalLink, Star, X } from 'lucide-react'
import './ApplicationToast.css'

/**
 * Toast at the bottom with same animation for:
 * - "Application was sent!" (heart / right swipe)
 * - "Added to favorites" (blue star / super like)
 * - External variant (orange) when isExternal
 */
function ApplicationToast({ title = 'Application was sent!', isExternal = false, variant = 'application', onClose }) {
    const [isVisible, setIsVisible] = useState(false)
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
        const showTimer = requestAnimationFrame(() => {
            requestAnimationFrame(() => setIsVisible(true))
        })
        const exitTimer = setTimeout(() => setIsExiting(true), 2500)
        const closeTimer = setTimeout(() => onClose?.(), 3000)
        return () => {
            cancelAnimationFrame(showTimer)
            clearTimeout(exitTimer)
            clearTimeout(closeTimer)
        }
    }, [onClose])

    const icon = variant === 'rejected' ? <X size={20} /> : variant === 'favorites' ? <Star size={20} /> : (isExternal ? <ExternalLink size={20} /> : <Send size={20} />)

    return (
        <div className={`application-toast ${isVisible ? 'visible' : ''} ${isExiting ? 'exiting' : ''} ${isExternal ? 'external' : ''} ${variant === 'favorites' ? 'favorites' : ''} ${variant === 'rejected' ? 'rejected' : ''}`}>
            <div className="toast-icon">
                {icon}
            </div>
            <div className="toast-content">
                <span className="toast-title">{title}</span>
            </div>
            <div className="toast-check">
                <CheckCircle size={20} />
            </div>
        </div>
    )
}

export default ApplicationToast
