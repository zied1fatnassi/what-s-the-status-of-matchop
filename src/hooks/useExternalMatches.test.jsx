import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useEffect } from 'react'

const authState = {
    user: { id: 'student-1' },
    isStudent: true
}

const fromMock = vi.fn()
const updateCalls = []
const DAY_IN_MS = 24 * 60 * 60 * 1000
const externalMatchesTable = []
const externalJobsTable = []
let externalMatchesError = null

function createExternalMatchRow(overrides = {}) {
    return {
        id: 'external-match-1',
        student_id: 'student-1',
        external_job_id: 'external-job-1',
        source_website: 'LinkedIn',
        original_url: 'https://example.com/external-job-1',
        title: 'Growth Product Designer',
        company_name: 'Orbit Labs',
        saved_at: '2026-03-17T10:00:00.000Z',
        status: 'saved',
        applied_at: null,
        interview_at: null,
        rejected_at: null,
        archived_at: null,
        follow_up_at: null,
        ...overrides
    }
}

function createExternalJobRow(overrides = {}) {
    return {
        id: 'external-job-1',
        location: 'Remote',
        ...overrides
    }
}

function createQueryBuilder(tableName) {
    const state = {
        filters: [],
        order: null,
        operation: 'select',
        payload: null
    }

    const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column, value) => {
            state.filters.push((row) => row?.[column] === value)
            return builder
        }),
        order: vi.fn((column, options = {}) => {
            state.order = {
                column,
                ascending: options.ascending !== false
            }
            return builder
        }),
        in: vi.fn((column, values = []) => {
            state.filters.push((row) => values.includes(row?.[column]))
            return builder
        }),
        update: vi.fn((payload) => {
            state.operation = 'update'
            state.payload = payload
            return builder
        }),
        maybeSingle: vi.fn(() => Promise.resolve(resolveSingleQuery(tableName, state))),
        then(resolve, reject) {
            return Promise.resolve(resolveQuery(tableName, state)).then(resolve, reject)
        }
    }
    return builder
}

function applyFilters(rows, state) {
    let nextRows = [...rows]

    state.filters.forEach((filterFn) => {
        nextRows = nextRows.filter(filterFn)
    })

    if (state.order) {
        const { column, ascending } = state.order
        nextRows.sort((a, b) => {
            if (a?.[column] === b?.[column]) return 0
            if (a?.[column] == null) return 1
            if (b?.[column] == null) return -1
            return ascending
                ? String(a[column]).localeCompare(String(b[column]))
                : String(b[column]).localeCompare(String(a[column]))
        })
    }

    return nextRows
}

function resolveExternalMatches(state, single = false) {
    if (externalMatchesError) {
        return {
            data: single ? null : [],
            error: externalMatchesError
        }
    }

    if (state.operation === 'update') {
        const rowsToUpdate = applyFilters(externalMatchesTable, state)
        updateCalls.push({
            payload: { ...(state.payload || {}) },
            rowIds: rowsToUpdate.map((row) => row.id)
        })
        rowsToUpdate.forEach((row) => {
            Object.assign(row, state.payload || {})
        })
        const firstUpdatedRow = rowsToUpdate[0] ? { ...rowsToUpdate[0] } : null

        return {
            data: single ? firstUpdatedRow : null,
            error: null
        }
    }

    const rows = applyFilters(externalMatchesTable, state).map((row) => ({ ...row }))
    return {
        data: single ? (rows[0] || null) : rows,
        error: null
    }
}

function resolveQuery(tableName, state) {
    if (tableName === 'external_matches') {
        return resolveExternalMatches(state, false)
    }

    if (tableName === 'external_jobs_public') {
        return {
            data: applyFilters(externalJobsTable, state).map((row) => ({ ...row })),
            error: null
        }
    }

    return { data: [], error: null }
}

function resolveSingleQuery(tableName, state) {
    if (tableName === 'external_matches') {
        return resolveExternalMatches(state, true)
    }

    if (tableName === 'external_jobs_public') {
        const rows = applyFilters(externalJobsTable, state).map((row) => ({ ...row }))
        return {
            data: rows[0] || null,
            error: null
        }
    }

    return { data: null, error: null }
}

async function waitForCondition(predicate, timeoutMs = 1500) {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
        if (predicate()) return
        await new Promise((resolve) => setTimeout(resolve, 10))
    }
    throw new Error('Timed out waiting for condition')
}

vi.mock('../context/AuthContext', () => ({
    useAuth: () => authState
}))

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: (...args) => fromMock(...args)
    }
}))

import { useExternalMatches } from './useExternalMatches'

function HookHarness({ onSnapshot }) {
    const snapshot = useExternalMatches()
    useEffect(() => {
        onSnapshot(snapshot)
    }, [snapshot, onSnapshot])
    return null
}

describe('useExternalMatches', () => {
    let container = null
    let root = null
    let latestSnapshot = null

    beforeEach(() => {
        latestSnapshot = null
        vi.clearAllMocks()
        fromMock.mockImplementation((tableName) => createQueryBuilder(tableName))
        updateCalls.splice(0, updateCalls.length)
        externalMatchesTable.splice(0, externalMatchesTable.length, createExternalMatchRow())
        externalJobsTable.splice(0, externalJobsTable.length, createExternalJobRow())
        externalMatchesError = null

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

    it('returns saved external jobs with location enrichment and derived metadata', async () => {
        await act(async () => {
            root.render(
                <HookHarness onSnapshot={(snapshot) => { latestSnapshot = snapshot }} />
            )
        })

        await waitForCondition(() => latestSnapshot && latestSnapshot.loading === false)

        expect(latestSnapshot.externalMatches).toEqual([{
            id: 'external-match-1',
            externalJobId: 'external-job-1',
            title: 'Growth Product Designer',
            company_name: 'Orbit Labs',
            source_website: 'LinkedIn',
            original_url: 'https://example.com/external-job-1',
            saved_at: '2026-03-17T10:00:00.000Z',
            status: 'saved',
            applied_at: null,
            interview_at: null,
            rejected_at: null,
            archived_at: null,
            follow_up_at: null,
            isFollowUpDue: false,
            isStaleApplication: false,
            priorityScore: 10,
            priorityLevel: 'low',
            location: 'Remote'
        }])
        expect(latestSnapshot.sortedExternalMatches.map((match) => match.id)).toEqual(['external-match-1'])
        expect(latestSnapshot.focusMatches).toEqual([])
        expect(latestSnapshot.insights).toEqual({
            totalSaved: 1,
            totalApplied: 0,
            totalInterview: 0,
            totalRejected: 0,
            conversionRate: 0,
            responseRate: 0
        })
    })

    it('computes priority scores, sorting order, focus matches, and insights', async () => {
        const nowMs = Date.now()
        externalMatchesTable.splice(0, externalMatchesTable.length,
            createExternalMatchRow({
                id: 'saved-1',
                external_job_id: 'job-1',
                title: 'Saved Role',
                saved_at: new Date(nowMs - DAY_IN_MS).toISOString(),
                status: 'saved'
            }),
            createExternalMatchRow({
                id: 'applied-1',
                external_job_id: 'job-2',
                title: 'Follow Up Role',
                saved_at: new Date(nowMs - DAY_IN_MS).toISOString(),
                status: 'applied',
                applied_at: new Date(nowMs - (15 * DAY_IN_MS)).toISOString(),
                follow_up_at: new Date(nowMs - DAY_IN_MS).toISOString()
            }),
            createExternalMatchRow({
                id: 'interview-1',
                external_job_id: 'job-3',
                title: 'Interview Role',
                saved_at: new Date(nowMs - (2 * DAY_IN_MS)).toISOString(),
                status: 'interview',
                applied_at: new Date(nowMs - (10 * DAY_IN_MS)).toISOString(),
                interview_at: new Date(nowMs - DAY_IN_MS).toISOString()
            }),
            createExternalMatchRow({
                id: 'applied-2',
                external_job_id: 'job-4',
                title: 'Fresh Applied Role',
                saved_at: new Date(nowMs - (2 * DAY_IN_MS)).toISOString(),
                status: 'applied',
                applied_at: new Date(nowMs - DAY_IN_MS).toISOString(),
                follow_up_at: new Date(nowMs + (3 * DAY_IN_MS)).toISOString()
            }),
            createExternalMatchRow({
                id: 'applied-3',
                external_job_id: 'job-5',
                title: 'Older Applied Role',
                saved_at: new Date(nowMs - (4 * DAY_IN_MS)).toISOString(),
                status: 'applied',
                applied_at: new Date(nowMs - (2 * DAY_IN_MS)).toISOString(),
                follow_up_at: new Date(nowMs + DAY_IN_MS).toISOString()
            }),
            createExternalMatchRow({
                id: 'rejected-1',
                external_job_id: 'job-6',
                title: 'Rejected Role',
                saved_at: new Date(nowMs - DAY_IN_MS).toISOString(),
                status: 'rejected',
                applied_at: new Date(nowMs - (5 * DAY_IN_MS)).toISOString(),
                rejected_at: new Date(nowMs - (2 * DAY_IN_MS)).toISOString()
            })
        )
        externalJobsTable.splice(0, externalJobsTable.length,
            createExternalJobRow({ id: 'job-1', location: 'Remote' }),
            createExternalJobRow({ id: 'job-2', location: 'Paris' }),
            createExternalJobRow({ id: 'job-3', location: 'Berlin' }),
            createExternalJobRow({ id: 'job-4', location: 'Remote' }),
            createExternalJobRow({ id: 'job-5', location: 'Tunis' }),
            createExternalJobRow({ id: 'job-6', location: 'Remote' })
        )

        await act(async () => {
            root.render(
                <HookHarness onSnapshot={(snapshot) => { latestSnapshot = snapshot }} />
            )
        })

        await waitForCondition(() => latestSnapshot && latestSnapshot.loading === false)

        const matchesById = Object.fromEntries(
            latestSnapshot.externalMatches.map((match) => [match.id, match])
        )

        expect(matchesById['saved-1'].priorityScore).toBe(20)
        expect(matchesById['saved-1'].priorityLevel).toBe('low')
        expect(matchesById['applied-1'].priorityScore).toBe(120)
        expect(matchesById['applied-1'].priorityLevel).toBe('high')
        expect(matchesById['interview-1'].priorityScore).toBe(40)
        expect(matchesById['interview-1'].priorityLevel).toBe('medium')
        expect(matchesById['applied-2'].priorityScore).toBe(30)
        expect(matchesById['applied-2'].priorityLevel).toBe('medium')
        expect(matchesById['applied-3'].priorityScore).toBe(20)
        expect(matchesById['applied-3'].priorityLevel).toBe('low')
        expect(matchesById['rejected-1'].priorityScore).toBe(0)
        expect(matchesById['rejected-1'].priorityLevel).toBe('low')

        expect(latestSnapshot.sortedExternalMatches.map((match) => match.id)).toEqual([
            'applied-1',
            'interview-1',
            'applied-2',
            'saved-1',
            'applied-3',
            'rejected-1'
        ])
        expect(latestSnapshot.focusMatches.map((match) => match.id)).toEqual([
            'applied-1',
            'applied-2',
            'applied-3'
        ])
        expect(latestSnapshot.insights).toEqual({
            totalSaved: 1,
            totalApplied: 3,
            totalInterview: 1,
            totalRejected: 1,
            conversionRate: 1 / 3,
            responseRate: 2 / 3
        })
    })

    it('auto-sets follow_up_at when entering applied and keeps the seven-day offset', async () => {
        await act(async () => {
            root.render(
                <HookHarness onSnapshot={(snapshot) => { latestSnapshot = snapshot }} />
            )
        })

        await waitForCondition(() => latestSnapshot && latestSnapshot.loading === false)

        await act(async () => {
            await latestSnapshot.markAsApplied('external-match-1')
        })
        expect(latestSnapshot.externalMatches[0].status).toBe('applied')
        expect(externalMatchesTable[0].status).toBe('applied')
        expect(externalMatchesTable[0].applied_at).toMatch(/^20/)
        expect(externalMatchesTable[0].follow_up_at).toMatch(/^20/)
        expect(
            Date.parse(externalMatchesTable[0].follow_up_at) - Date.parse(externalMatchesTable[0].applied_at)
        ).toBe(DAY_IN_MS * 7)
    })

    it('does not overwrite an existing follow_up_at when moving to applied', async () => {
        externalMatchesTable[0].follow_up_at = '2026-03-30T09:00:00.000Z'

        await act(async () => {
            root.render(
                <HookHarness onSnapshot={(snapshot) => { latestSnapshot = snapshot }} />
            )
        })

        await waitForCondition(() => latestSnapshot && latestSnapshot.loading === false)

        await act(async () => {
            await latestSnapshot.markAsApplied('external-match-1')
        })
        expect(externalMatchesTable[0].follow_up_at).toBe('2026-03-30T09:00:00.000Z')

        await act(async () => {
            await latestSnapshot.markAsInterview('external-match-1')
        })
        expect(latestSnapshot.externalMatches[0].status).toBe('interview')
        expect(externalMatchesTable[0].status).toBe('interview')
        expect(externalMatchesTable[0].interview_at).toMatch(/^20/)

        await act(async () => {
            await latestSnapshot.markAsRejected('external-match-1')
        })
        expect(latestSnapshot.externalMatches[0].status).toBe('rejected')
        expect(externalMatchesTable[0].status).toBe('rejected')
        expect(externalMatchesTable[0].rejected_at).toMatch(/^20/)

        await act(async () => {
            await latestSnapshot.archiveExternalMatch('external-match-1')
        })
        expect(latestSnapshot.externalMatches[0].status).toBe('archived')
        expect(externalMatchesTable[0].status).toBe('archived')
        expect(externalMatchesTable[0].archived_at).toMatch(/^20/)
    })

    it('computes follow-up due and stale application flags from timestamps', async () => {
        externalMatchesTable[0].status = 'applied'
        externalMatchesTable[0].applied_at = new Date(Date.now() - (15 * DAY_IN_MS)).toISOString()
        externalMatchesTable[0].follow_up_at = new Date(Date.now() - DAY_IN_MS).toISOString()

        await act(async () => {
            root.render(
                <HookHarness onSnapshot={(snapshot) => { latestSnapshot = snapshot }} />
            )
        })

        await waitForCondition(() => latestSnapshot && latestSnapshot.loading === false)

        expect(latestSnapshot.externalMatches[0].isFollowUpDue).toBe(true)
        expect(latestSnapshot.externalMatches[0].isStaleApplication).toBe(true)
        expect(latestSnapshot.externalMatches[0].priorityScore).toBe(110)
        expect(latestSnapshot.externalMatches[0].priorityLevel).toBe('high')
    })

    it('blocks invalid transitions before updating the database', async () => {
        await act(async () => {
            root.render(
                <HookHarness onSnapshot={(snapshot) => { latestSnapshot = snapshot }} />
            )
        })

        await waitForCondition(() => latestSnapshot && latestSnapshot.loading === false)

        let result = null
        await act(async () => {
            result = await latestSnapshot.markAsInterview('external-match-1')
        })

        expect(result?.error).toBeInstanceOf(Error)
        expect(result?.blocked).toBe(true)
        expect(latestSnapshot.externalMatches[0].status).toBe('saved')
        expect(externalMatchesTable[0].status).toBe('saved')
        expect(updateCalls).toHaveLength(0)
    })

    it('does nothing when the requested status is already set', async () => {
        externalMatchesTable[0].status = 'applied'
        externalMatchesTable[0].applied_at = '2026-03-01T09:00:00.000Z'

        await act(async () => {
            root.render(
                <HookHarness onSnapshot={(snapshot) => { latestSnapshot = snapshot }} />
            )
        })

        await waitForCondition(() => latestSnapshot && latestSnapshot.loading === false)

        let result = null
        await act(async () => {
            result = await latestSnapshot.markAsApplied('external-match-1')
        })

        expect(result).toEqual({
            error: null,
            skipped: true
        })
        expect(externalMatchesTable[0].status).toBe('applied')
        expect(externalMatchesTable[0].applied_at).toBe('2026-03-01T09:00:00.000Z')
        expect(updateCalls).toHaveLength(0)
    })

    it('updates follow_up_at without changing status', async () => {
        externalMatchesTable[0].status = 'applied'
        externalMatchesTable[0].applied_at = '2026-03-01T09:00:00.000Z'

        await act(async () => {
            root.render(
                <HookHarness onSnapshot={(snapshot) => { latestSnapshot = snapshot }} />
            )
        })

        await waitForCondition(() => latestSnapshot && latestSnapshot.loading === false)

        await act(async () => {
            await latestSnapshot.setFollowUpDate('external-match-1', '2026-03-25T09:00:00.000Z')
        })

        expect(externalMatchesTable[0].status).toBe('applied')
        expect(externalMatchesTable[0].follow_up_at).toBe('2026-03-25T09:00:00.000Z')
        expect(latestSnapshot.externalMatches[0].follow_up_at).toBe('2026-03-25T09:00:00.000Z')
    })

    it('returns an empty state when external_matches is missing locally', async () => {
        externalMatchesError = {
            code: '42P01',
            message: 'relation "public.external_matches" does not exist'
        }

        await act(async () => {
            root.render(
                <HookHarness onSnapshot={(snapshot) => { latestSnapshot = snapshot }} />
            )
        })

        await waitForCondition(() => latestSnapshot && latestSnapshot.loading === false)

        expect(latestSnapshot.externalMatches).toEqual([])
        expect(latestSnapshot.error).toBe(null)
    })
})
