import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Loading spinner for auth state resolution
 */
const AuthLoadingSpinner = () => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 50%, #1976d2 100%)'
    }}>
        <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(255,255,255,0.2)',
            borderTop: '4px solid #2196f3',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }} />
        <style>{`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `}</style>
    </div>
)

/**
 * ProtectedRoute - Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 * Shows loading state while auth is being determined
 * 
 * @param {ReactNode} children - The protected component to render
 * @param {string} requiredType - Optional: 'student' or 'company' to restrict by user type
 */
export function ProtectedRoute({ children, requiredType = null }) {
    const { isLoggedIn, isLoading, isStudent, isCompany, user } = useAuth()
    const location = useLocation()

    // While loading, show spinner - don't render anything else
    if (isLoading) {
        return <AuthLoadingSpinner />
    }

    // Not logged in - redirect to appropriate login page
    if (!isLoggedIn || !user) {
        // Determine which login to redirect to based on URL pattern
        const isCompanyPath = location.pathname.startsWith('/company')
        const loginPath = isCompanyPath ? '/company/login' : '/student/login'

        return <Navigate to={loginPath} state={{ from: location }} replace />
    }

    // Check user type if required
    if (requiredType === 'student' && !isStudent) {
        // User is logged in but wrong type - redirect to company area
        return <Navigate to="/company/candidates" replace />
    }

    if (requiredType === 'company' && !isCompany) {
        // User is logged in but wrong type - redirect to student area
        return <Navigate to="/student/swipe" replace />
    }

    // Authenticated and correct type - render children
    return children
}

/**
 * PublicRoute - Wraps routes that should only be accessible when NOT logged in
 * Redirects to app if user IS authenticated (signup, login pages)
 * 
 * @param {ReactNode} children - The public component to render
 */
export function PublicRoute({ children }) {
    const { isLoggedIn, isLoading, isStudent, isCompany } = useAuth()

    // While loading, show spinner - don't render anything else
    if (isLoading) {
        return <AuthLoadingSpinner />
    }

    // If logged in, redirect to appropriate dashboard
    if (isLoggedIn) {
        if (isStudent) {
            return <Navigate to="/student/swipe" replace />
        }
        if (isCompany) {
            return <Navigate to="/company/candidates" replace />
        }
        // Logged in but type not determined - wait for profile
        // This shouldn't happen but fallback to landing
        return <Navigate to="/" replace />
    }

    // Not logged in - render public content
    return children
}

/**
 * AdminRoute - Wraps routes that require admin privileges
 * Redirects to home if user is not an admin
 * 
 * @param {ReactNode} children - The admin component to render
 */
export function AdminRoute({ children }) {
    const { isLoggedIn, isLoading, profile, user } = useAuth()
    const location = useLocation()

    // While loading, show spinner
    if (isLoading) {
        return <AuthLoadingSpinner />
    }

    // Not logged in - redirect to login
    if (!isLoggedIn || !user) {
        return <Navigate to="/student/login" state={{ from: location }} replace />
    }

    // Check if user is admin
    const isAdmin = profile?.role === 'admin' || user?.user_metadata?.type === 'admin'

    if (!isAdmin) {
        // Not an admin - redirect to appropriate dashboard
        if (profile?.role === 'student') {
            return <Navigate to="/student/swipe" replace />
        }
        if (profile?.role === 'company') {
            return <Navigate to="/company/candidates" replace />
        }
        return <Navigate to="/" replace />
    }

    // Authenticated admin - render children
    return children
}

export default { ProtectedRoute, PublicRoute, AdminRoute }
