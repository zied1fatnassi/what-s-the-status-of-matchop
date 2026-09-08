import { beforeEach, describe, expect, it } from 'vitest'
import {
    INBOUND_REFERRAL_CODE_KEY,
    MY_REFERRAL_CODE_KEY,
    buildReferralInviteLink,
    isValidReferralCode,
    normalizeReferralCode,
    resolveMyReferralCode,
} from './referrals'

describe('referrals utilities & identity safety', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('returns empty string and does not bleed identity when caller is unauthenticated (null userId)', () => {
        const code = resolveMyReferralCode(null)
        expect(code).toBe('')
        expect(localStorage.getItem(MY_REFERRAL_CODE_KEY)).toBeNull()
    })

    it('returns deterministic referral code for authenticated user when not cached', () => {
        const code = resolveMyReferralCode('abcdef12-3456-7890-abcd-ef1234567890')
        expect(code).toBe('MOP-ABCDEF12')
        expect(isValidReferralCode(code)).toBe(true)
        expect(localStorage.getItem(MY_REFERRAL_CODE_KEY)).toBe('MOP-ABCDEF12')
    })

    it('reads cached referral code if valid', () => {
        localStorage.setItem(MY_REFERRAL_CODE_KEY, 'MOP-VALID123')
        const code = resolveMyReferralCode('user-999')
        expect(code).toBe('MOP-VALID123')
    })

    it('does not bleed inbound referral code into user identity', () => {
        localStorage.setItem(INBOUND_REFERRAL_CODE_KEY, 'MOP-FRIEND11')
        const code = resolveMyReferralCode(null)
        expect(code).toBe('')
        expect(localStorage.getItem(MY_REFERRAL_CODE_KEY)).toBeNull()
        expect(localStorage.getItem(INBOUND_REFERRAL_CODE_KEY)).toBe('MOP-FRIEND11')
    })

    it('builds invite link formatted for student signup', () => {
        const link = buildReferralInviteLink('MOP-ABCDEF12', 'https://matchop.tn')
        expect(link).toBe('https://matchop.tn/student/signup?ref=MOP-ABCDEF12')
    })

    it('normalizes and validates referral codes strictly', () => {
        expect(normalizeReferralCode('  mop-abcdef12  ')).toBe('MOP-ABCDEF12')
        expect(isValidReferralCode('MOP-ABCDEF12')).toBe(true)
        expect(isValidReferralCode('MOP-SHORT')).toBe(false)
        expect(isValidReferralCode('INVALID-CODE')).toBe(false)
        expect(isValidReferralCode('')).toBe(false)
    })
})
