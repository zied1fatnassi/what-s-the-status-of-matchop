import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import './Premium.css'

function Premium() {
    return (
        <section className="premium-page">
            <div className="premium-shell glass-card">
                <span className="premium-eyebrow">Premium</span>
                <h1>Premium upgrade</h1>
                <p className="premium-subtitle">
                    Payments are not enabled yet. This page is a placeholder for checkout and plan management.
                </p>

                <ul className="premium-feature-list">
                    <li><CheckCircle2 size={18} /> Unlimited swipes</li>
                    <li><CheckCircle2 size={18} /> Global reach</li>
                    <li><CheckCircle2 size={18} /> Hyper-personalized stack</li>
                </ul>

                <div className="premium-actions">
                    <button type="button" className="btn btn-primary" disabled>
                        Checkout coming soon
                    </button>
                    <Link to="/student/swipe" className="btn btn-secondary">
                        Back to swipe
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default Premium

