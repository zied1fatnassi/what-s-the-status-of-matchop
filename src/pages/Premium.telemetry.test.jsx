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
        profile: {
            is_premium: false,
            premium_expires_at: null
        },
        refreshProfile: vi.fn(async () => {})
    })
}))

import Premium from './Premium'

function PremiumHarness({ initialEntry = '/premium' }) {
    return (
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route path="/premium" element={<Premium />} />
                <Route path="/checkout" element={<div>Checkout</div>} />
            </Routes>
        </MemoryRouter>
    )
}

describe('Premium telemetry', () => {
    let container = null
    let root = null

    beforeEach(() => {
        trackMock.mockReset()
        localStorage.clear()
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

    it('tracks premium_viewed with source from query param', async () => {
        await act(async () => {
            root.render(<PremiumHarness initialEntry="/premium?source=global_discovery" />)
        })

        expect(trackMock).toHaveBeenCalledWith('premium_viewed', { source: 'global_discovery' })
    })

    it('tracks plan_selected when selecting a plan', async () => {
        await act(async () => {
            root.render(<PremiumHarness initialEntry="/premium" />)
        })

        const monthlyPlanButton = Array.from(container.querySelectorAll('button'))
            .find((button) => button.textContent?.includes('Monthly'))

        expect(monthlyPlanButton).toBeTruthy()

        await act(async () => {
            monthlyPlanButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })

        expect(trackMock).toHaveBeenCalledWith('plan_selected', { planId: 'monthly' })
    })
})
