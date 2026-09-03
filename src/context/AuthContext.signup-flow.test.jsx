import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

vi.mock('../lib/supabase', () => {
    return {
        supabase: {
            auth: {
                getSession: vi.fn(),
                getUser: vi.fn(),
                signUp: vi.fn(),
                signInWithPassword: vi.fn(),
                signOut: vi.fn(),
                resend: vi.fn(),
                onAuthStateChange: vi.fn()
            },
            from: vi.fn(),
            rpc: vi.fn()
        }
    }
})

describe('AuthContext signup & profile flow', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
        supabase.auth.onAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } }
        })
    })

    it('passes student metadata including university and referral code during signUp', async () => {
        supabase.auth.signUp.mockResolvedValueOnce({
            data: {
                user: { id: 'student-1', email: 'ahmed@esprit.tn' },
                session: null
            },
            error: null
        })

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>
        const { result } = renderHook(() => useAuth(), { wrapper })

        let res
        await act(async () => {
            res = await result.current.signUp('ahmed@esprit.tn', 'StrongPass123!', 'student', {
                name: 'Ahmed Ben Ali',
                university: 'ESPRIT',
                major: 'Computer Science',
                graduationYear: '2026',
                referralCode: 'MATCH2026'
            })
        })

        expect(res.needsEmailVerification).toBe(true)
        expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
            email: 'ahmed@esprit.tn',
            password: 'StrongPass123!',
            options: expect.objectContaining({
                data: expect.objectContaining({
                    type: 'student',
                    name: 'Ahmed Ben Ali',
                    university: 'ESPRIT',
                    major: 'Computer Science',
                    graduationYear: '2026',
                    referral_code: 'MATCH2026'
                })
            })
        }))
    })

    it('passes company metadata during signUp', async () => {
        supabase.auth.signUp.mockResolvedValueOnce({
            data: {
                user: { id: 'company-1', email: 'hr@vermeg.com' },
                session: null
            },
            error: null
        })

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>
        const { result } = renderHook(() => useAuth(), { wrapper })

        let res
        await act(async () => {
            res = await result.current.signUp('hr@vermeg.com', 'StrongPass123!', 'company', {
                name: 'Vermeg',
                website: 'https://vermeg.com',
                sector: 'finance',
                size: '201-500'
            })
        })

        expect(res.needsEmailVerification).toBe(true)
        expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
            email: 'hr@vermeg.com',
            password: 'StrongPass123!',
            options: expect.objectContaining({
                data: expect.objectContaining({
                    type: 'company',
                    name: 'Vermeg',
                    website: 'https://vermeg.com',
                    sector: 'finance',
                    size: '201-500'
                })
            })
        }))
    })

    it('handles immediate session return when email confirmation is disabled', async () => {
        const userObj = { id: 'student-instant', email: 'instant@esprit.tn' }
        const sessionObj = { user: userObj, access_token: 'fake-jwt' }

        supabase.auth.signUp.mockResolvedValueOnce({
            data: {
                user: userObj,
                session: sessionObj
            },
            error: null
        })

        const mockBuilder = {
            upsert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'up-1' } }),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis()
        }
        supabase.from.mockReturnValue(mockBuilder)

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>
        const { result } = renderHook(() => useAuth(), { wrapper })

        let res
        await act(async () => {
            res = await result.current.signUp('instant@esprit.tn', 'Pass123!', 'student', {
                name: 'Instant Student'
            })
        })

        expect(res.needsEmailVerification).toBe(false)
        expect(res.data.session).toEqual(sessionObj)
    })
})
