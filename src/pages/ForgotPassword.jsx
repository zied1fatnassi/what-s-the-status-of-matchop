import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle, Loader2, KeyRound } from 'lucide-react'
import { validateEmail } from '../lib/validation'
import { requestPasswordReset } from '../lib/passwordReset'
import { useBilingualText } from '../lib/useBilingualText'
import '../pages/student/StudentSignup.css'

const STUDENT_LOGIN_PATH = '/student/login'
const COMPANY_LOGIN_PATH = '/company/login'

/**
 * Forgot Password Page
 * 
 * SECURITY: Uses the secure-password-reset Edge Function instead of
 * direct Supabase Auth. This provides:
 * - Rate limiting (3 requests per email per hour)
 * - Single-use tokens with 15-minute expiry
 * - SHA-256 hashed token storage (no plaintext in DB)
 * - User enumeration prevention (always returns success)
 */
function ForgotPassword() {
    const tr = useBilingualText()
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isEmailSent, setIsEmailSent] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        // Validate email
        const emailValidation = validateEmail(email)
        if (!emailValidation.valid) {
            setError(emailValidation.error)
            return
        }

        setIsLoading(true)

        try {
            const result = await requestPasswordReset(email)

            if (result.error) {
                setError(result.error)
                return
            }

            setIsEmailSent(true)
        } catch (err) {
            // Handle rate limiting (429)
            if (err.message?.includes('Too many') || err.message?.includes('rate limit')) {
                setError(tr(
                    'Too many reset attempts. Please wait 15 minutes before trying again.',
                    'Trop de tentatives de reinitialisation. Veuillez attendre 15 minutes.'
                ))
            } else {
                setError(err.message || tr(
                    'Failed to send reset email. Please try again.',
                    "Echec de l'envoi de l'email de reinitialisation. Veuillez reessayer."
                ))
            }
        } finally {
            setIsLoading(false)
        }
    }

    // Success state - email sent
    if (isEmailSent) {
        return (
            <div className="auth-page">
                <div className="auth-container login-container">
                    <div className="auth-visual">
                        <div className="visual-content">
                            <div className="visual-icon">
                                <CheckCircle size={64} />
                            </div>
                            <h2>{tr('Check Your Email', 'Verifiez votre email')}</h2>
                            <p>{tr(
                                "We've sent you a password reset link",
                                'Nous vous avons envoye un lien de reinitialisation.'
                            )}</p>
                        </div>
                    </div>

                    <div className="auth-form-container">
                        <div className="auth-header">
                            <h1>{tr('Email Sent!', 'Email envoye !')}</h1>
                            <p>{tr(
                                'Check your inbox for the password reset link',
                                'Consultez votre boite mail pour le lien de reinitialisation.'
                            )}</p>
                        </div>

                        <div className="verification-notice" style={{ marginTop: '2rem' }}>
                            <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '1rem' }} />
                            <h3>{tr('Password Reset Email Sent', 'Email de reinitialisation envoye')}</h3>
                            <p>
                                {tr(
                                    "We've sent a password reset link to",
                                    'Nous avons envoye un lien de reinitialisation a'
                                )} <strong>{email}</strong>. {tr(
                                    'Click the link in the email to reset your password.',
                                    "Cliquez sur le lien dans l'email pour reinitialiser votre mot de passe."
                                )}
                            </p>
                            <p style={{ marginTop: '1rem', opacity: 0.8 }}>
                                {tr(
                                    "Didn't receive the email? Check your spam folder or try again.",
                                    "Vous n'avez pas recu l'email ? Verifiez les spams ou reessayez."
                                )}
                            </p>
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                onClick={() => {
                                    setIsEmailSent(false)
                                    setEmail('')
                                }}
                                className="btn btn-secondary w-full"
                            >
                                {tr('Try Different Email', 'Essayer un autre email')}
                            </button>
                            <Link to={STUDENT_LOGIN_PATH} className="btn btn-primary w-full">
                                <ArrowLeft size={20} />
                                {tr('Go to Student Sign In', "Aller a la connexion etudiant")}
                            </Link>
                            <Link to={COMPANY_LOGIN_PATH} className="btn btn-secondary w-full">
                                <ArrowLeft size={20} />
                                {tr('Go to Company Sign In', "Aller a la connexion entreprise")}
                            </Link>
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
                        <h2>{tr('Forgot Password?', 'Mot de passe oublie ?')}</h2>
                        <p>{tr(
                            "No worries, we'll help you reset it",
                            'Pas de souci, nous allons vous aider a le reinitialiser.'
                        )}</p>
                    </div>
                </div>

                <div className="auth-form-container">
                    <div className="auth-header">
                        <h1>{tr('Reset Password', 'Reinitialiser le mot de passe')}</h1>
                        <p>{tr(
                            'Enter your email to receive a reset link',
                            'Entrez votre email pour recevoir un lien de reinitialisation.'
                        )}</p>
                    </div>

                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-step">
                            <div className="input-group">
                                <label className="input-label" htmlFor="forgot-password-email">{tr('Email Address', 'Adresse email')}</label>
                                <div className="input-with-icon">
                                    <Mail size={20} className="input-icon" />
                                    <input
                                        id="forgot-password-email"
                                        type="email"
                                        name="email"
                                        className="input"
                                        placeholder={tr('you@example.com', 'vous@exemple.com')}
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value)
                                            setError('')
                                        }}
                                        disabled={isLoading}
                                        required
                                        autoComplete="email"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={isLoading || !email}
                            style={{ marginTop: '1.5rem' }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="spinner" />
                                    {tr('Sending...', 'Envoi...')}
                                </>
                            ) : (
                                tr('Send Reset Link', 'Envoyer le lien de reinitialisation')
                            )}
                        </button>

                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <Link
                                to={STUDENT_LOGIN_PATH}
                                className="btn btn-secondary w-full"
                            >
                                <ArrowLeft size={20} />
                                {tr('Go to Student Sign In', "Aller a la connexion etudiant")}
                            </Link>
                            <Link
                                to={COMPANY_LOGIN_PATH}
                                className="btn btn-secondary w-full"
                            >
                                <ArrowLeft size={20} />
                                {tr('Go to Company Sign In', "Aller a la connexion entreprise")}
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ForgotPassword
