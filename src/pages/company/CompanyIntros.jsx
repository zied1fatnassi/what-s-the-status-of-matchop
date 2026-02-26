import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users, Loader, AlertCircle, RefreshCw, MapPin, Clock3, MessageCircle, Archive, XCircle, Star } from 'lucide-react'
import { useIntros } from '../../hooks/useIntros'
import './CompanyIntros.css'

function CompanyIntros() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { intros, loading, error, stats, acceptIntro, declineIntro, refresh } = useIntros('pending')
    const [processingIds, setProcessingIds] = useState(() => new Set())

    const pendingCount = useMemo(() => stats?.pending ?? intros.length, [stats?.pending, intros.length])

    const startProcessing = (introId) => {
        setProcessingIds((prev) => {
            const next = new Set(prev)
            next.add(introId)
            return next
        })
    }

    const stopProcessing = (introId) => {
        setProcessingIds((prev) => {
            const next = new Set(prev)
            next.delete(introId)
            return next
        })
    }

    const handleMessage = async (intro) => {
        startProcessing(intro.id)
        const { error: actionError } = await acceptIntro(intro.id)
        stopProcessing(intro.id)

        if (!actionError) {
            navigate('/company/matches')
        }
    }

    const handleArchive = async (intro) => {
        startProcessing(intro.id)
        await declineIntro(intro.id)
        stopProcessing(intro.id)
    }

    const handleReject = async (intro) => {
        startProcessing(intro.id)
        await declineIntro(intro.id)
        stopProcessing(intro.id)
    }

    if (loading) {
        return (
            <div className="intros-page">
                <div className="container">
                    <div className="intros-loading">
                        <Loader className="animate-spin" size={44} />
                        <p>{t('companyWorkflow.newCandidates.loading')}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="intros-page">
                <div className="container">
                    <div className="intros-error glass-card">
                        <AlertCircle size={40} />
                        <h2>{t('companyWorkflow.newCandidates.loadError')}</h2>
                        <p>{error}</p>
                        <button className="btn btn-primary" onClick={refresh}>
                            <RefreshCw size={16} />
                            {t('companyWorkflow.newCandidates.actions.refresh')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="intros-page">
            <div className="container">
                <div className="intros-header">
                    <div>
                        <h1>
                            <Users size={26} />
                            {t('companyWorkflow.newCandidates.title')}
                        </h1>
                        <p>{t('companyWorkflow.newCandidates.subtitle')}</p>
                    </div>

                    <div className="intros-header-actions">
                        <span className="pending-pill">{t('companyWorkflow.newCandidates.pendingCount', { count: pendingCount })}</span>
                        <button className="btn btn-secondary btn-sm" onClick={refresh}>
                            <RefreshCw size={16} />
                            {t('companyWorkflow.newCandidates.actions.refresh')}
                        </button>
                    </div>
                </div>

                {intros.length === 0 ? (
                    <div className="no-intros glass-card">
                        <div className="empty-icon" aria-hidden="true">
                            <Users size={62} />
                        </div>
                        <h2>{t('companyWorkflow.newCandidates.emptyTitle')}</h2>
                        <p>{t('companyWorkflow.newCandidates.emptyDescription')}</p>
                        <Link to="/company/post-offer" className="btn btn-primary">
                            {t('companyWorkflow.newCandidates.openOffers')}
                        </Link>
                    </div>
                ) : (
                    <div className="intros-grid">
                        {intros.map((intro) => {
                            const isProcessing = processingIds.has(intro.id)

                            return (
                                <article
                                    key={intro.id}
                                    className={`intro-card glass-card ${isProcessing ? 'processing' : ''}`}
                                >
                                    <div className="intro-top">
                                        <div className="intro-avatar" aria-hidden="true">
                                            {intro.studentAvatar ? (
                                                <img src={intro.studentAvatar} alt="" />
                                            ) : (
                                                <span>{intro.studentName?.charAt(0) || '?'}</span>
                                            )}
                                        </div>
                                        <div className="intro-score" title={t('companyWorkflow.newCandidates.meta.matchScore', { score: intro.matchScore || 0 })}>
                                            <Star size={13} />
                                            <strong>{intro.matchScore || 0}%</strong>
                                        </div>
                                    </div>

                                    <div className="intro-info">
                                        <h3>{intro.studentName || t('companyWorkflow.common.unknownCandidate')}</h3>
                                        <p className="intro-offer">{t('companyWorkflow.newCandidates.meta.forOffer', { offer: intro.offerTitle || t('companyWorkflow.common.unknownOffer') })}</p>
                                        {intro.studentLocation && (
                                            <p className="intro-location">
                                                <MapPin size={14} />
                                                {intro.studentLocation}
                                            </p>
                                        )}
                                        {intro.timeRemaining && intro.timeRemaining !== 'Unknown' && (
                                            <p className="intro-expiry">
                                                <Clock3 size={14} />
                                                {t('companyWorkflow.newCandidates.meta.expiresIn', { time: intro.timeRemaining })}
                                            </p>
                                        )}
                                    </div>

                                    {Array.isArray(intro.studentSkills) && intro.studentSkills.length > 0 && (
                                        <div className="intro-skills" aria-label={t('companyWorkflow.matches.meta.skills')}>
                                            {intro.studentSkills.slice(0, 4).map((skill) => (
                                                <span key={skill} className="skill-badge">{skill}</span>
                                            ))}
                                            {intro.studentSkills.length > 4 && (
                                                <span className="skill-badge more">+{intro.studentSkills.length - 4}</span>
                                            )}
                                        </div>
                                    )}

                                    {intro.studentBio && <p className="intro-bio">{intro.studentBio}</p>}

                                    <div className="intro-actions">
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleMessage(intro)}
                                            disabled={isProcessing}
                                            aria-label={`${t('companyWorkflow.newCandidates.actions.message')} ${intro.studentName}`}
                                        >
                                            <MessageCircle size={16} />
                                            {t('companyWorkflow.newCandidates.actions.message')}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleArchive(intro)}
                                            disabled={isProcessing}
                                            aria-label={`${t('companyWorkflow.newCandidates.actions.archive')} ${intro.studentName}`}
                                        >
                                            <Archive size={16} />
                                            {t('companyWorkflow.newCandidates.actions.archive')}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleReject(intro)}
                                            disabled={isProcessing}
                                            aria-label={`${t('companyWorkflow.newCandidates.actions.reject')} ${intro.studentName}`}
                                        >
                                            <XCircle size={16} />
                                            {t('companyWorkflow.newCandidates.actions.reject')}
                                        </button>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default CompanyIntros
