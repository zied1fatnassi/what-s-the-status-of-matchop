import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useBilingualText } from '../lib/useBilingualText'

const MIN_CHECK_MS = 500
const REDIRECT_DELAY_MS = 900

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function decodeDescription(value) {
    if (!value) return ''
    const normalized = value.replace(/\+/g, ' ')
    try {
        return decodeURIComponent(normalized)
    } catch {
        return normalized
    }
}

function normalizeFailureMessage(errorCode, description, exchangeMessage, tr) {
    const raw = `${errorCode || ''} ${description || ''} ${exchangeMessage || ''}`.toLowerCase()

    const looksExpiredOrUsed =
        raw.includes('expired') ||
        raw.includes('invalid') ||
        raw.includes('already') ||
        raw.includes('used') ||
        raw.includes('grant') ||
        raw.includes('code verifier')

    if (looksExpiredOrUsed) {
        return tr(
            'This link is invalid or already used. If your account is already verified, sign in normally.',
            'Ce lien est invalide ou deja utilise. Si votre compte est deja verifie, connectez-vous normalement.'
        )
    }

    return description || exchangeMessage || tr(
        'Authentication failed. Please request a new link.',
        "Echec de l'authentification. Veuillez demander un nouveau lien."
    )
}

function clearAuthParamsFromUrl() {
    const url = new URL(window.location.href)

    const keysToDelete = [
        'code',
        'error',
        'error_description',
        'state',
        'access_token',
        'refresh_token',
        'token_type',
        'expires_in',
        'type'
    ]

    keysToDelete.forEach((key) => url.searchParams.delete(key))

    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
    keysToDelete.forEach((key) => hashParams.delete(key))

    const query = url.searchParams.toString()
    const hash = hashParams.toString()
    const cleanUrl = `${url.pathname}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`

    window.history.replaceState({}, document.title, cleanUrl)
}

/**
 * Auth Callback Page
 *
 * Handles Supabase auth redirects and avoids "false negative" failures by:
 * 1) checking session first,
 * 2) listening to onAuthStateChange while processing,
 * 3) treating "already used" link errors as success if session exists,
 * 4) waiting a minimum 500ms before rendering final state.
 */
function AuthCallback() {
    const navigate = useNavigate()
    const tr = useBilingualText()
    const [status, setStatus] = useState('checking') // 'checking' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        let isActive = true
        let isResolved = false
        let redirectTimerId = null
        const startedAt = Date.now()

        const waitForMinimumCheckingTime = async () => {
            const elapsed = Date.now() - startedAt
            const remaining = MIN_CHECK_MS - elapsed
            if (remaining > 0) await sleep(remaining)
        }

        const finishSuccess = async () => {
            if (!isActive || isResolved) return
            isResolved = true
            await waitForMinimumCheckingTime()
            if (!isActive) return

            clearAuthParamsFromUrl()
            setStatus('success')
            redirectTimerId = setTimeout(() => {
                navigate('/dashboard', { replace: true })
            }, REDIRECT_DELAY_MS)
        }

        const finishError = async (message) => {
            if (!isActive || isResolved) return
            isResolved = true
            await waitForMinimumCheckingTime()
            if (!isActive) return

            clearAuthParamsFromUrl()
            setErrorMessage(message)
            setStatus('error')
        }

        // Listen first so UI doesn't race into error while auth is still settling.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                await finishSuccess()
            }
        })

        const handleCallback = async () => {
            try {
                // 1) Session-first check: if already signed in, treat as success.
                const { data: initialSessionData } = await supabase.auth.getSession()
                if (initialSessionData?.session?.user) {
                    await finishSuccess()
                    return
                }

                const url = new URL(window.location.href)
                const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))

                const code = url.searchParams.get('code') || hashParams.get('code')
                const errorCode = url.searchParams.get('error') || hashParams.get('error')
                const errorDescription = decodeDescription(
                    url.searchParams.get('error_description') || hashParams.get('error_description')
                )

                // 2) PKCE code exchange.
                if (code) {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

                    if (data?.session?.user) {
                        await finishSuccess()
                        return
                    }

                    if (error) {
                        // Silent Success Pattern:
                        // scanner pre-click can consume code; if a session exists now, it's success.
                        const { data: afterExchangeData } = await supabase.auth.getSession()
                        if (afterExchangeData?.session?.user) {
                            await finishSuccess()
                            return
                        }

                        await finishError(normalizeFailureMessage(errorCode, errorDescription, error.message, tr))
                        return
                    }
                }

                // 3) Provider error in URL.
                if (errorCode) {
                    // Give auth event a brief window to settle before showing failure UI.
                    await sleep(250)

                    const { data: afterUrlErrorData } = await supabase.auth.getSession()
                    if (afterUrlErrorData?.session?.user) {
                        await finishSuccess()
                        return
                    }

                    await finishError(normalizeFailureMessage(errorCode, errorDescription, '', tr))
                    return
                }

                // 4) Final settle check for detectSessionInUrl async path.
                await sleep(250)
                const { data: finalSessionData } = await supabase.auth.getSession()

                if (finalSessionData?.session?.user) {
                    await finishSuccess()
                    return
                }

                await finishError(tr(
                    'No active verification session was found. If your email is already verified, sign in normally.',
                    'Aucune session de verification active trouvee. Si votre email est deja verifie, connectez-vous normalement.'
                ))
            } catch (err) {
                console.error('[AuthCallback] Unexpected error:', err)

                // Last-chance silent-success check before surfacing failure.
                try {
                    const { data: fallbackSessionData } = await supabase.auth.getSession()
                    if (fallbackSessionData?.session?.user) {
                        await finishSuccess()
                        return
                    }
                } catch {
                    // ignore
                }

                const message = err instanceof Error
                    ? err.message
                    : tr('An unexpected error occurred.', 'Une erreur inattendue est survenue.')
                await finishError(normalizeFailureMessage('', '', message, tr))
            }
        }

        handleCallback()

        return () => {
            isActive = false
            subscription.unsubscribe()
            if (redirectTimerId) clearTimeout(redirectTimerId)
        }
    }, [navigate])

    return (
        <div style={{
            minHeight: '100dvh',
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
                {status === 'checking' && (
                    <>
                        <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary)' }} />
                        <h2 style={{ margin: 0 }}>{tr('Verifying your email...', 'Verification de votre email...')}</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                            {tr(
                                'Please wait while we confirm your account status.',
                                'Veuillez patienter pendant la verification de votre compte.'
                            )}
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle size={48} style={{ color: 'var(--success, #22c55e)' }} />
                        <h2 style={{ margin: 0 }}>{tr('Email Verified!', 'Email verifie !')}</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                            {tr(
                                'Your account is confirmed. Redirecting to your dashboard...',
                                'Votre compte est confirme. Redirection vers votre tableau de bord...'
                            )}
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle size={48} style={{ color: 'var(--error, #ef4444)' }} />
                        <h2 style={{ margin: 0 }}>{tr('Verification Failed', 'Echec de verification')}</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                            {errorMessage}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/login')}
                            >
                                {tr('Go to Login', 'Aller a la connexion')}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate('/signup')}
                            >
                                {tr('Sign Up Again', "S'inscrire a nouveau")}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default AuthCallback
