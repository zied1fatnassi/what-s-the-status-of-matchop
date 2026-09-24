import { describe, expect, it } from 'vitest'
import { getPaymentsProvider } from './config'
import { createD17ReferenceCode } from './providers/d17'

describe('payments provider config', () => {
    it('always resolves to d17', () => {
        const previousProvider = import.meta.env.VITE_PAYMENTS_PROVIDER
        try {
            delete import.meta.env.VITE_PAYMENTS_PROVIDER
            expect(getPaymentsProvider()).toBe('d17')
            import.meta.env.VITE_PAYMENTS_PROVIDER = 'stripe'
            expect(getPaymentsProvider()).toBe('d17')
        } finally {
            if (previousProvider === undefined) {
                delete import.meta.env.VITE_PAYMENTS_PROVIDER
            } else {
                import.meta.env.VITE_PAYMENTS_PROVIDER = previousProvider
            }
        }
    })

    it('d17 reference code uses first 8 chars of user id', () => {
        expect(createD17ReferenceCode('1234567890abcdef', 'yearly')).toBe('MOP-12345678-yearly')
    })
})
