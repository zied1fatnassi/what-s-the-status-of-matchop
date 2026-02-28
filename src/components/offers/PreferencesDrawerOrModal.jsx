import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { lockOverlayScroll, unlockOverlayScroll } from '../../lib/overlayLock'
import './OfferDiscoveryControls.css'

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(', ')

function PreferencesDrawerOrModal({
    isOpen,
    preferences,
    categoryOptions,
    onChange,
    onReset,
    onClose,
    onSave
}) {
    const { t } = useTranslation(undefined, { useSuspense: false })
    const dialogRef = useRef(null)
    const firstInputRef = useRef(null)
    const restoreFocusRef = useRef(null)

    useEffect(() => {
        if (!isOpen) return undefined

        restoreFocusRef.current = document.activeElement

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
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
        queueMicrotask(() => firstInputRef.current?.focus())

        return () => {
            unlockOverlayScroll()
            document.removeEventListener('keydown', handleKeyDown)
            const target = restoreFocusRef.current
            if (target && typeof target.focus === 'function') target.focus()
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return createPortal(
        <div
            className="offer-preferences-overlay"
            role="presentation"
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                className="offer-preferences-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="offer-preferences-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="offer-preferences-header">
                    <h3 id="offer-preferences-title">{t('studentSwipe.preferences.title')}</h3>
                    <button
                        type="button"
                        className="offer-preferences-close"
                        onClick={onClose}
                        aria-label={t('studentSwipe.preferences.closeAria')}
                    >
                        <X size={14} />
                    </button>
                </div>

                <p className="offer-preferences-copy">
                    {t('studentSwipe.preferences.previewCopy')}
                </p>

                <label className="offer-preferences-field">
                    <span>{t('studentSwipe.preferences.locationQueryLabel')}</span>
                    <input
                        ref={firstInputRef}
                        type="text"
                        value={preferences.locationQuery}
                        placeholder={t('studentSwipe.preferences.locationQueryPlaceholder')}
                        onChange={(event) => onChange?.('locationQuery', event.target.value)}
                    />
                </label>

                <label className="offer-preferences-field">
                    <span>{t('studentSwipe.preferences.radiusLabel')}</span>
                    <select
                        value={preferences.radiusKm}
                        onChange={(event) => onChange?.('radiusKm', event.target.value)}
                    >
                        <option value="any">{t('studentSwipe.preferences.radius.any')}</option>
                        <option value="25">{t('studentSwipe.preferences.radius.km25')}</option>
                        <option value="50">{t('studentSwipe.preferences.radius.km50')}</option>
                        <option value="100">{t('studentSwipe.preferences.radius.km100')}</option>
                        <option value="250">{t('studentSwipe.preferences.radius.km250')}</option>
                    </select>
                </label>

                <label className="offer-preferences-field">
                    <span>{t('studentSwipe.preferences.locationMode.label')}</span>
                    <select
                        value={preferences.locationMode}
                        onChange={(event) => onChange?.('locationMode', event.target.value)}
                    >
                        <option value="all">{t('studentSwipe.preferences.locationMode.all')}</option>
                        <option value="remote">{t('studentSwipe.preferences.locationMode.remote')}</option>
                        <option value="onsite">{t('studentSwipe.preferences.locationMode.onsite')}</option>
                    </select>
                </label>

                <label className="offer-preferences-field">
                    <span>{t('studentSwipe.preferences.opportunityType.label')}</span>
                    <select
                        value={preferences.opportunityType}
                        onChange={(event) => onChange?.('opportunityType', event.target.value)}
                    >
                        <option value="all">{t('studentSwipe.preferences.opportunityType.all')}</option>
                        <option value="internship">{t('studentSwipe.preferences.opportunityType.internship')}</option>
                        <option value="full-time">{t('studentSwipe.preferences.opportunityType.fullTime')}</option>
                        <option value="part-time">{t('studentSwipe.preferences.opportunityType.partTime')}</option>
                        <option value="contract">{t('studentSwipe.preferences.opportunityType.contract')}</option>
                    </select>
                </label>

                <label className="offer-preferences-field">
                    <span>{t('studentSwipe.preferences.categoryLabel')}</span>
                    <select
                        value={preferences.category}
                        onChange={(event) => onChange?.('category', event.target.value)}
                    >
                        {categoryOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="offer-preferences-actions">
                    <button type="button" className="btn btn-secondary" onClick={onReset}>
                        {t('studentSwipe.preferences.actions.reset')}
                    </button>
                    <button type="button" className="btn btn-primary" onClick={onSave}>
                        {t('studentSwipe.preferences.actions.save')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default PreferencesDrawerOrModal
