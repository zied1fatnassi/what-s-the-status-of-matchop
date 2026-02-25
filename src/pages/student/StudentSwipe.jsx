import { useState, useEffect, useRef } from 'react'
import { X, Heart, Star, RotateCcw, Loader } from 'lucide-react'
import SwipeCard from '../../components/SwipeCard'
import MatchModal from '../../components/MatchModal'
import OfferDetailModal from '../../components/OfferDetailModal'
import ApplicationToast from '../../components/ApplicationToast'
import MatchToast from '../../components/MatchToast'
import { useAuth } from '../../context/AuthContext'
import { useApplications } from '../../context/ApplicationContext'
import { useJobOffers } from '../../hooks/useJobOffers'
import { useMatchListener } from '../../hooks/useMatchListener'
import { isLimitReachedCode } from '../../lib/swipeLimit'
import './StudentSwipe.css'

function StudentSwipe() {
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
    const topCardRef = useRef(null)

    useEffect(() => {
        setOffers(realOffers || [])
        setCurrentIndex(0)
    }, [realOffers])

    const { user, profile } = useAuth()

    const isPremiumFromProfile = Boolean(
        profile?.is_premium &&
        (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date())
    )
    const canUsePremiumMode = effectivePlan === 'premium' || isPremiumFromProfile

    const currentOffer = offers[currentIndex]
    const hasMoreOffers = currentIndex < offers.length

    const handleModeChange = (nextMode) => {
        if (!isSwipeStackV2Enabled) return
        if (nextMode === mode) return
        if (nextMode === 'premium' && !canUsePremiumMode) {
            openPremiumUpsell('personalized_mode')
            return
        }
        clearPaywall()
        setMode(nextMode)
    }

    useEffect(() => {
        if (!paywall) return
        openPremiumUpsell('personalized_mode')
        clearPaywall()
        if (mode === 'premium') {
            setMode('standard')
        }
    }, [paywall, mode, setMode, clearPaywall, openPremiumUpsell])

    const handleSwipe = async (direction) => {
        if (!currentOffer) return
        if (mode === 'standard' && !canUsePremiumMode && dailySwipeUsage?.reached) {
            openPremiumUpsell('daily_swipe_limit', {
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
                openPremiumUpsell('daily_swipe_limit', {
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
                        <div className="stack-mode-toggle" role="tablist" aria-label="Swipe stack mode">
                            <button
                                type="button"
                                className={`stack-mode-btn ${mode === 'standard' ? 'active' : ''}`}
                                onClick={() => handleModeChange('standard')}
                                disabled={loading}
                            >
                                Standard
                            </button>
                            <button
                                type="button"
                                className={`stack-mode-btn ${mode === 'premium' ? 'active' : ''}`}
                                onClick={() => handleModeChange('premium')}
                                disabled={loading}
                            >
                                {canUsePremiumMode ? 'Personalized Plan' : 'Personalized Plan (Premium)'}
                            </button>
                        </div>

                        {notice && (
                            <div className="stack-mode-notice">
                                {notice}
                            </div>
                        )}
                    </div>
                )}

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
                        <h2 className="text-2xl font-bold mb-2">You're all caught up!</h2>
                        <p className="text-muted mb-6">You've seen all available opportunities. Check back later for new matches.</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                setCurrentIndex(0)
                                setSwipeHistory([])
                                refresh() // Explicitly call refresh
                            }}
                        >
                            Refresh Jobs <RotateCcw size={18} className="ml-2" />
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
