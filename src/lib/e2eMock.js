const E2E_ROLE_PARAM = 'e2eRole'
const E2E_ROLE_STORAGE_KEY = 'matchop:e2eRole'
const VALID_E2E_ROLES = new Set(['guest', 'student', 'company', 'admin'])

export function isE2EMockModeEnabled() {
    if (import.meta.env.VITE_E2E_MOCK_MODE === 'true') return true
    if (import.meta.env.DEV && typeof window !== 'undefined') {
        const search = window.location.search
        if (search && search.includes(E2E_ROLE_PARAM)) {
            const role = new URLSearchParams(search).get(E2E_ROLE_PARAM)
            if (VALID_E2E_ROLES.has(role)) {
                window.sessionStorage.setItem(E2E_ROLE_STORAGE_KEY, role)
                return true
            }
        }
        if (window.sessionStorage.getItem(E2E_ROLE_STORAGE_KEY)) return true
    }
    return false
}

function getRoleFromQuery(search) {
    const params = new URLSearchParams(search || '')
    const role = params.get(E2E_ROLE_PARAM)
    return VALID_E2E_ROLES.has(role) ? role : null
}

function getStoredRole() {
    if (typeof window === 'undefined') return null
    const stored = window.sessionStorage.getItem(E2E_ROLE_STORAGE_KEY)
    return VALID_E2E_ROLES.has(stored) ? stored : null
}

function persistRole(role) {
    if (typeof window === 'undefined') return
    if (!role) {
        window.sessionStorage.removeItem(E2E_ROLE_STORAGE_KEY)
        return
    }
    window.sessionStorage.setItem(E2E_ROLE_STORAGE_KEY, role)
}

export function getE2EMockRole() {
    if (!isE2EMockModeEnabled()) return null
    if (typeof window === 'undefined') return null

    const roleFromQuery = getRoleFromQuery(window.location.search)
    if (roleFromQuery) {
        persistRole(roleFromQuery)
        return roleFromQuery
    }

    return getStoredRole() || 'guest'
}

export function isE2EMockRole(role) {
    return getE2EMockRole() === role
}

export function getE2EMockUser() {
    const role = getE2EMockRole()
    if (!role || role === 'guest') return null

    const id = `e2e-${role}-user`
    return {
        id,
        email: `${role}@e2e.local`,
        user_metadata: {
            type: role,
            name: `${role[0].toUpperCase()}${role.slice(1)} E2E`
        },
        email_confirmed_at: new Date().toISOString()
    }
}

