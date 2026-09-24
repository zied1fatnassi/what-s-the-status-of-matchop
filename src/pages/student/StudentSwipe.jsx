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
import AICVPersonalizationModal from '../../components/discovery/AICVPersonalizationModal'
import Logo from '../../components/Logo'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useApplications } from '../../context/ApplicationContext'
import { useJobOffers } from '../../hooks/useJobOffers'
import { useMatchListener } from '../../hooks/useMatchListener'
import { usePremiumGate } from '../../hooks/usePremiumGate'
import { isLimitReachedCode } from '../../lib/swipeLimit'
import { readStorageJSON, writeStorageJSON } from '../../lib/localStorageState'
import { evaluateOpportunityDistance } from '../../lib/geoDistance'
import {
    matchesOpportunityType,
    matchesOpportunityCategory,
    resolveOpportunityType
} from '../../lib/opportunityTaxonomy'
import './StudentSwipe.css'

const DISCOVERY_SCOPE_STORAGE_KEY = 'matchop_discovery_scope'
const LEGACY_DISCOVERY_MODE_STORAGE_KEY = 'matchop_discovery_mode'
const STUDENT_SWIPE_PREFERENCES_KEY = 'matchop_student_swipe_preferences'

const DEFAULT_SWIPE_PREFERENCES = {
    locationMode: 'all',
    opportunityType: 'all',
    category: 'all',
    referenceLocation: '',
    radiusKm: 'any',
    includeUnspecifiedLocation: true
}

const LOCATION_MODE_VALUES = new Set(['all', 'remote', 'onsite'])
const OPPORTUNITY_TYPE_VALUES = new Set(['all', 'internship', 'full-time', 'part-time', 'contract'])
const RADIUS_VALUES = new Set(['any', '15', '25', '50', '100', '250'])

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
        referenceLocation: `${value.referenceLocation || value.locationQuery || ''}`.trim(),
        radiusKm,
        includeUnspecifiedLocation: value.includeUnspecifiedLocation !== false
    }
}

function applySwipePreferences(rawOffers, preferences, defaultOrigin = 'Tunis') {
    const offers = Array.isArray(rawOffers) ? rawOffers : []
    const locationMode = preferences?.locationMode || 'all'
    const opportunityType = preferences?.opportunityType || 'all'
    const category = preferences?.category || 'all'
    const referenceLocation = (preferences?.referenceLocation || defaultOrigin || 'Tunis').trim()
    const radiusKm = `${preferences?.radiusKm || 'any'}`
    const includeUnspecified = preferences?.includeUnspecifiedLocation !== false
    const maxRadius = radiusKm !== 'any' ? Number(radiusKm) : null

    return offers
        .map((offer) => {
            const evalDist = evaluateOpportunityDistance(
                referenceLocation,
                offer?.location,
                offer?.companyLocation || offer?.companies?.location
            )
            const resolvedType = resolveOpportunityType(offer)
            return {
                ...offer,
                distanceEvaluated: evalDist,
                resolvedType
            }
        })
        .filter((offer) => {
            // 1. Opportunity Type Filter
            if (!matchesOpportunityType(offer, opportunityType)) {
                return false
            }

            // 2. Industry / Category Filter
            if (!matchesOpportunityCategory(offer, category)) {
                return false
            }

            const evalDist = offer.distanceEvaluated

            // 3. Workplace mode
            if (locationMode === 'remote' && !evalDist.isRemote) {
                return false
            }
            if (locationMode === 'onsite' && evalDist.isRemote) {
                return false
            }

            // 4. Unspecified location handling
            if (evalDist.isUnspecified) {
                if (locationMode === 'onsite' && !includeUnspecified) {
                    return false
                }
                if (maxRadius !== null && !includeUnspecified) {
                    return false
                }
            }

            // 5. Radius constraint (for physical on-site/hybrid positions with known distance)
            if (maxRadius !== null && !evalDist.isRemote && evalDist.distanceKm !== null) {
                if (evalDist.distanceKm > maxRadius) {
                    return false
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
    const { user, isLoading: authLoading } = useAuth()
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
    const [personalizationOffer, setPersonalizationOffer] = useState(null)
    const [studentLocation, setStudentLocation] = useState('')
    const [swipePreferences, setSwipePreferences] = useState(() => normalizeSwipePreferences(
        readStorageJSON(STUDENT_SWIPE_PREFERENCES_KEY, DEFAULT_SWIPE_PREFERENCES)
    ))
    const { t } = useTranslation(undefined, { useSuspense: false })
    const preloadedAssetUrlsRef = useRef(new Set())
    const modeInitializedRef = useRef(false)

    // Load student profile location to use as default reference location for distance
    useEffect(() => {
        if (!user?.id) return
        let isMounted = true
        supabase
            .from('students')
            .select('location')
            .eq('id', user.id)
            .maybeSingle()
            .then(({ data }) => {
                if (isMounted && data?.location) {
                    setStudentLocation(data.location)
                }
            })
            .catch(() => {})
        return () => { isMounted = false }
    }, [user?.id])

    const canUsePremiumMode = isPremiumEnabled && (effectivePlan === 'premium' || isPremium)
    const showDiscoveryControls = isSwipeStackV2Enabled && isPremiumEnabled
    const activeScope = showDiscoveryControls && mode === 'premium' && canUsePremiumMode
        ? 'global'
        : 'local'

    const currentOffer = offers[currentIndex]
    const hasMoreOffers = currentIndex < offers.length
    const isLocalEmptyState = !hasMoreOffers && activeScope === 'local'

    const activeFilterCount = useMemo(() => {
        let count = 0
        if (swipePreferences.locationMode !== 'all') count++
        if (swipePreferences.opportunityType !== 'all') count++
        if (swipePreferences.category !== 'all') count++
        if (swipePreferences.radiusKm !== 'any') count++
        return count
    }, [swipePreferences])

    const categoryOptions = useMemo(() => {
        const categories = new Set(['all'])
        ;(realOffers || []).forEach((offer) => {
            const nextCategory = `${offer?.industry || offer?.department || 'General'}`
            categories.add(nextCategory)
        })
        return Array.from(categories)
    }, [realOffers])

    useEffect(() => {
        const filteredOffers = applySwipePreferences(realOffers, swipePreferences, studentLocation)
        setOffers(filteredOffers)
        setCurrentIndex(0)
    }, [realOffers, swipePreferences, studentLocation])

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
        setSwipePreferences((prev) => {
            const updated = { ...prev, [key]: value }
            writeStorageJSON(STUDENT_SWIPE_PREFERENCES_KEY, updated)
            return updated
        })
    }

    const resetSwipePreferences = () => {
        const resetValues = {
            ...DEFAULT_SWIPE_PREFERENCES,
            referenceLocation: studentLocation || 'Tunis'
        }
        setSwipePreferences(resetValues)
        writeStorageJSON(STUDENT_SWIPE_PREFERENCES_KEY, resetValues)
    }

    const handleSavePreferences = async (newPreferences) => {
        const normalized = normalizeSwipePreferences(newPreferences)
        setSwipePreferences(normalized)
        writeStorageJSON(STUDENT_SWIPE_PREFERENCES_KEY, normalized)

        // Sync to profiles.preferences in Supabase if logged in
        if (user?.id) {
            try {
                await supabase
                    .from('profiles')
                    .update({
                        preferences: {
                            ...(user.preferences || {}),
                            swipe_preferences: normalized,
                            remoteOnly: normalized.locationMode === 'remote',
                            opportunityType: normalized.opportunityType,
                            category: normalized.category,
                            referenceLocation: normalized.referenceLocation,
                            radiusKm: normalized.radiusKm
                        }
                    })
                    .eq('id', user.id)
            } catch (err) {
                console.warn('[StudentSwipe] Could not sync preferences to profile:', err)
            }
        }
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

        // INTERCEPT: Internal offer + right/super swipe -> Open Personalization Modal
        if ((direction === 'right' || direction === 'super') && !isExternal) {
            setPersonalizationOffer(offerToSwipe)
            return
        }

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

    const handleSendPersonalizedApplication = async (personalizedCvUrl) => {
        const targetOffer = personalizationOffer
        setPersonalizationOffer(null)
        if (!targetOffer) return

        setSwipeHistory((prev) => [...prev, { offer: targetOffer, direction: 'right' }])
        setCurrentIndex((prev) => prev + 1)

        try {
            let finalCvUrl = personalizedCvUrl || null
            if (!finalCvUrl && user?.id) {
                try {
                    const { data: studentData } = await supabase
                        .from('students')
                        .select('cv_url, original_docx_url')
                        .eq('id', user.id)
                        .maybeSingle()
                    finalCvUrl = studentData?.cv_url || studentData?.original_docx_url || null
                } catch (fetchCvErr) {
                    console.warn('[StudentSwipe] Could not retrieve fallback CV URL:', fetchCvErr)
                }
            }

            const swipeResult = await swipe(targetOffer, 'right', { personalizedCvUrl: finalCvUrl })
            if (isLimitReachedCode(swipeResult?.code)) {
                openPremiumUpsell('daily_limit', {
                    used: swipeResult?.usage?.used ?? dailySwipeUsage?.used ?? null,
                    limit: swipeResult?.usage?.limit ?? dailySwipeUsage?.limit ?? null
                })
                return
            }

            if (swipeResult?.error) {
                console.error('[StudentSwipe] personalized swipe failed', swipeResult.error)
                return
            }

            setToastIsExternal(false)
            setToastTitle(t('studentSwipe.toasts.applicationSent', 'Application was sent!'))
            setToastVariant('application')
            setShowToast(true)

            if (targetOffer.hasMatched) {
                setMatchedOffer(targetOffer)
                setTimeout(() => setShowMatch(true), 500)
            }
        } catch (swipeError) {
            console.error('[StudentSwipe] personalized swipe request failed', swipeError)
        }
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
                            activeCount={activeFilterCount}
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
                studentLocation={studentLocation}
                categoryOptions={categoryOptions}
                matchCount={offers.length}
                onChange={updateSwipePreference}
                onReset={resetSwipePreferences}
                onClose={() => setShowPreferencesModal(false)}
                onSave={handleSavePreferences}
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
                    onApply={(offer) => {
                        setSelectedOffer(null)
                        handleSwipe('right', offer)
                    }}
                />
            )}

            {newMatch && (
                <MatchToast
                    match={newMatch}
                    onClose={clearMatch}
                />
            )}

            {personalizationOffer && (
                <AICVPersonalizationModal
                    isOpen={Boolean(personalizationOffer)}
                    offer={personalizationOffer}
                    onClose={() => setPersonalizationOffer(null)}
                    onConfirmSend={handleSendPersonalizedApplication}
                />
            )}
        </div>
    )
}

export default StudentSwipe
