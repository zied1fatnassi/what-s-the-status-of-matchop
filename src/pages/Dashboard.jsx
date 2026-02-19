import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const DashboardLoading = () => (
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

/**
 * Dashboard Route
 *
 * Redirects authenticated users to their role-specific dashboard.
 */
function Dashboard() {
    const { isLoggedIn, isLoading, isStudent, isCompany, isAdmin, user, profile } = useAuth()
    const metadataType = user?.user_metadata?.type

    if (isLoading) {
        return <DashboardLoading />
    }

    if (!isLoggedIn) {
        return <Navigate to="/login" replace />
    }

    if (isAdmin || metadataType === 'admin') {
        return <Navigate to="/admin/dashboard" replace />
    }

    if (isCompany || metadataType === 'company') {
        return <Navigate to="/company/candidates" replace />
    }

    if (isStudent || metadataType === 'student') {
        return <Navigate to="/student/swipe" replace />
    }

    // Avoid role assumptions while profile is still hydrating.
    if (!profile) {
        return <DashboardLoading />
    }

    return <Navigate to="/" replace />
}

export default Dashboard
