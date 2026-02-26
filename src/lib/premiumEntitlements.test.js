import { afterEach, describe, expect, it, vi } from 'vitest'
import { getEntitlements, isPremiumActive } from './premiumEntitlements'

describe('premiumEntitlements', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it('returns false for users without premium flag', () => {
        expect(isPremiumActive({ is_premium: false })).toBe(false)
        expect(isPremiumActive(null)).toBe(false)
    })

    it('returns true for premium users without expiry', () => {
        expect(isPremiumActive({ is_premium: true, premium_expires_at: null })).toBe(true)
    })

    it('returns true when premium expiry is in the future', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-02-26T00:00:00.000Z'))

        expect(
            isPremiumActive({
                is_premium: true,
                premium_expires_at: '2026-03-01T00:00:00.000Z'
            })
        ).toBe(true)
    })

    it('returns false when premium expiry is in the past', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-02-26T00:00:00.000Z'))

        expect(
            isPremiumActive({
                is_premium: true,
                premium_expires_at: '2026-02-20T00:00:00.000Z'
            })
        ).toBe(false)
    })

    it('marks status as Expired when premium flag exists but expiry has passed', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-02-26T00:00:00.000Z'))

        const entitlements = getEntitlements({
            is_premium: true,
            premium_expires_at: '2026-02-20T00:00:00.000Z'
        })

        expect(entitlements.premiumActive).toBe(false)
        expect(entitlements.premiumStatusLabel).toBe('Expired')
        expect(entitlements.hasUnlimitedSwipes).toBe(false)
        expect(entitlements.dailySwipeLimit).toBe(20)
    })

    it('returns premium entitlements for active premium users', () => {
        const entitlements = getEntitlements({
            is_premium: true,
            premium_expires_at: null
        })

        expect(entitlements.premiumActive).toBe(true)
        expect(entitlements.canUseGlobalDiscovery).toBe(true)
        expect(entitlements.canUsePersonalized).toBe(true)
        expect(entitlements.hasUnlimitedSwipes).toBe(true)
        expect(entitlements.dailySwipeLimit).toBe(null)
        expect(entitlements.premiumStatusLabel).toBe('Premium')
    })

    it('returns free entitlements for non-premium users', () => {
        const entitlements = getEntitlements({
            is_premium: false,
            premium_expires_at: null
        })

        expect(entitlements.premiumActive).toBe(false)
        expect(entitlements.canUseGlobalDiscovery).toBe(false)
        expect(entitlements.canUsePersonalized).toBe(false)
        expect(entitlements.hasUnlimitedSwipes).toBe(false)
        expect(entitlements.dailySwipeLimit).toBe(20)
        expect(entitlements.premiumStatusLabel).toBe('Free')
    })
})
