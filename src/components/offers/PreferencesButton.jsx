import { SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './OfferDiscoveryControls.css'

function PreferencesButton({ onClick, disabled = false, activeCount = 0 }) {
    const { t } = useTranslation(undefined, { useSuspense: false })

    return (
        <button
            type="button"
            data-testid="preferences-button"
            className={`offer-preferences-button ${activeCount > 0 ? 'is-active' : ''}`}
            onClick={onClick}
            disabled={disabled}
            aria-label={t('studentSwipe.controls.preferencesAria')}
            title={t('studentSwipe.controls.preferences')}
        >
            <SlidersHorizontal size={15} aria-hidden="true" />
            <span className="offer-preferences-button-text">{t('studentSwipe.controls.preferences')}</span>
            {activeCount > 0 && (
                <span className="offer-preferences-count-badge" aria-label={`${activeCount} active filters`}>
                    {activeCount}
                </span>
            )}
        </button>
    )
}

export default PreferencesButton
