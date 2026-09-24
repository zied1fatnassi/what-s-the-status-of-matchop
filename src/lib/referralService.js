import { supabase } from './supabase'
import { normalizeReferralCode, isValidReferralCode } from './referrals'

/**
 * Validates a referral code against the backend without leaking owner information.
 * Safe for anonymous / pre-signup usage.
 * @param {string} code
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
export async function validateReferralCode(code) {
    const normalized = normalizeReferralCode(code)
    if (!isValidReferralCode(normalized)) {
        return { valid: false }
    }

    try {
        const { data, error } = await supabase.rpc('validate_referral_code', {
            p_code: normalized
        })

        if (error) {
            console.error('[referralService] validate_referral_code error:', error)
            return { valid: false, error: error.message }
        }

        return { valid: Boolean(data?.valid) }
    } catch (err) {
        console.error('[referralService] validateReferralCode exception:', err)
        return { valid: false, error: err.message }
    }
}

/**
 * Fetches the server-authoritative referral dashboard state for the authenticated user.
 * @returns {Promise<{
 *   ok: boolean,
 *   referralCode: string,
 *   totalReferrals: number,
 *   qualifyingReferrals: number,
 *   pendingReferrals: number,
 *   requiredReferrals: number,
 *   rewardDays: number,
 *   milestoneStatus: 'in_progress' | 'eligible' | 'claimed',
 *   isEligible: boolean,
 *   isClaimed: boolean,
 *   claimedAt: string | null,
 *   premium: { isPremium: boolean, premiumExpiresAt: string | null },
 *   error?: string
 * }>}
 */
export async function getReferralDashboard() {
    try {
        const { data, error } = await supabase.rpc('get_referral_dashboard')

        if (error) {
            console.error('[referralService] get_referral_dashboard error:', error)
            return {
                ok: false,
                referralCode: '',
                totalReferrals: 0,
                qualifyingReferrals: 0,
                pendingReferrals: 0,
                requiredReferrals: 3,
                rewardDays: 7,
                milestoneStatus: 'in_progress',
                isEligible: false,
                isClaimed: false,
                claimedAt: null,
                premium: { isPremium: false, premiumExpiresAt: null },
                error: error.message
            }
        }

        return {
            ok: true,
            referralCode: data?.referral_code || '',
            totalReferrals: Number(data?.total_referrals || 0),
            qualifyingReferrals: Number(data?.qualifying_referrals || 0),
            pendingReferrals: Number(data?.pending_referrals || 0),
            requiredReferrals: Number(data?.required_referrals || 3),
            rewardDays: Number(data?.reward_days || 7),
            milestoneStatus: data?.milestone_status || 'in_progress',
            isEligible: Boolean(data?.is_eligible),
            isClaimed: Boolean(data?.is_claimed),
            claimedAt: data?.claimed_at || null,
            premium: {
                isPremium: Boolean(data?.premium?.is_premium),
                premiumExpiresAt: data?.premium?.premium_expires_at || null
            }
        }
    } catch (err) {
        console.error('[referralService] getReferralDashboard exception:', err)
        return {
            ok: false,
            referralCode: '',
            totalReferrals: 0,
            qualifyingReferrals: 0,
            pendingReferrals: 0,
            requiredReferrals: 3,
            rewardDays: 7,
            milestoneStatus: 'in_progress',
            isEligible: false,
            isClaimed: false,
            claimedAt: null,
            premium: { isPremium: false, premiumExpiresAt: null },
            error: err.message
        }
    }
}

/**
 * Submits referral attribution for the currently authenticated user.
 * Server-authoritative and idempotent.
 * @param {string} code
 * @returns {Promise<{ ok: boolean, alreadyAttributed?: boolean, status?: string, errorCode?: string, message?: string }>}
 */
export async function attributeReferral(code) {
    const normalized = normalizeReferralCode(code)
    if (!isValidReferralCode(normalized)) {
        return { ok: false, errorCode: 'INVALID_REFERRAL_CODE', message: 'Invalid code format' }
    }

    try {
        const { data, error } = await supabase.rpc('attribute_referral', {
            p_referral_code: normalized
        })

        if (error) {
            console.error('[referralService] attribute_referral error:', error)
            return { ok: false, errorCode: 'RPC_ERROR', message: error.message }
        }

        return {
            ok: Boolean(data?.ok),
            alreadyAttributed: Boolean(data?.already_attributed),
            status: data?.status || '',
            errorCode: data?.error_code,
            message: data?.message
        }
    } catch (err) {
        console.error('[referralService] attributeReferral exception:', err)
        return { ok: false, errorCode: 'EXCEPTION', message: err.message }
    }
}

/**
 * Claims the referral milestone reward for the authenticated user.
 * Idempotent, concurrency-safe server operation.
 * @param {string} [milestoneType='invite_3_premium_7d']
 * @returns {Promise<{
 *   ok: boolean,
 *   alreadyClaimed?: boolean,
 *   rewardDays?: number,
 *   premiumExpiresAt?: string,
 *   isPremium?: boolean,
 *   errorCode?: string,
 *   message?: string
 * }>}
 */
export async function claimReferralReward(milestoneType = 'invite_3_premium_7d') {
    try {
        const { data, error } = await supabase.rpc('claim_referral_reward', {
            p_milestone_type: milestoneType
        })

        if (error) {
            console.error('[referralService] claim_referral_reward error:', error)
            return { ok: false, errorCode: 'RPC_ERROR', message: error.message }
        }

        return {
            ok: Boolean(data?.ok),
            alreadyClaimed: Boolean(data?.already_claimed),
            rewardDays: data?.reward_days || 7,
            premiumExpiresAt: data?.premium_expires_at,
            isPremium: Boolean(data?.is_premium),
            errorCode: data?.error_code,
            message: data?.message
        }
    } catch (err) {
        console.error('[referralService] claimReferralReward exception:', err)
        return { ok: false, errorCode: 'EXCEPTION', message: err.message }
    }
}
