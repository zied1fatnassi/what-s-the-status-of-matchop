import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Building2, ArrowRight, CheckCircle, Globe, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { validatePassword, validateEmail, validateName, getPasswordStrengthInfo, getAuthErrorMessage, validateURL } from '../../lib/validation'
import '../student/StudentSignup.css'

/**
 * Company Signup Page
 * Secure registration using Supabase Auth with email verification
 */
function CompanySignup() {
    const navigate = useNavigate()
    const { signUp, resendVerificationEmail } = useAuth()
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        companyName: '',
        email: '',
        password: '',
        website: '',
        industry: '',
        size: '',
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

        // Update password strength in real-time
        if (name === 'password') {
            const validation = validatePassword(value)
            setPasswordStrength({ strength: validation.strength, errors: validation.errors })
        }
    }

    const validateStep1 = () => {
        // Validate company name
        const nameValidation = validateName(formData.companyName)
        if (!nameValidation.valid) {
            setError(nameValidation.error.replace('Name', 'Company name'))
            return false
        }

        // Validate email
        const emailValidation = validateEmail(formData.email)
        if (!emailValidation.valid) {
            setError(emailValidation.error)
            return false
        }

        // Validate password strength
        const passwordValidation = validatePassword(formData.password)
        if (!passwordValidation.valid) {
            setError(passwordValidation.errors[0])
            return false
        }

        return true
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (step < 2) {
            if (validateStep1()) {
                setStep(step + 1)
            }
        } else {
            // Final submission
            if (!formData.industry || !formData.size) {
                setError('Please complete all required fields')
                return
            }

            setIsLoading(true)

            try {
                const { data, error: signUpError, needsEmailVerification } = await signUp(
                    formData.email,
                    formData.password,
                    'company',
                    {
                        name: formData.companyName,
                        website: formData.website,
                        sector: formData.industry,
                        size: formData.size
                    }
                )

                if (signUpError) {
                    setError(getAuthErrorMessage(signUpError))
                    return
                }

                if (needsEmailVerification) {
                    setShowEmailVerification(true)
                } else if (data?.user) {
                    navigate('/company/profile')
                }
            } catch (err) {
                setError(getAuthErrorMessage(err))
            } finally {
                setIsLoading(false)
            }
        }
    }

    const strengthInfo = getPasswordStrengthInfo(passwordStrength.strength)

    const handleResendEmail = async () => {
        if (resendCooldown > 0 || resendStatus === 'sending') return
        setResendStatus('sending')
        try {
            const { error } = await resendVerificationEmail(formData.email)
            if (error) {
                setResendStatus('error')
            } else {
                setResendStatus('sent')
                setResendCooldown(60)
                const interval = setInterval(() => {
                    setResendCooldown(prev => {
                        if (prev <= 1) { clearInterval(interval); return 0 }
                        return prev - 1
                    })
                }, 1000)
            }
        } catch {
            setResendStatus('error')
        }
    }

    // Email verification success screen
    if (showEmailVerification) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-visual" style={{ background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)' }}>
                        <div className="visual-content">
                            <div className="visual-icon animate-float">
                                <Mail size={64} />
                            </div>
                            <h2>Check Your Email</h2>
                            <p>We've sent a verification link to your inbox</p>
                        </div>
                    </div>

                    <div className="auth-form-container">
                        <div className="email-verification-notice">
                            <div className="verification-icon">
                                <CheckCircle size={48} />
                            </div>
                            <h2>Verify Your Email</h2>
                            <p>We've sent a verification email to:</p>
                            <p className="verification-email">{formData.email}</p>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                                <p>📧 Check your <strong>spam/junk</strong> folder — the email may land there.</p>
                                <p>⏳ It can take up to 2 minutes to arrive.</p>
                                <p style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.9 }}>
                                    Still nothing? Supabase&apos;s default email only works for pre-authorized addresses. 
                                    Run <code>database/auto_confirm_emails.sql</code> in Supabase SQL Editor, or configure Custom SMTP — see <code>docs/EMAIL_SETUP.md</code>.
                                </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                                <Link to="/company/login" className="btn btn-primary" style={{ textAlign: 'center' }}>
                                    Go to Login
                                </Link>
                                <button
                                    onClick={handleResendEmail}
                                    className="btn btn-secondary"
                                    disabled={resendCooldown > 0 || resendStatus === 'sending'}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
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
                                    <p style={{ color: 'var(--success)', fontSize: '0.85rem', textAlign: 'center' }}>
                                        ✓ Verification email resent!
                                    </p>
                                )}
                                {resendStatus === 'error' && (
                                    <p style={{ color: 'var(--error)', fontSize: '0.85rem', textAlign: 'center' }}>
                                        Failed to resend. Please try again later.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-visual" style={{ background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)' }}>
                    <div className="visual-content">
                        <div className="visual-icon animate-float">
                            <Building2 size={64} />
                        </div>
                        <h2>Find Top Talent</h2>
                        <p>Connect with motivated students and graduates ready to make an impact</p>

                        <div className="visual-features">
                            <div className="visual-feature">
                                <CheckCircle size={20} />
                                <span>Pre-qualified candidates</span>
                            </div>
                            <div className="visual-feature">
                                <CheckCircle size={20} />
                                <span>Reduced time-to-hire</span>
                            </div>
                            <div className="visual-feature">
                                <CheckCircle size={20} />
                                <span>Direct messaging</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="auth-form-container">
                    <div className="auth-header">
                        <h1>Company Account</h1>
                        <p>Already registered? <Link to="/company/login">Sign in</Link></p>
                    </div>

                    <div className="progress-steps">
                        <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
                            <div className="step-dot">1</div>
                            <span>Account</span>
                        </div>
                        <div className="progress-line"></div>
                        <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
                            <div className="step-dot">2</div>
                            <span>Company</span>
                        </div>
                    </div>

                    {error && (
                        <div className="auth-error">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        {step === 1 && (
                            <div className="form-step animate-fade-in">
                                <div className="input-group">
                                    <label className="input-label">Company Name</label>
                                    <div className="input-with-icon">
                                        <Building2 size={20} className="input-icon" />
                                        <input
                                            type="text"
                                            name="companyName"
                                            className="input"
                                            placeholder="Sofrecom Tunisia, Vermeg"
                                            value={formData.companyName}
                                            onChange={handleChange}
                                            disabled={isLoading}
                                            required
                                            autoComplete="organization"
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Work Email</label>
                                    <div className="input-with-icon">
                                        <Mail size={20} className="input-icon" />
                                        <input
                                            type="email"
                                            name="email"
                                            className="input"
                                            placeholder="hr@sofrecom.tn"
                                            value={formData.email}
                                            onChange={handleChange}
                                            disabled={isLoading}
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Password</label>
                                    <div className="input-with-icon">
                                        <Lock size={20} className="input-icon" />
                                        <input
                                            type="password"
                                            name="password"
                                            className="input"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleChange}
                                            disabled={isLoading}
                                            required
                                            autoComplete="new-password"
                                        />
                                    </div>

                                    {/* Password strength indicator */}
                                    {formData.password && (
                                        <div className="password-strength">
                                            <div className="strength-bar">
                                                <div
                                                    className="strength-fill"
                                                    style={{
                                                        width: `${passwordStrength.strength}%`,
                                                        backgroundColor: strengthInfo.color
                                                    }}
                                                />
                                            </div>
                                            <span className="strength-label" style={{ color: strengthInfo.color }}>
                                                {strengthInfo.label}
                                            </span>
                                        </div>
                                    )}

                                    <p className="password-hint">
                                        Min. 8 characters with uppercase, lowercase, number, and special character
                                    </p>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="form-step animate-fade-in">
                                <div className="input-group">
                                    <label className="input-label">Website (optional)</label>
                                    <div className="input-with-icon">
                                        <Globe size={20} className="input-icon" />
                                        <input
                                            type="url"
                                            name="website"
                                            className="input"
                                            placeholder="https://sofrecom.tn"
                                            value={formData.website}
                                            onChange={handleChange}
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Industry</label>
                                    <select
                                        name="industry"
                                        className="input"
                                        value={formData.industry}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        required
                                    >
                                        <option value="">Select industry</option>
                                        <option value="technology">Technology</option>
                                        <option value="finance">Finance</option>
                                        <option value="healthcare">Healthcare</option>
                                        <option value="education">Education</option>
                                        <option value="retail">Retail</option>
                                        <option value="manufacturing">Manufacturing</option>
                                        <option value="consulting">Consulting</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Company Size</label>
                                    <select
                                        name="size"
                                        className="input"
                                        value={formData.size}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        required
                                    >
                                        <option value="">Select size</option>
                                        <option value="1-10">1-10 employees</option>
                                        <option value="11-50">11-50 employees</option>
                                        <option value="51-200">51-200 employees</option>
                                        <option value="201-500">201-500 employees</option>
                                        <option value="500+">500+ employees</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="spinner" />
                                    Creating Account...
                                </>
                            ) : (
                                <>
                                    {step < 2 ? 'Continue' : 'Create Account'}
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>

                        {step > 1 && (
                            <button
                                type="button"
                                className="btn btn-secondary w-full"
                                onClick={() => setStep(step - 1)}
                                disabled={isLoading}
                            >
                                Back
                            </button>
                        )}
                    </form>

                    <p className="auth-terms">
                        By signing up, you agree to our <Link to="/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of Service</Link> and <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default CompanySignup
