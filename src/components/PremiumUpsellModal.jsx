import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Crown, Infinity as InfinityIcon, Globe2, Sparkles, X } from 'lucide-react'
import { lockOverlayScroll, unlockOverlayScroll } from '../lib/overlayLock'
import { track } from '../lib/analytics'
import './PremiumUpsellModal.css'

const REASON_CONTENT_KEYS = {
    global_discovery: {
        titleKey: 'premiumUpsell.reasons.global_discovery.title',
        subtitleKey: 'premiumUpsell.reasons.global_discovery.subtitle'
    },
    personalized_mode: {
        titleKey: 'premiumUpsell.reasons.personalized_mode.title',
        subtitleKey: 'premiumUpsell.reasons.personalized_mode.subtitle'
    },
    daily_limit: {
        titleKey: 'premiumUpsell.reasons.daily_limit.title',
        subtitleKey: 'premiumUpsell.reasons.daily_limit.subtitle'
    },
    daily_swipe_limit: {
        titleKey: 'premiumUpsell.reasons.daily_swipe_limit.title',
        subtitleKey: 'premiumUpsell.reasons.daily_swipe_limit.subtitle'
    },
    generic: {
        titleKey: 'premiumUpsell.reasons.generic.title',
        subtitleKey: 'premiumUpsell.reasons.generic.subtitle'
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
    const { t } = useTranslation(undefined, { useSuspense: false })
    const dialogRef = useRef(null)
    const upgradeButtonRef = useRef(null)

    const copy = useMemo(() => REASON_CONTENT_KEYS[reason] || REASON_CONTENT_KEYS.generic, [reason])

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
                    aria-label={t('premiumUpsell.closeAria')}
                >
                    <X size={18} />
                </button>

                <div className="premium-upsell-badge" aria-hidden="true">
                    <Crown size={18} />
                    {t('premiumUpsell.badge')}
                </div>

                <h2 id="premium-upsell-title" className="premium-upsell-title">
                    {t(copy.titleKey)}
                </h2>
                <p id="premium-upsell-subtitle" className="premium-upsell-subtitle">
                    {t(copy.subtitleKey)}
                </p>

                <ul className="premium-upsell-features" aria-label={t('premiumUpsell.featuresAria')}>
                    <li>
                        <InfinityIcon size={16} />
                        {t('premiumUpsell.features.unlimitedSwipes')}
                    </li>
                    <li>
                        <Globe2 size={16} />
                        {t('premiumUpsell.features.globalReach')}
                    </li>
                    <li>
                        <Sparkles size={16} />
                        {t('premiumUpsell.features.personalizedStack')}
                    </li>
                </ul>

                <div className="premium-upsell-actions">
                    <button
                        ref={upgradeButtonRef}
                        type="button"
                        className="btn btn-primary"
                        onClick={onUpgrade}
                    >
                        {t('premiumUpsell.actions.upgrade')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        {t('premiumUpsell.actions.notNow')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default PremiumUpsellModal
