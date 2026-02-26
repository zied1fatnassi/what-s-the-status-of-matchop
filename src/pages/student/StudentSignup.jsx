import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight, GraduationCap, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { validatePassword, validateEmail, TUNISIAN_UNIVERSITIES } from '../../lib/validation'
import PasswordInput from '../../components/forms/PasswordInput'
import './StudentSignup.css'
import './StudentAuthLayout.css'

/**
 * Student Signup Page
 * Secure registration using Supabase Auth with email verification
 */
const AUTH_ERROR_TRANSLATION_MAP = {
    invalid_credentials: 'auth.studentSignup.errors.invalidCredentials',
    invalid_login_credentials: 'auth.studentSignup.errors.invalidCredentials',
    email_not_confirmed: 'auth.studentSignup.errors.emailNotConfirmed',
    user_already_exists: 'auth.studentSignup.errors.userAlreadyExists',
    weak_password: 'auth.studentSignup.errors.weakPassword',
    over_request_rate_limit: 'auth.studentSignup.errors.tooManyAttempts',
    signup_disabled: 'auth.studentSignup.errors.signupDisabled',
}

function StudentSignup() {
    const navigate = useNavigate()
    const { t } = useTranslation()
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

    const getLocalizedPasswordError = (passwordError) => {
        if (!passwordError) return t('auth.studentSignup.passwordStrengthPlaceholder')

        const normalized = String(passwordError).toLowerCase()

        if (normalized.includes('password is required')) return t('auth.studentSignup.errors.passwordRequired')
        if (normalized.includes('at least 8 characters')) return t('auth.studentSignup.errors.passwordMinLength')
        if (normalized.includes('uppercase letter')) return t('auth.studentSignup.errors.passwordUppercase')
        if (normalized.includes('lowercase letter')) return t('auth.studentSignup.errors.passwordLowercase')
        if (normalized.includes('at least one number')) return t('auth.studentSignup.errors.passwordNumber')
        if (normalized.includes('special character')) return t('auth.studentSignup.errors.passwordSpecial')

        return t('auth.studentSignup.passwordStrengthPlaceholder')
    }

    const getLocalizedAuthError = (authError) => {
        const errorCode = String(authError?.code || authError?.message || '').toLowerCase()
        const matchedEntry = Object.entries(AUTH_ERROR_TRANSLATION_MAP).find(([code]) =>
            errorCode.includes(code)
        )

        if (matchedEntry) return t(matchedEntry[1])

        return t('auth.studentSignup.errors.generic')
    }

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

        const trimmedName = formData.name.trim()
        if (!trimmedName) {
            setError(t('auth.studentSignup.errors.nameRequired'))
            return
        }

        if (trimmedName.length < 2) {
            setError(t('auth.studentSignup.errors.nameMinLength'))
            return
        }

        if (trimmedName.length > 100) {
            setError(t('auth.studentSignup.errors.nameMaxLength'))
            return
        }

        if (!formData.email.trim()) {
            setError(t('auth.studentSignup.errors.emailRequired'))
            return
        }

        const emailValidation = validateEmail(formData.email)
        if (!emailValidation.valid) {
            setError(t('auth.studentSignup.errors.invalidEmail'))
            return
        }

        const passwordValidation = validatePassword(formData.password)
        if (!passwordValidation.valid) {
            setError(getLocalizedPasswordError(passwordValidation.errors[0]))
            return
        }

        if (!formData.university || !formData.major.trim() || !formData.graduationYear) {
            setError(t('auth.studentSignup.errors.completeAllFields'))
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
                setError(getLocalizedAuthError(signUpError))
                return
            }

            if (needsEmailVerification) {
                setShowEmailVerification(true)
            } else if (data?.user) {
                navigate('/student/profile')
            }
        } catch (err) {
            setError(getLocalizedAuthError(err))
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
                    <h2>{t('auth.studentSignup.verification.title')}</h2>
                    <p className="student-auth-verify-copy">
                        {t('auth.studentSignup.verification.sentPrefix')} <strong>{formData.email}</strong>.{' '}
                        {t('auth.studentSignup.verification.sentSuffix')}
                    </p>
                    <div className="student-auth-verify-hints">
                        <p>{t('auth.studentSignup.verification.spamHint')}</p>
                        <p>{t('auth.studentSignup.verification.arrivalHint')}</p>
                        <p>
                            {t('auth.studentSignup.verification.preauthorizedHint')}{' '}
                            {t('auth.studentSignup.verification.setupHintPrefix')}{' '}
                            <code>database/auto_confirm_emails.sql</code>{' '}
                            {t('auth.studentSignup.verification.setupHintMiddle')}{' '}
                            <code>docs/EMAIL_SETUP.md</code>.
                        </p>
                    </div>
                    <div className="student-auth-verify-actions">
                        <Link to="/student/login" className="btn btn-primary student-auth-submit">
                            {t('auth.studentSignup.verification.goToLogin')}
                        </Link>
                        <button
                            onClick={handleResendEmail}
                            className="btn btn-secondary student-auth-submit"
                            disabled={resendCooldown > 0 || resendStatus === 'sending'}
                        >
                            {resendStatus === 'sending' ? (
                                <><Loader2 size={16} className="spinner" /> {t('auth.studentSignup.verification.resendSending')}</>
                            ) : resendCooldown > 0 ? (
                                <>{t('auth.studentSignup.verification.resendIn', { seconds: resendCooldown })}</>
                            ) : (
                                <><RefreshCw size={16} /> {t('auth.studentSignup.verification.resendButton')}</>
                            )}
                        </button>
                        {resendStatus === 'sent' && (
                            <p className="student-auth-feedback success">{t('auth.studentSignup.verification.resendSuccess')}</p>
                        )}
                        {resendStatus === 'error' && (
                            <p className="student-auth-feedback error">{t('auth.studentSignup.verification.resendError')}</p>
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
                    <h1>{t('auth.studentSignup.title')}</h1>
                    <p>{t('auth.studentSignup.subtitle')}</p>
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
                            <label htmlFor="student-signup-name">{t('auth.studentSignup.nameLabel')}</label>
                            <div className="student-auth-input-wrapper">
                                <User size={20} className="student-auth-input-icon" />
                                <input
                                    id="student-signup-name"
                                    type="text"
                                    name="name"
                                    className="input"
                                    placeholder={t('auth.studentSignup.namePlaceholder')}
                                    value={formData.name}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    required
                                    autoComplete="name"
                                />
                            </div>
                        </div>

                        <div className="student-auth-group">
                            <label htmlFor="student-signup-email">{t('auth.studentSignup.emailLabel')}</label>
                            <div className="student-auth-input-wrapper">
                                <Mail size={20} className="student-auth-input-icon" />
                                <input
                                    id="student-signup-email"
                                    type="email"
                                    name="email"
                                    className="input"
                                    placeholder={t('auth.studentSignup.emailPlaceholder')}
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="student-auth-group">
                            <label htmlFor="student-signup-password">{t('auth.studentSignup.passwordLabel')}</label>
                            <div className="student-auth-input-wrapper">
                                <Lock size={20} className="student-auth-input-icon" />
                                <PasswordInput
                                    id="student-signup-password"
                                    name="password"
                                    placeholder={t('auth.studentSignup.passwordPlaceholder')}
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
                                        {getLocalizedPasswordError(passwordStrength.errors[0])}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="student-auth-group">
                            <label htmlFor="student-signup-university">{t('auth.studentSignup.universityLabel')}</label>
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
                                    <option value="">{t('auth.studentSignup.universityPlaceholder')}</option>
                                    {TUNISIAN_UNIVERSITIES.map((uni) => (
                                        <option key={uni} value={uni}>{uni}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="student-auth-group">
                            <div className="student-auth-split-fields">
                                <div>
                                    <label htmlFor="student-signup-major">{t('auth.studentSignup.majorLabel')}</label>
                                    <input
                                        id="student-signup-major"
                                        type="text"
                                        name="major"
                                        className="input"
                                        placeholder={t('auth.studentSignup.majorPlaceholder')}
                                        value={formData.major}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="student-signup-graduation-year">{t('auth.studentSignup.graduationYearLabel')}</label>
                                    <input
                                        id="student-signup-graduation-year"
                                        type="number"
                                        name="graduationYear"
                                        className="input"
                                        placeholder={t('auth.studentSignup.graduationYearPlaceholder')}
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
                                    {t('auth.studentSignup.submitting')}
                                </>
                            ) : (
                                <>
                                    {t('auth.studentSignup.submit')}
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>

                        <div className="student-auth-footer">
                            <p>
                                {t('auth.studentSignup.alreadyHaveAccount')}{' '}
                                <Link to="/student/login" className="text-primary font-bold">{t('auth.studentSignup.signIn')}</Link>
                            </p>
                            <p className="mt-2 text-sm text-muted">
                                {t('auth.termsAgree')}{' '}
                                <Link to="/legal/terms" className="text-primary underline">{t('auth.termsOfService')}</Link>{' '}
                                {t('auth.and')}{' '}
                                <Link to="/legal/privacy" className="text-primary underline">{t('auth.privacyPolicy')}</Link>.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default StudentSignup
