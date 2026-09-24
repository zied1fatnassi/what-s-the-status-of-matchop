import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle, Copy, Loader2, Mail, MessageCircle, Sparkles, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AuthToast from '../../components/AuthToast'
import { useAuth } from '../../context/AuthContext'
import { track } from '../../lib/analytics'
import { addNotification, NOTIFICATION_SCOPE_STUDENT } from '../../lib/notifications'
import { buildReferralInviteLink } from '../../lib/referrals'
import { claimReferralReward, getReferralDashboard } from '../../lib/referralService'
import './Referrals.css'

const REFERRAL_GOAL = 3

function Referrals() {
    const { t } = useTranslation(undefined, { useSuspense: false })
    const { user, fetchProfile } = useAuth()
    const trackedViewed = useRef(false)
    const [toast, setToast] = useState(null)

    const [loading, setLoading] = useState(true)
    const [referralCode, setReferralCode] = useState('')
    const [qualifyingReferrals, setQualifyingReferrals] = useState(0)
    const [pendingReferrals, setPendingReferrals] = useState(0)
    const [isEligible, setIsEligible] = useState(false)
    const [rewardClaimed, setRewardClaimed] = useState(false)
    const [premiumExpiresAt, setPremiumExpiresAt] = useState(null)
    const [isClaiming, setIsClaiming] = useState(false)

    const loadDashboard = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getReferralDashboard()
            if (data.ok) {
                setReferralCode(data.referralCode)
                setQualifyingReferrals(data.qualifyingReferrals)
                setPendingReferrals(data.pendingReferrals)
                setIsEligible(data.isEligible)
                setRewardClaimed(data.isClaimed)
                setPremiumExpiresAt(data.premium?.premiumExpiresAt || null)
            }
        } catch (err) {
            console.error('[Referrals] Failed to load dashboard:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadDashboard()
    }, [loadDashboard, user?.id])

    useEffect(() => {
        if (!referralCode || trackedViewed.current) return
        trackedViewed.current = true
        track('referral_viewed', { code: referralCode })
    }, [referralCode])

    const inviteLink = useMemo(() => {
        return buildReferralInviteLink(referralCode)
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

    const handleClaimReward = async () => {
        if (qualifyingReferrals < REFERRAL_GOAL || rewardClaimed || isClaiming) return
        setIsClaiming(true)
        try {
            const res = await claimReferralReward('invite_3_premium_7d')
            if (res.ok) {
                setRewardClaimed(true)
                setIsEligible(false)
                if (res.premiumExpiresAt) {
                    setPremiumExpiresAt(res.premiumExpiresAt)
                }

                // Refresh AuthContext profile to immediately hydrate is_premium state
                if (user?.id && typeof fetchProfile === 'function') {
                    try {
                        await fetchProfile(user.id, user)
                    } catch (fetchErr) {
                        console.warn('[Referrals] Profile refresh non-fatal error:', fetchErr)
                    }
                }

                addNotification(NOTIFICATION_SCOPE_STUDENT, {
                    title: 'Referral reward claimed',
                    body: '7 days of MatchOp Premium have been activated on your account!',
                    read: false,
                })

                setToast({
                    type: 'success',
                    message: t('referrals.rewardUnlock.claimedToast')
                })
                track('referral_reward_claimed', { rewardDays: res.rewardDays || 7 })
            } else {
                setToast({
                    type: 'error',
                    message: res.message || t('referrals.errors.claimFailed')
                })
            }
        } catch (err) {
            console.error('[Referrals] Error claiming reward:', err)
            setToast({
                type: 'error',
                message: t('referrals.errors.claimFailed')
            })
        } finally {
            setIsClaiming(false)
        }
    }

    const progressPercent = Math.min(100, Math.round((qualifyingReferrals / REFERRAL_GOAL) * 100))
    const progressSteps = [
        { key: 'inviteSent', completed: qualifyingReferrals >= 1 },
        { key: 'signedUp', completed: qualifyingReferrals >= 2 },
        { key: 'verified', completed: qualifyingReferrals >= 3 }
    ]

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
                            {loading ? t('referrals.labels.loadingCode') : (referralCode || t('referrals.labels.loadingCode'))}
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
                            {loading ? t('referrals.labels.loadingLink') : (inviteLink || t('referrals.labels.loadingLink'))}
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
                        <div className="referrals-reward-header">
                            <h2>{t('referrals.rewards.title')}</h2>
                            <Sparkles size={18} className="text-primary" />
                        </div>
                        <p>{t('referrals.rewards.body')}</p>

                        <div className="referrals-progress-row">
                            <span className="referrals-progress-label">
                                {t('referrals.progress.current', { invites: qualifyingReferrals, goal: REFERRAL_GOAL })}
                            </span>
                            <Users size={16} />
                        </div>
                        <div
                            className="referrals-progress-track"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={REFERRAL_GOAL}
                            aria-valuenow={qualifyingReferrals}
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

                        {pendingReferrals > 0 && (
                            <p className="referrals-pending-notice text-sm text-muted mt-2">
                                {t('referrals.labels.pendingInvites', { count: pendingReferrals })}
                            </p>
                        )}

                        {(isEligible || (qualifyingReferrals >= REFERRAL_GOAL && !rewardClaimed)) && (
                            <button
                                type="button"
                                className="btn btn-primary mt-4"
                                data-testid="claim-reward-button"
                                onClick={handleClaimReward}
                                disabled={isClaiming}
                            >
                                {isClaiming ? (
                                    <>
                                        <Loader2 size={16} className="spinner mr-2" />
                                        {t('referrals.rewardUnlock.claiming')}
                                    </>
                                ) : (
                                    t('referrals.rewardUnlock.claimAction')
                                )}
                            </button>
                        )}

                        {rewardClaimed && (
                            <div className="referrals-reward-claimed mt-4" data-testid="reward-claimed-state">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={18} className="text-success" />
                                    <strong>{t('referrals.rewardUnlock.claimedTitle')}</strong>
                                </div>
                                <p>{t('referrals.rewardUnlock.claimedSubtitle')}</p>
                                {premiumExpiresAt && (
                                    <p className="text-xs text-muted mt-1">
                                        {t('referrals.progress.lastUpdated', {
                                            timestamp: new Date(premiumExpiresAt).toLocaleDateString()
                                        })}
                                    </p>
                                )}
                            </div>
                        )}
                    </article>
                </div>
            </div>
        </section>
    )
}

export default Referrals
