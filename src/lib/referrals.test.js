import { beforeEach, describe, expect, it } from 'vitest'
import {
    INBOUND_REFERRAL_CODE_KEY,
    INBOUND_REFERRAL_SEEN_AT_KEY,
    MY_REFERRAL_CODE_KEY,
    migrateLegacySelfReferralCode,
    resolveMyReferralCode,
} from './referrals'

describe('referrals storage migration', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('migrates legacy self code from inbound key in authenticated context', () => {
        localStorage.setItem(INBOUND_REFERRAL_CODE_KEY, 'MOP-ABCDEF12')

        const migrated = migrateLegacySelfReferralCode('user-1')

        expect(migrated).toBe('MOP-ABCDEF12')
        expect(localStorage.getItem(MY_REFERRAL_CODE_KEY)).toBe('MOP-ABCDEF12')
        expect(localStorage.getItem(INBOUND_REFERRAL_CODE_KEY)).toBeNull()
    })

    it('does not migrate inbound attribution when seen timestamp exists', () => {
        localStorage.setItem(INBOUND_REFERRAL_CODE_KEY, 'MOP-ABCDEF12')
        localStorage.setItem(INBOUND_REFERRAL_SEEN_AT_KEY, '2026-02-27T10:00:00.000Z')

        const migrated = migrateLegacySelfReferralCode('user-1')

        expect(migrated).toBe('')
        expect(localStorage.getItem(MY_REFERRAL_CODE_KEY)).toBeNull()
        expect(localStorage.getItem(INBOUND_REFERRAL_CODE_KEY)).toBe('MOP-ABCDEF12')
    })

    it('resolveMyReferralCode keeps existing self code and avoids collisions', () => {
        localStorage.setItem(MY_REFERRAL_CODE_KEY, 'MOP-KEEPME99')
        localStorage.setItem(INBOUND_REFERRAL_CODE_KEY, 'MOP-OTHER111')

        const code = resolveMyReferralCode('user-2')

        expect(code).toBe('MOP-KEEPME99')
        expect(localStorage.getItem(MY_REFERRAL_CODE_KEY)).toBe('MOP-KEEPME99')
    })
})
