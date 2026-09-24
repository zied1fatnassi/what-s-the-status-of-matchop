import { isPremiumActive } from './premiumEntitlements'

export const DEFAULT_STANDARD_DAILY_SWIPE_LIMIT = 20

export function resolveStandardDailySwipeLimit(rawValue, fallback = DEFAULT_STANDARD_DAILY_SWIPE_LIMIT) {
    const numeric = Number(rawValue)
    if (!Number.isFinite(numeric)) return fallback
    const parsed = Math.trunc(numeric)
    if (parsed < 1) return fallback
    return parsed
}

export function isPremiumProfileActive(profile, nowMs = Date.now()) {
    return isPremiumActive(profile, nowMs)
}

export function isLimitReachedCode(code) {
    return code === 'LIMIT_REACHED' || code === 'DAILY_LIMIT'
}

export function normalizeSwipeLimitUsage(rawStatus, fallbackLimit = DEFAULT_STANDARD_DAILY_SWIPE_LIMIT) {
    const status = rawStatus && typeof rawStatus === 'object' ? rawStatus : {}
    const effectivePlan = status.effective_plan === 'premium' ? 'premium' : 'standard'

    if (effectivePlan === 'premium') {
        return {
            effectivePlan,
            allowed: true,
            reached: false,
            limit: null,
            used: Number(status.daily_count ?? 0),
            remaining: null,
            code: String(status.code ?? 'OK')
        }
    }

    const rawLimit = Number(status.limit_count)
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.trunc(rawLimit)
        : fallbackLimit

    const rawCount = Number(status.daily_count)
    const used = Number.isFinite(rawCount) && rawCount >= 0
        ? Math.trunc(rawCount)
        : 0

    const remaining = Math.max(0, limit - used)
    const reached = Boolean(status.reached) || remaining <= 0

    return {
        effectivePlan,
        allowed: !reached,
        reached,
        limit,
        used,
        remaining,
        code: String(status.code ?? (reached ? 'LIMIT_REACHED' : 'OK'))
    }
}
