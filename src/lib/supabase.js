import { createClient } from '@supabase/supabase-js'
import { cookieStorage } from './cookieStorage'
import { isE2EMockModeEnabled, getE2EMockUser } from './e2eMock'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const isE2EMockMode = isE2EMockModeEnabled()
const MOCK_MATCH_ID = 'test-match'

if (!isE2EMockMode && (!supabaseUrl || !supabaseAnonKey)) {
    console.error('Missing Supabase environment variables')
    console.error('Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

function createMockResponse(data = [], error = null) {
    return {
        data,
        error,
        count: Array.isArray(data) ? data.length : (data ? 1 : 0),
        status: error ? 400 : 200,
        statusText: error ? 'error' : 'ok'
    }
}

function createMockRows(tableName, currentUser) {
    const now = '2026-01-15T10:00:00.000Z'

    const studentProfile = {
        id: 'e2e-student-user',
        email: 'student@e2e.local',
        created_at: now,
        suspended: false,
        user_profiles: [{ id: 'up-student', user_id: 'e2e-student-user', profile_type: 'student', is_default: true }],
        students: { full_name: 'Student E2E', avatar_url: null },
        companies: null
    }

    const companyProfile = {
        id: 'e2e-company-user',
        email: 'company@e2e.local',
        created_at: now,
        suspended: false,
        user_profiles: [{ id: 'up-company', user_id: 'e2e-company-user', profile_type: 'company', is_default: true }],
        students: null,
        companies: { company_name: 'Acme Labs', logo_url: null }
    }

    const adminProfile = {
        id: 'e2e-admin-user',
        email: 'admin@e2e.local',
        created_at: now,
        suspended: false,
        user_profiles: [{ id: 'up-admin', user_id: 'e2e-admin-user', profile_type: 'admin', is_default: true }],
        students: null,
        companies: null
    }

    const mockCompany = {
        id: 'e2e-company-user',
        company_name: 'Acme Labs',
        logo_url: null,
        industry: 'Technology',
        location: 'Tunis',
        website: 'https://example.com',
        description: 'Mock company for mobile tests',
        company_size: '51-200',
        verified: true,
        created_at: now
    }

    const mockOffer = {
        id: 'offer-1',
        company_id: 'e2e-company-user',
        title: 'Frontend Intern',
        status: 'active',
        location: 'Remote',
        required_skills: ['React', 'CSS'],
        salary_min: 1000,
        salary_max: 1500,
        description: 'Build responsive user interfaces',
        created_at: now,
        companies: {
            id: 'e2e-company-user',
            company_name: 'Acme Labs',
            logo_url: null
        }
    }

    const mockMatch = {
        id: MOCK_MATCH_ID,
        company_id: 'e2e-company-user',
        student_id: 'e2e-student-user',
        created_at: now,
        email: 'hr@acme.local',
        company: 'Acme Labs',
        companies: {
            id: 'e2e-company-user',
            logo_url: null,
            company_name: 'Acme Labs'
        },
        offers: {
            title: 'Frontend Intern'
        },
        profiles: {
            id: 'e2e-student-user',
            name: 'Student E2E',
            avatar_url: null,
            bio: 'Computer science student'
        }
    }

    const mockMessages = [
        {
            id: 'msg-1',
            match_id: MOCK_MATCH_ID,
            sender_id: 'e2e-company-user',
            content: 'Welcome! Let us schedule an interview.',
            created_at: now,
            sender: { name: 'Acme HR', avatar_url: null }
        },
        {
            id: 'msg-2',
            match_id: MOCK_MATCH_ID,
            sender_id: 'e2e-student-user',
            content: 'Thank you, I am available this week.',
            created_at: now,
            sender: { name: 'Student E2E', avatar_url: null }
        }
    ]

    const rowsByTable = {
        profiles: [studentProfile, companyProfile, adminProfile],
        user_profiles: [
            ...studentProfile.user_profiles,
            ...companyProfile.user_profiles,
            ...adminProfile.user_profiles
        ],
        students: [{
            id: 'e2e-student-user',
            display_name: 'Student E2E',
            location: 'Tunis',
            skills: ['React', 'TypeScript']
        }],
        companies: [mockCompany],
        offers: [mockOffer],
        matches: [mockMatch],
        messages: mockMessages,
        reports: [{
            id: 'report-1',
            reporter_id: 'e2e-student-user',
            reported_id: 'e2e-company-user',
            reason: 'spam',
            status: 'pending',
            description: 'Example report',
            created_at: now
        }],
        app_settings: [{
            id: 1,
            settings: {
                siteName: 'MATCHOP',
                allowNewSignups: true,
                maintenanceMode: false
            },
            updated_at: now
        }],
        admin_audit_logs: [{
            id: 'audit-1',
            admin_id: currentUser?.id || 'e2e-admin-user',
            admin_email: currentUser?.email || 'admin@e2e.local',
            action: 'Mock mode active',
            target_type: 'system',
            created_at: now
        }],
        handshake_intros: [],
        intro_status_events: []
    }

    return rowsByTable[tableName] || []
}

function createMockQuery(tableName, getCurrentUser) {
    const state = {
        payloadOverride: null,
        filters: [],
        limit: null,
        range: null,
        order: null
    }

    const builder = {}

    const normalizeRows = () => {
        const source = state.payloadOverride !== null
            ? (Array.isArray(state.payloadOverride) ? state.payloadOverride : [state.payloadOverride])
            : createMockRows(tableName, getCurrentUser())

        let rows = [...source]

        for (const filterFn of state.filters) {
            rows = rows.filter(filterFn)
        }

        if (state.order) {
            const { column, ascending } = state.order
            rows.sort((a, b) => {
                const aValue = a?.[column]
                const bValue = b?.[column]
                if (aValue === bValue) return 0
                if (aValue == null) return 1
                if (bValue == null) return -1
                if (aValue > bValue) return ascending ? 1 : -1
                return ascending ? -1 : 1
            })
        }

        if (state.range) {
            const [from, to] = state.range
            rows = rows.slice(from, to + 1)
        }

        if (typeof state.limit === 'number') {
            rows = rows.slice(0, state.limit)
        }

        return rows
    }

    builder.select = () => builder
    builder.throwOnError = () => builder
    builder.abortSignal = () => builder
    builder.contains = () => builder
    builder.overlaps = () => builder
    builder.or = () => builder
    builder.not = () => builder
    builder.is = () => builder
    builder.textSearch = () => builder
    builder.filter = () => builder

    builder.eq = (column, value) => {
        state.filters.push((row) => row?.[column] === value)
        return builder
    }

    builder.neq = (column, value) => {
        state.filters.push((row) => row?.[column] !== value)
        return builder
    }

    builder.gt = (column, value) => {
        state.filters.push((row) => row?.[column] > value)
        return builder
    }

    builder.gte = (column, value) => {
        state.filters.push((row) => row?.[column] >= value)
        return builder
    }

    builder.lt = (column, value) => {
        state.filters.push((row) => row?.[column] < value)
        return builder
    }

    builder.lte = (column, value) => {
        state.filters.push((row) => row?.[column] <= value)
        return builder
    }

    builder.ilike = (column, value) => {
        const needle = String(value || '').replace(/%/g, '').toLowerCase()
        state.filters.push((row) => String(row?.[column] || '').toLowerCase().includes(needle))
        return builder
    }

    builder.like = builder.ilike

    builder.match = (criteria = {}) => {
        Object.entries(criteria).forEach(([column, value]) => {
            state.filters.push((row) => row?.[column] === value)
        })
        return builder
    }

    builder.in = (column, values = []) => {
        state.filters.push((row) => values.includes(row?.[column]))
        return builder
    }

    builder.order = (column, options = {}) => {
        state.order = { column, ascending: options.ascending !== false }
        return builder
    }

    builder.limit = (value) => {
        state.limit = value
        return builder
    }

    builder.range = (from, to) => {
        state.range = [from, to]
        return builder
    }

    builder.insert = (payload) => {
        state.payloadOverride = Array.isArray(payload) ? payload : [payload]
        return builder
    }

    builder.update = (payload) => {
        state.payloadOverride = payload || {}
        return builder
    }

    builder.upsert = (payload) => {
        state.payloadOverride = Array.isArray(payload) ? payload : [payload]
        return builder
    }

    builder.delete = () => {
        state.payloadOverride = []
        return builder
    }

    builder.single = async () => {
        const rows = normalizeRows()
        return createMockResponse(rows[0] || null)
    }

    builder.maybeSingle = async () => {
        const rows = normalizeRows()
        return createMockResponse(rows[0] || null)
    }

    builder.then = (resolve, reject) => {
        const rows = normalizeRows()
        return Promise.resolve(createMockResponse(rows)).then(resolve, reject)
    }

    builder.catch = (reject) => Promise.resolve(createMockResponse(normalizeRows())).catch(reject)
    builder.finally = (handler) => Promise.resolve(createMockResponse(normalizeRows())).finally(handler)

    return builder
}

function createMockSupabase() {
    let currentUser = getE2EMockUser()
    const listeners = new Set()

    const getSessionPayload = () => ({
        session: currentUser
            ? {
                access_token: 'e2e-access-token',
                refresh_token: 'e2e-refresh-token',
                user: currentUser
            }
            : null
    })

    const notifyAuthChange = (event) => {
        const session = getSessionPayload().session
        listeners.forEach((listener) => listener(event, session))
    }

    const channelObject = {
        on() {
            return channelObject
        },
        subscribe(callback) {
            callback?.('SUBSCRIBED')
            return channelObject
        },
        unsubscribe() {
            return channelObject
        }
    }

    return {
        auth: {
            async getSession() {
                currentUser = getE2EMockUser()
                return { data: getSessionPayload(), error: null }
            },
            onAuthStateChange(callback) {
                listeners.add(callback)
                setTimeout(() => callback('INITIAL_SESSION', getSessionPayload().session), 0)
                return {
                    data: {
                        subscription: {
                            unsubscribe() {
                                listeners.delete(callback)
                            }
                        }
                    }
                }
            },
            async getUser() {
                currentUser = getE2EMockUser()
                return { data: { user: currentUser }, error: null }
            },
            async signUp() {
                return {
                    data: { user: currentUser, session: getSessionPayload().session },
                    error: null
                }
            },
            async signInWithPassword({ email }) {
                const role = email?.includes('admin')
                    ? 'admin'
                    : email?.includes('company')
                        ? 'company'
                        : 'student'

                currentUser = {
                    id: `e2e-${role}-user`,
                    email: email || `${role}@e2e.local`,
                    user_metadata: { type: role, name: `${role} E2E` },
                    email_confirmed_at: new Date().toISOString()
                }
                notifyAuthChange('SIGNED_IN')
                return {
                    data: {
                        user: currentUser,
                        session: getSessionPayload().session
                    },
                    error: null
                }
            },
            async signOut() {
                currentUser = null
                notifyAuthChange('SIGNED_OUT')
                return { error: null }
            },
            async resend() {
                return { error: null }
            }
        },
        from(tableName) {
            return createMockQuery(tableName, () => currentUser)
        },
        rpc: async (fn) => {
            if (fn === 'get_swipe_limit_status') {
                return createMockResponse({
                    allowed: true,
                    code: 'OK',
                    effective_plan: 'standard',
                    daily_count: 0,
                    limit_count: 20,
                    remaining: 20,
                    reached: false
                })
            }

            if (fn === 'record_student_swipe_with_limit') {
                return createMockResponse({
                    success: true,
                    code: 'OK',
                    message: 'Swipe recorded',
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
            }

            if (fn === 'create_intro_from_swipe') {
                return createMockResponse({
                    success: true,
                    intro_id: 'intro-e2e'
                })
            }

            return createMockResponse(null)
        },
        channel() {
            return channelObject
        },
        removeChannel() {
            return null
        },
        functions: {
            async invoke(name, payload = {}) {
                if (name === 'suggest-icebreakers') {
                    return {
                        data: {
                            suggestions: [
                                'Hi, I am interested in this role and would love to learn more.',
                                'What qualities are you prioritizing for this position?',
                                'Could you share the next steps in your hiring process?'
                            ]
                        },
                        error: null
                    }
                }

                if (name === 'ai-profile-polisher') {
                    const bio = payload?.body?.bio || ''
                    return {
                        data: {
                            success: true,
                            bio: bio ? `${bio.trim()}\n\nOpen to new opportunities and collaboration.` : bio
                        },
                        error: null
                    }
                }

                if (name === 'record-swipe') {
                    return {
                        data: {
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
                        },
                        error: null
                    }
                }

                return { data: {}, error: null }
            }
        }
    }
}

/**
 * Supabase Client Configuration
 *
 * SECURITY FIX: Sessions are now stored in Secure, SameSite=Strict cookies
 * instead of localStorage. This mitigates XSS-based token theft because:
 *   - SameSite=Strict prevents cross-origin cookie sending (CSRF mitigation)
 *   - Secure flag ensures cookies are only sent over HTTPS
 *   - Cookie storage adapter abstracts persistence from the SPA
 *
 * The SPA reads auth state via Supabase's in-memory onAuthStateChange listener,
 * NOT by reading cookies directly — maintaining the SPA flow.
 *
 * PKCE flow is enabled for enhanced security on the authorization code exchange.
 */
export const supabase = isE2EMockMode
    ? createMockSupabase()
    : createClient(supabaseUrl || '', supabaseAnonKey || '', {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            storage: typeof window !== 'undefined' ? cookieStorage : undefined,
            storageKey: 'matchop-auth-token'
        }
    })

export default supabase
