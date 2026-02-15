import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

/**
 * Auth Callback Page
 * 
 * Handles the redirect from Supabase email confirmation links (PKCE flow).
 * Supabase redirects here with ?code=xxx which is exchanged for a session,
 * then the user is sent to /dashboard.
 */
function AuthCallback() {
    const navigate = useNavigate()
    const [status, setStatus] = useState('processing') // 'processing' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const url = new URL(window.location.href)
                const code = url.searchParams.get('code')
                const errorParam = url.searchParams.get('error')
                const errorDescription = url.searchParams.get('error_description')

                // Handle error from Supabase
                if (errorParam) {
                    const message = errorDescription?.replace(/\+/g, ' ') || 'Authentication failed'
                    setStatus('error')
                    setErrorMessage(message)
                    return
                }

                // Exchange code for session (PKCE flow)
                if (code) {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

                    if (error) {
                        console.error('[AuthCallback] Code exchange failed:', error.message)
                        setStatus('error')
                        setErrorMessage(
                            error.message.includes('expired')
                                ? 'The verification link has expired. Please request a new one.'
                                : error.message
                        )
                        return
                    }

                    if (data?.session) {
                        setStatus('success')
                        // Brief pause so user sees success state, then redirect
                        setTimeout(() => {
                            navigate('/dashboard', { replace: true })
                        }, 1500)
                        return
                    }
                }

                // If detectSessionInUrl already handled it, check for existing session
                const { data: { session } } = await supabase.auth.getSession()
                if (session) {
                    setStatus('success')
                    setTimeout(() => {
                        navigate('/dashboard', { replace: true })
                    }, 1500)
                    return
                }

                // No code and no session — something went wrong
                setStatus('error')
                setErrorMessage('No authentication code found. Please try signing up again.')
            } catch (err) {
                console.error('[AuthCallback] Unexpected error:', err)
                setStatus('error')
                setErrorMessage('An unexpected error occurred. Please try again.')
            }
        }

        handleCallback()
    }, [navigate])

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <div className="glass-card" style={{
                maxWidth: '500px',
                width: '100%',
                padding: '3rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem'
            }}>
                {status === 'processing' && (
                    <>
                        <Loader2 size={48} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                        <h2 style={{ margin: 0 }}>Verifying your email...</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                            Please wait while we confirm your account.
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle size={48} style={{ color: 'var(--success, #22c55e)' }} />
                        <h2 style={{ margin: 0 }}>Email Verified!</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                            Your account has been confirmed. Redirecting to your dashboard...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle size={48} style={{ color: 'var(--error, #ef4444)' }} />
                        <h2 style={{ margin: 0 }}>Verification Failed</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                            {errorMessage}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/login')}
                            >
                                Go to Login
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate('/signup')}
                            >
                                Sign Up Again
                            </button>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}

export default AuthCallback
