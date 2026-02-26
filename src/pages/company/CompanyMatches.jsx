import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, GraduationCap, Loader, AlertCircle, RefreshCw, Users, Archive, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMatches } from '../../hooks/useMatches'
import './CompanyMatches.css'

function CompanyMatches() {
    const { t, i18n } = useTranslation()
    const { matches, loading, error, refresh, archiveMatch } = useMatches()
    const [processingIds, setProcessingIds] = useState(() => new Set())

    const activeMatches = useMemo(
        () => matches.filter((match) => match.status !== 'archived'),
        [matches]
    )

    const markProcessing = (matchId) => {
        setProcessingIds((prev) => {
            const next = new Set(prev)
            next.add(matchId)
            return next
        })
    }

    const unmarkProcessing = (matchId) => {
        setProcessingIds((prev) => {
            const next = new Set(prev)
            next.delete(matchId)
            return next
        })
    }

    const handleArchive = async (matchId) => {
        markProcessing(matchId)
        await archiveMatch(matchId)
        unmarkProcessing(matchId)
    }

    const handleReject = async (matchId) => {
        markProcessing(matchId)
        await archiveMatch(matchId)
        unmarkProcessing(matchId)
    }

    if (loading) {
        return (
            <div className="company-matches-page">
                <div className="container">
                    <div className="company-matches-loading">
                        <Loader className="animate-spin" size={44} />
                        <p>{t('companyWorkflow.matches.loading')}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="company-matches-page">
                <div className="container">
                    <div className="company-matches-error glass-card">
                        <AlertCircle size={40} />
                        <h2>{t('companyWorkflow.matches.loadError')}</h2>
                        <p>{error}</p>
                        <button className="btn btn-primary" onClick={refresh}>
                            <RefreshCw size={16} />
                            {t('companyWorkflow.matches.actions.refresh')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="company-matches-page">
            <div className="container">
                <div className="company-matches-header">
                    <div>
                        <h1>{t('companyWorkflow.matches.title')}</h1>
                        <p>{t('companyWorkflow.matches.subtitle')}</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={refresh}>
                        <RefreshCw size={16} />
                        {t('companyWorkflow.matches.actions.refresh')}
                    </button>
                </div>

                {activeMatches.length === 0 ? (
                    <div className="company-matches-empty glass-card">
                        <div className="empty-icon" aria-hidden="true">
                            <Users size={64} />
                        </div>
                        <h2>{t('companyWorkflow.matches.emptyTitle')}</h2>
                        <p>{t('companyWorkflow.matches.emptyDescription')}</p>
                        <Link to="/company/intros" className="btn btn-primary">
                            {t('companyWorkflow.matches.reviewCandidates')}
                        </Link>
                    </div>
                ) : (
                    <div className="company-matches-list">
                        {activeMatches.map((match) => {
                            const student = match.students || match.student_profiles
                            const studentProfile = match.student_profile || match.profiles || match.student_profiles?.profiles
                            const studentName = student?.display_name || studentProfile?.name || t('companyWorkflow.common.unknownCandidate')
                            const studentBio = studentProfile?.bio || student?.bio || t('matches.studentFallback')
                            const studentSkills = Array.isArray(student?.skills)
                                ? student.skills
                                : (Array.isArray(match.student_profiles?.skills) ? match.student_profiles.skills : [])
                            const avatarUrl = studentProfile?.avatar_url
                            const matchedAt = match.matched_at
                                ? new Date(match.matched_at).toLocaleDateString(i18n.language)
                                : t('matches.recently')
                            const isProcessing = processingIds.has(match.id)

                            return (
                                <article
                                    key={match.id}
                                    className={`company-match-card glass-card ${isProcessing ? 'processing' : ''}`}
                                >
                                    <div className="company-match-main">
                                        <div className="company-match-avatar" aria-hidden="true">
                                            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{studentName.charAt(0)}</span>}
                                        </div>

                                        <div className="company-match-body">
                                            <div className="company-match-top">
                                                <h3>{studentName}</h3>
                                                <span className="company-match-date">
                                                    {t('companyWorkflow.matches.meta.matchedOn', { date: matchedAt })}
                                                </span>
                                            </div>

                                            <p className="company-match-bio">{studentBio}</p>

                                            {studentSkills.length > 0 && (
                                                <p className="company-match-skills">
                                                    <GraduationCap size={14} />
                                                    <span>{studentSkills.slice(0, 4).join(', ')}</span>
                                                </p>
                                            )}

                                            {match.last_message ? (
                                                <p className="company-match-last-message">{match.last_message}</p>
                                            ) : (
                                                <p className="company-match-last-message muted">
                                                    <MessageCircle size={14} />
                                                    {t('matches.startConversation')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="company-match-actions">
                                        <Link
                                            to={`/company/chat/${match.id}`}
                                            className="btn btn-primary btn-sm"
                                            aria-label={`${t('companyWorkflow.matches.actions.message')} ${studentName}`}
                                        >
                                            <MessageCircle size={16} />
                                            {t('companyWorkflow.matches.actions.message')}
                                        </Link>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleArchive(match.id)}
                                            disabled={isProcessing}
                                            aria-label={`${t('companyWorkflow.matches.actions.archive')} ${studentName}`}
                                        >
                                            <Archive size={16} />
                                            {t('companyWorkflow.matches.actions.archive')}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleReject(match.id)}
                                            disabled={isProcessing}
                                            aria-label={`${t('companyWorkflow.matches.actions.reject')} ${studentName}`}
                                        >
                                            <XCircle size={16} />
                                            {t('companyWorkflow.matches.actions.reject')}
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

export default CompanyMatches
