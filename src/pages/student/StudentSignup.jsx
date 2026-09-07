import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight, GraduationCap, Loader2, AlertCircle, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { track } from '../../lib/analytics'
import { validatePassword, validateEmail, validateName, getAuthErrorMessage, TUNISIAN_UNIVERSITIES } from '../../lib/validation'
import PasswordInput from '../../components/forms/PasswordInput'
import AuthToast from '../../components/AuthToast'
import {
    INBOUND_REFERRAL_CODE_KEY,
    INBOUND_REFERRAL_SEEN_AT_KEY,
    MY_REFERRAL_CODE_KEY,
    buildReferralInviteLink,
    isValidReferralCode,
    normalizeReferralCode,
    resolveMyReferralCode,
} from '../../lib/referrals'
import {
    readStorageString,
    removeStorageKeys,
    writeStorageString,
} from '../../lib/localStorageState'
import './StudentSignup.css'
import './StudentAuthLayout.css'

const REFERRAL_BANNER_TTL_MS = 24 * 60 * 60 * 1000
const STUDENT_SIGNUP_PATH = '/student/signup'

/**
 * Student Signup Page
 * Secure registration using Supabase Auth with email verification
 */
function StudentSignup() {
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation()
    const [searchParams] = useSearchParams()
    const { signUp, resendVerificationEmail } = useAuth()
    const trackedReferralRef = useRef(null)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        university: '',
        major: '',
        graduationYear: '',
    })
    const [referralCode, setReferralCode] = useState(() => readStorageString(INBOUND_REFERRAL_CODE_KEY, ''))
    const [showReferralBanner, setShowReferralBanner] = useState(false)
    const [showInviteFollowup, setShowInviteFollowup] = useState(false)
    const [toast, setToast] = useState(null)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showEmailVerification, setShowEmailVerification] = useState(false)
    const [referralAppliedNotice, setReferralAppliedNotice] = useState('')
    const [passwordStrength, setPasswordStrength] = useState({ strength: 0, errors: [] })
    const [resendStatus, setResendStatus] = useState('')
    const [resendCooldown, setResendCooldown] = useState(0)

    const [createdUserCode, setCreatedUserCode] = useState('')

    const inviteLink = useMemo(() => {
        const myCode = createdUserCode || readStorageString(MY_REFERRAL_CODE_KEY, '')
        return buildReferralInviteLink(myCode)
    }, [createdUserCode])

    useEffect(() => {
        if (location.pathname !== STUDENT_SIGNUP_PATH) {
            setShowReferralBanner(false)
            return
        }

        const queryRef = normalizeReferralCode(searchParams.get('ref'))
        if (!isValidReferralCode(queryRef)) return

        const storedInboundCode = normalizeReferralCode(readStorageString(INBOUND_REFERRAL_CODE_KEY, ''))
        const seenAtRaw = readStorageString(INBOUND_REFERRAL_SEEN_AT_KEY, '')
        const seenAtMs = Date.parse(seenAtRaw || '')
        const isSeenTimestampValid = Number.isFinite(seenAtMs)
        const isExpired = isSeenTimestampValid && (Date.now() - seenAtMs) > REFERRAL_BANNER_TTL_MS
        const isSameCode = storedInboundCode === queryRef

        if (!isSameCode || !isSeenTimestampValid) {
            writeStorageString(INBOUND_REFERRAL_CODE_KEY, queryRef)
            writeStorageString(INBOUND_REFERRAL_SEEN_AT_KEY, new Date().toISOString())
            setReferralCode(queryRef)
            setShowReferralBanner(true)
        } else {
            setReferralCode(storedInboundCode || queryRef)
            setShowReferralBanner(false)
        }

        if (isSameCode && isExpired) {
            setShowReferralBanner(false)
        }

        if (trackedReferralRef.current !== queryRef) {
            trackedReferralRef.current = queryRef
            track('referral_signup_attributed', { ref: queryRef })
        }
    }, [location.pathname, searchParams])

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
                    graduationYear: formData.graduationYear,
                    referralCode: referralCode || undefined
                }
            )

            if (signUpError) {
                setError(getAuthErrorMessage(signUpError))
                return
            }

            if (referralCode) {
                setReferralAppliedNotice(t('referrals.signupApplied', { ref: referralCode }))
            }

            removeStorageKeys([INBOUND_REFERRAL_CODE_KEY, INBOUND_REFERRAL_SEEN_AT_KEY])
            setShowReferralBanner(false)
            setReferralCode('')
            setShowInviteFollowup(true)

            if (data?.user?.id) {
                const userCode = resolveMyReferralCode(data.user.id)
                setCreatedUserCode(userCode)
            }

            if (needsEmailVerification) {
                setShowEmailVerification(true)
            } else if (data?.user) {
                navigate('/student/profile', {
                    state: {
                        referralFollowUp: true
                    }
                })
            }
        } catch (err) {
            setError(getAuthErrorMessage(err))
        } finally {
            setIsLoading(false)
        }
    }

    const handleDismissReferralBanner = () => {
        setShowReferralBanner(false)
    }

    const handleCopyInviteLink = async () => {
        try {
            if (!navigator?.clipboard?.writeText) {
                throw new Error('Clipboard API unavailable')
            }
            const activeCode = createdUserCode || readStorageString(MY_REFERRAL_CODE_KEY, '')
            const targetLink = inviteLink || (activeCode ? buildReferralInviteLink(activeCode) : '')
            if (!targetLink) {
                setToast({ type: 'error', message: t('referrals.toast.copyFailed') })
                return
            }
            await navigator.clipboard.writeText(targetLink)
            setToast({ type: 'success', message: t('referrals.toast.copyLinkSuccess') })
        } catch {
            setToast({ type: 'error', message: t('referrals.toast.copyFailed') })
        }
    }

    const [resendCustomError, setResendCustomError] = useState('')

    const handleResendEmail = async () => {
        if (resendCooldown > 0 || resendStatus === 'sending') return
        setResendStatus('sending')
        setResendCustomError('')
        try {
            const { error: resendError } = await resendVerificationEmail(formData.email)
            if (resendError) {
                const isRateLimit = String(resendError.message || resendError.code || '').toLowerCase().includes('rate') || resendError.status === 429
                setResendCustomError(isRateLimit
                    ? t('auth.studentSignup.verification.resendRateLimit')
                    : t('auth.studentSignup.verification.resendError')
                )
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
        } catch (err) {
            const isRateLimit = String(err?.message || '').toLowerCase().includes('rate')
            setResendCustomError(isRateLimit
                ? t('auth.studentSignup.verification.resendRateLimit')
                : t('auth.studentSignup.verification.resendError')
            )
            setResendStatus('error')
        }
    }

    if (showEmailVerification) {
        return (
            <div className="student-auth-page page-shell">
                {toast && (
                    <AuthToast
                        type={toast.type}
                        message={toast.message}
                        duration={2500}
                        onClose={() => setToast(null)}
                    />
                )}
                <div className="student-auth-verify-card glass-card">
                    <div className="student-auth-verify-icon">
                        <Mail size={64} />
                    </div>
                    <h2>{t('auth.studentSignup.verification.title')}</h2>
                    <p className="student-auth-verify-copy">
                        {t('auth.studentSignup.verification.sentPrefix')} <strong>{formData.email}</strong>.{' '}
                        {t('auth.studentSignup.verification.sentSuffix')}
                    </p>
                    {referralAppliedNotice && (
                        <p className="student-signup-referral-applied">
                            {referralAppliedNotice}
                        </p>
                    )}
                    <div className="student-auth-verify-hints">
                        <p>{t('auth.studentSignup.verification.spamHint')}</p>
                        <p>{t('auth.studentSignup.verification.arrivalHint')}</p>
                        <p>
                            {t('auth.studentSignup.verification.preauthorizedHint')}{' '}
                            {t('auth.studentSignup.verification.setupHintPrefix')} <code>database/auto_confirm_emails.sql</code>{' '}
                            {t('auth.studentSignup.verification.setupHintMiddle')} <code>docs/EMAIL_SETUP.md</code>.
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
                            <p className="student-auth-feedback error">{resendCustomError || t('auth.studentSignup.verification.resendError')}</p>
                        )}
                    </div>
                    {showInviteFollowup && (
                        <section className="student-signup-followup-card" aria-label={t('referrals.signupFlow.followupTitle')}>
                            <h3>{t('referrals.signupFlow.followupTitle')}</h3>
                            <p>{t('referrals.signupFlow.followupSubtitle')}</p>
                            <div className="student-signup-followup-actions">
                                <Link to="/student/referrals" className="btn btn-secondary">
                                    {t('referrals.signupFlow.openReferrals')}
                                </Link>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleCopyInviteLink}
                                >
                                    {t('referrals.signupFlow.copyInviteLink')}
                                </button>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="student-auth-page page-shell">
            {toast && (
                <AuthToast
                    type={toast.type}
                    message={toast.message}
                    duration={2500}
                    onClose={() => setToast(null)}
                />
            )}
            <div className="student-auth-container student-auth-container--signup glass-card hover-lift">
                <div className="student-auth-header">
                    <div className="student-auth-icon-wrapper">
                        <GraduationCap size={40} className="text-white" />
                    </div>
                    <h1>{t('auth.studentSignup.title')}</h1>
                    <p>{t('auth.studentSignup.subtitle')}</p>
                </div>

                <div className="student-auth-form-wrapper">
                    {showReferralBanner && referralCode && (
                        <section className="student-signup-referral-card" aria-live="polite">
                            <div className="student-signup-referral-card-header">
                                <div>
                                    <h2>{t('referrals.signupFlow.invitedTitle')}</h2>
                                    <p>{t('referrals.signupFlow.invitedSubtitle')}</p>
                                </div>
                                <button
                                    type="button"
                                    className="student-signup-referral-dismiss"
                                    onClick={handleDismissReferralBanner}
                                    aria-label={t('referrals.signupFlow.dismissAria')}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </section>
                    )}

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
                                        {passwordStrength.errors[0] || t('auth.studentSignup.passwordStrengthPlaceholder')}
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
                            <p>{t('auth.studentSignup.alreadyHaveAccount')} <Link to="/student/login" className="text-primary font-bold">{t('auth.studentSignup.signIn')}</Link></p>
                            <p className="mt-2 text-sm text-muted">
                                {t('auth.termsAgree')} <Link to="/legal/terms" className="text-primary underline">{t('auth.termsOfService')}</Link> {t('auth.and')} <Link to="/legal/privacy" className="text-primary underline">{t('auth.privacyPolicy')}</Link>.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default StudentSignup
