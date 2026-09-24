import { useMemo, useState } from 'react'
import { Gift, Copy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { buildReferralInviteLink, resolveMyReferralCode } from '../lib/referrals'
import './ReferralsCard.css'

function ReferralsCard({ compact = false, emphasized = false }) {
    const { t } = useTranslation(undefined, { useSuspense: false })
    const { user } = useAuth()
    const [copied, setCopied] = useState(false)

    const referralCode = useMemo(() => resolveMyReferralCode(user?.id), [user?.id])
    const inviteLink = useMemo(() => buildReferralInviteLink(referralCode), [referralCode])

    const handleCopyInviteLink = async () => {
        try {
            if (!navigator?.clipboard?.writeText) {
                throw new Error('Clipboard API unavailable')
            }
            await navigator.clipboard.writeText(inviteLink)
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
        } catch {
            setCopied(false)
        }
    }

    return (
        <section
            className={`profile-referrals-card ${compact ? 'profile-referrals-card-compact' : ''} ${emphasized ? 'profile-referrals-card-emphasized' : ''}`.trim()}
            aria-label={t('studentProfile.referrals.ariaLabel')}
        >
            <div className="profile-referrals-content">
                <div className="profile-referrals-title-row">
                    <Gift size={18} aria-hidden="true" />
                    <h2>{t('studentProfile.referrals.title')}</h2>
                </div>
                <p>{t('studentProfile.referrals.subtitle')}</p>
                <span className="profile-referrals-code">
                    {t('studentProfile.referrals.codeLabel')}: {referralCode}
                </span>
            </div>

            <div className="profile-referrals-actions">
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopyInviteLink}
                >
                    <Copy size={14} aria-hidden="true" />
                    {copied
                        ? t('studentProfile.referrals.copyInviteLinkDone')
                        : t('studentProfile.referrals.copyInviteLink')}
                </button>
                <Link to="/student/referrals" className="btn btn-primary btn-sm">
                    {t('studentProfile.referrals.openReferrals')}
                </Link>
            </div>
        </section>
    )
}

export default ReferralsCard
