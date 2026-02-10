import { useEffect, useState } from 'react'
import { Send, CheckCircle, ExternalLink, Heart } from 'lucide-react'
import './ApplicationToast.css'

/**
 * Toast notification that appears when student swipes right on a job.
 *
 * - Internal (MatchOp) offers: "Liked!" — the swipe is recorded in student_swipes.
 *   If the company also swipes right, a match is created automatically.
 * - External (scraped) jobs: "Opening Job Page!" — opens in a new tab.
 */
function ApplicationToast({ companyName, isExternal = false, onClose }) {
    const [isVisible, setIsVisible] = useState(false)
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
        // Animate in
        setTimeout(() => setIsVisible(true), 50)

        // Start exit animation after 2.5s
        const exitTimer = setTimeout(() => {
            setIsExiting(true)
        }, 2500)

        // Call onClose after exit animation
        const closeTimer = setTimeout(() => {
            onClose?.()
        }, 3000)

        return () => {
            clearTimeout(exitTimer)
            clearTimeout(closeTimer)
        }
    }, [onClose])

    return (
        <div className={`application-toast ${isVisible ? 'visible' : ''} ${isExiting ? 'exiting' : ''} ${isExternal ? 'external' : ''}`}>
            <div className="toast-icon">
                {isExternal ? <ExternalLink size={20} /> : <Heart size={20} />}
            </div>
            <div className="toast-content">
                <span className="toast-title">
                    {isExternal ? 'Opening Job Page! 🚀' : 'Liked! 💜'}
                </span>
                <span className="toast-message">
                    {isExternal ? (
                        <>Redirecting to <strong>{companyName}</strong> to apply</>
                    ) : (
                        <>You liked <strong>{companyName}</strong> — if they like you back, it's a match!</>
                    )}
                </span>
            </div>
            <div className="toast-check">
                <CheckCircle size={20} />
            </div>
        </div>
    )
}

export default ApplicationToast
