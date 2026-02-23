import { useState, useEffect, useRef } from 'react'
import { X, Heart, Star, RotateCcw, Loader } from 'lucide-react'
import SwipeCard from '../../components/SwipeCard'
import MatchModal from '../../components/MatchModal'
import OfferDetailModal from '../../components/OfferDetailModal'
import ApplicationToast from '../../components/ApplicationToast'
import MatchToast from '../../components/MatchToast'
import { useAuth } from '../../context/AuthContext'
import { useJobOffers } from '../../hooks/useJobOffers'
import { useMatchListener } from '../../hooks/useMatchListener'
import './StudentSwipe.css'

function StudentSwipe() {
    const { offers: realOffers, loading, error, swipe, refresh } = useJobOffers()
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
        if (realOffers.length > 0) {
            setOffers(realOffers)
        }
    }, [realOffers])

    const { user } = useAuth()

    const currentOffer = offers[currentIndex]
    const hasMoreOffers = currentIndex < offers.length

    const handleSwipe = async (direction) => {
        if (!currentOffer) return

        // Optimistic UI update
        const offerToSwipe = currentOffer
        setSwipeHistory([...swipeHistory, { offer: offerToSwipe, direction }])

        // Move to next card immediately for potential optimistic update
        const nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)

        // Determine if this is a real MatchOp offer or an external scraped job
        const isExternal = offerToSwipe.isExternal === true && !!offerToSwipe.externalUrl

        // Show toast IMMEDIATELY before any async operations
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

        // Call Supabase swipe (internal offers only) - happens after toast shows
        if (!isExternal) {
            swipe(offerToSwipe.id, direction) // Fire and forget, don't await
        }

        // Check if it's a match (internal offers only — externals can never match)
        if ((direction === 'right' || direction === 'super') && !isExternal && offerToSwipe.hasMatched) {
            setMatchedOffer(offerToSwipe)

            // Send email notification (fire and forget)
            import('../../lib/email').then(({ sendMatchEmail }) => {
                sendMatchEmail(
                    user?.email,
                    user?.user_metadata?.name || 'Student',
                    offerToSwipe.company,
                    'Company'
                )
            })

            setTimeout(() => setShowMatch(true), 500) // Delay match modal so toast appears first
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

