import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight, GraduationCap, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { validatePassword, validateEmail, validateName, getAuthErrorMessage, TUNISIAN_UNIVERSITIES } from '../../lib/validation'
import PasswordInput from '../../components/forms/PasswordInput'
import './StudentSignup.css'
import './StudentAuthLayout.css'

/**
 * Student Signup Page
 * Secure registration using Supabase Auth with email verification
 */
function StudentSignup() {
    const navigate = useNavigate()
    const { signUp, resendVerificationEmail } = useAuth()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        university: '',
        major: '',
        graduationYear: '',
    })
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showEmailVerification, setShowEmailVerification] = useState(false)
    const [passwordStrength, setPasswordStrength] = useState({ strength: 0, errors: [] })
    const [resendStatus, setResendStatus] = useState('')
    const [resendCooldown, setResendCooldown] = useState(0)

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })
        setError('')

        if (name === 'password') {
            const validation = validatePassword(value)
            setPasswordStrength({ strength: validation.strength, errors: validation.errors })
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        const nameValidation = validateName(formData.name)
        if (!nameValidation.valid) {
            setError(nameValidation.error)
            return
        }

        const emailValidation = validateEmail(formData.email)
        if (!emailValidation.valid) {
            setError(emailValidation.error)
            return
        }

        const passwordValidation = validatePassword(formData.password)
        if (!passwordValidation.valid) {
            setError(passwordValidation.errors[0])
            return
        }

        if (!formData.university || !formData.major || !formData.graduationYear) {
            setError('Please complete all fields (University, Major, Graduation Year)')
            return
        }

        setIsLoading(true)

        try {
            const { data, error: signUpError, needsEmailVerification } = await signUp(
                formData.email,
                formData.password,
                'student',
                {
                    name: formData.name,
                    university: formData.university,
                    major: formData.major,
                    graduationYear: formData.graduationYear
                }
            )

            if (signUpError) {
                setError(getAuthErrorMessage(signUpError))
                return
            }

            if (needsEmailVerification) {
                setShowEmailVerification(true)
            } else if (data?.user) {
                navigate('/student/profile')
            }
        } catch (err) {
            setError(getAuthErrorMessage(err))
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendEmail = async () => {
        if (resendCooldown > 0 || resendStatus === 'sending') return
        setResendStatus('sending')
        try {
            const { error: resendError } = await resendVerificationEmail(formData.email)
            if (resendError) {
                setResendStatus('error')
            } else {
                setResendStatus('sent')
                setResendCooldown(60)
                const interval = setInterval(() => {
                    setResendCooldown((prev) => {
                        if (prev <= 1) {
                            clearInterval(interval)
                            return 0
                        }
                        return prev - 1
                    })
                }, 1000)
            }
        } catch {
            setResendStatus('error')
        }
    }

    if (showEmailVerification) {
        return (
            <div className="student-auth-page page-shell">
                <div className="student-auth-verify-card glass-card">
                    <div className="student-auth-verify-icon">
                        <Mail size={64} />
                    </div>
                    <h2>Check Your Email</h2>
                    <p className="student-auth-verify-copy">
                        We've sent a verification link to <strong>{formData.email}</strong>.
                        Click the link to activate your account.
                    </p>
                    <div className="student-auth-verify-hints">
                        <p>Check your spam/junk folder, the email may land there.</p>
                        <p>It can take up to 2 minutes to arrive.</p>
                        <p>
                            Still nothing? Supabase default email only works for pre-authorized addresses.
                            Run <code>database/auto_confirm_emails.sql</code> in Supabase SQL Editor,
                            or configure Custom SMTP. See <code>docs/EMAIL_SETUP.md</code>.
                        </p>
                    </div>
                    <div className="student-auth-verify-actions">
                        <Link to="/student/login" className="btn btn-primary student-auth-submit">
                            Go to Login
                        </Link>
                        <button
                            onClick={handleResendEmail}
                            className="btn btn-secondary student-auth-submit"
                            disabled={resendCooldown > 0 || resendStatus === 'sending'}
                        >
                            {resendStatus === 'sending' ? (
                                <><Loader2 size={16} className="spinner" /> Sending...</>
                            ) : resendCooldown > 0 ? (
                                <>Resend in {resendCooldown}s</>
                            ) : (
                                <><RefreshCw size={16} /> Resend Verification Email</>
                            )}
                        </button>
                        {resendStatus === 'sent' && (
                            <p className="student-auth-feedback success">Verification email resent.</p>
                        )}
                        {resendStatus === 'error' && (
                            <p className="student-auth-feedback error">Failed to resend. Please try again later.</p>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="student-auth-page page-shell">
            <div className="student-auth-container student-auth-container--signup glass-card hover-lift">
                <div className="student-auth-header">
                    <div className="student-auth-icon-wrapper">
                        <GraduationCap size={40} className="text-white" />
                    </div>
                    <h1>Join MatchOp</h1>
                    <p>Start your career journey today</p>
                </div>

                <div className="student-auth-form-wrapper">
                    {error && (
                        <div className="auth-error mb-4">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="student-auth-group">
                            <label htmlFor="student-signup-name">Full Name</label>
                            <div className="student-auth-input-wrapper">
                                <User size={20} className="student-auth-input-icon" />
                                <input
                                    id="student-signup-name"
                                    type="text"
                                    name="name"
                                    className="input"
                                    placeholder="e.g. Ahmed Ben Ali"
                                    value={formData.name}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    required
                                    autoComplete="name"
                                />
                            </div>
                        </div>

                        <div className="student-auth-group">
                            <label htmlFor="student-signup-email">Email Address</label>
                            <div className="student-auth-input-wrapper">
                                <Mail size={20} className="student-auth-input-icon" />
                                <input
                                    id="student-signup-email"
                                    type="email"
                                    name="email"
                                    className="input"
                                    placeholder="student@university.tn"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="student-auth-group">
                            <label htmlFor="student-signup-password">Password</label>
                            <div className="student-auth-input-wrapper">
                                <Lock size={20} className="student-auth-input-icon" />
                                <PasswordInput
                                    id="student-signup-password"
                                    name="password"
                                    placeholder="Create a strong password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    required
                                    autoComplete="new-password"
                                    hasLeadingIcon
                                />
                            </div>

                            {formData.password && (
                                <div className="password-strength" style={{ marginTop: '0.5rem' }}>
                                    <div className="strength-bar" style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div
                                            className="strength-fill"
                                            style={{
                                                width: `${passwordStrength.strength}%`,
                                                backgroundColor: passwordStrength.strength < 40 ? '#ef4444' : passwordStrength.strength < 80 ? '#f59e0b' : '#10b981',
                                                height: '100%',
                                                transition: 'width 0.3s ease, background-color 0.3s ease'
                                            }}
                                        />
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        {passwordStrength.errors[0] || 'Password strength'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="student-auth-group">
                            <label htmlFor="student-signup-university">University</label>
                            <div className="student-auth-input-wrapper">
                                <GraduationCap size={20} className="student-auth-input-icon" />
                                <select
                                    id="student-signup-university"
                                    name="university"
                                    className="input"
                                    value={formData.university}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    required
                                >
                                    <option value="">Select University</option>
                                    {TUNISIAN_UNIVERSITIES.map((uni) => (
                                        <option key={uni} value={uni}>{uni}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="student-auth-group">
                            <div className="student-auth-split-fields">
                                <div>
                                    <label htmlFor="student-signup-major">Major</label>
                                    <input
                                        id="student-signup-major"
                                        type="text"
                                        name="major"
                                        className="input"
                                        placeholder="e.g. CS"
                                        value={formData.major}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="student-signup-graduation-year">Graduation Year</label>
                                    <input
                                        id="student-signup-graduation-year"
                                        type="number"
                                        name="graduationYear"
                                        className="input"
                                        placeholder="2026"
                                        value={formData.graduationYear}
                                        onChange={handleChange}
                                        required
                                        min="2020"
                                        max="2030"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block mt-4 student-auth-submit"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin mr-2" />
                                    Creating Account...
                                </>
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>

                        <div className="student-auth-footer">
                            <p>Already have an account? <Link to="/student/login" className="text-primary font-bold">Sign in</Link></p>
                            <p className="mt-2 text-sm text-muted">
                                By signing up, you agree to our <Link to="/legal/terms" className="text-primary underline">Terms</Link> and <Link to="/legal/privacy" className="text-primary underline">Privacy Policy</Link>.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default StudentSignup
