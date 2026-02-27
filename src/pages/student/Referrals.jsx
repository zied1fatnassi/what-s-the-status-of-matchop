import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Mail, MessageCircle, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AuthToast from '../../components/AuthToast'
import { useAuth } from '../../context/AuthContext'
import { track } from '../../lib/analytics'
import './Referrals.css'

const REFERRAL_CODE_KEY = 'matchop_referral_code'
const REFERRAL_PROGRESS_KEY = 'matchop_referral_progress'
const REFERRAL_GOAL = 3

const clampInvites = (value) => Math.max(0, Math.min(REFERRAL_GOAL, value))

function buildReferralCode(userId) {
    if (!userId) return ''
    return `MOP-${String(userId).slice(0, 8).toUpperCase()}`
}

function readStoredProgress() {
    try {
        const raw = localStorage.getItem(REFERRAL_PROGRESS_KEY)
        if (!raw) {
            return { invites: 0, lastUpdated: null }
        }

        const parsed = JSON.parse(raw)
        const invites = clampInvites(Number(parsed?.invites) || 0)
        const lastUpdated = typeof parsed?.lastUpdated === 'string' ? parsed.lastUpdated : null
        return { invites, lastUpdated }
    } catch {
        return { invites: 0, lastUpdated: null }
    }
}

function Referrals() {
    const { t } = useTranslation(undefined, { useSuspense: false })
    const { user } = useAuth()
    const trackedViewed = useRef(false)
    const [toast, setToast] = useState(null)
    const [referralCode, setReferralCode] = useState(() => localStorage.getItem(REFERRAL_CODE_KEY) || '')
    const [progress, setProgress] = useState(() => readStoredProgress())

    useEffect(() => {
        if (!user?.id) return
        const nextCode = buildReferralCode(user.id)
        setReferralCode(nextCode)
        localStorage.setItem(REFERRAL_CODE_KEY, nextCode)
    }, [user?.id])

    useEffect(() => {
        if (!referralCode || trackedViewed.current) return
        trackedViewed.current = true
        track('referral_viewed', { code: referralCode })
    }, [referralCode])

    const inviteLink = useMemo(() => {
        if (!referralCode) return ''
        return `${window.location.origin}/student/signup?ref=${encodeURIComponent(referralCode)}`
    }, [referralCode])

    const whatsappHref = useMemo(() => {
        const message = t('referrals.share.whatsappTemplate', { code: referralCode, link: inviteLink })
        return `https://wa.me/?text=${encodeURIComponent(message)}`
    }, [inviteLink, referralCode, t])

    const emailHref = useMemo(() => {
        const subject = t('referrals.share.emailSubject')
        const body = t('referrals.share.emailBody', { code: referralCode, link: inviteLink })
        return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    }, [inviteLink, referralCode, t])

    const handleCopy = async (type) => {
        const text = type === 'code' ? referralCode : inviteLink
        if (!text) return

        try {
            if (!navigator?.clipboard?.writeText) {
                throw new Error('Clipboard API unavailable')
            }
            await navigator.clipboard.writeText(text)
            setToast({
                type: 'success',
                message: type === 'code'
                    ? t('referrals.toast.copyCodeSuccess')
                    : t('referrals.toast.copyLinkSuccess')
            })
            track('referral_copied', { type })
        } catch {
            setToast({
                type: 'error',
                message: t('referrals.toast.copyFailed')
            })
        }
    }

    const updateProgress = (delta) => {
        setProgress((prev) => {
            const invites = clampInvites(prev.invites + delta)
            const next = { invites, lastUpdated: new Date().toISOString() }
            localStorage.setItem(REFERRAL_PROGRESS_KEY, JSON.stringify(next))
            return next
        })
    }

    const progressPercent = Math.round((progress.invites / REFERRAL_GOAL) * 100)
    const progressSteps = [
        { key: 'inviteSent', completed: progress.invites >= 1 },
        { key: 'signedUp', completed: progress.invites >= 2 },
        { key: 'verified', completed: progress.invites >= 3 }
    ]
    const formattedLastUpdated = progress.lastUpdated
        ? new Date(progress.lastUpdated).toLocaleString()
        : t('referrals.progress.neverUpdated')

    return (
        <section className="referrals-page">
            {toast && (
                <AuthToast
                    type={toast.type}
                    message={toast.message}
                    duration={2500}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="referrals-shell glass-card">
                <header className="referrals-header">
                    <h1>{t('referrals.title')}</h1>
                    <p>{t('referrals.subtitle')}</p>
                </header>

                <div className="referrals-grid">
                    <article className="referrals-card">
                        <h2>{t('referrals.labels.referralCode')}</h2>
                        <p className="referrals-mono" data-testid="referral-code-value">
                            {referralCode || t('referrals.labels.loadingCode')}
                        </p>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            data-testid="copy-code-button"
                            onClick={() => handleCopy('code')}
                            disabled={!referralCode}
                        >
                            <Copy size={14} />
                            {t('referrals.actions.copyCode')}
                        </button>
                    </article>

                    <article className="referrals-card">
                        <h2>{t('referrals.labels.inviteLink')}</h2>
                        <p className="referrals-link" data-testid="referral-link-value">
                            {inviteLink || t('referrals.labels.loadingLink')}
                        </p>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            data-testid="copy-link-button"
                            onClick={() => handleCopy('link')}
                            disabled={!inviteLink}
                        >
                            <Copy size={14} />
                            {t('referrals.actions.copyLink')}
                        </button>
                    </article>

                    <article className="referrals-card">
                        <h2>{t('referrals.labels.share')}</h2>
                        <div className="referrals-share-actions">
                            <a
                                href={whatsappHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                onClick={() => track('referral_shared', { channel: 'whatsapp' })}
                            >
                                <MessageCircle size={14} />
                                {t('referrals.actions.shareWhatsApp')}
                            </a>
                            <a
                                href={emailHref}
                                className="btn btn-secondary"
                                onClick={() => track('referral_shared', { channel: 'email' })}
                            >
                                <Mail size={14} />
                                {t('referrals.actions.shareEmail')}
                            </a>
                        </div>
                    </article>

                    <article className="referrals-card referrals-card--reward">
                        <h2>{t('referrals.rewards.title')}</h2>
                        <p>{t('referrals.rewards.body')}</p>
                        <span className="referrals-demo-badge">{t('referrals.progress.demoBadge')}</span>
                        <div className="referrals-progress-row">
                            <span className="referrals-progress-label">
                                {t('referrals.progress.current', { invites: progress.invites, goal: REFERRAL_GOAL })}
                            </span>
                            <Users size={16} />
                        </div>
                        <div
                            className="referrals-progress-track"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={REFERRAL_GOAL}
                            aria-valuenow={progress.invites}
                        >
                            <span className="referrals-progress-fill" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <div className="referrals-steps" aria-label={t('referrals.progress.stepsLabel')}>
                            {progressSteps.map((step) => (
                                <div key={step.key} className={`referrals-step ${step.completed ? 'is-complete' : ''}`}>
                                    <span className="referrals-step-dot" aria-hidden="true" />
                                    <span>{t(`referrals.progress.steps.${step.key}`)}</span>
                                </div>
                            ))}
                        </div>
                        <p className="referrals-progress-hint">{t('referrals.progress.hint')}</p>
                        <p className="referrals-progress-hint">
                            {t('referrals.progress.lastUpdated', { timestamp: formattedLastUpdated })}
                        </p>

                        {import.meta.env.DEV && (
                            <div className="referrals-debug">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => updateProgress(-1)}
                                >
                                    {t('referrals.actions.decreaseInvite')}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => updateProgress(1)}
                                >
                                    {t('referrals.actions.increaseInvite')}
                                </button>
                            </div>
                        )}
                    </article>
                </div>
            </div>
        </section>
    )
}

export default Referrals
