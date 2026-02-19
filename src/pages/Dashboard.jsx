import { useState } from 'react'
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

const UnknownRoleFallback = ({ onSignOut, isSigningOut, email }) => (
    <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
    }}>
        <div className="glass-card" style={{
            maxWidth: '560px',
            width: '100%',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <h2 style={{ marginBottom: '0.75rem' }}>Account Type Unresolved</h2>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>
                Your session is active, but your account role could not be determined.
                Please sign out and sign in again. If this persists, contact support.
            </p>
            {email && (
                <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Signed in as: {email}
                </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onSignOut}
                    disabled={isSigningOut}
                >
                    {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                </button>
                <a href="mailto:support@matchop.com" className="btn btn-secondary">
                    Contact Support
                </a>
            </div>
        </div>
    </div>
)

/**
 * Dashboard Route
 *
 * Redirects authenticated users to their role-specific dashboard.
 */
function Dashboard() {
    const [isSigningOut, setIsSigningOut] = useState(false)
    const { isLoggedIn, isLoading, isStudent, isCompany, isAdmin, user, profile, signOut } = useAuth()
    const metadataType = user?.user_metadata?.type

    const handleSignOut = async () => {
        if (isSigningOut) return
        setIsSigningOut(true)
        try {
            await signOut()
            window.location.assign('/')
        } catch (error) {
            console.error('[Dashboard] Failed to sign out from unknown-role fallback:', error)
            setIsSigningOut(false)
        }
    }

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

    return (
        <UnknownRoleFallback
            onSignOut={handleSignOut}
            isSigningOut={isSigningOut}
            email={user?.email}
        />
    )
}

export default Dashboard
