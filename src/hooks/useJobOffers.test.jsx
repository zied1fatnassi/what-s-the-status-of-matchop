import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useEffect } from 'react'

const authState = {
    user: { id: 'student-1' },
    profile: {
        is_premium: false,
        premium_expires_at: null
    }
}

const fromMock = vi.fn()
const rpcMock = vi.fn()
const functionsInvokeMock = vi.fn()
const recordSwipeActionMock = vi.fn()

function createQueryBuilder(tableName) {
    const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        gte: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        in: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        single: vi.fn(async () => ({ data: null, error: null })),
        then(resolve, reject) {
            return Promise.resolve(resolveQuery(tableName)).then(resolve, reject)
        }
    }
    return builder
}

function resolveQuery(tableName) {
    if (tableName === 'student_swipes') {
        return { data: [], error: null, count: 0 }
    }

    if (tableName === 'offers') {
        return { data: [], error: null }
    }

    if (tableName === 'external_jobs_public') {
        return { data: [], error: null }
    }

    return { data: [], error: null }
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
        from: (...args) => fromMock(...args),
        rpc: (...args) => rpcMock(...args),
        functions: {
            invoke: (...args) => functionsInvokeMock(...args)
        }
    }
}))

vi.mock('../lib/swipeStackApi', () => ({
    fetchSwipeStack: vi.fn(),
    isNoProfileError: vi.fn(() => false),
    isPaywallError: vi.fn(() => false)
}))

vi.mock('../lib/swipeActionApi', () => ({
    recordSwipeAction: (...args) => recordSwipeActionMock(...args),
    isSwipeLimitReachedError: (error) => error?.code === 'LIMIT_REACHED'
}))

import { useJobOffers } from './useJobOffers'

function HookHarness({ onSnapshot }) {
    const snapshot = useJobOffers()
    useEffect(() => {
        onSnapshot(snapshot)
    }, [snapshot, onSnapshot])
    return null
}

describe('useJobOffers integration', () => {
    let container = null
    let root = null
    let latestSnapshot = null

    beforeEach(() => {
        latestSnapshot = null
        vi.clearAllMocks()

        fromMock.mockImplementation((tableName) => createQueryBuilder(tableName))

        rpcMock.mockImplementation(async (fn) => {
            if (fn === 'get_swipe_limit_status') {
                return {
                    data: {
                        allowed: true,
                        code: 'OK',
                        effective_plan: 'standard',
                        daily_count: 0,
                        limit_count: 20,
                        remaining: 20,
                        reached: false
                    },
                    error: null
                }
            }

            if (fn === 'create_intro_from_swipe') {
                return { data: { success: true }, error: null }
            }

            return { data: null, error: null }
        })

        functionsInvokeMock.mockImplementation(async (fn) => {
            if (fn === 'get-matched-jobs') {
                return {
                    data: { success: false, offers: [] },
                    error: null
                }
            }

            return { data: {}, error: null }
        })

        recordSwipeActionMock.mockResolvedValue({
            success: true,
            code: 'OK',
            usage: {
                allowed: true,
                code: 'OK',
                effective_plan: 'standard',
                daily_count: 1,
                limit_count: 20,
                remaining: 19,
                reached: false
            }
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

    it('returns LIMIT_REACHED when swipe action API reports a daily cap', async () => {
        recordSwipeActionMock.mockRejectedValueOnce(
            Object.assign(new Error('Daily swipe limit reached'), {
                code: 'LIMIT_REACHED',
                usage: {
                    allowed: false,
                    code: 'LIMIT_REACHED',
                    effective_plan: 'standard',
                    daily_count: 20,
                    limit_count: 20,
                    remaining: 0,
                    reached: true
                }
            })
        )

        await act(async () => {
            root.render(
                <HookHarness onSnapshot={(snapshot) => { latestSnapshot = snapshot }} />
            )
        })

        await waitForCondition(() => latestSnapshot && latestSnapshot.loading === false)

        let swipeResult = null
        await act(async () => {
            swipeResult = await latestSnapshot.swipe('offer-1', 'left')
        })

        expect(swipeResult?.code).toBe('LIMIT_REACHED')
        expect(swipeResult?.usage?.reached).toBe(true)
        expect(recordSwipeActionMock).toHaveBeenCalledTimes(1)
    })
})
