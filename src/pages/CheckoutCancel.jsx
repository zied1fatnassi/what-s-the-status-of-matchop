import { useEffect } from 'react'
import { CircleSlash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { track } from '../lib/analytics'
import './Checkout.css'

function CheckoutCancel() {
    useEffect(() => {
        track('checkout_cancel_viewed')
    }, [])

    return (
        <section className="checkout-page">
            <div className="checkout-shell checkout-result glass-card">
                <CircleSlash2 size={28} className="checkout-result-icon cancel" />
                <h1>Checkout canceled</h1>
                <p className="checkout-subtitle">
                    No changes were made. You can return to Premium any time.
                </p>
                <div className="checkout-actions">
                    <Link to="/premium" className="btn btn-primary">
                        Back to Premium
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default CheckoutCancel
