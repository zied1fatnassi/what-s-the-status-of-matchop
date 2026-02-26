import '@testing-library/jest-dom'

// React 19 act() warning suppression for jsdom integration tests.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Mock Supabase for tests
const createQueryBuilder = () => {
    const builder = {
        select: vi.fn(() => builder),
        insert: vi.fn(() => builder),
        update: vi.fn(() => builder),
        upsert: vi.fn(() => builder),
        delete: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        then: (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject)
    }
    return builder
}

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'test-user' } } } })),
            getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } } })),
        },
        from: vi.fn(() => createQueryBuilder()),
        functions: {
            invoke: vi.fn(() => Promise.resolve({ data: {}, error: null }))
        },
        storage: {
            from: vi.fn(() => ({
                upload: vi.fn(() => Promise.resolve({ data: { path: 'mock/path' }, error: null })),
                createSignedUrl: vi.fn(() => Promise.resolve({ data: { signedUrl: 'https://example.com/mock' }, error: null }))
            }))
        },
        rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }
}))
