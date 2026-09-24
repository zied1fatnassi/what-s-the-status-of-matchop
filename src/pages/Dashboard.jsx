import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBilingualText } from '../lib/useBilingualText'
import { safeLogError } from '../lib/logger'
import './Dashboard.css'

const DashboardLoading = () => (
    <div className="dashboard-loading">
        <div className="dashboard-loading-spinner" />
    </div>
)

const UnknownRoleFallback = ({ onSignOut, isSigningOut, email, tr }) => (
    <div className="dashboard-fallback-page">
        <div className="dashboard-fallback-card">
            <h2 className="dashboard-fallback-title">{tr('Account Type Unresolved', 'Type de compte non resolu')}</h2>
            <p className="dashboard-fallback-desc">
                {tr(
                    'Your session is active, but your account role could not be determined. Please sign out and sign in again. If this persists, contact support.',
                    "Votre session est active, mais le role du compte n'a pas pu etre determine. Veuillez vous deconnecter puis vous reconnecter. Si le probleme persiste, contactez le support."
                )}
            </p>
            {email && (
                <p className="dashboard-fallback-email">
                    {tr('Signed in as:', 'Connecte en tant que :')} {email}
                </p>
            )}

            <div className="dashboard-fallback-actions">
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onSignOut}
                    disabled={isSigningOut}
                >
                    {isSigningOut
                        ? tr('Signing Out...', 'Deconnexion...')
                        : tr('Sign Out', 'Se deconnecter')}
                </button>
                <a href="mailto:contact@matchop.tech" className="btn btn-secondary">
                    {tr('Contact Support', 'Contacter le support')}
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
    const tr = useBilingualText()
    const { isLoggedIn, isLoading, isStudent, isCompany, isAdmin, user, profile, signOut } = useAuth()
    const metadataType = user?.user_metadata?.type

    const handleSignOut = async () => {
        if (isSigningOut) return
        setIsSigningOut(true)
        try {
            await signOut()
            window.location.assign('/')
        } catch (error) {
            safeLogError('[Dashboard] Failed to sign out from unknown-role fallback', { error })
            setIsSigningOut(false)
        }
    }

    if (isLoading) {
        return <DashboardLoading />
    }

    if (!isLoggedIn) {
        return <Navigate to="/student/login" replace />
    }

    if (isAdmin || metadataType === 'admin') {
        return <Navigate to="/admin/dashboard" replace />
    }

    if (isCompany || metadataType === 'company') {
        return <Navigate to="/company/intros" replace />
    }

    if (isStudent || metadataType === 'student') {
        return <Navigate to="/student/feed" replace />
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
            tr={tr}
        />
    )
}

export default Dashboard
