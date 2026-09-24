import { useEffect } from 'react'
import { X, WifiOff, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import './ErrorToast.css'

/**
 * Toast notification for errors and success messages
 * Auto-dismisses after a set duration
 */
function ErrorToast({ type = 'error', message, onClose, duration = 5000 }) {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(onClose, duration)
            return () => clearTimeout(timer)
        }
    }, [duration, onClose])

    const getIcon = () => {
        switch (type) {
            case 'error':
                return <AlertTriangle size={20} />
            case 'success':
                return <CheckCircle size={20} />
            case 'network':
                return <WifiOff size={20} />
            case 'info':
                return <Info size={20} />
            default:
                return <AlertTriangle size={20} />
        }
    }

    const getTitle = () => {
        switch (type) {
            case 'error':
                return 'Error'
            case 'success':
                return 'Success'
            case 'network':
                return 'Connection Error'
            case 'info':
                return 'Info'
            default:
                return 'Error'
        }
    }

    return (
        <div className={`error-toast error-toast-${type} animate-slide-in`}>
            <div className="error-toast-icon">
                {getIcon()}
            </div>
            <div className="error-toast-content">
                <div className="error-toast-title">{getTitle()}</div>
                <div className="error-toast-message">{message}</div>
            </div>
            <button className="error-toast-close" onClick={onClose}>
                <X size={18} />
            </button>
        </div>
    )
}

export default ErrorToast
