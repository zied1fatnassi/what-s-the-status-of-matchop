import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Building2, ArrowRight, CheckCircle, Globe, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { validatePassword, validateEmail, getPasswordStrengthInfo } from '../../lib/validation'
import PasswordInput from '../../components/forms/PasswordInput'
import '../student/StudentSignup.css'

/**
 * Company Signup Page
 * Secure registration using Supabase Auth with email verification
 */
const AUTH_ERROR_TRANSLATION_MAP = {
    invalid_credentials: 'auth.companySignup.errors.invalidCredentials',
    invalid_login_credentials: 'auth.companySignup.errors.invalidCredentials',
    email_not_confirmed: 'auth.companySignup.errors.emailNotConfirmed',
    user_already_exists: 'auth.companySignup.errors.userAlreadyExists',
    weak_password: 'auth.companySignup.errors.weakPassword',
    over_request_rate_limit: 'auth.companySignup.errors.tooManyAttempts',
    signup_disabled: 'auth.companySignup.errors.signupDisabled',
}

const INDUSTRY_OPTIONS = [
    'technology',
    'finance',
    'healthcare',
    'education',
    'retail',
    'manufacturing',
    'consulting',
    'other',
]

const SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '500+']

const SIZE_OPTION_KEYS = {
    '1-10': 'size1to10',
    '11-50': 'size11to50',
    '51-200': 'size51to200',
    '201-500': 'size201to500',
    '500+': 'size500plus',
}

function CompanySignup() {
    const navigate = useNavigate()
    const { t } = useTranslation()
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

    const getLocalizedPasswordError = (passwordError) => {
        if (!passwordError) return t('auth.companySignup.passwordStrengthHint')

        const normalized = String(passwordError).toLowerCase()

        if (normalized.includes('password is required')) return t('auth.companySignup.errors.passwordRequired')
        if (normalized.includes('at least 8 characters')) return t('auth.companySignup.errors.passwordMinLength')
        if (normalized.includes('uppercase letter')) return t('auth.companySignup.errors.passwordUppercase')
        if (normalized.includes('lowercase letter')) return t('auth.companySignup.errors.passwordLowercase')
        if (normalized.includes('at least one number')) return t('auth.companySignup.errors.passwordNumber')
        if (normalized.includes('special character')) return t('auth.companySignup.errors.passwordSpecial')

        return t('auth.companySignup.passwordStrengthHint')
    }

    const getLocalizedStrengthLabel = (label) => {
        const normalized = String(label || '').toLowerCase()

        if (normalized === 'weak') return t('auth.companySignup.passwordStrengthLabels.weak')
        if (normalized === 'fair') return t('auth.companySignup.passwordStrengthLabels.fair')
        if (normalized === 'good') return t('auth.companySignup.passwordStrengthLabels.good')
        if (normalized === 'strong') return t('auth.companySignup.passwordStrengthLabels.strong')

        return t('auth.companySignup.passwordStrengthHint')
    }

    const getLocalizedAuthError = (authError) => {
        const errorCode = String(authError?.code || authError?.message || '').toLowerCase()
        const matchedEntry = Object.entries(AUTH_ERROR_TRANSLATION_MAP).find(([code]) =>
            errorCode.includes(code)
        )

        if (matchedEntry) return t(matchedEntry[1])

        return t('auth.companySignup.errors.generic')
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

    const validateStep1 = () => {
        const trimmedCompanyName = formData.companyName.trim()
        if (!trimmedCompanyName) {
            setError(t('auth.companySignup.errors.companyNameRequired'))
            return false
        }

        if (trimmedCompanyName.length < 2) {
            setError(t('auth.companySignup.errors.companyNameMinLength'))
            return false
        }

        if (trimmedCompanyName.length > 100) {
            setError(t('auth.companySignup.errors.companyNameMaxLength'))
            return false
        }

        if (!formData.email.trim()) {
            setError(t('auth.companySignup.errors.emailRequired'))
            return false
        }

        const emailValidation = validateEmail(formData.email)
        if (!emailValidation.valid) {
            setError(t('auth.companySignup.errors.invalidEmail'))
            return false
        }

        const passwordValidation = validatePassword(formData.password)
        if (!passwordValidation.valid) {
            setError(getLocalizedPasswordError(passwordValidation.errors[0]))
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
            return
        }

        if (!formData.industry || !formData.size) {
            setError(t('auth.companySignup.errors.completeRequiredFields'))
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
                    size: formData.size,
                }
            )

            if (signUpError) {
                setError(getLocalizedAuthError(signUpError))
                return
            }

            if (needsEmailVerification) {
                setShowEmailVerification(true)
            } else if (data?.user) {
                navigate('/company/profile')
            }
        } catch (err) {
            setError(getLocalizedAuthError(err))
        } finally {
            setIsLoading(false)
        }
    }

    const strengthInfo = getPasswordStrengthInfo(passwordStrength.strength)

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
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-visual" style={{ background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)' }}>
                        <div className="visual-content">
                            <div className="visual-icon animate-float">
                                <Mail size={64} />
                            </div>
                            <h2>{t('auth.companySignup.verification.visualTitle')}</h2>
                            <p>{t('auth.companySignup.verification.visualSubtitle')}</p>
                        </div>
                    </div>

                    <div className="auth-form-container">
                        <div className="email-verification-notice">
                            <div className="verification-icon">
                                <CheckCircle size={48} />
                            </div>
                            <h2>{t('auth.companySignup.verification.title')}</h2>
                            <p>{t('auth.companySignup.verification.sentTo')}</p>
                            <p className="verification-email">{formData.email}</p>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                                <p>{t('auth.companySignup.verification.spamHint')}</p>
                                <p>{t('auth.companySignup.verification.arrivalHint')}</p>
                                <p style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.9 }}>
                                    {t('auth.companySignup.verification.preauthorizedHint')}{' '}
                                    {t('auth.companySignup.verification.setupHintPrefix')}{' '}
                                    <code>database/auto_confirm_emails.sql</code>{' '}
                                    {t('auth.companySignup.verification.setupHintMiddle')}{' '}
                                    <code>docs/EMAIL_SETUP.md</code>.
                                </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                                <Link to="/company/login" className="btn btn-primary" style={{ textAlign: 'center' }}>
                                    {t('auth.companySignup.verification.goToLogin')}
                                </Link>
                                <button
                                    onClick={handleResendEmail}
                                    className="btn btn-secondary"
                                    disabled={resendCooldown > 0 || resendStatus === 'sending'}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    {resendStatus === 'sending' ? (
                                        <><Loader2 size={16} className="spinner" /> {t('auth.companySignup.verification.resendSending')}</>
                                    ) : resendCooldown > 0 ? (
                                        <>{t('auth.companySignup.verification.resendIn', { seconds: resendCooldown })}</>
                                    ) : (
                                        <><RefreshCw size={16} /> {t('auth.companySignup.verification.resendButton')}</>
                                    )}
                                </button>
                                {resendStatus === 'sent' && (
                                    <p style={{ color: 'var(--success)', fontSize: '0.85rem', textAlign: 'center' }}>
                                        {t('auth.companySignup.verification.resendSuccess')}
                                    </p>
                                )}
                                {resendStatus === 'error' && (
                                    <p style={{ color: 'var(--error)', fontSize: '0.85rem', textAlign: 'center' }}>
                                        {t('auth.companySignup.verification.resendError')}
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
                        <h2>{t('auth.companySignup.visualTitle')}</h2>
                        <p>{t('auth.companySignup.visualSubtitle')}</p>

                        <div className="visual-features">
                            <div className="visual-feature">
                                <CheckCircle size={20} />
                                <span>{t('auth.companySignup.features.preQualifiedCandidates')}</span>
                            </div>
                            <div className="visual-feature">
                                <CheckCircle size={20} />
                                <span>{t('auth.companySignup.features.reducedTimeToHire')}</span>
                            </div>
                            <div className="visual-feature">
                                <CheckCircle size={20} />
                                <span>{t('auth.companySignup.features.directMessaging')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="auth-form-container">
                    <div className="auth-header">
                        <h1>{t('auth.companySignup.title')}</h1>
                        <p>
                            {t('auth.companySignup.alreadyRegistered')}{' '}
                            <Link to="/company/login">{t('auth.companySignup.signIn')}</Link>
                        </p>
                    </div>

                    <div className="progress-steps">
                        <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
                            <div className="step-dot">1</div>
                            <span>{t('auth.companySignup.steps.account')}</span>
                        </div>
                        <div className="progress-line"></div>
                        <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
                            <div className="step-dot">2</div>
                            <span>{t('auth.companySignup.steps.company')}</span>
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
                                    <label className="input-label">{t('auth.companySignup.companyNameLabel')}</label>
                                    <div className="input-with-icon">
                                        <Building2 size={20} className="input-icon" />
                                        <input
                                            type="text"
                                            name="companyName"
                                            className="input"
                                            placeholder={t('auth.companySignup.companyNamePlaceholder')}
                                            value={formData.companyName}
                                            onChange={handleChange}
                                            disabled={isLoading}
                                            required
                                            autoComplete="organization"
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">{t('auth.companySignup.workEmailLabel')}</label>
                                    <div className="input-with-icon">
                                        <Mail size={20} className="input-icon" />
                                        <input
                                            type="email"
                                            name="email"
                                            className="input"
                                            placeholder={t('auth.companySignup.workEmailPlaceholder')}
                                            value={formData.email}
                                            onChange={handleChange}
                                            disabled={isLoading}
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">{t('auth.companySignup.passwordLabel')}</label>
                                    <div className="input-with-icon">
                                        <Lock size={20} className="input-icon" />
                                        <PasswordInput
                                            name="password"
                                            placeholder={t('auth.companySignup.passwordPlaceholder')}
                                            value={formData.password}
                                            onChange={handleChange}
                                            disabled={isLoading}
                                            required
                                            autoComplete="new-password"
                                            hasLeadingIcon
                                        />
                                    </div>

                                    {formData.password && (
                                        <div className="password-strength">
                                            <div className="strength-bar">
                                                <div
                                                    className="strength-fill"
                                                    style={{
                                                        width: `${passwordStrength.strength}%`,
                                                        backgroundColor: strengthInfo.color,
                                                    }}
                                                />
                                            </div>
                                            <span className="strength-label" style={{ color: strengthInfo.color }}>
                                                {getLocalizedStrengthLabel(strengthInfo.label)}
                                            </span>
                                        </div>
                                    )}

                                    <p className="password-hint">
                                        {t('auth.companySignup.passwordStrengthHint')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="form-step animate-fade-in">
                                <div className="input-group">
                                    <label className="input-label">{t('auth.companySignup.websiteOptionalLabel')}</label>
                                    <div className="input-with-icon">
                                        <Globe size={20} className="input-icon" />
                                        <input
                                            type="url"
                                            name="website"
                                            className="input"
                                            placeholder={t('auth.companySignup.websitePlaceholder')}
                                            value={formData.website}
                                            onChange={handleChange}
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">{t('auth.companySignup.industryLabel')}</label>
                                    <select
                                        name="industry"
                                        className="input"
                                        value={formData.industry}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        required
                                    >
                                        <option value="">{t('auth.companySignup.industryPlaceholder')}</option>
                                        {INDUSTRY_OPTIONS.map((industry) => (
                                            <option key={industry} value={industry}>
                                                {t(`auth.companySignup.industries.${industry}`)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">{t('auth.companySignup.sizeLabel')}</label>
                                    <select
                                        name="size"
                                        className="input"
                                        value={formData.size}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        required
                                    >
                                        <option value="">{t('auth.companySignup.sizePlaceholder')}</option>
                                        {SIZE_OPTIONS.map((size) => (
                                            <option key={size} value={size}>
                                                {t(`auth.companySignup.companySizes.${SIZE_OPTION_KEYS[size]}`)}
                                            </option>
                                        ))}
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
                                    {t('auth.companySignup.buttons.creatingAccount')}
                                </>
                            ) : (
                                <>
                                    {step < 2 ? t('auth.companySignup.buttons.continue') : t('auth.companySignup.buttons.createAccount')}
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
                                {t('auth.companySignup.buttons.back')}
                            </button>
                        )}
                    </form>

                    <p className="auth-terms">
                        {t('auth.termsAgree')}{' '}
                        <Link to="/legal/terms" target="_blank" rel="noopener noreferrer">{t('auth.termsOfService')}</Link>{' '}
                        {t('auth.and')}{' '}
                        <Link to="/legal/privacy" target="_blank" rel="noopener noreferrer">{t('auth.privacyPolicy')}</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default CompanySignup
