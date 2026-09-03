import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Lightweight bilingual helper for places that still have inline copy.
 * Returns english by default and french when active language starts with "fr".
 */
export function useBilingualText() {
    const { i18n } = useTranslation()
    const isFrench = String(i18n?.language || '').toLowerCase().startsWith('fr')

    return useCallback(
        (englishText, frenchText) => (isFrench ? frenchText : englishText),
        [isFrench]
    )
}

export default useBilingualText
