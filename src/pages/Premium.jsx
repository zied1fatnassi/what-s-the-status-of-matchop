import { useEffect, useMemo, useRef, useState } from 'react'
import {
    BadgeCheck,
    ChevronDown,
    Clock3,
    Globe2,
    Infinity as InfinityIcon,
    RefreshCw,
    Sparkles,
    Zap
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthToast from '../components/AuthToast'
import { CURRENCY, PLANS, PREMIUM_FEATURES } from '../config/pricing'
import { useAuth } from '../context/AuthContext'
import { track } from '../lib/analytics'
import { getEntitlements } from '../lib/premiumEntitlements'
import './Premium.css'

const LAST_UPSELL_SOURCE_STORAGE_KEY = 'matchop_last_upsell_source'
const UPSELL_HEADLINES = {
    global_discovery: 'Unlock international opportunities',
    daily_limit: 'Unlock unlimited swipes',
    daily_swipe_limit: 'Unlock unlimited swipes',
    personalized_mode: 'Unlock personalized matches',
    expired: 'Renew your Premium access'
}

const FAQ_ITEMS = [
    {
        question: 'When will checkout be available?',
        answer: 'Checkout is in progress. Premium UI is ready and we will activate billing in a future release.'
    },
    {
        question: 'Will my current account and matches remain?',
        answer: 'Yes. Your profile, swipes, and matches stay the same. Premium unlocks additional discovery features.'
    },
    {
        question: 'Can I switch plans later?',
        answer: 'Yes. Monthly and yearly options are both planned, and switching will be available in account settings.'
    },
    {
        question: 'What does Premium include?',
        answer: 'Premium is designed to unlock global opportunities, personalized matching, and unlimited swipe capacity.'
    }
]

const PLAN_ORDER = [PLANS.monthly, PLANS.yearly]

function getFeatureIcon(feature) {
    if (feature.includes('Unlimited')) return InfinityIcon
    if (feature.includes('Global')) return Globe2
    if (feature.includes('Personalized')) return Sparkles
    if (feature.includes('Faster')) return Zap
    if (feature.includes('Priority')) return BadgeCheck
    return Clock3
}

function Premium() {
    const isPremiumWaitlistMode = import.meta.env.VITE_PREMIUM_WAITLIST_MODE === 'true'
    const [selectedPlan, setSelectedPlan] = useState(PLANS.yearly.id)
    const [openFaq, setOpenFaq] = useState(0)
    const [waitlistEmail, setWaitlistEmail] = useState('')
    const [toast, setToast] = useState(null)
    const [source, setSource] = useState('direct')
    const [isRefreshingStatus, setIsRefreshingStatus] = useState(false)
    const waitlistInputRef = useRef(null)
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { profile, refreshProfile } = useAuth()
    const entitlements = getEntitlements(profile)
    const statusClassName = `premium-status-${entitlements.premiumStatusLabel.toLowerCase()}`
    const sourceFromQuery = searchParams.get('source')

    useEffect(() => {
        let sourceFromStorage = null

        try {
            sourceFromStorage = localStorage.getItem(LAST_UPSELL_SOURCE_STORAGE_KEY)
            localStorage.removeItem(LAST_UPSELL_SOURCE_STORAGE_KEY)
        } catch {
            sourceFromStorage = null
        }

        const resolvedSource = sourceFromQuery || sourceFromStorage || 'direct'
        setSource(resolvedSource)
        track('premium_viewed', { source: resolvedSource })
    }, [sourceFromQuery])

    const headline = useMemo(
        () => UPSELL_HEADLINES[source] || 'Premium upgrade',
        [source]
    )

    const handleJoinWaitlist = (event) => {
        event.preventDefault()
        if (!waitlistEmail.trim()) return
        setToast({
            type: 'info',
            message: 'Coming soon'
        })
        setWaitlistEmail('')
    }

    const handleRefreshStatus = async () => {
        if (typeof refreshProfile !== 'function') return

        setIsRefreshingStatus(true)
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
            setIsRefreshingStatus(false)
        }
    }

    const handlePlanSelect = (planId) => {
        if (planId !== PLANS.monthly.id && planId !== PLANS.yearly.id) return
        setSelectedPlan(planId)
        track('plan_selected', { planId })
    }

    const handleCheckoutStart = () => {
        track('checkout_started', { planId: selectedPlan, source })
        const params = new URLSearchParams({
            plan: selectedPlan,
            source
        })
        navigate(`/checkout?${params.toString()}`)
    }

    return (
        <section className="premium-page">
            {toast && (
                <AuthToast
                    type={toast.type}
                    message={toast.message}
                    duration={3000}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="premium-shell glass-card">
                <span className="premium-eyebrow">Premium</span>
                <h1>{headline}</h1>
                <p className="premium-subtitle">
                    Payments are not enabled yet. Join the waitlist now and we will notify you when checkout goes live.
                </p>

                <div className="premium-status-row">
                    <span className={`premium-status ${statusClassName}`}>
                        Status: {entitlements.premiumStatusLabel}
                    </span>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm premium-refresh-btn"
                        onClick={handleRefreshStatus}
                        disabled={isRefreshingStatus}
                    >
                        <RefreshCw size={14} className={isRefreshingStatus ? 'is-spinning' : ''} />
                        {isRefreshingStatus ? 'Refreshing...' : 'Refresh status'}
                    </button>
                </div>

                {!isPremiumWaitlistMode && (
                    <section className="premium-plan-section" aria-label="Plan selector">
                        <h2 className="premium-section-title">Choose your plan</h2>
                        <div className="premium-plan-grid">
                            {PLAN_ORDER.map((plan) => (
                                <button
                                    key={plan.id}
                                    type="button"
                                    className={`premium-plan-card ${selectedPlan === plan.id ? 'active' : ''}`}
                                    onClick={() => handlePlanSelect(plan.id)}
                                    aria-pressed={selectedPlan === plan.id}
                                >
                                    {plan.badge && <span className="premium-plan-badge">{plan.badge}</span>}
                                    <span className="premium-plan-name">{plan.label}</span>
                                    <span className="premium-plan-price">{plan.price} {CURRENCY}<span>{plan.cadence}</span></span>
                                    <span className="premium-plan-note">
                                        {plan.id === PLANS.yearly.id ? 'Billed annually, save more' : 'Flexible monthly billing'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                <section className="premium-benefits" aria-label="Premium benefits">
                    <h2 className="premium-section-title">What you unlock</h2>
                    <ul className="premium-feature-list">
                        {PREMIUM_FEATURES.map((feature) => {
                            const FeatureIcon = getFeatureIcon(feature)
                            return (
                                <li key={feature}>
                                    <FeatureIcon size={18} />
                                    {feature}
                                </li>
                            )
                        })}
                    </ul>
                </section>

                <section className="premium-faq" aria-label="Frequently asked questions">
                    <h2 className="premium-section-title">FAQ</h2>
                    <div className="premium-faq-list">
                        {FAQ_ITEMS.map((item, index) => {
                            const isOpen = openFaq === index
                            return (
                                <article key={item.question} className={`premium-faq-item ${isOpen ? 'open' : ''}`}>
                                    <button
                                        type="button"
                                        className="premium-faq-trigger"
                                        aria-expanded={isOpen}
                                        onClick={() => setOpenFaq(isOpen ? -1 : index)}
                                    >
                                        <span>{item.question}</span>
                                        <ChevronDown size={18} />
                                    </button>
                                    {isOpen && <p className="premium-faq-answer">{item.answer}</p>}
                                </article>
                            )
                        })}
                    </div>
                </section>

                <section className="premium-waitlist" aria-label="Premium waitlist">
                    <h2 className="premium-section-title">Join waitlist</h2>
                    <form className="premium-waitlist-form" onSubmit={handleJoinWaitlist}>
                        <input
                            ref={waitlistInputRef}
                            type="email"
                            value={waitlistEmail}
                            onChange={(event) => setWaitlistEmail(event.target.value)}
                            placeholder="you@example.com"
                            required
                            autoComplete="email"
                        />
                        <button type="submit" className="btn btn-primary">
                            Join waitlist
                        </button>
                    </form>
                </section>

                <div className="premium-actions">
                    {isPremiumWaitlistMode ? (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => waitlistInputRef.current?.focus()}
                        >
                            Join waitlist
                        </button>
                    ) : (
                        <button type="button" className="btn btn-primary" onClick={handleCheckoutStart}>
                            Upgrade
                        </button>
                    )}
                    <Link to="/student/swipe" className="btn btn-secondary">
                        Back to swipe
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default Premium
