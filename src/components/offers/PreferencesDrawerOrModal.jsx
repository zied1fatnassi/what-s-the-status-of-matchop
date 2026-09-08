import { useEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, MapPin, Briefcase, Building2, Sliders, CheckCircle2, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { lockOverlayScroll, unlockOverlayScroll } from '../../lib/overlayLock'
import { CURATED_CATEGORIES } from '../../lib/opportunityTaxonomy'
import { TUNISIAN_GOVERNORATES } from '../../lib/validation'
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
    studentLocation = '',
    categoryOptions = [],
    matchCount = null,
    onReset,
    onClose,
    onSave
}) {
    const { t, i18n } = useTranslation(undefined, { useSuspense: false })
    const isFrench = (i18n?.language || 'en').toLowerCase().startsWith('fr')
    const dialogRef = useRef(null)
    const firstInputRef = useRef(null)
    const restoreFocusRef = useRef(null)

    // Local draft state so adjusting filters is instant and does not re-render feed on every keystroke
    const [draft, setDraft] = useState(() => ({
        locationMode: preferences?.locationMode || 'all',
        opportunityType: preferences?.opportunityType || 'all',
        category: preferences?.category || 'all',
        referenceLocation: preferences?.referenceLocation || studentLocation || 'Tunis',
        radiusKm: preferences?.radiusKm || 'any',
        includeUnspecifiedLocation: preferences?.includeUnspecifiedLocation ?? true
    }))

    // Synchronize draft when preferences prop changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setDraft({
                locationMode: preferences?.locationMode || 'all',
                opportunityType: preferences?.opportunityType || 'all',
                category: preferences?.category || 'all',
                referenceLocation: preferences?.referenceLocation || studentLocation || 'Tunis',
                radiusKm: preferences?.radiusKm || 'any',
                includeUnspecifiedLocation: preferences?.includeUnspecifiedLocation ?? true
            })
        }
    }, [isOpen, preferences, studentLocation])

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

    const updateField = (key, value) => {
        setDraft((prev) => ({
            ...prev,
            [key]: value
        }))
    }

    const handleReset = () => {
        const resetValues = {
            locationMode: 'all',
            opportunityType: 'all',
            category: 'all',
            referenceLocation: studentLocation || 'Tunis',
            radiusKm: 'any',
            includeUnspecifiedLocation: true
        }
        setDraft(resetValues)
        onReset?.()
    }

    const handleApply = () => {
        onSave?.(draft)
        onClose?.()
    }

    // Merge curated categories with any dynamic categories found in feed
    const combinedCategories = useMemo(() => {
        const list = CURATED_CATEGORIES.map((cat) => ({
            value: cat.id,
            label: isFrench ? cat.labelFr : cat.labelEn
        }))

        // Include any custom categories from active offers
        const existingValues = new Set(list.map((c) => c.value.toLowerCase()))
        ;(categoryOptions || []).forEach((opt) => {
            const val = String(opt || '').trim()
            if (val && !existingValues.has(val.toLowerCase()) && val.toLowerCase() !== 'all') {
                list.push({ value: val, label: val })
                existingValues.add(val.toLowerCase())
            }
        })

        return list
    }, [categoryOptions, isFrench])

    if (!isOpen) return null

    const isRemoteOnly = draft.locationMode === 'remote'

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
                    <div className="offer-preferences-title-group">
                        <Sliders size={18} className="offer-preferences-icon" />
                        <h3 id="offer-preferences-title">{t('studentSwipe.preferences.title')}</h3>
                    </div>
                    <button
                        type="button"
                        className="offer-preferences-close"
                        onClick={onClose}
                        aria-label={t('studentSwipe.preferences.closeAria')}
                    >
                        <X size={16} />
                    </button>
                </div>

                <p className="offer-preferences-copy">
                    {t('studentSwipe.preferences.previewCopy')}
                </p>

                <div className="offer-preferences-body">
                    {/* 1. Reference Location (Where distance is measured from) */}
                    <div className="offer-preferences-field">
                        <span className="field-label-with-icon">
                            <MapPin size={14} />
                            {t('studentSwipe.preferences.referenceLocationLabel')}
                        </span>
                        <div className="location-picker-row">
                            <input
                                ref={firstInputRef}
                                type="text"
                                className="offer-preferences-input"
                                value={draft.referenceLocation}
                                placeholder={t('studentSwipe.preferences.referenceLocationPlaceholder')}
                                onChange={(e) => updateField('referenceLocation', e.target.value)}
                            />
                            <select
                                className="offer-preferences-select location-quick-select"
                                value={TUNISIAN_GOVERNORATES.includes(draft.referenceLocation) ? draft.referenceLocation : ''}
                                onChange={(e) => {
                                    if (e.target.value) updateField('referenceLocation', e.target.value)
                                }}
                                aria-label="Quick select governorate"
                            >
                                <option value="">Tunisia...</option>
                                {TUNISIAN_GOVERNORATES.map((gov) => (
                                    <option key={gov} value={gov}>
                                        {gov}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <span className="offer-preferences-hint">
                            {t('studentSwipe.preferences.referenceLocationHint')}
                        </span>
                    </div>

                    {/* 2. Workplace Mode (Remote / Onsite / All) */}
                    <div className="offer-preferences-field">
                        <span>{t('studentSwipe.preferences.locationMode.label')}</span>
                        <div className="segmented-control-group">
                            {[
                                { id: 'all', label: t('studentSwipe.preferences.locationMode.all') },
                                { id: 'onsite', label: t('studentSwipe.preferences.locationMode.onsite') },
                                { id: 'remote', label: t('studentSwipe.preferences.locationMode.remote') }
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    type="button"
                                    className={`segmented-control-btn ${draft.locationMode === mode.id ? 'active' : ''}`}
                                    onClick={() => updateField('locationMode', mode.id)}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3. Distance Radius */}
                    <label className={`offer-preferences-field ${isRemoteOnly ? 'is-disabled' : ''}`}>
                        <span>{t('studentSwipe.preferences.radiusLabel')}</span>
                        <select
                            className="offer-preferences-select"
                            value={draft.radiusKm}
                            disabled={isRemoteOnly}
                            onChange={(event) => updateField('radiusKm', event.target.value)}
                        >
                            <option value="any">{t('studentSwipe.preferences.radius.any')}</option>
                            <option value="15">{t('studentSwipe.preferences.radius.km15')}</option>
                            <option value="25">{t('studentSwipe.preferences.radius.km25')}</option>
                            <option value="50">{t('studentSwipe.preferences.radius.km50')}</option>
                            <option value="100">{t('studentSwipe.preferences.radius.km100')}</option>
                            <option value="250">{t('studentSwipe.preferences.radius.km250')}</option>
                        </select>
                        {isRemoteOnly && (
                            <span className="offer-preferences-hint is-warning">
                                {t('studentSwipe.preferences.radiusDisabledRemote')}
                            </span>
                        )}
                    </label>

                    {/* 4. Opportunity Type (Internship / CDI / Part-time / Contract) */}
                    <label className="offer-preferences-field">
                        <span className="field-label-with-icon">
                            <Briefcase size={14} />
                            {t('studentSwipe.preferences.opportunityType.label')}
                        </span>
                        <select
                            className="offer-preferences-select"
                            value={draft.opportunityType}
                            onChange={(event) => updateField('opportunityType', event.target.value)}
                        >
                            <option value="all">{t('studentSwipe.preferences.opportunityType.all')}</option>
                            <option value="internship">{t('studentSwipe.preferences.opportunityType.internship')}</option>
                            <option value="full-time">{t('studentSwipe.preferences.opportunityType.fullTime')}</option>
                            <option value="part-time">{t('studentSwipe.preferences.opportunityType.partTime')}</option>
                            <option value="contract">{t('studentSwipe.preferences.opportunityType.contract')}</option>
                        </select>
                    </label>

                    {/* 5. Industry / Sector */}
                    <label className="offer-preferences-field">
                        <span className="field-label-with-icon">
                            <Building2 size={14} />
                            {t('studentSwipe.preferences.categoryLabel')}
                        </span>
                        <select
                            className="offer-preferences-select"
                            value={draft.category}
                            onChange={(event) => updateField('category', event.target.value)}
                        >
                            {combinedCategories.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {/* 6. Unspecified Domiciliation Checkbox */}
                    <label className="offer-preferences-checkbox">
                        <input
                            type="checkbox"
                            checked={draft.includeUnspecifiedLocation}
                            onChange={(e) => updateField('includeUnspecifiedLocation', e.target.checked)}
                        />
                        <span>{t('studentSwipe.preferences.includeUnspecifiedLabel')}</span>
                    </label>
                </div>

                {/* Match indicator & Footer Actions */}
                <div className="offer-preferences-footer">
                    {matchCount !== null && (
                        <div className="offer-preferences-match-indicator">
                            <CheckCircle2 size={14} />
                            <span>
                                {matchCount === 1
                                    ? t('studentSwipe.preferences.matchingCount', '1 opportunity matches', { count: matchCount })
                                    : t('studentSwipe.preferences.matchingCountPlural', `${matchCount} opportunities match`, { count: matchCount })}
                            </span>
                        </div>
                    )}

                    <div className="offer-preferences-actions">
                        <button
                            type="button"
                            className="btn btn-secondary offer-preferences-btn-reset"
                            onClick={handleReset}
                        >
                            <RotateCcw size={14} />
                            {t('studentSwipe.preferences.actions.reset')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary offer-preferences-btn-save"
                            onClick={handleApply}
                        >
                            {t('studentSwipe.preferences.actions.save')}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default PreferencesDrawerOrModal
