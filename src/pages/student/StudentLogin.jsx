import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight, GraduationCap, Loader2, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { validateEmail } from '../../lib/validation'
import PasswordInput from '../../components/forms/PasswordInput'
import './StudentSignup.css'
import './StudentAuthLayout.css'

/**
 * Student Login Page
 * Secure authentication using Supabase Auth
 */
const AUTH_ERROR_TRANSLATION_MAP = {
    invalid_credentials: 'auth.studentLogin.errors.invalidCredentials',
    invalid_login_credentials: 'auth.studentLogin.errors.invalidCredentials',
    user_not_found: 'auth.studentLogin.errors.userNotFound',
    email_not_confirmed: 'auth.studentLogin.errors.emailNotConfirmed',
    over_request_rate_limit: 'auth.studentLogin.errors.tooManyAttempts',
}

function StudentLogin() {
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

        return t('auth.studentLogin.errors.generic')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!formData.email.trim()) {
            setError(t('auth.studentLogin.errors.emailRequired'))
            return
        }

        const emailValidation = validateEmail(formData.email)
        if (!emailValidation.valid) {
            setError(t('auth.studentLogin.errors.invalidEmail'))
            return
        }

        if (!formData.password) {
            setError(t('auth.studentLogin.errors.passwordRequired'))
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
                navigate('/student/swipe', { replace: true })
            }
        } catch (err) {
            setError(getLocalizedAuthError(err))
        } finally {
            setIsLoading(false)
        }
    }

    const isSubmitDisabled = isLoading || authLoading || !formData.email || !formData.password

    return (
        <div className="student-auth-page page-shell">
            <div className="student-auth-container glass-card hover-lift">
                <div className="student-auth-header">
                    <div className="student-auth-icon-wrapper">
                        <GraduationCap size={40} className="text-white" />
                    </div>
                    <h1>{t('auth.studentLogin.title')}</h1>
                    <p>{t('auth.studentLogin.subtitle')}</p>
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
                            <label htmlFor="student-login-email">{t('auth.studentLogin.emailLabel')}</label>
                            <div className="student-auth-input-wrapper">
                                <Mail size={20} className="student-auth-input-icon" />
                                <input
                                    id="student-login-email"
                                    type="email"
                                    name="email"
                                    className="input"
                                    placeholder={t('auth.studentLogin.emailPlaceholder')}
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="student-auth-group">
                            <label htmlFor="student-login-password">{t('auth.studentLogin.passwordLabel')}</label>
                            <div className="student-auth-input-wrapper">
                                <Lock size={20} className="student-auth-input-icon" />
                                <PasswordInput
                                    id="student-login-password"
                                    name="password"
                                    placeholder={t('auth.studentLogin.passwordPlaceholder')}
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    required
                                    autoComplete="current-password"
                                    hasLeadingIcon
                                />
                            </div>
                            <div className="student-auth-forgot">
                                <Link to="/forgot-password">{t('auth.studentLogin.forgotPassword')}</Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block mt-4 student-auth-submit"
                            disabled={isSubmitDisabled}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin mr-2" />
                                    {t('auth.studentLogin.submitting')}
                                </>
                            ) : (
                                <>
                                    {t('auth.studentLogin.submit')}
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>

                        <div className="student-auth-footer">
                            <p>
                                {t('auth.studentLogin.noAccount')}{' '}
                                <Link to="/student/signup" className="text-primary font-bold">
                                    {t('auth.studentLogin.signUp')}
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default StudentLogin
