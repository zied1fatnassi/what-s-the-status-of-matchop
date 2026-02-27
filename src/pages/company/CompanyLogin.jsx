import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Building2, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { validateEmail } from '../../lib/validation'
import PasswordInput from '../../components/forms/PasswordInput'
import '../student/StudentSignup.css'

/**
 * Company Login Page
 * Secure authentication using Supabase Auth
 */
const AUTH_ERROR_TRANSLATION_MAP = {
    invalid_credentials: 'auth.companyLogin.errors.invalidCredentials',
    invalid_login_credentials: 'auth.companyLogin.errors.invalidCredentials',
    user_not_found: 'auth.companyLogin.errors.userNotFound',
    email_not_confirmed: 'auth.companyLogin.errors.emailNotConfirmed',
    over_request_rate_limit: 'auth.companyLogin.errors.tooManyAttempts',
}

function CompanyLogin() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { signIn, isLoading: authLoading } = useAuth()
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    })
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        setError('')
    }

    const getLocalizedAuthError = (authError) => {
        const errorCode = String(authError?.code || authError?.message || '').toLowerCase()
        const matchedEntry = Object.entries(AUTH_ERROR_TRANSLATION_MAP).find(([code]) =>
            errorCode.includes(code)
        )

        if (matchedEntry) {
            return t(matchedEntry[1])
        }

        return t('auth.companyLogin.errors.generic')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!formData.email.trim()) {
            setError(t('auth.companyLogin.errors.emailRequired'))
            return
        }

        const emailValidation = validateEmail(formData.email)
        if (!emailValidation.valid) {
            setError(t('auth.companyLogin.errors.invalidEmail'))
            return
        }

        if (!formData.password) {
            setError(t('auth.companyLogin.errors.passwordRequired'))
            return
        }

        setIsLoading(true)

        try {
            const { data, error: signInError } = await signIn(formData.email, formData.password)

            if (signInError) {
                setError(getLocalizedAuthError(signInError))
                return
            }

            if (data?.user) {
                const userType = data.user.user_metadata?.type
                if (userType === 'student') {
                    setError(t('auth.companyLogin.errors.studentAccountUseStudentLogin'))
                    return
                }
                navigate('/company/candidates')
            }
        } catch (err) {
            setError(getLocalizedAuthError(err))
        } finally {
            setIsLoading(false)
        }
    }

    const isSubmitDisabled = isLoading || authLoading || !formData.email || !formData.password

    return (
        <div className="auth-page">
            <div className="auth-container login-container">
                <div className="auth-visual" style={{ background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)' }}>
                    <div className="visual-content">
                        <div className="visual-icon animate-float">
                            <Building2 size={64} />
                        </div>
                        <h2>{t('auth.companyLogin.visualTitle')}</h2>
                        <p>{t('auth.companyLogin.visualSubtitle')}</p>
                    </div>
                </div>

                <div className="auth-form-container">
                    <div className="auth-header">
                        <h1>{t('auth.companyLogin.title')}</h1>
                        <p>
                            {t('auth.companyLogin.noAccount')}{' '}
                            <Link to="/company/signup">{t('auth.companyLogin.signUp')}</Link>
                        </p>
                    </div>

                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-step">
                            <div className="input-group">
                                <label className="input-label">{t('auth.companyLogin.emailLabel')}</label>
                                <div className="input-with-icon">
                                    <Mail size={20} className="input-icon" />
                                    <input
                                        type="email"
                                        name="email"
                                        className="input"
                                        placeholder={t('auth.companyLogin.emailPlaceholder')}
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">{t('auth.companyLogin.passwordLabel')}</label>
                                <div className="input-with-icon">
                                    <Lock size={20} className="input-icon" />
                                    <PasswordInput
                                        name="password"
                                        placeholder={t('auth.companyLogin.passwordPlaceholder')}
                                        value={formData.password}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        required
                                        autoComplete="current-password"
                                        hasLeadingIcon
                                    />
                                </div>
                            </div>

                            <div className="forgot-password">
                                <Link to="/forgot-password">{t('auth.companyLogin.forgotPassword')}</Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={isSubmitDisabled}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="spinner" />
                                    {t('auth.companyLogin.submitting')}
                                </>
                            ) : (
                                <>
                                    {t('auth.companyLogin.submit')}
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default CompanyLogin
