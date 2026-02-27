import {
    readStorageString,
    removeStorageKey,
    writeStorageString,
} from './localStorageState'

export const INBOUND_REFERRAL_CODE_KEY = 'matchop_referral_code'
export const INBOUND_REFERRAL_SEEN_AT_KEY = 'matchop_referral_seen_at'
export const MY_REFERRAL_CODE_KEY = 'matchop_my_referral_code'
export const REFERRAL_PROGRESS_KEY = 'matchop_referral_progress'

export const REFERRAL_QUERY_PATTERN = /^MOP-[A-Z0-9]{8}$/

function randomBase36Code(length = 8) {
    let output = ''
    while (output.length < length) {
        output += Math.random().toString(36).slice(2).toUpperCase()
    }
    return output.slice(0, length)
}

export function buildReferralCodeFromUserId(userId) {
    if (!userId) return ''
    return `MOP-${String(userId).slice(0, 8).toUpperCase()}`
}

export function generateStableLocalReferralCode() {
    return `MOP-${randomBase36Code(8)}`
}

export function normalizeReferralCode(value) {
    return String(value || '').trim().toUpperCase()
}

export function isValidReferralCode(value) {
    return REFERRAL_QUERY_PATTERN.test(normalizeReferralCode(value))
}

export function migrateLegacySelfReferralCode(userId) {
    if (!userId) return ''

    const currentSelfCode = readStorageString(MY_REFERRAL_CODE_KEY, '')
    if (currentSelfCode) return currentSelfCode

    // Keep inbound attribution intact when a referral landing was actually seen.
    const inboundSeenAt = readStorageString(INBOUND_REFERRAL_SEEN_AT_KEY, '')
    if (inboundSeenAt) return ''

    const legacyCode = readStorageString(INBOUND_REFERRAL_CODE_KEY, '')
    const normalizedLegacyCode = normalizeReferralCode(legacyCode)
    if (!isValidReferralCode(normalizedLegacyCode)) return ''

    writeStorageString(MY_REFERRAL_CODE_KEY, normalizedLegacyCode)
    removeStorageKey(INBOUND_REFERRAL_CODE_KEY)
    return normalizedLegacyCode
}

export function resolveMyReferralCode(userId) {
    const migrated = migrateLegacySelfReferralCode(userId)
    if (migrated) return migrated

    const deterministic = buildReferralCodeFromUserId(userId)
    if (deterministic) {
        writeStorageString(MY_REFERRAL_CODE_KEY, deterministic)
        return deterministic
    }

    const existing = normalizeReferralCode(readStorageString(MY_REFERRAL_CODE_KEY, ''))
    if (isValidReferralCode(existing)) return existing

    const generated = generateStableLocalReferralCode()
    writeStorageString(MY_REFERRAL_CODE_KEY, generated)
    return generated
}

export function buildReferralInviteLink(referralCode, origin = window.location.origin) {
    const normalizedCode = normalizeReferralCode(referralCode)
    if (!normalizedCode) return ''
    return `${origin}/student/signup?ref=${encodeURIComponent(normalizedCode)}`
}
