import { supabase } from './supabase'

/**
 * Verification utilities for validating and managing user verification
 */

/**
 * Validate LinkedIn profile URL format
 * @param {string} linkedinUrl - LinkedIn profile URL
 * @returns {Object} - { valid: boolean, error?: string }
 */
export function validateLinkedInUrl(linkedinUrl) {
    if (!linkedinUrl || typeof linkedinUrl !== 'string') {
        return { valid: false, error: 'LinkedIn URL is required' }
    }

    // Remove trailing slash and whitespace
    const cleanUrl = linkedinUrl.trim().replace(/\/$/, '')

    // LinkedIn profile URL patterns
    const patterns = [
        /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+$/,  // Standard profile
        /^https?:\/\/(www\.)?linkedin\.com\/company\/[\w-]+$/  // Company page
    ]

    const isValid = patterns.some(pattern => pattern.test(cleanUrl))

    if (!isValid) {
        return {
            valid: false,
            error: 'Invalid LinkedIn URL format. Expected: https://linkedin.com/in/your-profile'
        }
    }

    return { valid: true, url: cleanUrl }
}

/**
 * Verify user's LinkedIn profile
 * @param {string} userId - User ID
 * @param {string} linkedinUrl - LinkedIn profile URL
 * @returns {Promise<Object>} - { success: boolean, error?: string }
 */
export async function verifyLinkedInProfile(userId, linkedinUrl) {
    // Validate URL format
    const validation = validateLinkedInUrl(linkedinUrl)
    if (!validation.valid) {
        return { success: false, error: validation.error }
    }

    try {
        // Update profile with LinkedIn verification
        const { error } = await supabase
            .from('profiles')
            .update({
                verified: true,
                verification_method: 'linkedin',
                verification_data: {
                    linkedin_url: validation.url,
                    linkedin_verified_at: new Date().toISOString()
                },
                verified_at: new Date().toISOString()
            })
            .eq('id', userId)

        if (error) throw error

        return { success: true }
    } catch (err) {
        console.error('LinkedIn verification failed:', err)
        return { success: false, error: err.message }
    }
}

/**
 * Auto-verify email when user confirms their email address
 * @param {string} userId - User ID
 * @param {string} emailConfirmedAt - Timestamp from Supabase auth
 * @returns {Promise<Object>} - { success: boolean, error?: string }
 */
export async function autoVerifyEmail(userId, emailConfirmedAt) {
    try {
        // Check if already verified
        const { data: profile } = await supabase
            .from('profiles')
            .select('verified')
            .eq('id', userId)
            .single()

        if (profile?.verified) {
            return { success: true, message: 'Already verified' }
        }

        // Set email verification
        const { error } = await supabase
            .from('profiles')
            .update({
                verified: true,
                verification_method: 'email',
                verification_data: {
                    verified_via: 'supabase_auth'
                },
                verified_at: emailConfirmedAt
            })
            .eq('id', userId)

        if (error) throw error

        return { success: true }
    } catch (err) {
        console.error('Email auto-verification failed:', err)
        return { success: false, error: err.message }
    }
}

/**
 * Remove verification from user profile
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - { success: boolean, error?: string }
 */
export async function removeVerification(userId) {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                verified: false,
                verification_method: null,
                verification_data: {},
                verified_at: null
            })
            .eq('id', userId)

        if (error) throw error

        return { success: true }
    } catch (err) {
        console.error('Remove verification failed:', err)
        return { success: false, error: err.message }
    }
}

/**
 * Check if user is verified
 * @param {Object} profile - User profile object
 * @returns {boolean}
 */
export function isVerified(profile) {
    return profile?.verified === true
}

/**
 * Get verification badge info for display
 * @param {Object} profile - User profile object
 * @returns {Object} - { verified, method, verifiedAt }
 */
export function getVerificationInfo(profile) {
    return {
        verified: profile?.verified || false,
        method: profile?.verification_method || null,
        verifiedAt: profile?.verified_at || null,
        data: profile?.verification_data || {}
    }
}
