import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const reviewPaymentRequestMock = vi.fn()
const fetchPaymentRequestAuditMock = vi.fn()
const translateMock = (key) => key

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: translateMock,
        i18n: { language: 'en' }
    })
}))

vi.mock('../../lib/analytics', () => ({
    track: vi.fn()
}))

vi.mock('../../lib/payments/admin', () => ({
    reviewPaymentRequest: (...args) => reviewPaymentRequestMock(...args),
    fetchPaymentRequestAudit: (...args) => fetchPaymentRequestAuditMock(...args)
}))

function createBuilder(rows = []) {
    const filters = []

    const applyFilters = () => rows.filter((row) => filters.every((fn) => fn(row)))

    const builder = {
        select: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        eq: vi.fn((column, value) => {
            filters.push((row) => row?.[column] === value)
            return builder
        }),
        in: vi.fn((column, values) => {
            filters.push((row) => values.includes(row?.[column]))
            return builder
        }),
        then: (resolve, reject) => Promise.resolve({
            data: applyFilters(),
            error: null
        }).then(resolve, reject)
    }

    return builder
}

const paymentRows = [{
    id: 'payment-1',
    user_id: 'user-1',
    plan_id: 'monthly',
    amount_tnd: 19,
    currency: 'TND',
    d17_phone: '+21652460278',
    reference: 'MOP-user-1-monthly',
    proof_object_path: null,
    status: 'approved',
    admin_note: null,
    reviewed_by: 'admin-1',
    reviewed_at: '2026-02-27T10:00:00.000Z',
    created_at: '2026-02-27T09:00:00.000Z'
}]

vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: (tableName) => {
            if (tableName === 'payment_requests') return createBuilder(paymentRows)
            if (tableName === 'profiles') return createBuilder([{ id: 'user-1', email: 'user@example.com' }])
            if (tableName === 'payment_requests_audit') return createBuilder([])
            return createBuilder([])
        },
        storage: {
            from: () => ({
                createSignedUrl: vi.fn(async () => ({
                    data: { signedUrl: 'https://example.com/proof' },
                    error: null
                }))
            })
        }
    }
}))

import AdminPayments from './AdminPayments'

describe('AdminPayments copy reference feedback', () => {
    let container = null
    let root = null
    const writeTextMock = vi.fn()

    beforeEach(() => {
        reviewPaymentRequestMock.mockReset()
        fetchPaymentRequestAuditMock.mockReset()
        writeTextMock.mockReset()
        writeTextMock.mockResolvedValue(undefined)

        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: writeTextMock },
            configurable: true
        })

        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
    })

    afterEach(async () => {
        if (root) {
            await act(async () => {
                root.unmount()
            })
        }

        if (container && container.parentNode) {
            container.parentNode.removeChild(container)
        }
    })

    it('copies the reference and shows copied feedback', async () => {
        await act(async () => {
            root.render(<AdminPayments />)
        })

        const copyButton = Array.from(container.querySelectorAll('button'))
            .find((button) => button.textContent?.includes('adminPayments.actions.copyReference'))

        expect(copyButton).toBeTruthy()

        await act(async () => {
            copyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })

        expect(writeTextMock).toHaveBeenCalledWith('MOP-user-1-monthly')

        const copiedButton = Array.from(container.querySelectorAll('button'))
            .find((button) => button.textContent?.includes('adminPayments.actions.copied'))
        expect(copiedButton).toBeTruthy()
    })
})
