import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Dashboard Route
 * 
 * Redirects authenticated users to their role-specific dashboard:
 *   - Students → /student/swipe
 *   - Companies → /company/candidates
 *   - Admins → /admin/dashboard
 * 
 * Unauthenticated users are redirected to the login page.
 */
function Dashboard() {
    const { isLoggedIn, isLoading, isStudent, isCompany, isAdmin, user } = useAuth()

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid rgba(255,255,255,0.1)',
                    borderTop: '3px solid #2196f3',
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
    }

    if (!isLoggedIn) {
        return <Navigate to="/login" replace />
    }

    if (isAdmin) {
        return <Navigate to="/admin/dashboard" replace />
    }

    if (isCompany) {
        return <Navigate to="/company/candidates" replace />
    }

    // Default to student dashboard (also handles case where profile type
    // hasn't loaded yet — student is the most common role)
    if (isStudent || user) {
        return <Navigate to="/student/swipe" replace />
    }

    return <Navigate to="/login" replace />
}

export default Dashboard
