import { useState, useEffect, useMemo, useRef } from 'react'
import { RotateCcw, Loader, Globe2, Sparkles, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import VerticalOpportunityFeed from '../../components/discovery/VerticalOpportunityFeed'
import StudentBottomNav from '../../components/navigation/StudentBottomNav'
import MatchModal from '../../components/MatchModal'
import OfferDetailModal from '../../components/OfferDetailModal'
import ApplicationToast from '../../components/ApplicationToast'
import MatchToast from '../../components/MatchToast'
import OfferScopeToggle from '../../components/offers/OfferScopeToggle'
import PreferencesButton from '../../components/offers/PreferencesButton'
import PreferencesDrawerOrModal from '../../components/offers/PreferencesDrawerOrModal'
import Logo from '../../components/Logo'
import { useAuth } from '../../context/AuthContext'
import { useApplications } from '../../context/ApplicationContext'
import { useJobOffers } from '../../hooks/useJobOffers'
import { useMatchListener } from '../../hooks/useMatchListener'
import { usePremiumGate } from '../../hooks/usePremiumGate'
import { isLimitReachedCode } from '../../lib/swipeLimit'
import { readStorageJSON, writeStorageJSON } from '../../lib/localStorageState'
import { useBilingualText } from '../../lib/useBilingualText'
import './StudentSwipe.css'

const DISCOVERY_SCOPE_STORAGE_KEY = 'matchop_discovery_scope'
const LEGACY_DISCOVERY_MODE_STORAGE_KEY = 'matchop_discovery_mode'
const STUDENT_SWIPE_PREFERENCES_KEY = 'matchop_student_swipe_preferences'

const DEFAULT_SWIPE_PREFERENCES = {
    locationMode: 'all',
    opportunityType: 'all',
    category: 'all',
    locationQuery: '',
    radiusKm: 'any',
}

const LOCATION_MODE_VALUES = new Set(['all', 'remote', 'onsite'])
const OPPORTUNITY_TYPE_VALUES = new Set(['all', 'internship', 'full-time', 'part-time', 'contract'])
const RADIUS_VALUES = new Set(['any', '25', '50', '100', '250'])

function normalizeSwipePreferences(value) {
    if (!value || typeof value !== 'object') return DEFAULT_SWIPE_PREFERENCES

    const locationMode = LOCATION_MODE_VALUES.has(value.locationMode)
        ? value.locationMode
        : 'all'
    const opportunityType = OPPORTUNITY_TYPE_VALUES.has(value.opportunityType)
        ? value.opportunityType
        : 'all'
    const radiusKm = RADIUS_VALUES.has(String(value.radiusKm))
        ? String(value.radiusKm)
        : 'any'

    return {
        locationMode,
        opportunityType,
        category: `${value.category || 'all'}` || 'all',
        locationQuery: `${value.locationQuery || ''}`,
        radiusKm,
    }
}

function applySwipePreferences(rawOffers, preferences) {
    const offers = Array.isArray(rawOffers) ? rawOffers : []
    const locationMode = preferences?.locationMode || 'all'
    const opportunityType = preferences?.opportunityType || 'all'
    const category = preferences?.category || 'all'
    const locationQuery = `${preferences?.locationQuery || ''}`.trim().toLowerCase()
    const radiusKm = `${preferences?.radiusKm || 'any'}`

    return offers.filter((offer) => {
        const locationLabel = `${offer?.location || ''}`.toLowerCase()
        const offerType = `${offer?.type || ''}`.toLowerCase()
        const offerCategory = `${offer?.industry || offer?.department || 'general'}`.toLowerCase()

        if (locationMode === 'remote' && !locationLabel.includes('remote')) return false
        if (locationMode === 'onsite' && locationLabel.includes('remote')) return false

        if (opportunityType !== 'all' && !offerType.includes(opportunityType)) return false
        if (category !== 'all' && offerCategory !== category.toLowerCase()) return false

        if (locationQuery) {
            const searchable = `${offer?.location || ''} ${offer?.company || ''} ${offer?.description || ''}`.toLowerCase()
            if (radiusKm === '25' || radiusKm === '50') {
                if (!searchable.includes(locationQuery)) return false
            } else {
                const tokens = locationQuery.split(/\s+/).filter(Boolean)
                if (tokens.length > 0 && !tokens.some((token) => searchable.includes(token))) return false
            }
        }

        return true
    })
}

function StudentSwipe() {
    const isPremiumEnabled = import.meta.env.VITE_PREMIUM_ENABLED !== 'false'
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
    const { user: _user, isLoading: authLoading } = useAuth()
    const { isPremium, requirePremium } = usePremiumGate({
        source: 'student_swipe',
        premiumEnabled: isPremiumEnabled
    })

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
    const [showPreferencesModal, setShowPreferencesModal] = useState(false)
    const [swipePreferences, setSwipePreferences] = useState(() => normalizeSwipePreferences(
        readStorageJSON(STUDENT_SWIPE_PREFERENCES_KEY, DEFAULT_SWIPE_PREFERENCES)
    ))
    const { t } = useTranslation(undefined, { useSuspense: false })
    const tr = useBilingualText()
    const preloadedAssetUrlsRef = useRef(new Set())
    const modeInitializedRef = useRef(false)

    const canUsePremiumMode = isPremiumEnabled && (effectivePlan === 'premium' || isPremium)
    const showDiscoveryControls = isSwipeStackV2Enabled && isPremiumEnabled
    const activeScope = showDiscoveryControls && mode === 'premium' && canUsePremiumMode
        ? 'global'
        : 'local'

    const currentOffer = offers[currentIndex]
    const hasMoreOffers = currentIndex < offers.length
    const isLocalEmptyState = !hasMoreOffers && activeScope === 'local'

    const categoryOptions = useMemo(() => {
        const categories = new Set(['all'])
        ;(realOffers || []).forEach((offer) => {
            const nextCategory = `${offer?.industry || offer?.department || 'General'}`
            categories.add(nextCategory)
        })
        return Array.from(categories)
    }, [realOffers])

    useEffect(() => {
        const filteredOffers = applySwipePreferences(realOffers, swipePreferences)
        setOffers(filteredOffers)
        setCurrentIndex(0)
    }, [realOffers, swipePreferences])

    useEffect(() => {
        writeStorageJSON(STUDENT_SWIPE_PREFERENCES_KEY, swipePreferences)
    }, [swipePreferences])

    // Preload next upcoming company logos
    useEffect(() => {
        if (!hasMoreOffers) return
        const queuedOffers = offers.slice(currentIndex + 1, currentIndex + 4)

        queuedOffers.forEach((offer) => {
            const assetUrl = offer?.companyLogo
            if (!assetUrl || preloadedAssetUrlsRef.current.has(assetUrl)) return
            const image = new Image()
            image.src = assetUrl
            preloadedAssetUrlsRef.current.add(assetUrl)
        })
    }, [currentIndex, offers, hasMoreOffers])

    const handleScopeChange = (nextScope) => {
        if (!showDiscoveryControls) return
        if (nextScope !== 'local' && nextScope !== 'global') return

        const nextMode = nextScope === 'global' ? 'premium' : 'standard'
        if (nextScope === 'local') {
            if (mode === 'standard') return
            clearPaywall()
            setMode('standard')
            return
        }

        if (nextMode === mode) return

        requirePremium('switch_global_scope', () => {
            clearPaywall()
            setMode('premium')
        }, {
            reason: 'premium_discovery_controls',
            isPremiumOverride: canUsePremiumMode
        })
    }

    const handleOpenPreferences = () => {
        requirePremium('open_preferences', () => {
            setShowPreferencesModal(true)
        }, {
            reason: 'premium_discovery_controls',
            isPremiumOverride: canUsePremiumMode
        })
    }

    const updateSwipePreference = (key, value) => {
        const actionName = key === 'locationQuery'
            ? 'change_preference_location'
            : key === 'radiusKm'
                ? 'change_preference_radius'
                : 'change_preference_filter'

        requirePremium(actionName, () => {
            setSwipePreferences((prev) => ({
                ...prev,
                [key]: value
            }))
        }, {
            reason: 'premium_discovery_controls',
            isPremiumOverride: canUsePremiumMode
        })
    }

    const resetSwipePreferences = () => {
        requirePremium('change_preference_filter', () => {
            setSwipePreferences(DEFAULT_SWIPE_PREFERENCES)
        }, {
            reason: 'premium_discovery_controls',
            isPremiumOverride: canUsePremiumMode
        })
    }

    useEffect(() => {
        if (!isSwipeStackV2Enabled) return
        if (authLoading) return
        if (modeInitializedRef.current) return

        if (!isPremiumEnabled) {
            if (mode === 'premium') {
                setMode('standard')
            }
            modeInitializedRef.current = true
            return
        }

        let preferredScope = 'local'
        try {
            const storedScope = localStorage.getItem(DISCOVERY_SCOPE_STORAGE_KEY)
            if (storedScope === 'local' || storedScope === 'global') {
                preferredScope = storedScope
            } else {
                const legacyMode = localStorage.getItem(LEGACY_DISCOVERY_MODE_STORAGE_KEY)
                if (legacyMode === 'premium') preferredScope = 'global'
                if (legacyMode === 'standard') preferredScope = 'local'
            }
        } catch {
            preferredScope = 'local'
        }

        if (preferredScope === 'global' && !canUsePremiumMode) {
            preferredScope = 'local'
        }

        const preferredMode = preferredScope === 'global' ? 'premium' : 'standard'
        if (preferredMode !== mode) {
            clearPaywall()
            setMode(preferredMode)
        }

        modeInitializedRef.current = true
    }, [isSwipeStackV2Enabled, authLoading, isPremiumEnabled, canUsePremiumMode, mode, clearPaywall, setMode])

    useEffect(() => {
        if (!isSwipeStackV2Enabled) return
        if (!isPremiumEnabled) return
        try {
            const persistedScope = mode === 'premium' && canUsePremiumMode ? 'global' : 'local'
            localStorage.setItem(DISCOVERY_SCOPE_STORAGE_KEY, persistedScope)
            localStorage.removeItem(LEGACY_DISCOVERY_MODE_STORAGE_KEY)
        } catch {
            // Ignore storage write errors in restricted environments.
        }
    }, [mode, canUsePremiumMode, isSwipeStackV2Enabled, isPremiumEnabled])

    useEffect(() => {
        if (!paywall) return

        clearPaywall()
        if (mode === 'premium') {
            setMode('standard')
        }
        if (isPremiumEnabled) {
            requirePremium('switch_global_scope', () => {}, {
                reason: 'premium_discovery_controls',
                isPremiumOverride: false
            })
        }
    }, [paywall, mode, setMode, clearPaywall, isPremiumEnabled, requirePremium])

    const handleSwipe = (direction, swipedOffer = currentOffer) => {
        const offerToSwipe = swipedOffer || currentOffer
        if (!offerToSwipe) return

        if (mode === 'standard' && !canUsePremiumMode && dailySwipeUsage?.reached) {
            openPremiumUpsell('daily_limit', {
                used: dailySwipeUsage?.used ?? null,
                limit: dailySwipeUsage?.limit ?? null
            })
            return
        }

        const isExternal = offerToSwipe.isExternal === true
        setSwipeHistory((prev) => [...prev, { offer: offerToSwipe, direction }])
        setCurrentIndex((prev) => prev + 1)

        void swipe(offerToSwipe, direction)
            .then((swipeResult) => {
                if (isLimitReachedCode(swipeResult?.code)) {
                    openPremiumUpsell('daily_limit', {
                        used: swipeResult?.usage?.used ?? dailySwipeUsage?.used ?? null,
                        limit: swipeResult?.usage?.limit ?? dailySwipeUsage?.limit ?? null
                    })
                    return
                }

                if (swipeResult?.error) {
                    console.error('[StudentSwipe] swipe failed', swipeResult.error)
                    return
                }

                if (direction === 'left') {
                    setToastIsExternal(false)
                    setToastTitle(t('studentSwipe.toasts.notInterested', 'Not interested'))
                    setToastVariant('rejected')
                    setShowToast(true)
                } else if (direction === 'right' || direction === 'super') {
                    if (isExternal && swipeResult?.externalMatchSaved) {
                        const website = swipeResult?.sourceWebsite
                            || offerToSwipe.sourceWebsite
                            || t('matches.externalSourceFallback', 'External Website')
                        setToastIsExternal(true)
                        setToastTitle(t('studentSwipe.toasts.externalSaved', { source: website }))
                        setToastVariant('application')
                    } else if (direction === 'super') {
                        setToastIsExternal(false)
                        setToastTitle(t('studentSwipe.toasts.addedToFavorites', 'Added to favorites'))
                        setToastVariant('favorites')
                    } else {
                        setToastIsExternal(false)
                        setToastTitle(t('studentSwipe.toasts.applicationSent', 'Application was sent!'))
                        setToastVariant('application')
                    }
                    setShowToast(true)
                }

                if ((direction === 'right' || direction === 'super') && !isExternal && offerToSwipe.hasMatched) {
                    setMatchedOffer(offerToSwipe)
                    setTimeout(() => setShowMatch(true), 500)
                }
            })
            .catch((swipeError) => {
                console.error('[StudentSwipe] swipe request failed', swipeError)
            })
    }

    const handleUndo = () => {
        if (swipeHistory.length === 0 || currentIndex <= 0) return
        setSwipeHistory((prev) => prev.slice(0, -1))
        setCurrentIndex((prev) => Math.max(0, prev - 1))
    }

    const handleViewDetails = (offer) => {
        setSelectedOffer(offer)
    }

    if (loading) {
        return (
            <div className="vertical-feed-page loading">
                <div className="feed-loading-hero">
                    <Logo size="default" animated={true} />
                    <div className="feed-loading-spinner-wrap">
                        <Loader className="animate-spin text-primary" size={32} />
                        <p>{t('studentSwipe.loading.findingBestJobs', 'Finding the best jobs for you...')}</p>
                    </div>
                </div>
                <StudentBottomNav />
            </div>
        )
    }

    if (error) {
        return (
            <div className="vertical-feed-page error">
                <div className="glass-card error-card">
                    <h3 className="text-red-500">{t('studentSwipe.error.title', 'Oops! Something went wrong.')}</h3>
                    <p>{error}</p>
                    <button className="btn btn-primary mt-4" onClick={() => refresh()}>
                        {t('studentSwipe.error.tryAgain', 'Try Again')}
                    </button>
                </div>
                <StudentBottomNav />
            </div>
        )
    }

    return (
        <div className="vertical-feed-page">
            {/* Top Discovery Controls Floating Bar */}
            <header className="feed-top-bar" aria-label="Discovery controls header">
                <div className="feed-top-bar__inner">
                    <div className="feed-top-bar__brand">
                        <Logo size="small" showText={false} />
                        <span className="feed-brand-title">MatchOp</span>
                    </div>

                    {showDiscoveryControls && (
                        <div className="feed-top-bar__scope">
                            <OfferScopeToggle
                                activeScope={activeScope}
                                isPremium={canUsePremiumMode}
                                disabled={loading}
                                onChange={handleScopeChange}
                                premiumEnabled={isPremiumEnabled}
                            />
                        </div>
                    )}

                    <div className="feed-top-bar__actions">
                        <PreferencesButton
                            onClick={handleOpenPreferences}
                            disabled={loading}
                        />
                    </div>
                </div>

                {notice && (
                    <div className="feed-notice-banner" role="status">
                        {notice}
                    </div>
                )}
            </header>

            {/* Opportunity Feed Stage or End-of-Feed Empty State */}
            <main className="feed-stage-container">
                {hasMoreOffers ? (
                    <VerticalOpportunityFeed
                        offers={offers}
                        currentIndex={currentIndex}
                        canUndo={swipeHistory.length > 0}
                        onSwipe={handleSwipe}
                        onUndo={handleUndo}
                        onViewDetails={handleViewDetails}
                    />
                ) : (
                    <div className="feed-empty-state-screen">
                        <div className="feed-empty-state-card glass-card">
                            <div className="feed-empty-icon-glow">
                                <Sparkles size={40} className="empty-sparkle-icon" />
                            </div>

                            {isLocalEmptyState ? (
                                <>
                                    <h2>{t('studentSwipe.empty.noOffersNearbyTitle', 'No offers nearby.')}</h2>
                                    <p>{t('studentSwipe.empty.noOffersNearbyBody', 'Try updating your discovery preferences or switch to Global mode.')}</p>
                                    <div className="feed-empty-actions">
                                        {isPremiumEnabled && (
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={() => handleScopeChange('global')}
                                            >
                                                <Globe2 size={16} />
                                                {t('studentSwipe.empty.switchToGlobal', 'Switch to Global')}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={handleOpenPreferences}
                                        >
                                            <SlidersHorizontal size={16} />
                                            {t('studentSwipe.empty.adjustPreferences', 'Adjust preferences')}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2>{t('swipe.allCaughtUp', 'You’ve reached the end')}</h2>
                                    <p>{t('swipe.noMoreOffers', 'New opportunities are added regularly. Refresh or adjust filters to discover more.')}</p>
                                    <div className="feed-empty-actions">
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => {
                                                setCurrentIndex(0)
                                                setSwipeHistory([])
                                                refresh()
                                            }}
                                        >
                                            <RotateCcw size={16} />
                                            {t('studentSwipe.empty.refreshJobs', 'Refresh Jobs')}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={handleOpenPreferences}
                                        >
                                            <SlidersHorizontal size={16} />
                                            {t('studentSwipe.empty.adjustPreferences', 'Adjust preferences')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Persistent Product Bottom Navigation */}
            <StudentBottomNav />

            {/* Modals & Toasts */}
            <PreferencesDrawerOrModal
                isOpen={showPreferencesModal}
                preferences={swipePreferences}
                categoryOptions={categoryOptions}
                onChange={updateSwipePreference}
                onReset={resetSwipePreferences}
                onClose={() => setShowPreferencesModal(false)}
                onSave={() => setShowPreferencesModal(false)}
            />

            {showToast && (
                <ApplicationToast
                    title={toastTitle}
                    variant={toastVariant}
                    isExternal={toastIsExternal}
                    onClose={() => setShowToast(false)}
                />
            )}

            {showMatch && (
                <MatchModal
                    match={matchedOffer}
                    onClose={() => setShowMatch(false)}
                    userType="student"
                />
            )}

            {selectedOffer && (
                <OfferDetailModal
                    offer={selectedOffer}
                    onClose={() => setSelectedOffer(null)}
                />
            )}

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
