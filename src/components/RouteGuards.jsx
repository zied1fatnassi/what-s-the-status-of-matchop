import { useState, useEffect } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import './RouteGuards.css'

const PROFILE_WAIT_TIMEOUT_MS = 5000

/**
 * Loading spinner for auth state resolution
 */
const AuthLoadingSpinner = ({ t }) => (
    <div className="route-guard-loading">
        <div className="route-guard-loading-card">
            <div className="route-guard-spinner" />
            <p>{t('routeGuards.checkingAccess')}</p>
        </div>
    </div>
)

function isSessionExpiredError(error) {
    const message = String(error?.message || '').toLowerCase()
    const code = String(error?.code || '').toLowerCase()
    return (
        message.includes('session') ||
        message.includes('token') ||
        message.includes('jwt') ||
        code.includes('auth') ||
        code.includes('401')
    )
}

function SessionExpiredNotice({ loginPath, t }) {
    return (
        <div className="route-guard-session-expired" role="alert" aria-live="polite">
            <h2>{t('routeGuards.sessionExpired')}</h2>
            <Link to={loginPath} className="btn btn-primary">{t('routeGuards.goToLogin')}</Link>
        </div>
    )
}

/**
 * ProtectedRoute - Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 * Shows loading state while auth is being determined
 * 
 * @param {ReactNode} children - The protected component to render
 * @param {string} requiredType - Optional: 'student' or 'company' to restrict by user type
 */
export function ProtectedRoute({ children, requiredType = null }) {
    const { t } = useTranslation(undefined, { useSuspense: false })
    const { isLoggedIn, isLoading, isStudent, isCompany, user, profile, authError } = useAuth()
    const location = useLocation()
    const [profileWaitTimedOut, setProfileWaitTimedOut] = useState(false)
    const isCompanyPath = location.pathname.startsWith('/company')
    const loginPath = isCompanyPath ? '/company/login' : '/student/login'

    // If we're waiting for profile, stop blocking after a timeout so the page never spins forever
    useEffect(() => {
        if (!requiredType || profile) return
        const t = setTimeout(() => setProfileWaitTimedOut(true), PROFILE_WAIT_TIMEOUT_MS)
        return () => clearTimeout(t)
    }, [requiredType, profile])

    // Reset timeout state when profile loads or route changes
    useEffect(() => {
        if (profile) setProfileWaitTimedOut(false)
    }, [profile])

    // While loading, show spinner - don't render anything else
    if (isLoading) {
        return <AuthLoadingSpinner t={t} />
    }

    if (isSessionExpiredError(authError)) {
        return <SessionExpiredNotice loginPath={loginPath} t={t} />
    }

    // Not logged in - redirect to appropriate login page
    if (!isLoggedIn || !user) {
        return <Navigate to={loginPath} state={{ from: location }} replace />
    }

    // Wait for profile to load before making role-based decisions, but don't block forever:
    // allow through if user_metadata has the required type, or after PROFILE_WAIT_TIMEOUT_MS.
    const userTypeFromMetadata = user?.user_metadata?.type
    const metadataSaysStudent = userTypeFromMetadata === 'student'
    const metadataSaysCompany = userTypeFromMetadata === 'company'
    const canProceedWithoutProfile =
        (requiredType === 'student' && metadataSaysStudent) ||
        (requiredType === 'company' && metadataSaysCompany)

    if (requiredType && !profile && !canProceedWithoutProfile && !profileWaitTimedOut) {
        return <AuthLoadingSpinner t={t} />
    }

    // Check user type if required (profile takes precedence; fallback to metadata)
    if (requiredType === 'student' && !isStudent && !metadataSaysStudent) {
        return <Navigate to="/company/intros" replace />
    }

    if (requiredType === 'company' && !isCompany && !metadataSaysCompany) {
        return <Navigate to="/student/feed" replace />
    }

    // Authenticated and correct type - render children
    return children
}

/**
 * PublicRoute - Wraps routes that should only be accessible when NOT logged in
 * Redirects to app if user IS authenticated (signup, login pages)
 * Uses user_metadata.type when profile isn't loaded yet so we don't stick on spinner after login.
 */
export function PublicRoute({ children }) {
    const { t } = useTranslation(undefined, { useSuspense: false })
    const { isLoggedIn, isLoading, isStudent, isCompany, user } = useAuth()

    if (isLoading) {
        return <AuthLoadingSpinner t={t} />
    }

    if (isLoggedIn) {
        // Use profile when available; otherwise use user_metadata so we redirect immediately after login
        const typeFromMetadata = user?.user_metadata?.type
        const isStudentType = isStudent || typeFromMetadata === 'student'
        const isCompanyType = isCompany || typeFromMetadata === 'company'

        if (isStudentType) {
            return <Navigate to="/student/feed" replace />
        }

        if (isCompanyType) {
            return <Navigate to="/company/intros" replace />
        }

        // Role unknown for now: let /dashboard resolve destination after profile initialization.
        return <Navigate to="/dashboard" replace />
    }

    return children
}

/**
 * AdminRoute - Wraps routes that require admin privileges
 * Redirects to home if user is not an admin
 * 
 * @param {ReactNode} children - The admin component to render
 */
export function AdminRoute({ children }) {
    const { t } = useTranslation(undefined, { useSuspense: false })
    const { isLoggedIn, isLoading, isAdmin, isStudent, isCompany, user, authError } = useAuth()
    const location = useLocation()
    const userTypeFromMetadata = user?.user_metadata?.type || null
    const isRoleResolving = isLoading || (
        isLoggedIn &&
        !!user &&
        !isAdmin &&
        !isStudent &&
        !isCompany &&
        !userTypeFromMetadata
    )

    // While loading or resolving role, show skeleton/loading state
    if (isRoleResolving) {
        return <AuthLoadingSpinner t={t} />
    }

    if (isSessionExpiredError(authError)) {
        return <SessionExpiredNotice loginPath="/student/login" t={t} />
    }

    // Not logged in - redirect to login
    if (!isLoggedIn || !user) {
        return <Navigate to="/student/login" state={{ from: location }} replace />
    }

    if (!isAdmin) {
        // Not an admin - redirect to appropriate dashboard
        if (isStudent || userTypeFromMetadata === 'student') {
            return <Navigate to="/student/feed" replace />
        }
        if (isCompany || userTypeFromMetadata === 'company') {
            return <Navigate to="/company/intros" replace />
        }
        return <Navigate to="/" replace />
    }

    // Authenticated admin - render children
    return children
}

export default { ProtectedRoute, PublicRoute, AdminRoute }
