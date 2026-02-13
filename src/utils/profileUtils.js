import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

/**
 * Export profile to PDF via server-side Edge Function.
 * Generates a branded, searchable PDF and returns a signed download URL.
 *
 * @param {string} profileId - The profile/user UUID to generate a PDF for
 * @param {string} profileType - 'student-cv' (default, only option for now)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function exportProfileToPDF(profileId, profileType = 'student-cv') {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
                profile_id: profileId,
                profile_type: profileType,
            }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
            console.error('[PDF] Generation failed:', data.error)
            return { success: false, error: data.error || 'PDF generation failed' }
        }

        // Open the signed URL in a new tab (auto-downloads or previews)
        window.open(data.url, '_blank')

        return { success: true, url: data.url }
    } catch (err) {
        console.error('[PDF] Unexpected error:', err)
        return { success: false, error: err.message || 'Network error' }
    }
}

/**
 * Generate profile share link
 */
export function generateProfileShareLink(userId) {
    const baseUrl = window.location.origin
    return `${baseUrl}/profile/${userId}`
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text)
        return { success: true }
    } catch (err) {
        return { success: false, error: err.message }
    }
}

export default {
    exportProfileToPDF,
    generateProfileShareLink,
    copyToClipboard
}
