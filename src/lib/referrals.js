import {
    readStorageString,
    writeStorageString,
} from './localStorageState'

export const INBOUND_REFERRAL_CODE_KEY = 'matchop_referral_code'
export const INBOUND_REFERRAL_SEEN_AT_KEY = 'matchop_referral_seen_at'
export const MY_REFERRAL_CODE_KEY = 'matchop_my_referral_code'

export const REFERRAL_QUERY_PATTERN = /^MOP-[A-Z0-9]{8}$/

export function buildReferralCodeFromUserId(userId) {
    if (!userId) return ''
    return `MOP-${String(userId).replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

export function normalizeReferralCode(value) {
    return String(value || '').trim().toUpperCase()
}

export function isValidReferralCode(value) {
    return REFERRAL_QUERY_PATTERN.test(normalizeReferralCode(value))
}

/**
 * Resolves the cached referral code for an authenticated user.
 * CRITICAL SECURITY GUARANTEE: Returns empty string for unauthenticated callers (null/undefined userId)
 * to strictly prevent client-side identity bleed and unauthenticated code generation.
 * @param {string|null} userId
 * @returns {string}
 */
export function resolveMyReferralCode(userId) {
    if (!userId) {
        return ''
    }

    const cached = normalizeReferralCode(readStorageString(MY_REFERRAL_CODE_KEY, ''))
    if (isValidReferralCode(cached)) {
        return cached
    }

    const fallback = buildReferralCodeFromUserId(userId)
    if (fallback) {
        writeStorageString(MY_REFERRAL_CODE_KEY, fallback)
        return fallback
    }

    return ''
}

export function buildReferralInviteLink(referralCode, origin = (typeof window !== 'undefined' ? window.location.origin : '')) {
    const normalizedCode = normalizeReferralCode(referralCode)
    if (!normalizedCode) return ''
    return `${origin}/student/signup?ref=${encodeURIComponent(normalizedCode)}`
}
