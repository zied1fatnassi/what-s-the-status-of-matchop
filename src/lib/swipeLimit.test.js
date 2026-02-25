import { describe, it, expect } from 'vitest'
import {
    DEFAULT_STANDARD_DAILY_SWIPE_LIMIT,
    resolveStandardDailySwipeLimit,
    isPremiumProfileActive,
    isLimitReachedCode,
    normalizeSwipeLimitUsage
} from './swipeLimit'

describe('swipeLimit utils', () => {
    describe('resolveStandardDailySwipeLimit', () => {
        it('returns valid positive integer values', () => {
            expect(resolveStandardDailySwipeLimit('25')).toBe(25)
            expect(resolveStandardDailySwipeLimit(12.9)).toBe(12)
        })

        it('falls back for invalid values', () => {
            expect(resolveStandardDailySwipeLimit(null)).toBe(DEFAULT_STANDARD_DAILY_SWIPE_LIMIT)
            expect(resolveStandardDailySwipeLimit('abc')).toBe(DEFAULT_STANDARD_DAILY_SWIPE_LIMIT)
            expect(resolveStandardDailySwipeLimit(0)).toBe(DEFAULT_STANDARD_DAILY_SWIPE_LIMIT)
            expect(resolveStandardDailySwipeLimit(-4)).toBe(DEFAULT_STANDARD_DAILY_SWIPE_LIMIT)
        })
    })

    describe('isPremiumProfileActive', () => {
        const now = Date.parse('2026-02-24T12:00:00.000Z')

        it('returns true for premium without expiry', () => {
            expect(isPremiumProfileActive({ is_premium: true, premium_expires_at: null }, now)).toBe(true)
        })

        it('returns true for unexpired premium and false for expired', () => {
            expect(isPremiumProfileActive({
                is_premium: true,
                premium_expires_at: '2026-02-25T00:00:00.000Z'
            }, now)).toBe(true)

            expect(isPremiumProfileActive({
                is_premium: true,
                premium_expires_at: '2026-02-20T00:00:00.000Z'
            }, now)).toBe(false)
        })
    })

    describe('isLimitReachedCode', () => {
        it('accepts both legacy and canonical limit codes', () => {
            expect(isLimitReachedCode('LIMIT_REACHED')).toBe(true)
            expect(isLimitReachedCode('DAILY_LIMIT')).toBe(true)
            expect(isLimitReachedCode('OK')).toBe(false)
        })
    })

    describe('normalizeSwipeLimitUsage', () => {
        it('normalizes standard status payloads', () => {
            const usage = normalizeSwipeLimitUsage({
                effective_plan: 'standard',
                daily_count: 19,
                limit_count: 20,
                code: 'OK'
            })

            expect(usage.effectivePlan).toBe('standard')
            expect(usage.limit).toBe(20)
            expect(usage.used).toBe(19)
            expect(usage.remaining).toBe(1)
            expect(usage.reached).toBe(false)
        })

        it('normalizes premium status payloads to unlimited shape', () => {
            const usage = normalizeSwipeLimitUsage({
                effective_plan: 'premium',
                code: 'OK'
            })

            expect(usage.effectivePlan).toBe('premium')
            expect(usage.limit).toBe(null)
            expect(usage.remaining).toBe(null)
            expect(usage.reached).toBe(false)
            expect(usage.allowed).toBe(true)
        })

        it('marks standard usage as reached when count exceeds limit', () => {
            const usage = normalizeSwipeLimitUsage({
                effective_plan: 'standard',
                daily_count: 22,
                limit_count: 20
            })

            expect(usage.reached).toBe(true)
            expect(usage.allowed).toBe(false)
            expect(usage.code).toBe('LIMIT_REACHED')
        })
    })
})

