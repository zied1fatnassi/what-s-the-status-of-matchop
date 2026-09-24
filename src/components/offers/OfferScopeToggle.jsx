import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import './OfferDiscoveryControls.css'

function OfferScopeToggle({
    activeScope = 'local',
    isPremium = false,
    disabled = false,
    onChange,
    premiumEnabled = true
}) {
    const { t } = useTranslation(undefined, { useSuspense: false })
    const scopes = useMemo(() => {
        if (!premiumEnabled) return ['local']
        return ['local', 'global']
    }, [premiumEnabled])

    if (!premiumEnabled) return null

    const activeIndex = Math.max(0, scopes.indexOf(activeScope))

    const handleKeyDown = (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()

        const delta = event.key === 'ArrowRight' ? 1 : -1
        const nextIndex = (activeIndex + delta + scopes.length) % scopes.length
        onChange?.(scopes[nextIndex])
    }

    return (
        <div
            className="offer-scope-toggle"
            role="radiogroup"
            aria-label={t('studentSwipe.stack.discoveryScopeAria')}
            onKeyDown={handleKeyDown}
        >
            <button
                type="button"
                data-testid="offer-scope-local"
                className={`offer-scope-toggle-btn ${activeScope === 'local' ? 'active' : ''}`.trim()}
                role="radio"
                aria-checked={activeScope === 'local'}
                aria-label={`${t('studentSwipe.stack.localLabel')} (${t('studentSwipe.stack.freeBadge')})`}
                onClick={() => onChange?.('local')}
                disabled={disabled}
            >
                <span className="offer-scope-toggle-label">
                    {t('studentSwipe.stack.localLabel')}
                </span>
                <span className="offer-scope-toggle-badge offer-scope-toggle-badge-free">
                    {t('studentSwipe.stack.freeBadge')}
                </span>
            </button>

            <button
                type="button"
                data-testid="offer-scope-global"
                className={`offer-scope-toggle-btn ${activeScope === 'global' ? 'active' : ''} ${!isPremium ? 'locked' : ''}`.trim()}
                role="radio"
                aria-checked={activeScope === 'global'}
                aria-label={`${t('studentSwipe.stack.globalLabel')} (${t('studentSwipe.stack.premiumBadge')})`}
                onClick={() => onChange?.('global')}
                disabled={disabled}
            >
                <span className="offer-scope-toggle-label">
                    {!isPremium && <Lock size={14} aria-hidden="true" />}
                    {t('studentSwipe.stack.globalLabel')}
                </span>
                <span className="offer-scope-toggle-badge offer-scope-toggle-badge-premium">
                    {t('studentSwipe.stack.premiumBadge')}
                </span>
            </button>
        </div>
    )
}

export default OfferScopeToggle
