import { useEffect } from 'react'
import { CircleSlash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { track } from '../lib/analytics'
import './Checkout.css'

function CheckoutCancel() {
    const { t } = useTranslation(undefined, { useSuspense: false })
    useEffect(() => {
        track('checkout_cancel_viewed')
    }, [])

    return (
        <section className="checkout-page">
            <div className="checkout-shell checkout-result glass-card">
                <CircleSlash2 size={28} className="checkout-result-icon cancel" />
                <h1>{t('checkoutCancel.title')}</h1>
                <p className="checkout-subtitle">
                    {t('checkoutCancel.subtitle')}
                </p>
                <div className="checkout-actions">
                    <Link to="/premium" className="btn btn-primary">
                        {t('checkoutCancel.backToPremium')}
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default CheckoutCancel
