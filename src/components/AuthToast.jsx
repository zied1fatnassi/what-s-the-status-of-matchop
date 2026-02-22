import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, X, Info } from 'lucide-react'
import './AuthToast.css'

/**
 * Toast notification for auth-related events
 * Shows success/error messages and auto-dismisses
 */
function AuthToast({ type = 'success', message, duration = 5000, onClose }) {
    const [isVisible, setIsVisible] = useState(true)
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose()
        }, duration)

        return () => clearTimeout(timer)
    }, [duration])

    const handleClose = () => {
        setIsExiting(true)
        setTimeout(() => {
            setIsVisible(false)
            onClose?.()
        }, 300) // Match animation duration
    }

    if (!isVisible) return null

    const icons = {
        success: <CheckCircle size={24} />,
        error: <XCircle size={24} />,
        info: <Info size={24} />
    }

    return (
        <div className={`auth-toast auth-toast-${type} ${isExiting ? 'exiting' : ''}`}>
            <div className="auth-toast-icon">
                {icons[type]}
            </div>
            <div className="auth-toast-content">
                <p>{message}</p>
            </div>
            <button
                type="button"
                className="auth-toast-close"
                onClick={handleClose}
                aria-label="Close notification"
            >
                <X size={18} />
            </button>
        </div>
    )
}

export default AuthToast
