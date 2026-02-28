import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Crown, Infinity as InfinityIcon, Globe2, Sparkles, SlidersHorizontal, X } from 'lucide-react'
import { lockOverlayScroll, unlockOverlayScroll } from '../lib/overlayLock'
import { track } from '../lib/analytics'
import './UpgradeModal.css'

const REASON_CONTENT_KEYS = {
    premium_discovery_controls: {
        titleKey: 'premiumUpsell.reasons.premium_discovery_controls.title',
        subtitleKey: 'premiumUpsell.reasons.premium_discovery_controls.subtitle',
        featureKeys: [
            'premiumUpsell.features.globalReach',
            'premiumUpsell.features.fasterMatches',
            'premiumUpsell.features.unlimitedSwipes',
            'premiumUpsell.features.advancedPreferences'
        ]
    },
    global_discovery: {
        titleKey: 'premiumUpsell.reasons.global_discovery.title',
        subtitleKey: 'premiumUpsell.reasons.global_discovery.subtitle',
        featureKeys: [
            'premiumUpsell.features.unlimitedSwipes',
            'premiumUpsell.features.globalReach',
            'premiumUpsell.features.personalizedStack'
        ]
    },
    personalized_mode: {
        titleKey: 'premiumUpsell.reasons.personalized_mode.title',
        subtitleKey: 'premiumUpsell.reasons.personalized_mode.subtitle',
        featureKeys: [
            'premiumUpsell.features.unlimitedSwipes',
            'premiumUpsell.features.globalReach',
            'premiumUpsell.features.personalizedStack'
        ]
    },
    daily_limit: {
        titleKey: 'premiumUpsell.reasons.daily_limit.title',
        subtitleKey: 'premiumUpsell.reasons.daily_limit.subtitle',
        featureKeys: [
            'premiumUpsell.features.unlimitedSwipes',
            'premiumUpsell.features.globalReach',
            'premiumUpsell.features.personalizedStack'
        ]
    },
    daily_swipe_limit: {
        titleKey: 'premiumUpsell.reasons.daily_swipe_limit.title',
        subtitleKey: 'premiumUpsell.reasons.daily_swipe_limit.subtitle',
        featureKeys: [
            'premiumUpsell.features.unlimitedSwipes',
            'premiumUpsell.features.globalReach',
            'premiumUpsell.features.personalizedStack'
        ]
    },
    generic: {
        titleKey: 'premiumUpsell.reasons.generic.title',
        subtitleKey: 'premiumUpsell.reasons.generic.subtitle',
        featureKeys: [
            'premiumUpsell.features.unlimitedSwipes',
            'premiumUpsell.features.globalReach',
            'premiumUpsell.features.personalizedStack'
        ]
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

function featureIconForKey(key) {
    if (key.includes('unlimitedSwipes')) return InfinityIcon
    if (key.includes('globalReach')) return Globe2
    if (key.includes('advancedPreferences')) return SlidersHorizontal
    return Sparkles
}

function UpgradeModal({
    isOpen,
    reason = 'generic',
    onClose,
    onUpgrade
}) {
    const { t } = useTranslation(undefined, { useSuspense: false })
    const dialogRef = useRef(null)
    const upgradeButtonRef = useRef(null)
    const restoreFocusRef = useRef(null)

    const copy = useMemo(
        () => REASON_CONTENT_KEYS[reason] || REASON_CONTENT_KEYS.generic,
        [reason]
    )

    useEffect(() => {
        if (!isOpen) return
        track('upsell_opened', { reason })
    }, [isOpen, reason])

    useEffect(() => {
        if (!isOpen) return undefined

        restoreFocusRef.current = document.activeElement

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
            const target = restoreFocusRef.current
            if (target && typeof target.focus === 'function') {
                target.focus()
            }
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return createPortal(
        <div
            className="upgrade-modal-overlay"
            role="presentation"
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                className="upgrade-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="upgrade-modal-title"
                aria-describedby="upgrade-modal-subtitle"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    className="upgrade-modal-close"
                    onClick={onClose}
                    aria-label={t('premiumUpsell.closeAria')}
                >
                    <X size={18} />
                </button>

                <div className="upgrade-modal-badge" aria-hidden="true">
                    <Crown size={18} />
                    {t('premiumUpsell.badge')}
                </div>

                <h2 id="upgrade-modal-title" className="upgrade-modal-title">
                    {t(copy.titleKey)}
                </h2>
                <p id="upgrade-modal-subtitle" className="upgrade-modal-subtitle">
                    {t(copy.subtitleKey)}
                </p>

                <ul className="upgrade-modal-features" aria-label={t('premiumUpsell.featuresAria')}>
                    {copy.featureKeys.map((featureKey) => {
                        const FeatureIcon = featureIconForKey(featureKey)
                        return (
                            <li key={featureKey}>
                                <FeatureIcon size={16} />
                                {t(featureKey)}
                            </li>
                        )
                    })}
                </ul>

                <div className="upgrade-modal-actions">
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

export default UpgradeModal
