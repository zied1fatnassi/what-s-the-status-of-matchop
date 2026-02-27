import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authState = {
    user: { id: 'company-1' }
}

const fromMock = vi.fn()

function createQueryBuilder(tableName, resolver) {
    const state = {
        select: ''
    }

    const builder = {
        select: vi.fn((value) => {
            state.select = value
            return builder
        }),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        then(resolve, reject) {
            return Promise.resolve(resolver({
                tableName,
                select: state.select
            })).then(resolve, reject)
        }
    }

    return builder
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

import { useCompanyClosedItems } from './useCompanyClosedItems'

function HookHarness({ onSnapshot }) {
    const snapshot = useCompanyClosedItems()
    useEffect(() => {
        onSnapshot(snapshot)
    }, [snapshot, onSnapshot])
    return null
}

describe('useCompanyClosedItems', () => {
    let container = null
    let root = null
    let latestSnapshot = null

    beforeEach(() => {
        latestSnapshot = null
        vi.clearAllMocks()
        authState.user = { id: 'company-1' }

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

    it('derives intro closedAt from reviewed_at then created_at', async () => {
        fromMock.mockImplementation((tableName) => createQueryBuilder(tableName, ({ tableName: currentTable }) => {
            if (currentTable === 'intros') {
                return {
                    data: [
                        {
                            id: 'intro-reviewed',
                            status: 'declined',
                            reviewed_at: '2026-02-27T10:30:00.000Z',
                            created_at: '2026-02-27T09:00:00.000Z',
                            students: {
                                display_name: 'Alice',
                                skills: ['React'],
                                location: 'Tunis'
                            },
                            offers: {
                                title: 'Frontend Intern'
                            }
                        },
                        {
                            id: 'intro-created',
                            status: 'expired',
                            reviewed_at: null,
                            created_at: '2026-02-26T09:00:00.000Z',
                            students: {
                                display_name: 'Bilel',
                                skills: ['Node.js'],
                                location: 'Sfax'
                            },
                            offers: {
                                title: 'Backend Intern'
                            }
                        }
                    ],
                    error: null
                }
            }

            if (currentTable === 'matches') {
                return { data: [], error: null }
            }

            return { data: [], error: null }
        }))

        await act(async () => {
            root.render(<HookHarness onSnapshot={(snapshot) => { latestSnapshot = snapshot }} />)
        })

        await waitForCondition(() => latestSnapshot && latestSnapshot.loading === false)

        const reviewedIntro = latestSnapshot.items.find((item) => item.sourceId === 'intro-reviewed')
        const createdIntro = latestSnapshot.items.find((item) => item.sourceId === 'intro-created')

        expect(latestSnapshot.error).toBeNull()
        expect(reviewedIntro?.closedAt).toBe('2026-02-27T10:30:00.000Z')
        expect(createdIntro?.closedAt).toBe('2026-02-26T09:00:00.000Z')
    })

    it('retries archived matches query without updated_at when column is missing', async () => {
        const matchSelectCalls = []

        fromMock.mockImplementation((tableName) => createQueryBuilder(tableName, ({ tableName: currentTable, select }) => {
            if (currentTable === 'intros') {
                return { data: [], error: null }
            }

            if (currentTable === 'matches') {
                matchSelectCalls.push(select)
                if (String(select).includes('updated_at')) {
                    return {
                        data: null,
                        error: {
                            code: '42703',
                            message: 'column matches.updated_at does not exist'
                        }
                    }
                }

                return {
                    data: [
                        {
                            id: 'match-1',
                            status: 'archived',
                            matched_at: '2026-02-27T12:00:00.000Z',
                            last_message: 'Last ping',
                            students: {
                                display_name: 'Sara',
                                skills: ['QA']
                            },
                            offers: {
                                title: 'QA Intern'
                            }
                        }
                    ],
                    error: null
                }
            }

            return { data: [], error: null }
        }))

        await act(async () => {
            root.render(<HookHarness onSnapshot={(snapshot) => { latestSnapshot = snapshot }} />)
        })

        await waitForCondition(() => latestSnapshot && latestSnapshot.loading === false)

        expect(latestSnapshot.error).toBeNull()
        expect(latestSnapshot.items).toHaveLength(1)
        expect(latestSnapshot.items[0].closedAt).toBe('2026-02-27T12:00:00.000Z')
        expect(matchSelectCalls.length).toBe(2)
        expect(matchSelectCalls[0]).toContain('updated_at')
        expect(matchSelectCalls[1]).not.toContain('updated_at')
    })
})
