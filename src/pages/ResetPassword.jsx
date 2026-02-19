import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle, Loader2, KeyRound } from 'lucide-react'
import { validatePassword, getAuthErrorMessage } from '../lib/validation'
import { validateResetToken, executePasswordReset, getResetParamsFromURL } from '../lib/passwordReset'
import '../pages/student/StudentSignup.css'

const STUDENT_LOGIN_PATH = '/student/login'
const COMPANY_LOGIN_PATH = '/company/login'

/**
 * Reset Password Page
 * 
 * SECURITY: Uses single-use tokens validated by the secure-password-reset
 * Edge Function. Token is extracted from URL query params (?token=xxx&email=yyy).
 * 
 * Flow:
 * 1. On mount: extract token + email from URL → validate via Edge Function
 * 2. If valid: show password form with strength meter
 * 3. On submit: consume token + update password via Edge Function
 * 4. Token is single-use — cannot be reused after consumption
 */
function ResetPassword() {
    const navigate = useNavigate()
    const location = useLocation()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [isTokenValid, setIsTokenValid] = useState(false)
    const [isCheckingToken, setIsCheckingToken] = useState(true)
    const [tokenExpiry, setTokenExpiry] = useState(null)
    const [resetToken, setResetToken] = useState(null)
    const [resetEmail, setResetEmail] = useState(null)

    // Validate the reset token from URL on mount
    useEffect(() => {
        let active = true

        const checkToken = async () => {
            try {
                // Extract token and email from URL query params
                const { token, email } = getResetParamsFromURL()

                if (!token || !email) {
                    if (active) {
                        setError('Invalid reset link. Please request a new password reset.')
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
                        setTokenExpiry(result.expiresAt)
                    } else {
                        setError(result.error || 'Your reset link is invalid or has expired. Please request a new one.')
                        setIsTokenValid(false)
                    }
                }
            } catch (err) {
                if (active) {
                    setError('Failed to validate reset link. Please try again or request a new one.')
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
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!isTokenValid || !resetToken || !resetEmail) {
            setError('Your reset link is invalid or has expired. Please request a new one.')
            return
        }

        // Validate password client-side
        const passwordValidation = validatePassword(password)
        if (!passwordValidation.valid) {
            setError(passwordValidation.error)
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setIsLoading(true)

        try {
            // Consume token + update password via Edge Function
            const result = await executePasswordReset(resetToken, resetEmail, password)

            if (result.success) {
                setIsSuccess(true)
            } else {
                setError(result.error || 'Failed to reset password. Please try again.')
            }
        } catch (err) {
            if (err.message?.includes('expired') || err.message?.includes('invalid')) {
                setError('Your reset token has expired. Please request a new reset link.')
            } else {
                setError(err.message || 'An error occurred. Please try again.')
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

        if (strength <= 25) return { strength, label: 'Weak', color: '#ef4444' }
        if (strength <= 50) return { strength, label: 'Fair', color: '#f59e0b' }
        if (strength <= 75) return { strength, label: 'Good', color: '#3b82f6' }
        return { strength, label: 'Strong', color: '#10b981' }
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
                            <h2>Password Updated!</h2>
                            <p>Your password has been changed successfully</p>
                        </div>
                    </div>

                    <div className="auth-form-container">
                        <div className="auth-header">
                            <h1>Success!</h1>
                            <p>Your password has been updated</p>
                        </div>

                        <div className="verification-notice" style={{ marginTop: '2rem' }}>
                            <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '1rem' }} />
                            <h3>Password Changed Successfully</h3>
                            <p>
                                Your password is updated. Choose your sign-in portal below.
                            </p>
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                onClick={() => navigate(STUDENT_LOGIN_PATH)}
                                className="btn btn-primary btn-lg w-full"
                            >
                                Go to Student Sign In
                            </button>
                            <button
                                onClick={() => navigate(COMPANY_LOGIN_PATH)}
                                className="btn btn-secondary btn-lg w-full"
                            >
                                Go to Company Sign In
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
                        <h2>Set New Password</h2>
                        <p>Choose a strong password for your account</p>
                    </div>
                </div>

                <div className="auth-form-container">
                    <div className="auth-header">
                        <h1>Reset Password</h1>
                        <p>Enter your new password below</p>
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
                                    Request New Link
                                </button>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-step">
                            <div className="input-group">
                                <label className="input-label">New Password</label>
                                <div className="input-with-icon">
                                    <Lock size={20} className="input-icon" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="input"
                                        placeholder="Enter new password"
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
                                <label className="input-label">Confirm Password</label>
                                <div className="input-with-icon">
                                    <Lock size={20} className="input-icon" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="input"
                                        placeholder="Confirm new password"
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
                                        {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
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
                                    Updating...
                                </>
                            ) : (
                                isCheckingToken ? 'Validating link...' : 'Update Password'
                            )}
                        </button>

                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={() => navigate(STUDENT_LOGIN_PATH)}
                                className="btn btn-secondary w-full"
                            >
                                Go to Student Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(COMPANY_LOGIN_PATH)}
                                className="btn btn-secondary w-full"
                            >
                                Go to Company Sign In
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ResetPassword
