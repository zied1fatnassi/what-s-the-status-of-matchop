import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { X, Heart, Star, RotateCcw, Loader, Lock, SlidersHorizontal, Globe2, Sparkles } from 'lucide-react'
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
import { readStorageJSON, writeStorageJSON } from '../../lib/localStorageState'
import './StudentSwipe.css'

const DISCOVERY_SCOPE_STORAGE_KEY = 'matchop_discovery_scope'
const LEGACY_DISCOVERY_MODE_STORAGE_KEY = 'matchop_discovery_mode'
const STUDENT_SWIPE_PREFERENCES_KEY = 'matchop_student_swipe_preferences'

const DEFAULT_SWIPE_PREFERENCES = {
    locationMode: 'all',
    opportunityType: 'all',
    category: 'all',
}

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(', ')

function normalizeSwipePreferences(value) {
    if (!value || typeof value !== 'object') return DEFAULT_SWIPE_PREFERENCES
    return {
        locationMode: value.locationMode || 'all',
        opportunityType: value.opportunityType || 'all',
        category: value.category || 'all',
    }
}

function applySwipePreferences(rawOffers, preferences) {
    const offers = Array.isArray(rawOffers) ? rawOffers : []
    const locationMode = preferences?.locationMode || 'all'
    const opportunityType = preferences?.opportunityType || 'all'
    const category = preferences?.category || 'all'

    return offers.filter((offer) => {
        const locationLabel = `${offer?.location || ''}`.toLowerCase()
        const offerType = `${offer?.type || ''}`.toLowerCase()
        const offerCategory = `${offer?.industry || offer?.department || 'general'}`.toLowerCase()

        if (locationMode === 'remote' && !locationLabel.includes('remote')) return false
        if (locationMode === 'onsite' && locationLabel.includes('remote')) return false

        if (opportunityType !== 'all' && !offerType.includes(opportunityType)) return false
        if (category !== 'all' && offerCategory !== category.toLowerCase()) return false

        return true
    })
}

function StudentSwipe() {
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
    const [toastTitle, setToastTitle] = useState('Application was sent!')
    const [toastVariant, setToastVariant] = useState('application')
    const [showPreferencesModal, setShowPreferencesModal] = useState(false)
    const [swipePreferences, setSwipePreferences] = useState(() => normalizeSwipePreferences(
        readStorageJSON(STUDENT_SWIPE_PREFERENCES_KEY, DEFAULT_SWIPE_PREFERENCES)
    ))
    const { t } = useTranslation(undefined, { useSuspense: false })
    const navigate = useNavigate()
    const topCardRef = useRef(null)
    const preloadedAssetUrlsRef = useRef(new Set())
    const preferencesModalRef = useRef(null)
    const preferencesTriggerRef = useRef(null)
    const preferencesReturnFocusRef = useRef(null)

    const closePreferencesModal = useCallback(() => {
        setShowPreferencesModal(false)
        queueMicrotask(() => {
            const target = preferencesReturnFocusRef.current
            if (target && typeof target.focus === 'function') {
                target.focus()
            }
        })
    }, [])

    const openPreferencesModal = useCallback((event) => {
        preferencesReturnFocusRef.current = event?.currentTarget || document.activeElement
        setShowPreferencesModal(true)
    }, [])

    useEffect(() => {
        const filteredOffers = applySwipePreferences(realOffers, swipePreferences)
        setOffers(filteredOffers)
        setCurrentIndex(0)
    }, [realOffers, swipePreferences])

    useEffect(() => {
        writeStorageJSON(STUDENT_SWIPE_PREFERENCES_KEY, swipePreferences)
    }, [swipePreferences])

    const { user, profile, isLoading: authLoading } = useAuth()
    const modeInitializedRef = useRef(false)
    const entitlements = getEntitlements(profile)
    const isExpiredPremium = entitlements.premiumStatusLabel === 'Expired'
    const canUsePremiumMode = isPremiumEnabled && (effectivePlan === 'premium' || entitlements.premiumActive)
    const showGlobalTab = isPremiumEnabled
    const activeScope = showGlobalTab && mode === 'premium' ? 'global' : 'local'
    const lockedGlobalCtaLabel = isExpiredPremium
        ? (isPremiumWaitlistMode ? 'Join waitlist' : 'Renew Premium')
        : (isPremiumWaitlistMode ? 'Join waitlist' : 'Upgrade to unlock Global')

    const currentOffer = offers[currentIndex]
    const hasMoreOffers = currentIndex < offers.length
    const isLocalEmptyState = !hasMoreOffers && activeScope === 'local'

    const categoryOptions = useMemo(() => {
        const categories = new Set(['all'])
        ;(realOffers || []).forEach((offer) => {
            const nextCategory = offer?.industry || offer?.department || 'General'
            categories.add(nextCategory)
        })
        return Array.from(categories)
    }, [realOffers])

    useEffect(() => {
        if (!hasMoreOffers) return
        const queuedOffers = offers.slice(currentIndex + 1, currentIndex + 3)

        queuedOffers.forEach((offer) => {
            const assetUrl = offer?.companyLogo
            if (!assetUrl || preloadedAssetUrlsRef.current.has(assetUrl)) return
            const image = new Image()
            image.src = assetUrl
            preloadedAssetUrlsRef.current.add(assetUrl)
        })
    }, [currentIndex, offers, hasMoreOffers])

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

    const updateSwipePreference = (key, value) => {
        setSwipePreferences((prev) => ({
            ...prev,
            [key]: value
        }))
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

    useEffect(() => {
        if (!showPreferencesModal) return undefined
        if (!preferencesReturnFocusRef.current) {
            preferencesReturnFocusRef.current = document.activeElement
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                closePreferencesModal()
                return
            }

            if (event.key !== 'Tab' || !preferencesModalRef.current) return
            const focusableElements = Array.from(preferencesModalRef.current.querySelectorAll(FOCUSABLE_SELECTOR))
            if (focusableElements.length === 0) return

            const firstElement = focusableElements[0]
            const lastElement = focusableElements[focusableElements.length - 1]

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault()
                lastElement.focus()
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault()
                firstElement.focus()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        queueMicrotask(() => {
            const firstField = preferencesModalRef.current?.querySelector('select')
            firstField?.focus()
        })

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [showPreferencesModal, closePreferencesModal])

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
                    user?.user_metadata?.name || 'Student',
                    offerToSwipe.company,
                    'Company'
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
                <p>Finding the best jobs for you...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="swipe-page error">
                <div className="glass-card">
                    <h3 className="text-red-500">Oops! Something went wrong.</h3>
                    <p>{error}</p>
                    <button className="btn btn-primary mt-4" onClick={() => refresh()}>Try Again</button>
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
                            aria-label="Discovery scope"
                        >
                            <button
                                type="button"
                                className={`stack-mode-option ${activeScope === 'local' ? 'active' : ''}`}
                                onClick={() => handleScopeChange('local')}
                                disabled={loading}
                            >
                                <span className="stack-mode-option-label">
                                    Local
                                    <span className="stack-mode-option-badge stack-mode-option-badge-free">Free</span>
                                </span>
                                <span className="stack-mode-option-description">Local / regional opportunities</span>
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
                                        Global
                                        <span
                                            className={`stack-mode-option-badge ${
                                                isExpiredPremium
                                                    ? 'stack-mode-option-badge-expired'
                                                    : 'stack-mode-option-badge-premium'
                                            }`}
                                        >
                                            {isExpiredPremium ? 'Expired' : 'Premium'}
                                        </span>
                                    </span>
                                    <span className="stack-mode-option-description">International opportunities (Premium)</span>
                                </button>
                            )}
                        </div>

                        {notice && (
                            <div className="stack-mode-notice">
                                {notice}
                            </div>
                        )}

                        {showGlobalTab && !canUsePremiumMode && (
                            <section className="global-teaser" aria-label="Global opportunities teaser">
                                <h3 className="global-teaser-title">Preview: Global opportunities</h3>

                                {isExpiredPremium && (
                                    <p className="global-teaser-status">
                                        Your Premium access is expired.
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
                                    <li>Global reach</li>
                                    <li>Faster matches</li>
                                    <li>Unlimited swipes</li>
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
                    <div className="no-more-offers glass-card hover-lift">
                        {isLocalEmptyState ? (
                            <>
                                <div className="empty-icon">📍</div>
                                <h2>No offers nearby.</h2>
                                <p>Try updating your discovery preferences or switch to Global mode.</p>
                                <div className="no-offers-actions">
                                    <button
                                        ref={preferencesTriggerRef}
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={openPreferencesModal}
                                    >
                                        <SlidersHorizontal size={16} />
                                        Adjust preferences
                                    </button>
                                    {showGlobalTab && canUsePremiumMode && (
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => handleScopeChange('global')}
                                        >
                                            <Globe2 size={16} />
                                            Switch to Global
                                        </button>
                                    )}
                                </div>

                                {showGlobalTab && !canUsePremiumMode && (
                                    <section className="empty-global-lock" aria-label="Global premium lock">
                                        <p className="empty-global-lock-title">Global is Premium</p>
                                        <ul className="empty-global-lock-benefits">
                                            <li>Access global opportunities</li>
                                            <li>Reach more companies faster</li>
                                            <li>Unlock unlimited discovery</li>
                                        </ul>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleLockedGlobalCta}
                                        >
                                            <Sparkles size={16} />
                                            Unlock Premium
                                        </button>
                                    </section>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="empty-icon">🎯</div>
                                <h2>You're all caught up!</h2>
                                <p>You've seen all available opportunities. Check back later for new matches.</p>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        setCurrentIndex(0)
                                        setSwipeHistory([])
                                        refresh()
                                    }}
                                >
                                    Refresh Jobs <RotateCcw size={18} className="ml-2" />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {showPreferencesModal && (
                <div
                    className="swipe-preferences-overlay"
                    role="presentation"
                    onClick={closePreferencesModal}
                >
                    <div
                        ref={preferencesModalRef}
                        className="swipe-preferences-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="swipe-preferences-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="swipe-preferences-modal-header">
                            <h3 id="swipe-preferences-title">Adjust preferences</h3>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={closePreferencesModal}
                                aria-label="Close preferences"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <p className="swipe-preferences-modal-copy">
                            Preview: preferences are saved on this device.
                        </p>

                        <label className="swipe-preferences-field">
                            <span>Location mode</span>
                            <select
                                value={swipePreferences.locationMode}
                                onChange={(event) => updateSwipePreference('locationMode', event.target.value)}
                            >
                                <option value="all">All</option>
                                <option value="remote">Remote-first</option>
                                <option value="onsite">Onsite / hybrid</option>
                            </select>
                        </label>

                        <label className="swipe-preferences-field">
                            <span>Opportunity type</span>
                            <select
                                value={swipePreferences.opportunityType}
                                onChange={(event) => updateSwipePreference('opportunityType', event.target.value)}
                            >
                                <option value="all">All</option>
                                <option value="internship">Internship</option>
                                <option value="full-time">Full-time</option>
                                <option value="part-time">Part-time</option>
                                <option value="contract">Contract</option>
                            </select>
                        </label>

                        <label className="swipe-preferences-field">
                            <span>Category</span>
                            <select
                                value={swipePreferences.category}
                                onChange={(event) => updateSwipePreference('category', event.target.value)}
                            >
                                {categoryOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="swipe-preferences-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setSwipePreferences(DEFAULT_SWIPE_PREFERENCES)
                                    closePreferencesModal()
                                }}
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={closePreferencesModal}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
