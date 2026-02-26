import { describe, expect, it, vi, beforeEach } from 'vitest'

const invokeMock = vi.fn()

vi.mock('../supabase', () => ({
    supabase: {
        functions: {
            invoke: (...args) => invokeMock(...args)
        }
    }
}))

import { revertPaymentRequest } from './admin'

describe('payments admin helpers', () => {
    beforeEach(() => {
        invokeMock.mockReset()
        invokeMock.mockResolvedValue({ data: { success: true }, error: null })
    })

    it('revertPaymentRequest invokes admin-review-payment with revert action', async () => {
        await revertPaymentRequest('request-1', 'undo note')

        expect(invokeMock).toHaveBeenCalledWith('admin-review-payment', {
            body: {
                paymentRequestId: 'request-1',
                action: 'revert',
                admin_note: 'undo note'
            }
        })
    })
})
