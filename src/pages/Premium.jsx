import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
const UPSELL_HEADLINE_KEYS = {
    global_discovery: 'premium.headlines.global_discovery',
    daily_limit: 'premium.headlines.daily_limit',
    daily_swipe_limit: 'premium.headlines.daily_swipe_limit',
    personalized_mode: 'premium.headlines.personalized_mode',
    expired: 'premium.headlines.expired'
}

const FAQ_ITEMS = [
    {
        questionKey: 'premium.faq.whenAvailable.question',
        answerKey: 'premium.faq.whenAvailable.answer'
    },
    {
        questionKey: 'premium.faq.switchPlans.question',
        answerKey: 'premium.faq.switchPlans.answer'
    },
    {
        questionKey: 'premium.faq.whatIncludes.question',
        answerKey: 'premium.faq.whatIncludes.answer'
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
    const { t } = useTranslation(undefined, { useSuspense: false })
    const [selectedPlan, setSelectedPlan] = useState(PLANS.yearly.id)
    const [openFaq, setOpenFaq] = useState(-1)
    const [toast, setToast] = useState(null)
    const [source, setSource] = useState('direct')
    const [isRefreshingStatus, setIsRefreshingStatus] = useState(false)
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { profile, refreshProfile } = useAuth()
    const entitlements = getEntitlements(profile)
    const statusClassName = `premium-status-${entitlements.premiumStatusLabel.toLowerCase()}`
    const sourceFromQuery = searchParams.get('source')
    const visibleFeatures = useMemo(() => PREMIUM_FEATURES.slice(0, 3), [])

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

    const headline = useMemo(() => {
        const key = UPSELL_HEADLINE_KEYS[source] || 'premium.headlines.default'
        return t(key)
    }, [source, t])

    const handleRefreshStatus = async () => {
        if (typeof refreshProfile !== 'function') return

        setIsRefreshingStatus(true)
        try {
            await refreshProfile()
            setToast({
                type: 'success',
                message: t('premium.toasts.statusRefreshed')
            })
        } catch {
            setToast({
                type: 'error',
                message: t('premium.toasts.refreshError')
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
                <span className="premium-eyebrow">{t('premium.eyebrow')}</span>
                <h1>{headline}</h1>
                <p className="premium-subtitle">
                    {t('premium.subtitle')}
                </p>

                <div className="premium-status-row">
                    <span className={`premium-status ${statusClassName}`}>
                        {t('premium.statusLabel')}: {t(`premium.statusValues.${entitlements.premiumStatusLabel.toLowerCase()}`)}
                    </span>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm premium-refresh-btn"
                        onClick={handleRefreshStatus}
                        disabled={isRefreshingStatus}
                    >
                        <RefreshCw size={14} className={isRefreshingStatus ? 'is-spinning' : ''} />
                        {isRefreshingStatus ? t('premium.refreshing') : t('premium.refresh')}
                    </button>
                </div>

                <section className="premium-benefits" aria-label={t('premium.aria.benefits')}>
                    <h2 className="premium-section-title">{t('premium.benefitsTitle')}</h2>
                    <ul className="premium-feature-list">
                        {visibleFeatures.map((feature) => {
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

                <section className="premium-plan-section" aria-label={t('premium.aria.planSelector')}>
                    <h2 className="premium-section-title">{t('premium.planSectionTitle')}</h2>
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
                                    {plan.id === PLANS.yearly.id ? t('premium.planNotes.yearly') : t('premium.planNotes.monthly')}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="premium-faq" aria-label={t('premium.aria.faq')}>
                    <h2 className="premium-section-title">{t('premium.faqTitle')}</h2>
                    <div className="premium-faq-list">
                        {FAQ_ITEMS.map((item, index) => {
                            const isOpen = openFaq === index
                            return (
                                <article key={item.questionKey} className={`premium-faq-item ${isOpen ? 'open' : ''}`}>
                                    <button
                                        type="button"
                                        className="premium-faq-trigger"
                                        aria-expanded={isOpen}
                                        onClick={() => setOpenFaq(isOpen ? -1 : index)}
                                    >
                                        <span>{t(item.questionKey)}</span>
                                        <ChevronDown size={18} />
                                    </button>
                                    {isOpen && <p className="premium-faq-answer">{t(item.answerKey)}</p>}
                                </article>
                            )
                        })}
                    </div>
                </section>

                <div className="premium-actions">
                    <button type="button" className="btn btn-primary" onClick={handleCheckoutStart}>
                        {t('premium.upgradeAction')}
                    </button>
                    <Link to="/student/swipe" className="btn btn-secondary">
                        {t('premium.backToSwipe')}
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default Premium
