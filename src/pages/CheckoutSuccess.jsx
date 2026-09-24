import { useEffect, useState } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { track } from '../lib/analytics'
import AuthToast from '../components/AuthToast'
import './Checkout.css'

function CheckoutSuccess() {
    const { t } = useTranslation(undefined, { useSuspense: false })
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
                message: t('checkoutSuccess.toasts.statusRefreshed')
            })
        } catch {
            setToast({
                type: 'error',
                message: t('checkoutSuccess.toasts.refreshError')
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
                <h1>{t('checkoutSuccess.title')}</h1>
                <p className="checkout-subtitle">
                    {t('checkoutSuccess.subtitle')}
                </p>
                <div className="checkout-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleRefreshStatus}
                        disabled={isRefreshing}
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'is-spinning' : ''} />
                        {isRefreshing ? t('checkoutSuccess.refreshing') : t('checkoutSuccess.refresh')}
                    </button>
                    <Link to="/student/feed" className="btn btn-primary">
                        {t('checkoutSuccess.backToDiscovery')}
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default CheckoutSuccess
