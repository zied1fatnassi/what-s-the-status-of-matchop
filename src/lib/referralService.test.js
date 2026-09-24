import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.fn()

vi.mock('./supabase', () => ({
    supabase: {
        rpc: (...args) => rpcMock(...args)
    }
}))

import {
    attributeReferral,
    claimReferralReward,
    getReferralDashboard,
    validateReferralCode,
} from './referralService'

describe('referralService', () => {
    beforeEach(() => {
        rpcMock.mockReset()
    })

    describe('validateReferralCode', () => {
        it('rejects invalid format before calling RPC', async () => {
            const res = await validateReferralCode('invalid')
            expect(res.valid).toBe(false)
            expect(rpcMock).not.toHaveBeenCalled()
        })

        it('calls RPC for validly formatted code', async () => {
            rpcMock.mockResolvedValue({ data: { valid: true }, error: null })
            const res = await validateReferralCode('mop-12345678')
            expect(rpcMock).toHaveBeenCalledWith('validate_referral_code', { p_code: 'MOP-12345678' })
            expect(res.valid).toBe(true)
        })

        it('handles RPC error gracefully', async () => {
            rpcMock.mockResolvedValue({ data: null, error: new Error('Database unreachable') })
            const res = await validateReferralCode('MOP-12345678')
            expect(res.valid).toBe(false)
            expect(res.error).toBe('Database unreachable')
        })
    })

    describe('getReferralDashboard', () => {
        it('fetches and maps dashboard data successfully', async () => {
            rpcMock.mockResolvedValue({
                data: {
                    ok: true,
                    referral_code: 'MOP-ALICE001',
                    total_referrals: 3,
                    qualifying_referrals: 3,
                    pending_referrals: 0,
                    required_referrals: 3,
                    reward_days: 7,
                    milestone_status: 'eligible',
                    is_eligible: true,
                    is_claimed: false,
                    claimed_at: null,
                    premium: {
                        is_premium: false,
                        premium_expires_at: null
                    }
                },
                error: null
            })

            const res = await getReferralDashboard()
            expect(rpcMock).toHaveBeenCalledWith('get_referral_dashboard')
            expect(res.ok).toBe(true)
            expect(res.referralCode).toBe('MOP-ALICE001')
            expect(res.qualifyingReferrals).toBe(3)
            expect(res.isEligible).toBe(true)
            expect(res.isClaimed).toBe(false)
        })

        it('handles error with safe defaults', async () => {
            rpcMock.mockResolvedValue({ data: null, error: new Error('Network error') })
            const res = await getReferralDashboard()
            expect(res.ok).toBe(false)
            expect(res.referralCode).toBe('')
            expect(res.qualifyingReferrals).toBe(0)
            expect(res.isEligible).toBe(false)
        })
    })

    describe('attributeReferral', () => {
        it('rejects invalid code format immediately', async () => {
            const res = await attributeReferral('bad')
            expect(res.ok).toBe(false)
            expect(res.errorCode).toBe('INVALID_REFERRAL_CODE')
            expect(rpcMock).not.toHaveBeenCalled()
        })

        it('calls attribution RPC and returns success', async () => {
            rpcMock.mockResolvedValue({
                data: {
                    ok: true,
                    already_attributed: false,
                    status: 'qualified',
                    referral_code: 'MOP-BOB00001'
                },
                error: null
            })

            const res = await attributeReferral('MOP-BOB00001')
            expect(rpcMock).toHaveBeenCalledWith('attribute_referral', { p_referral_code: 'MOP-BOB00001' })
            expect(res.ok).toBe(true)
            expect(res.alreadyAttributed).toBe(false)
            expect(res.status).toBe('qualified')
        })

        it('returns alreadyAttributed true if already linked', async () => {
            rpcMock.mockResolvedValue({
                data: {
                    ok: true,
                    already_attributed: true,
                    status: 'qualified',
                    referral_code: 'MOP-BOB00001'
                },
                error: null
            })

            const res = await attributeReferral('MOP-BOB00001')
            expect(res.ok).toBe(true)
            expect(res.alreadyAttributed).toBe(true)
        })

        it('handles self-referral rejection from server', async () => {
            rpcMock.mockResolvedValue({
                data: {
                    ok: false,
                    error_code: 'SELF_REFERRAL',
                    message: 'You cannot use your own referral code'
                },
                error: null
            })

            const res = await attributeReferral('MOP-MYOWN001')
            expect(res.ok).toBe(false)
            expect(res.errorCode).toBe('SELF_REFERRAL')
        })
    })

    describe('claimReferralReward', () => {
        it('claims reward and returns updated premium state', async () => {
            rpcMock.mockResolvedValue({
                data: {
                    ok: true,
                    already_claimed: false,
                    status: 'claimed',
                    reward_days: 7,
                    premium_expires_at: '2026-03-25T10:00:00.000Z',
                    is_premium: true
                },
                error: null
            })

            const res = await claimReferralReward()
            expect(rpcMock).toHaveBeenCalledWith('claim_referral_reward', { p_milestone_type: 'invite_3_premium_7d' })
            expect(res.ok).toBe(true)
            expect(res.alreadyClaimed).toBe(false)
            expect(res.isPremium).toBe(true)
            expect(res.rewardDays).toBe(7)
        })

        it('returns alreadyClaimed if already redeemed', async () => {
            rpcMock.mockResolvedValue({
                data: {
                    ok: true,
                    already_claimed: true,
                    status: 'claimed',
                    message: 'Reward has already been claimed',
                    premium_expires_at: '2026-03-25T10:00:00.000Z',
                    is_premium: true
                },
                error: null
            })

            const res = await claimReferralReward()
            expect(res.ok).toBe(true)
            expect(res.alreadyClaimed).toBe(true)
        })

        it('handles not eligible error', async () => {
            rpcMock.mockResolvedValue({
                data: {
                    ok: false,
                    error_code: 'NOT_ELIGIBLE',
                    message: 'You need at least 3 qualifying referrals to claim this reward'
                },
                error: null
            })

            const res = await claimReferralReward()
            expect(res.ok).toBe(false)
            expect(res.errorCode).toBe('NOT_ELIGIBLE')
        })
    })
})
