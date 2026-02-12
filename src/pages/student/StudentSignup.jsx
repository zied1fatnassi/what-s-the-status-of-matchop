import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight, GraduationCap, CheckCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { validatePassword, validateEmail, validateName, getPasswordStrengthInfo, getAuthErrorMessage, TUNISIAN_UNIVERSITIES } from '../../lib/validation'
import './StudentSignup.css'

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
    const [resendStatus, setResendStatus] = useState('') // '', 'sending', 'sent', 'error'
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

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        // Validate Name
        const nameValidation = validateName(formData.name)
        if (!nameValidation.valid) {
            setError(nameValidation.error)
            return
        }

        // Validate Email
        const emailValidation = validateEmail(formData.email)
        if (!emailValidation.valid) {
            setError(emailValidation.error)
            return
        }

        // Validate Password
        const passwordValidation = validatePassword(formData.password)
        if (!passwordValidation.valid) {
            setError(passwordValidation.errors[0])
            return
        }

        // Validate Education Fields
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
            <div className="login-page">
                <div className="login-container glass-card" style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', margin: '0 auto', minHeight: 'auto' }}>
                    <div className="animate-float" style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>
                        <Mail size={64} />
                    </div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Check Your Email</h2>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        We've sent a verification link to <strong>{formData.email}</strong>.<br />
                        Click the link to activate your account.
                    </p>
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                        <p>📧 Check your <strong>spam/junk</strong> folder — the email may land there.</p>
                        <p>⏳ It can take up to 2 minutes to arrive.</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '280px' }}>
                        <Link to="/student/login" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                            Go to Login
                        </Link>
                        <button
                            onClick={handleResendEmail}
                            className="btn btn-secondary"
                            disabled={resendCooldown > 0 || resendStatus === 'sending'}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
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
                <style>{`
                    .login-page {
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 2rem;
                    }
                `}</style>
            </div>
        )
    }

    return (
        <div className="login-page">
            <div className="login-container glass-card hover-lift" style={{ maxWidth: '1000px' }}>
                <div className="login-header">
                    <div className="icon-wrapper">
                        <GraduationCap size={40} className="text-white" />
                    </div>
                    <h1>Join MatchOp</h1>
                    <p>Start your career journey today</p>
                </div>

                <div className="login-form-wrapper">
                    {error && (
                        <div className="auth-error mb-4">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label>Full Name</label>
                            <div className="input-wrapper">
                                <User size={20} className="input-icon" />
                                <input
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

                        <div className="form-group">
                            <label>Email Address</label>
                            <div className="input-wrapper">
                                <Mail size={20} className="input-icon" />
                                <input
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

                        <div className="form-group">
                            <label>Password</label>
                            <div className="input-wrapper">
                                <Lock size={20} className="input-icon" />
                                <input
                                    type="password"
                                    name="password"
                                    className="input"
                                    placeholder="Create a strong password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>

                            {/* Password strength indicator */}
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

                        <div className="form-group">
                            <label>University</label>
                            <div className="input-wrapper">
                                <GraduationCap size={20} className="input-icon" />
                                <select
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

                        <div className="form-group">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label>Major</label>
                                    <input
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
                                    <label>Graduation Year</label>
                                    <input
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
                            className="btn btn-primary btn-block mt-4"
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

                        <div className="form-footer">
                            <p>Already have an account? <Link to="/student/login" className="text-primary font-bold">Sign in</Link></p>
                            <p className="mt-2 text-sm text-muted">
                                By signing up, you agree to our <Link to="/legal/terms" className="text-primary underline">Terms</Link> and <Link to="/legal/privacy" className="text-primary underline">Privacy Policy</Link>.
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Reuse Login styles */}
            <style>{`
                .login-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                }
                .login-container {
                    display: grid;
                    grid-template-columns: 1fr 1.5fr;
                    width: 100%;
                    overflow: hidden;
                    min-height: 600px;
                }
                .login-header {
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
                    padding: 3rem;
                    color: white;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                }
                .icon-wrapper {
                    background: rgba(255,255,255,0.2);
                    padding: 1.5rem;
                    border-radius: 50%;
                    margin-bottom: 1.5rem;
                    backdrop-filter: blur(10px);
                }
                .login-header h1 { color: white; margin-bottom: 0.5rem; font-size: 2rem; }
                .login-header p { color: rgba(255,255,255,0.8); }
                
                .login-form-wrapper { padding: 3rem; }
                .form-group { margin-bottom: 1.25rem; }
                .form-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: var(--text-primary);
                }
                .input-wrapper { position: relative; }
                .input-icon {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    pointer-events: none;
                }
                .input-wrapper input, .input-wrapper select { padding-left: 3rem; }
                
                .btn-block { width: 100%; justify-content: center; padding: 1rem; font-size: 1.1rem; }
                .form-footer { margin-top: 2rem; text-align: center; color: var(--text-secondary); }

                @media (max-width: 768px) {
                    .login-container { grid-template-columns: 1fr; }
                    .login-header { padding: 2rem; }
                    .login-form-wrapper { padding: 2rem; }
                }
            `}</style>
        </div>
    )
}

export default StudentSignup
