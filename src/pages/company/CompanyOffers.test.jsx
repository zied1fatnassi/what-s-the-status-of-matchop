import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

const hookStateFactory = vi.fn()

vi.mock('../../hooks/useCompanyOffers', () => ({
    useCompanyOffers: () => hookStateFactory()
}))

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: { language: 'en' },
        t: (key, params) => {
            if (key === 'companyOffers.pagination.pageOf') {
                return `Page ${params.page} of ${params.totalPages}`
            }
            if (key === 'companyOffers.modals.deleteWarning') {
                return `Delete "${params.title}"`
            }
            return key
        }
    })
}))

vi.mock('react-chartjs-2', () => ({
    Line: () => <div data-testid="line-chart">line-chart</div>,
    Bar: () => <div data-testid="bar-chart">bar-chart</div>
}))

vi.mock('chart.js', () => ({
    Chart: { register: vi.fn() },
    CategoryScale: {},
    LinearScale: {},
    PointElement: {},
    LineElement: {},
    BarElement: {},
    Title: {},
    Tooltip: {},
    Legend: {},
    Filler: {}
}))

import CompanyOffers from './CompanyOffers'

function createBaseHookState(overrides = {}) {
    return {
        offers: [
            {
                id: 'offer-1',
                title: 'Frontend Intern',
                status: 'active',
                location: 'Tunis',
                created_at: '2026-02-26T10:00:00.000Z',
                salary_range: '1200 TND',
                description: 'Build UI',
                req_skills: ['React', 'CSS'],
                metrics: {
                    lifetime: {
                        right_swipes: 4,
                        pending_intros: 1,
                        accepted_intros: 1,
                        matches: 2,
                        match_rate: 50
                    }
                }
            }
        ],
        loading: false,
        error: null,
        filters: { search: '', status: 'all' },
        setFilters: vi.fn(),
        pagination: { page: 1, totalPages: 2 },
        setPage: vi.fn(),
        analytics: {
            lifetime: {
                offers_total: 1,
                right_swipes: 4,
                pending_intros: 1,
                accepted_intros: 1,
                matches: 2,
                match_rate: 50
            },
            last30d: {
                right_swipes: 2,
                matches: 1,
                match_rate: 50
            }
        },
        trends30d: [
            { label: '2/26', right_swipes: 1, accepted_intros: 1, matches: 1 },
            { label: '2/27', right_swipes: 1, accepted_intros: 0, matches: 0 }
        ],
        refresh: vi.fn(),
        updateOffer: vi.fn(async () => ({ error: null })),
        toggleStatus: vi.fn(async () => ({ error: null })),
        deleteOffer: vi.fn(async () => ({ error: null })),
        ...overrides
    }
}

function findButtonByText(container, text) {
    return Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes(text))
}

describe('CompanyOffers page', () => {
    let container = null
    let root = null

    beforeEach(() => {
        vi.clearAllMocks()
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

        if (container?.parentNode) {
            container.parentNode.removeChild(container)
        }
    })

    it('updates filters when search and status inputs change', async () => {
        const hookState = createBaseHookState()
        hookStateFactory.mockReturnValue(hookState)

        await act(async () => {
            root.render(
                <MemoryRouter>
                    <CompanyOffers />
                </MemoryRouter>
            )
        })

        const searchInput = container.querySelector('input[aria-label="companyOffers.filters.searchLabel"]')
        expect(searchInput).toBeTruthy()

        const statusSelect = container.querySelector('.company-offers-status-filter select')
        expect(statusSelect).toBeTruthy()

        await act(async () => {
            statusSelect.value = 'closed'
            statusSelect.dispatchEvent(new Event('change', { bubbles: true }))
        })

        expect(hookState.setFilters).toHaveBeenCalledWith({ status: 'closed' })
    })

    it('supports edit, toggle status, and delete confirmation actions', async () => {
        const hookState = createBaseHookState()
        hookStateFactory.mockReturnValue(hookState)

        await act(async () => {
            root.render(
                <MemoryRouter>
                    <CompanyOffers />
                </MemoryRouter>
            )
        })

        const editButton = findButtonByText(container, 'companyOffers.actions.edit')
        expect(editButton).toBeTruthy()

        await act(async () => {
            editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })

        const titleInput = Array.from(container.querySelectorAll('.company-offers-modal input'))
            .find((input) => input.value === 'Frontend Intern')
        expect(titleInput).toBeTruthy()

        const saveButton = findButtonByText(container, 'companyOffers.actions.save')
        expect(saveButton).toBeTruthy()

        await act(async () => {
            saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })

        expect(hookState.updateOffer).toHaveBeenCalledTimes(1)
        expect(hookState.updateOffer.mock.calls[0][0]).toBe('offer-1')
        expect(hookState.updateOffer.mock.calls[0][1]).toMatchObject({
            title: 'Frontend Intern',
            req_skills: ['React', 'CSS']
        })

        const closeButton = findButtonByText(container, 'companyOffers.actions.close')
        expect(closeButton).toBeTruthy()

        await act(async () => {
            closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })

        expect(hookState.toggleStatus).toHaveBeenCalledWith('offer-1', 'closed')

        const deleteButton = findButtonByText(container, 'companyOffers.actions.delete')
        expect(deleteButton).toBeTruthy()

        await act(async () => {
            deleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })

        const modalInputs = container.querySelectorAll('.company-offers-modal--danger input')
        const confirmInput = modalInputs[0]
        expect(confirmInput).toBeTruthy()

        const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        await act(async () => {
            valueSetter?.call(confirmInput, 'Frontend Intern')
            confirmInput.dispatchEvent(new Event('input', { bubbles: true }))
            confirmInput.dispatchEvent(new Event('change', { bubbles: true }))
        })

        const confirmDeleteButton = Array.from(container.querySelectorAll('.company-offers-modal--danger button'))
            .find((button) => button.textContent?.includes('companyOffers.actions.delete'))
        expect(confirmDeleteButton).toBeTruthy()
        expect(confirmDeleteButton.disabled).toBe(false)

        await act(async () => {
            confirmDeleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })

        expect(hookState.deleteOffer).toHaveBeenCalledWith('offer-1')
    })
})
