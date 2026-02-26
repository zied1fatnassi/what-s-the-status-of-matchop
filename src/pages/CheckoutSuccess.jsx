import { useEffect, useState } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { track } from '../lib/analytics'
import AuthToast from '../components/AuthToast'
import './Checkout.css'

function CheckoutSuccess() {
    const { refreshProfile } = useAuth()
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [toast, setToast] = useState(null)

    useEffect(() => {
        track('checkout_success_viewed')
    }, [])

    const handleRefreshStatus = async () => {
        if (typeof refreshProfile !== 'function') return

        setIsRefreshing(true)
        try {
            await refreshProfile()
            setToast({
                type: 'success',
                message: 'Status refreshed'
            })
        } catch {
            setToast({
                type: 'error',
                message: 'Unable to refresh status right now'
            })
        } finally {
            setIsRefreshing(false)
        }
    }

    return (
        <section className="checkout-page">
            {toast && (
                <AuthToast
                    type={toast.type}
                    message={toast.message}
                    duration={3000}
                    onClose={() => setToast(null)}
                />
            )}
            <div className="checkout-shell checkout-result glass-card">
                <CheckCircle2 size={28} className="checkout-result-icon success" />
                <h1>Checkout success</h1>
                <p className="checkout-subtitle">
                    This is a preview success page. Billing activation is not connected yet.
                </p>
                <div className="checkout-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleRefreshStatus}
                        disabled={isRefreshing}
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'is-spinning' : ''} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh status'}
                    </button>
                    <Link to="/student/swipe" className="btn btn-primary">
                        Back to Discovery
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default CheckoutSuccess
