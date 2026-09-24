import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'

let latestSnapshot = null
let tableData = {}

const authState = {
    user: { id: 'company-1' }
}

function cloneRows(rows) {
    return rows.map((row) => ({ ...row }))
}

function applyFilters(rows, filters) {
    return rows.filter((row) => filters.every((fn) => fn(row)))
}

function applyOrder(rows, orderBy) {
    if (!orderBy) return rows

    const { column, ascending } = orderBy
    return [...rows].sort((a, b) => {
        const aValue = a?.[column]
        const bValue = b?.[column]
        if (aValue === bValue) return 0
        if (aValue == null) return 1
        if (bValue == null) return -1
        if (aValue > bValue) return ascending ? 1 : -1
        return ascending ? -1 : 1
    })
}

function executeQuery(tableName, state) {
    const source = cloneRows(tableData[tableName] || [])

    if (state.mode === 'select') {
        const filtered = applyOrder(applyFilters(source, state.filters), state.orderBy)
        return { data: filtered, error: null }
    }

    if (state.mode === 'update') {
        const nextRows = source.map((row) => {
            if (!applyFilters([row], state.filters).length) return row
            return { ...row, ...(state.payload || {}) }
        })
        tableData[tableName] = nextRows
        return { data: null, error: null }
    }

    if (state.mode === 'delete') {
        const nextRows = source.filter((row) => !applyFilters([row], state.filters).length)
        tableData[tableName] = nextRows
        return { data: null, error: null }
    }

    return { data: source, error: null }
}

function createBuilder(tableName) {
    const state = {
        mode: 'select',
        payload: null,
        filters: [],
        orderBy: null
    }

    const builder = {}
    builder.select = vi.fn(() => builder)
    builder.eq = vi.fn((column, value) => {
        state.filters.push((row) => row?.[column] === value)
        return builder
    })
    builder.in = vi.fn((column, values = []) => {
        state.filters.push((row) => values.includes(row?.[column]))
        return builder
    })
    builder.ilike = vi.fn((column, value) => {
        const needle = String(value || '').toLowerCase().replace(/%/g, '')
        state.filters.push((row) => String(row?.[column] || '').toLowerCase().includes(needle))
        return builder
    })
    builder.order = vi.fn((column, options = {}) => {
        state.orderBy = {
            column,
            ascending: options.ascending !== false
        }
        return builder
    })
    builder.update = vi.fn((payload) => {
        state.mode = 'update'
        state.payload = payload
        return builder
    })
    builder.delete = vi.fn(() => {
        state.mode = 'delete'
        return builder
    })
    builder.then = (resolve, reject) => Promise.resolve(executeQuery(tableName, state)).then(resolve, reject)

    return builder
}

const fromMock = vi.fn((tableName) => createBuilder(tableName))

vi.mock('../context/AuthContext', () => ({
    useAuth: () => authState
}))

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: (...args) => fromMock(...args)
    }
}))

import { useCompanyOffers } from './useCompanyOffers'

function HookHarness({ onSnapshot }) {
    const snapshot = useCompanyOffers()
    useEffect(() => {
        onSnapshot(snapshot)
    }, [snapshot, onSnapshot])
    return null
}

async function waitForCondition(predicate, timeoutMs = 2000) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
        if (predicate()) return
        await new Promise((resolve) => setTimeout(resolve, 15))
    }
    throw new Error('Timed out waiting for condition')
}

describe('useCompanyOffers', () => {
    let container = null
    let root = null

    beforeEach(() => {
        latestSnapshot = null
        vi.clearAllMocks()

        const now = new Date()
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString()
        const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)).toISOString()
        const fortyDaysAgo = new Date(now.getTime() - (40 * 24 * 60 * 60 * 1000)).toISOString()

        tableData = {
            offers: [
                {
                    id: 'offer-1',
                    company_id: 'company-1',
                    title: 'Frontend Intern',
                    description: 'Build dashboards',
                    req_skills: ['React'],
                    location: 'Tunis',
                    salary_range: '1200 TND',
                    status: 'active',
                    created_at: oneDayAgo,
                    updated_at: oneDayAgo
                },
                {
                    id: 'offer-2',
                    company_id: 'company-1',
                    title: 'Backend Intern',
                    description: 'Build APIs',
                    req_skills: ['Node.js'],
                    location: 'Remote',
                    salary_range: '1300 TND',
                    status: 'closed',
                    created_at: twoDaysAgo,
                    updated_at: twoDaysAgo
                }
            ],
            student_swipes: [
                { offer_id: 'offer-1', direction: 'right', created_at: oneDayAgo },
                { offer_id: 'offer-1', direction: 'right', created_at: fortyDaysAgo },
                { offer_id: 'offer-2', direction: 'right', created_at: twoDaysAgo }
            ],
            intros: [
                { offer_id: 'offer-1', status: 'pending', created_at: oneDayAgo },
                { offer_id: 'offer-1', status: 'accepted', created_at: fortyDaysAgo },
                { offer_id: 'offer-2', status: 'accepted', created_at: oneDayAgo }
            ],
            matches: [
                { offer_id: 'offer-1', matched_at: oneDayAgo, created_at: oneDayAgo },
                { offer_id: 'offer-1', matched_at: fortyDaysAgo, created_at: fortyDaysAgo }
            ]
        }

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

    it('aggregates lifetime and last-30-day analytics correctly', async () => {
        await act(async () => {
            root.render(<HookHarness onSnapshot={(snapshot) => { latestSnapshot = snapshot }} />)
        })

        await waitForCondition(() => latestSnapshot && latestSnapshot.loading === false)

        expect(latestSnapshot.analytics.lifetime.offers_total).toBe(2)
        expect(latestSnapshot.analytics.lifetime.right_swipes).toBe(3)
        expect(latestSnapshot.analytics.lifetime.accepted_intros).toBe(2)
        expect(latestSnapshot.analytics.lifetime.pending_intros).toBe(1)
        expect(latestSnapshot.analytics.lifetime.matches).toBe(2)
        expect(latestSnapshot.analytics.lifetime.match_rate).toBe(66.7)
        expect(latestSnapshot.analytics.lifetime.close_rate).toBe(50)

        expect(latestSnapshot.analytics.last30d.right_swipes).toBe(2)
        expect(latestSnapshot.analytics.last30d.pending_intros).toBe(1)
        expect(latestSnapshot.analytics.last30d.accepted_intros).toBe(1)
        expect(latestSnapshot.analytics.last30d.matches).toBe(1)
        expect(latestSnapshot.analytics.last30d.match_rate).toBe(50)

        const recentSwipeTotal = latestSnapshot.trends30d.reduce((acc, point) => acc + point.right_swipes, 0)
        const recentMatchTotal = latestSnapshot.trends30d.reduce((acc, point) => acc + point.matches, 0)
        expect(recentSwipeTotal).toBe(2)
        expect(recentMatchTotal).toBe(1)
    })

    it('supports update, status toggle, and hard delete operations', async () => {
        await act(async () => {
            root.render(<HookHarness onSnapshot={(snapshot) => { latestSnapshot = snapshot }} />)
        })

        await waitForCondition(() => latestSnapshot && latestSnapshot.loading === false)

        let result = null
        await act(async () => {
            result = await latestSnapshot.updateOffer('offer-1', { title: 'Frontend Engineer Intern' })
        })
        expect(result.error).toBeNull()
        expect(tableData.offers.find((offer) => offer.id === 'offer-1')?.title).toBe('Frontend Engineer Intern')

        await act(async () => {
            result = await latestSnapshot.toggleStatus('offer-2', 'active')
        })
        expect(result.error).toBeNull()
        expect(tableData.offers.find((offer) => offer.id === 'offer-2')?.status).toBe('active')

        await act(async () => {
            result = await latestSnapshot.deleteOffer('offer-2')
        })
        expect(result.error).toBeNull()
        expect(tableData.offers.some((offer) => offer.id === 'offer-2')).toBe(false)
    })
})
