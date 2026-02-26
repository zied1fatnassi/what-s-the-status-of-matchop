const FREE_DAILY_SWIPE_LIMIT = 20

export function isPremiumActive(profile, nowMs = Date.now()) {
    if (profile?.is_premium !== true) return false
    if (!profile?.premium_expires_at) return true

    const expiresAtMs = Date.parse(profile.premium_expires_at)
    return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs
}

export function getEntitlements(profile) {
    const premiumActive = isPremiumActive(profile)
    const hasPremiumFlag = profile?.is_premium === true
    const premiumStatusLabel = premiumActive
        ? 'Premium'
        : hasPremiumFlag
            ? 'Expired'
            : 'Free'

    return {
        premiumActive,
        canUseGlobalDiscovery: premiumActive,
        canUsePersonalized: premiumActive,
        hasUnlimitedSwipes: premiumActive,
        dailySwipeLimit: premiumActive ? null : FREE_DAILY_SWIPE_LIMIT,
        premiumStatusLabel
    }
}

export default {
    isPremiumActive,
    getEntitlements
}
