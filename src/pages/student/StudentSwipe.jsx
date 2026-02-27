import { useState, useEffect, useRef } from 'react'
import { X, Heart, Star, RotateCcw, Loader, Lock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SwipeCard from '../../components/SwipeCard'
import MatchModal from '../../components/MatchModal'
import OfferDetailModal from '../../components/OfferDetailModal'
import ApplicationToast from '../../components/ApplicationToast'
import MatchToast from '../../components/MatchToast'
import { useAuth } from '../../context/AuthContext'
import { useApplications } from '../../context/ApplicationContext'
import { useJobOffers } from '../../hooks/useJobOffers'
import { useMatchListener } from '../../hooks/useMatchListener'
import { getEntitlements } from '../../lib/premiumEntitlements'
import { isLimitReachedCode } from '../../lib/swipeLimit'
import { useBilingualText } from '../../lib/useBilingualText'
import './StudentSwipe.css'

const DISCOVERY_SCOPE_STORAGE_KEY = 'matchop_discovery_scope'
const LEGACY_DISCOVERY_MODE_STORAGE_KEY = 'matchop_discovery_mode'

function StudentSwipe() {
    const tr = useBilingualText()
    const isPremiumEnabled = import.meta.env.VITE_PREMIUM_ENABLED !== 'false'
    const isPremiumWaitlistMode = import.meta.env.VITE_PREMIUM_WAITLIST_MODE === 'true'
    const {
        offers: realOffers,
        loading,
        error,
        notice,
        paywall,
        mode,
        setMode,
        effectivePlan,
        dailySwipeUsage,
        isSwipeStackV2Enabled,
        swipe,
        refresh,
        clearPaywall
    } = useJobOffers()
    const { openPremiumUpsell } = useApplications()
    const { newMatch, clearMatch } = useMatchListener()
    const [offers, setOffers] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [showMatch, setShowMatch] = useState(false)
    const [matchedOffer, setMatchedOffer] = useState(null)
    const [swipeHistory, setSwipeHistory] = useState([])
    const [selectedOffer, setSelectedOffer] = useState(null)
    const [showToast, setShowToast] = useState(false)
    const [toastIsExternal, setToastIsExternal] = useState(false)
    const [toastTitle, setToastTitle] = useState('')
    const [toastVariant, setToastVariant] = useState('application')
    const { t } = useTranslation(undefined, { useSuspense: false })
    const navigate = useNavigate()
    const topCardRef = useRef(null)

    useEffect(() => {
        setOffers(realOffers || [])
        setCurrentIndex(0)
    }, [realOffers])

    const { user, profile, isLoading: authLoading } = useAuth()
    const modeInitializedRef = useRef(false)
    const entitlements = getEntitlements(profile)
    const isExpiredPremium = entitlements.premiumStatusLabel === 'Expired'
    const canUsePremiumMode = isPremiumEnabled && (effectivePlan === 'premium' || entitlements.premiumActive)
    const showGlobalTab = isPremiumEnabled
    const activeScope = showGlobalTab && mode === 'premium' ? 'global' : 'local'
    const lockedGlobalCtaLabel = isExpiredPremium
        ? (isPremiumWaitlistMode ? tr('Join waitlist', "Rejoindre la liste d'attente") : tr('Renew Premium', 'Renouveler Premium'))
        : (isPremiumWaitlistMode ? tr('Join waitlist', "Rejoindre la liste d'attente") : tr('Upgrade to unlock Global', 'Passez premium pour debloquer Global'))

    const currentOffer = offers[currentIndex]
    const hasMoreOffers = currentIndex < offers.length

    const handleLockedGlobalCta = () => {
        if (isExpiredPremium) {
            navigate('/premium?source=expired')
            return
        }
        openPremiumUpsell('global_discovery')
    }

    const handleScopeChange = (nextScope) => {
        if (!isSwipeStackV2Enabled) return
        if (nextScope !== 'local' && nextScope !== 'global') return
        if (nextScope === 'global' && !showGlobalTab) return
        const nextMode = nextScope === 'global' ? 'premium' : 'standard'
        if (nextMode === mode) return
        if (nextScope === 'global' && !canUsePremiumMode) {
            if (isExpiredPremium) {
                navigate('/premium?source=expired')
                return
            }
            openPremiumUpsell('global_discovery')
            return
        }
        clearPaywall()
        setMode(nextMode)
    }

    useEffect(() => {
        if (!isSwipeStackV2Enabled) return
        if (authLoading) return
        if (modeInitializedRef.current) return

        let preferredScope = 'local'
        try {
            if (showGlobalTab) {
                const storedScope = localStorage.getItem(DISCOVERY_SCOPE_STORAGE_KEY)
                if (storedScope === 'local' || storedScope === 'global') {
                    preferredScope = storedScope
                } else {
                    const legacyMode = localStorage.getItem(LEGACY_DISCOVERY_MODE_STORAGE_KEY)
                    if (legacyMode === 'premium') preferredScope = 'global'
                    if (legacyMode === 'standard') preferredScope = 'local'
                }
            }
        } catch {
            preferredScope = 'local'
        }

        if (!showGlobalTab || (preferredScope === 'global' && !canUsePremiumMode)) {
            preferredScope = 'local'
        }

        const preferredMode = preferredScope === 'global' && showGlobalTab ? 'premium' : 'standard'
        if (preferredMode !== mode) {
            clearPaywall()
            setMode(preferredMode)
        }

        modeInitializedRef.current = true
    }, [isSwipeStackV2Enabled, authLoading, canUsePremiumMode, mode, clearPaywall, setMode, showGlobalTab])

    useEffect(() => {
        if (!isSwipeStackV2Enabled) return
        try {
            const persistedScope = showGlobalTab && mode === 'premium' && canUsePremiumMode ? 'global' : 'local'
            localStorage.setItem(DISCOVERY_SCOPE_STORAGE_KEY, persistedScope)
            localStorage.removeItem(LEGACY_DISCOVERY_MODE_STORAGE_KEY)
        } catch {
            // Ignore storage write errors in restricted environments.
        }
    }, [mode, canUsePremiumMode, isSwipeStackV2Enabled, showGlobalTab])

    useEffect(() => {
        if (!paywall) return
        if (!showGlobalTab) {
            clearPaywall()
            if (mode === 'premium') {
                setMode('standard')
            }
            return
        }
        if (isExpiredPremium) {
            navigate('/premium?source=expired')
            clearPaywall()
            if (mode === 'premium') {
                setMode('standard')
            }
            return
        }
        openPremiumUpsell('global_discovery')
        clearPaywall()
        if (mode === 'premium') {
            setMode('standard')
        }
    }, [paywall, mode, setMode, clearPaywall, openPremiumUpsell, isExpiredPremium, navigate, showGlobalTab])

    const handleSwipe = async (direction) => {
        if (!currentOffer) return
        if (mode === 'standard' && !canUsePremiumMode && dailySwipeUsage?.reached) {
            openPremiumUpsell('daily_limit', {
                used: dailySwipeUsage?.used ?? null,
                limit: dailySwipeUsage?.limit ?? null
            })
            return
        }

        const offerToSwipe = currentOffer
        const isExternal = offerToSwipe.isExternal === true && !!offerToSwipe.externalUrl

        if (!isExternal) {
            const swipeResult = await swipe(offerToSwipe.id, direction)
            if (isLimitReachedCode(swipeResult?.code)) {
                openPremiumUpsell('daily_limit', {
                    used: swipeResult?.usage?.used ?? dailySwipeUsage?.used ?? null,
                    limit: swipeResult?.usage?.limit ?? dailySwipeUsage?.limit ?? null
                })
                return
            }

            if (swipeResult?.error) {
                return
            }
        }

        setSwipeHistory([...swipeHistory, { offer: offerToSwipe, direction }])

        const nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)

        if (direction === 'left') {
            setToastIsExternal(false)
            setToastTitle('Not interested')
            setToastVariant('rejected')
            setShowToast(true)
        } else if (direction === 'right' || direction === 'super') {
            setToastIsExternal(isExternal)
            if (direction === 'super') {
                setToastTitle('Added to favorites')
                setToastVariant('favorites')
            } else {
                setToastTitle('Application was sent!')
                setToastVariant('application')
            }
            setShowToast(true)
        }

        if ((direction === 'right' || direction === 'super') && !isExternal && offerToSwipe.hasMatched) {
            setMatchedOffer(offerToSwipe)

            import('../../lib/email').then(({ sendMatchEmail }) => {
                sendMatchEmail(
                    user?.email,
                    user?.user_metadata?.name || tr('Student', 'Etudiant'),
                    offerToSwipe.company,
                    tr('Company', 'Entreprise')
                )
            })

            setTimeout(() => setShowMatch(true), 500)
        }
    }

    const handleUndo = () => {
        if (swipeHistory.length === 0) return
        setSwipeHistory(swipeHistory.slice(0, -1))
        setCurrentIndex(currentIndex - 1)
    }

    const handleViewDetails = (offer) => {
        setSelectedOffer(offer)
    }

    if (loading) {
        return (
            <div className="swipe-page loading">
                <Loader className="animate-spin text-primary" size={48} />
                <p>{tr('Finding the best jobs for you...', 'Recherche des meilleures offres pour vous...')}</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="swipe-page error">
                <div className="glass-card">
                    <h3 className="text-red-500">{tr('Oops! Something went wrong.', 'Oups ! Une erreur est survenue.')}</h3>
                    <p>{error}</p>
                    <button className="btn btn-primary mt-4" onClick={() => refresh()}>{tr('Try Again', 'Reessayer')}</button>
                </div>
            </div>
        )
    }

    return (
        <div className="swipe-page">
            <div className="swipe-container">
                {isSwipeStackV2Enabled && (
                    <div className="stack-mode-panel">
                        <div
                            className={`stack-mode-toggle ${showGlobalTab ? '' : 'stack-mode-toggle-single'}`.trim()}
                            role="tablist"
                            aria-label={tr('Discovery scope', 'Portee de decouverte')}
                        >
                            <button
                                type="button"
                                className={`stack-mode-option ${activeScope === 'local' ? 'active' : ''}`}
                                onClick={() => handleScopeChange('local')}
                                disabled={loading}
                            >
                                <span className="stack-mode-option-label">
                                    {tr('Local', 'Local')}
                                    <span className="stack-mode-option-badge stack-mode-option-badge-free">{tr('Free', 'Gratuit')}</span>
                                </span>
                                <span className="stack-mode-option-description">{tr('Local / regional opportunities', 'Opportunites locales / regionales')}</span>
                            </button>
                            {showGlobalTab && (
                                <button
                                    type="button"
                                    className={`stack-mode-option ${activeScope === 'global' ? 'active' : ''} ${!canUsePremiumMode ? 'locked' : ''}`}
                                    onClick={() => handleScopeChange('global')}
                                    disabled={loading}
                                    aria-disabled={!canUsePremiumMode}
                                >
                                    <span className="stack-mode-option-label">
                                        {!canUsePremiumMode && <Lock size={14} aria-hidden="true" />}
                                        {tr('Global', 'Global')}
                                        <span
                                            className={`stack-mode-option-badge ${
                                                isExpiredPremium
                                                    ? 'stack-mode-option-badge-expired'
                                                    : 'stack-mode-option-badge-premium'
                                            }`}
                                        >
                                            {isExpiredPremium ? tr('Expired', 'Expire') : tr('Premium', 'Premium')}
                                        </span>
                                    </span>
                                    <span className="stack-mode-option-description">{tr('International opportunities (Premium)', 'Opportunites internationales (Premium)')}</span>
                                </button>
                            )}
                        </div>

                        {notice && (
                            <div className="stack-mode-notice">
                                {notice}
                            </div>
                        )}

                        {showGlobalTab && !canUsePremiumMode && (
                            <section className="global-teaser" aria-label={tr('Global opportunities teaser', 'Apercu opportunites globales')}>
                                <h3 className="global-teaser-title">{tr('Preview: Global opportunities', 'Apercu : opportunites globales')}</h3>

                                {isExpiredPremium && (
                                    <p className="global-teaser-status">
                                        {tr('Your Premium access is expired.', 'Votre acces Premium est expire.')}
                                    </p>
                                )}

                                <div className="global-teaser-cards" aria-hidden="true">
                                    {[1, 2, 3].map((card) => (
                                        <article key={card} className="global-teaser-card">
                                            <span className="global-teaser-line global-teaser-line-title" />
                                            <span className="global-teaser-line global-teaser-line-meta" />
                                            <span className="global-teaser-line global-teaser-line-meta short" />
                                        </article>
                                    ))}
                                </div>

                                <ul className="global-teaser-features">
                                    <li>{tr('Global reach', 'Portee mondiale')}</li>
                                    <li>{tr('Faster matches', 'Matchs plus rapides')}</li>
                                    <li>{tr('Unlimited swipes', 'Swipes illimites')}</li>
                                </ul>

                                <button
                                    type="button"
                                    className="btn btn-primary global-teaser-cta"
                                    onClick={handleLockedGlobalCta}
                                >
                                    {lockedGlobalCtaLabel}
                                </button>
                            </section>
                        )}
                    </div>
                )}

                <section className="swipe-referral-cta" aria-label={t('referrals.cta.sectionAria')}>
                    <div>
                        <h3 className="swipe-referral-cta-title">{t('referrals.cta.title')}</h3>
                        <p className="swipe-referral-cta-copy">{t('referrals.cta.body')}</p>
                    </div>
                    <Link to="/student/referrals" className="btn btn-secondary">
                        {t('referrals.cta.action')}
                    </Link>
                </section>

                {hasMoreOffers ? (
                    <>
                        <div className="cards-stack">
                            {offers.slice(currentIndex, currentIndex + 2).reverse().map((offer, index) => (
                                <SwipeCard
                                    key={offer.id}
                                    offer={offer}
                                    onSwipe={handleSwipe}
                                    onViewDetails={handleViewDetails}
                                    isTop={index === offers.slice(currentIndex, currentIndex + 2).length - 1}
                                    ref={index === offers.slice(currentIndex, currentIndex + 2).length - 1 ? topCardRef : null}
                                />
                            ))}
                        </div>

                        <div className="swipe-actions">
                            <button
                                className="action-btn undo"
                                onClick={handleUndo}
                                disabled={swipeHistory.length === 0}
                            >
                                <RotateCcw size={24} />
                            </button>
                            <button
                                className="action-btn pass"
                                onClick={() => {
                                    if (topCardRef.current) topCardRef.current.triggerSwipe('left')
                                    else handleSwipe('left')
                                }}
                            >
                                <X size={32} />
                            </button>
                            <button
                                className="action-btn super-like"
                                onClick={() => {
                                    if (topCardRef.current) topCardRef.current.triggerSwipe('super')
                                    else handleSwipe('super')
                                }}
                            >
                                <Star size={24} />
                            </button>
                            <button
                                className="action-btn like"
                                onClick={() => {
                                    if (topCardRef.current) topCardRef.current.triggerSwipe('right')
                                    else handleSwipe('right')
                                }}
                            >
                                <Heart size={32} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="no-more-offers glass-card hover-lift" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="empty-icon text-6xl mb-4">🎯</div>
                        <h2 className="text-2xl font-bold mb-2">{tr("You're all caught up!", 'Vous etes a jour !')}</h2>
                        <p className="text-muted mb-6">{tr(
                            "You've seen all available opportunities. Check back later for new matches.",
                            'Vous avez vu toutes les opportunites disponibles. Revenez plus tard pour de nouvelles offres.'
                        )}</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                setCurrentIndex(0)
                                setSwipeHistory([])
                                refresh() // Explicitly call refresh
                            }}
                        >
                            {tr('Refresh Jobs', 'Actualiser les offres')} <RotateCcw size={18} className="ml-2" />
                        </button>
                    </div>
                )}
            </div>

            {/* Application Toast */}
            {showToast && (
                <ApplicationToast
                    title={toastTitle}
                    variant={toastVariant}
                    isExternal={toastIsExternal}
                    onClose={() => setShowToast(false)}
                />
            )}

            {/* Match Modal */}
            {showMatch && (
                <MatchModal
                    match={matchedOffer}
                    onClose={() => setShowMatch(false)}
                    userType="student"
                />
            )}

            {/* Offer Detail Modal */}
            {selectedOffer && (
                <OfferDetailModal
                    offer={selectedOffer}
                    onClose={() => setSelectedOffer(null)}
                />
            )}

            {/* Real-time Match Toast */}
            {newMatch && (
                <MatchToast
                    match={newMatch}
                    onClose={clearMatch}
                />
            )}
        </div>
    )
}

export default StudentSwipe
