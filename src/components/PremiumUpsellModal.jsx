import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Crown, Infinity as InfinityIcon, Globe2, Sparkles, X } from 'lucide-react'
import { lockOverlayScroll, unlockOverlayScroll } from '../lib/overlayLock'
import { track } from '../lib/analytics'
import './PremiumUpsellModal.css'

const REASON_CONTENT = {
    global_discovery: {
        title: 'Global opportunities are Premium',
        subtitle: 'Upgrade to unlock international discovery.'
    },
    personalized_mode: {
        title: 'Personalized Plan is Premium',
        subtitle: 'Upgrade to unlock personalized recommendations.'
    },
    daily_limit: {
        title: 'Daily swipe limit reached',
        subtitle: 'Upgrade for unlimited swipes and more matches.'
    },
    daily_swipe_limit: {
        title: 'Daily swipe limit reached',
        subtitle: 'You have reached today\'s standard swipe limit.'
    },
    generic: {
        title: 'Upgrade to Premium',
        subtitle: 'Unlock the full swipe experience.'
    }
}

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(', ')

function PremiumUpsellModal({
    isOpen,
    reason = 'generic',
    onClose,
    onUpgrade
}) {
    const isPremiumWaitlistMode = import.meta.env.VITE_PREMIUM_WAITLIST_MODE === 'true'
    const dialogRef = useRef(null)
    const upgradeButtonRef = useRef(null)

    const copy = useMemo(() => REASON_CONTENT[reason] || REASON_CONTENT.generic, [reason])

    useEffect(() => {
        if (!isOpen) return
        track('upsell_opened', { reason })
    }, [isOpen, reason])

    useEffect(() => {
        if (!isOpen) return undefined

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose?.()
                return
            }

            if (event.key !== 'Tab' || !dialogRef.current) return

            const focusableElements = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR))
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

        lockOverlayScroll()
        document.addEventListener('keydown', handleKeyDown)
        queueMicrotask(() => {
            upgradeButtonRef.current?.focus()
        })

        return () => {
            unlockOverlayScroll()
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return createPortal(
        <div
            className="premium-upsell-overlay"
            role="presentation"
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                className="premium-upsell-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="premium-upsell-title"
                aria-describedby="premium-upsell-subtitle"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    className="premium-upsell-close"
                    onClick={onClose}
                    aria-label="Close premium upgrade modal"
                >
                    <X size={18} />
                </button>

                <div className="premium-upsell-badge" aria-hidden="true">
                    <Crown size={18} />
                    Premium
                </div>

                <h2 id="premium-upsell-title" className="premium-upsell-title">
                    {copy.title}
                </h2>
                <p id="premium-upsell-subtitle" className="premium-upsell-subtitle">
                    {copy.subtitle}
                </p>

                <ul className="premium-upsell-features" aria-label="Premium plan highlights">
                    <li>
                        <InfinityIcon size={16} />
                        Unlimited swipes
                    </li>
                    <li>
                        <Globe2 size={16} />
                        Global reach
                    </li>
                    <li>
                        <Sparkles size={16} />
                        Hyper-personalized stack
                    </li>
                </ul>

                <div className="premium-upsell-actions">
                    <button
                        ref={upgradeButtonRef}
                        type="button"
                        className="btn btn-primary"
                        onClick={onUpgrade}
                    >
                        {isPremiumWaitlistMode ? 'Join waitlist' : 'Upgrade'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default PremiumUpsellModal
