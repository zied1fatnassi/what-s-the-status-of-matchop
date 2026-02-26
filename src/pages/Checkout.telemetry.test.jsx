import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const trackMock = vi.fn()

vi.mock('../lib/analytics', () => ({
    track: (...args) => trackMock(...args)
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

function CheckoutHarness({ initialEntry = '/checkout?plan=monthly' }) {
    return (
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route path="/checkout" element={<Checkout />} />
            </Routes>
        </MemoryRouter>
    )
}

describe('Checkout telemetry', () => {
    let container = null
    let root = null

    beforeEach(() => {
        trackMock.mockReset()
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

    it('fires checkout_provider_selected once on mount', async () => {
        await act(async () => {
            root.render(<CheckoutHarness />)
        })

        expect(trackMock).toHaveBeenCalledTimes(1)
        expect(trackMock).toHaveBeenCalledWith('checkout_provider_selected', { provider: 'd17' })
    })
})
