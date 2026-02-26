import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const checkoutTranslations = {
    'checkout.actions.createRequest': 'Create payment request',
    'checkout.proofUpload.uploadAction': 'Upload proof',
    'common.continue': 'Continue'
}

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => checkoutTranslations[key] || key,
        i18n: { language: 'en' }
    })
}))

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: {
            id: '1234567890abcdef'
        },
        profile: {
            is_premium: false,
            premium_expires_at: null
        },
        refreshProfile: vi.fn(async () => {})
    })
}))

import Checkout from './Checkout'
import { supabase } from '../lib/supabase'

function createGenericBuilder() {
    const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        update: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        then: (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject)
    }
    return builder
}

function createPaymentRequestsBuilder() {
    const builder = createGenericBuilder()

    builder.then = (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject)
    builder.maybeSingle = vi.fn(async () => {
        const latestPatch = builder.update.mock.calls.at(-1)?.[0] || {}
        return {
            data: {
                id: 'payment-request-1',
                plan_id: 'monthly',
                amount_tnd: 19,
                currency: 'TND',
                d17_phone: '+21652460278',
                reference: 'MOP-12345678-20260226-abc123',
                status: 'pending',
                created_at: '2026-02-26T10:00:00.000Z',
                proof_object_path: latestPatch.proof_object_path || null,
                admin_note: null,
                reviewed_at: null
            },
            error: null
        }
    })

    return builder
}

function CheckoutHarness({ initialEntry = '/checkout?plan=monthly&source=test' }) {
    return (
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/premium" element={<div>Premium Page</div>} />
                <Route path="/payments" element={<div>Payments Page</div>} />
                <Route path="/checkout/success" element={<div>Success Page</div>} />
            </Routes>
        </MemoryRouter>
    )
}

describe('Checkout payment request flow', () => {
    let container = null
    let root = null
    let paymentRequestsBuilder = null
    let uploadMock = null

    beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)

        paymentRequestsBuilder = createPaymentRequestsBuilder()
        uploadMock = vi.fn(async (path) => ({ data: { path }, error: null }))

        supabase.functions.invoke.mockReset()
        supabase.from.mockReset()
        supabase.storage.from.mockReset()

        supabase.functions.invoke.mockResolvedValue({
            data: {
                success: true,
                paymentRequestId: 'payment-request-1',
                plan_id: 'monthly',
                reference: 'MOP-12345678-20260226-abc123',
                amount_tnd: 19,
                currency: 'TND',
                d17_phone: '+21652460278',
                status: 'pending',
                created_at: '2026-02-26T10:00:00.000Z'
            },
            error: null
        })

        supabase.from.mockImplementation((tableName) => {
            if (tableName === 'payment_requests') return paymentRequestsBuilder
            return createGenericBuilder()
        })

        supabase.storage.from.mockReturnValue({
            upload: uploadMock,
            createSignedUrl: vi.fn(async () => ({
                data: { signedUrl: 'https://example.com/proof' },
                error: null
            }))
        })
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

    it('creates a D17 request and uploads proof for review', async () => {
        await act(async () => {
            root.render(<CheckoutHarness />)
        })

        const createButton = Array.from(container.querySelectorAll('button'))
            .find((button) => button.textContent?.includes('Create payment request'))

        expect(createButton).toBeTruthy()

        await act(async () => {
            createButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })

        expect(supabase.functions.invoke).toHaveBeenCalledWith('create-d17-payment-request', {
            body: { plan_id: 'monthly' }
        })
        expect(container.textContent).toContain('MOP-12345678-20260226-abc123')

        const fileInput = container.querySelector('#proof-file')
        expect(fileInput).toBeTruthy()

        const proofFile = new File(['proof'], 'proof.pdf', { type: 'application/pdf' })
        await act(async () => {
            Object.defineProperty(fileInput, 'files', {
                value: [proofFile],
                configurable: true
            })
            fileInput.dispatchEvent(new Event('change', { bubbles: true }))
        })

        const uploadButton = Array.from(container.querySelectorAll('button'))
            .find((button) => button.textContent?.includes('Upload proof'))
        expect(uploadButton).toBeTruthy()

        await act(async () => {
            uploadButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })

        expect(uploadMock).toHaveBeenCalledTimes(1)
        const uploadedPath = uploadMock.mock.calls[0][0]
        expect(uploadedPath).toMatch(/^1234567890abcdef\/payment-request-1\//)
        expect(container.textContent).toContain(uploadedPath)
    })
})
