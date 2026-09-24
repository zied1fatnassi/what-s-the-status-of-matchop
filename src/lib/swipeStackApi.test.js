import { beforeEach, describe, expect, it, vi } from 'vitest'

const invokeMock = vi.fn()

vi.mock('./supabase', () => ({
    supabase: {
        functions: {
            invoke: (...args) => invokeMock(...args)
        }
    }
}))

import { fetchSwipeStack, isNoProfileError, isPaywallError } from './swipeStackApi'

function makeFunctionError(payload, status) {
    return {
        message: payload?.message || 'Edge function failed',
        context: {
            status,
            clone: () => ({
                json: async () => payload
            })
        }
    }
}

describe('swipeStackApi', () => {
    beforeEach(() => {
        invokeMock.mockReset()
    })

    it('maps NO_PROFILE function payload to a structured 409 error', async () => {
        invokeMock.mockResolvedValue({
            data: null,
            error: makeFunctionError({
                code: 'NO_PROFILE',
                message: 'No profile found for authenticated user'
            }, 409)
        })

        await expect(fetchSwipeStack({ mode: 'standard' })).rejects.toMatchObject({
            code: 'NO_PROFILE',
            status: 409,
            message: 'No profile found for authenticated user'
        })
    })

    it('recognizes helper error guards', () => {
        expect(isNoProfileError({ code: 'NO_PROFILE' })).toBe(true)
        expect(isNoProfileError({ code: 'PAYWALL' })).toBe(false)

        expect(isPaywallError({ code: 'PAYWALL' })).toBe(true)
        expect(isPaywallError({ code: 'NO_PROFILE' })).toBe(false)
    })
})
