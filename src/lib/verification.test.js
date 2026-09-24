import { describe, it, expect } from 'vitest'
import {
    validateLinkedInUrl,
    isVerified,
    getVerificationInfo
} from '../lib/verification'

describe('Verification Utilities', () => {

    describe('validateLinkedInUrl', () => {

        it('should accept valid LinkedIn profile URLs', () => {
            const validUrls = [
                'https://linkedin.com/in/johndoe',
                'https://www.linkedin.com/in/jane-smith',
                'http://linkedin.com/in/user123',
                'https://linkedin.com/in/my-profile-name'
            ]

            validUrls.forEach(url => {
                const result = validateLinkedInUrl(url)
                expect(result.valid).toBe(true)
            })
        })

        it('should accept valid LinkedIn company URLs', () => {
            const companyUrls = [
                'https://linkedin.com/company/google',
                'https://www.linkedin.com/company/meta-platforms'
            ]

            companyUrls.forEach(url => {
                const result = validateLinkedInUrl(url)
                expect(result.valid).toBe(true)
            })
        })

        it('should reject invalid URLs', () => {
            const invalidUrls = [
                'https://facebook.com/johndoe',
                'linkedin.com/in/noprotocol',
                'https://linkedin.com/jobs/something',
                'random text',
                ''
            ]

            invalidUrls.forEach(url => {
                const result = validateLinkedInUrl(url)
                expect(result.valid).toBe(false)
            })
        })

        it('should handle null and undefined', () => {
            expect(validateLinkedInUrl(null).valid).toBe(false)
            expect(validateLinkedInUrl(undefined).valid).toBe(false)
        })

        it('should strip trailing slashes', () => {
            const result = validateLinkedInUrl('https://linkedin.com/in/johndoe/')
            expect(result.valid).toBe(true)
            expect(result.url).toBe('https://linkedin.com/in/johndoe')
        })
    })

    describe('isVerified', () => {

        it('should return true for verified profiles', () => {
            expect(isVerified({ verified: true })).toBe(true)
        })

        it('should return false for unverified profiles', () => {
            expect(isVerified({ verified: false })).toBe(false)
            expect(isVerified({})).toBe(false)
            expect(isVerified(null)).toBe(false)
        })
    })

    describe('getVerificationInfo', () => {

        it('should extract verification info from profile', () => {
            const profile = {
                verified: true,
                verification_method: 'email',
                verified_at: '2025-01-01',
                verification_data: { source: 'supabase' }
            }

            const info = getVerificationInfo(profile)

            expect(info.verified).toBe(true)
            expect(info.method).toBe('email')
            expect(info.verifiedAt).toBe('2025-01-01')
            expect(info.data.source).toBe('supabase')
        })

        it('should handle missing profile', () => {
            const info = getVerificationInfo(null)

            expect(info.verified).toBe(false)
            expect(info.method).toBe(null)
        })
    })
})
