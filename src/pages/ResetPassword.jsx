import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle, Loader2, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { validatePassword } from '../lib/validation'
import { validateResetToken, executePasswordReset, getResetParamsFromURL } from '../lib/passwordReset'
import { useBilingualText } from '../lib/useBilingualText'
import '../pages/student/StudentSignup.css'

const STUDENT_LOGIN_PATH = '/student/login'
const COMPANY_LOGIN_PATH = '/company/login'

/**
 * Reset Password Page
 * 
 * Supports both:
 * 1. Single-use tokens validated by secure-password-reset Edge Function (?token=xxx&email=yyy)
 * 2. Native Supabase Auth recovery session (via location.state?.accessToken or active session)
 */
function ResetPassword() {
    const navigate = useNavigate()
    const location = useLocation()
    const tr = useBilingualText()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [isTokenValid, setIsTokenValid] = useState(false)
    const [isCheckingToken, setIsCheckingToken] = useState(true)
    const [isSupabaseSession, setIsSupabaseSession] = useState(false)
    const [resetToken, setResetToken] = useState(null)
    const [resetEmail, setResetEmail] = useState(null)

    // Validate the reset token or check active auth session on mount
    useEffect(() => {
        let active = true

        const checkToken = async () => {
            try {
                // Check if Supabase recovery session is active or passed in state
                if (location.state?.accessToken) {
                    if (active) {
                        setIsSupabaseSession(true)
                        setIsTokenValid(true)
                        setIsCheckingToken(false)
                    }
                    return
                }

                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    if (active) {
                        setIsSupabaseSession(true)
                        setIsTokenValid(true)
                        setResetEmail(session.user.email || null)
                        setIsCheckingToken(false)
                    }
                    return
                }

                // Extract token and email from URL query params
                const { token, email } = getResetParamsFromURL()

                if (!token || !email) {
                    if (active) {
                        setError(tr(
                            'Invalid reset link. Please request a new password reset.',
                            'Lien de reinitialisation invalide. Veuillez demander un nouveau lien.'
                        ))
                        setIsTokenValid(false)
                    }
                    return
                }

                // Store for later use in form submission
                setResetToken(token)
                setResetEmail(email)

                // Validate token via Edge Function (does NOT consume it)
                const result = await validateResetToken(token, email)

                if (active) {
                    if (result.valid) {
                        setIsTokenValid(true)
                    } else {
                        setError(result.error || tr(
                            'Your reset link is invalid or has expired. Please request a new one.',
                            'Votre lien de reinitialisation est invalide ou expire. Veuillez en demander un nouveau.'
                        ))
                        setIsTokenValid(false)
                    }
                }
            } catch {
                if (active) {
                    setError(tr(
                        'Failed to validate reset link. Please try again or request a new one.',
                        'Impossible de valider le lien. Veuillez reessayer ou demander un nouveau.'
                    ))
                    setIsTokenValid(false)
                }
            } finally {
                if (active) {
                    setIsCheckingToken(false)
                }
            }
        }

        checkToken()
        return () => { active = false }
    }, [location.state])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!isTokenValid || (!isSupabaseSession && (!resetToken || !resetEmail))) {
            setError(tr(
                'Your reset link is invalid or has expired. Please request a new one.',
                'Votre lien de reinitialisation est invalide ou expire. Veuillez en demander un nouveau.'
            ))
            return
        }

        // Validate password client-side
        const passwordValidation = validatePassword(password)
        if (!passwordValidation.valid) {
            setError(passwordValidation.error)
            return
        }

        if (password !== confirmPassword) {
            setError(tr('Passwords do not match', 'Les mots de passe ne correspondent pas'))
            return
        }

        setIsLoading(true)

        try {
            if (isSupabaseSession) {
                const { error: updateError } = await supabase.auth.updateUser({ password })
                if (updateError) throw updateError
                setIsSuccess(true)
            } else {
                // Consume token + update password via Edge Function
                const result = await executePasswordReset(resetToken, resetEmail, password)

                if (result.success) {
                    setIsSuccess(true)
                } else {
                    setError(result.error || tr(
                        'Failed to reset password. Please try again.',
                        'Echec de la reinitialisation du mot de passe. Veuillez reessayer.'
                    ))
                }
            }
        } catch (err) {
            if (err.message?.includes('expired') || err.message?.includes('invalid')) {
                setError(tr(
                    'Your reset token has expired. Please request a new reset link.',
                    'Votre jeton de reinitialisation a expire. Veuillez demander un nouveau lien.'
                ))
            } else {
                setError(err.message || tr('An error occurred. Please try again.', 'Une erreur est survenue. Veuillez reessayer.'))
            }
        } finally {
            setIsLoading(false)
        }
    }

    // Password strength calculation
    const getPasswordStrength = () => {
        if (!password) return { strength: 0, label: '', color: '' }

        let strength = 0
        if (password.length >= 8) strength += 25
        if (/[A-Z]/.test(password)) strength += 25
        if (/[0-9]/.test(password)) strength += 25
        if (/[^A-Za-z0-9]/.test(password)) strength += 25

        if (strength <= 25) return { strength, label: tr('Weak', 'Faible'), color: '#ef4444' }
        if (strength <= 50) return { strength, label: tr('Fair', 'Moyen'), color: '#f59e0b' }
        if (strength <= 75) return { strength, label: tr('Good', 'Bon'), color: '#3b82f6' }
        return { strength, label: tr('Strong', 'Fort'), color: '#10b981' }
    }

    const passwordStrength = getPasswordStrength()

    // Success state
    if (isSuccess) {
        return (
            <div className="auth-page">
                <div className="auth-container login-container">
                    <div className="auth-visual">
                        <div className="visual-content">
                            <div className="visual-icon">
                                <CheckCircle size={64} />
                            </div>
                            <h2>{tr('Password Updated!', 'Mot de passe mis a jour !')}</h2>
                            <p>{tr('Your password has been changed successfully', 'Votre mot de passe a ete modifie avec succes')}</p>
                        </div>
                    </div>

                    <div className="auth-form-container">
                        <div className="auth-header">
                            <h1>{tr('Success!', 'Succes !')}</h1>
                            <p>{tr('Your password has been updated', 'Votre mot de passe a ete mis a jour')}</p>
                        </div>

                        <div className="verification-notice" style={{ marginTop: '2rem' }}>
                            <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '1rem' }} />
                            <h3>{tr('Password Changed Successfully', 'Mot de passe modifie avec succes')}</h3>
                            <p>
                                {tr(
                                    'Your password is updated. Choose your sign-in portal below.',
                                    'Votre mot de passe est mis a jour. Choisissez votre portail de connexion.'
                                )}
                            </p>
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                onClick={() => navigate(STUDENT_LOGIN_PATH)}
                                className="btn btn-primary btn-lg w-full"
                            >
                                {tr('Go to Student Sign In', "Aller a la connexion etudiant")}
                            </button>
                            <button
                                onClick={() => navigate(COMPANY_LOGIN_PATH)}
                                className="btn btn-secondary btn-lg w-full"
                            >
                                {tr('Go to Company Sign In', "Aller a la connexion entreprise")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-page">
            <div className="auth-container login-container">
                <div className="auth-visual">
                    <div className="visual-content">
                        <div className="visual-icon">
                            <KeyRound size={64} />
                        </div>
                        <h2>{tr('Set New Password', 'Definir un nouveau mot de passe')}</h2>
                        <p>{tr('Choose a strong password for your account', 'Choisissez un mot de passe fort pour votre compte')}</p>
                    </div>
                </div>

                <div className="auth-form-container">
                    <div className="auth-header">
                        <h1>{tr('Reset Password', 'Reinitialiser le mot de passe')}</h1>
                        <p>{tr('Enter your new password below', 'Entrez votre nouveau mot de passe ci-dessous')}</p>
                    </div>

                    {error && (
                        <div className="auth-error" style={{ marginBottom: '1rem' }}>
                            {error}
                            {error.includes('expired') && (
                                <button
                                    onClick={() => navigate('/forgot-password')}
                                    className="btn btn-secondary"
                                    style={{ marginTop: '1rem', width: '100%' }}
                                >
                                    {tr('Request New Link', 'Demander un nouveau lien')}
                                </button>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-step">
                            <input
                                type="email"
                                name="username"
                                value={resetEmail || ''}
                                autoComplete="username"
                                readOnly
                                tabIndex={-1}
                                aria-hidden="true"
                                style={{
                                    position: 'absolute',
                                    width: '1px',
                                    height: '1px',
                                    opacity: 0,
                                    pointerEvents: 'none'
                                }}
                            />

                            <div className="input-group">
                                <label className="input-label" htmlFor="reset-password-new">{tr('New Password', 'Nouveau mot de passe')}</label>
                                <div className="input-with-icon">
                                    <Lock size={20} className="input-icon" />
                                    <input
                                        id="reset-password-new"
                                        type={showPassword ? 'text' : 'password'}
                                        name="newPassword"
                                        className="input"
                                        placeholder={tr('Enter new password', 'Entrez un nouveau mot de passe')}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value)
                                            setError('')
                                        }}
                                        disabled={isLoading}
                                        required
                                        autoComplete="new-password"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>

                                {/* Password strength indicator */}
                                {password && (
                                    <div className="password-strength">
                                        <div className="strength-bar">
                                            <div
                                                className="strength-fill"
                                                style={{
                                                    width: `${passwordStrength.strength}%`,
                                                    backgroundColor: passwordStrength.color
                                                }}
                                            />
                                        </div>
                                        <span className="strength-label" style={{ color: passwordStrength.color }}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="input-group">
                                <label className="input-label" htmlFor="reset-password-confirm">{tr('Confirm Password', 'Confirmer le mot de passe')}</label>
                                <div className="input-with-icon">
                                    <Lock size={20} className="input-icon" />
                                    <input
                                        id="reset-password-confirm"
                                        type={showPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        className="input"
                                        placeholder={tr('Confirm new password', 'Confirmez le nouveau mot de passe')}
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value)
                                            setError('')
                                        }}
                                        disabled={isLoading}
                                        required
                                        autoComplete="new-password"
                                    />
                                </div>

                                {/* Match indicator */}
                                {confirmPassword && (
                                    <p style={{
                                        fontSize: '0.875rem',
                                        marginTop: '0.5rem',
                                        color: password === confirmPassword ? '#10b981' : '#ef4444'
                                    }}>
                                        {password === confirmPassword
                                            ? tr('Passwords match', 'Les mots de passe correspondent')
                                            : tr('Passwords do not match', 'Les mots de passe ne correspondent pas')}
                                    </p>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={isLoading || isCheckingToken || !isTokenValid || !password || !confirmPassword || password !== confirmPassword}
                            style={{ marginTop: '1.5rem' }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                                    {tr('Updating...', 'Mise a jour...')}
                                </>
                            ) : (
                                isCheckingToken
                                    ? tr('Validating link...', 'Validation du lien...')
                                    : tr('Update Password', 'Mettre a jour le mot de passe')
                            )}
                        </button>

                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={() => navigate(STUDENT_LOGIN_PATH)}
                                className="btn btn-secondary w-full"
                            >
                                {tr('Go to Student Sign In', "Aller a la connexion etudiant")}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(COMPANY_LOGIN_PATH)}
                                className="btn btn-secondary w-full"
                            >
                                {tr('Go to Company Sign In', "Aller a la connexion entreprise")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ResetPassword
