import { Link } from 'react-router-dom'
import { MessageCircle, GraduationCap, Loader, AlertCircle, RefreshCw, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMatches } from '../../hooks/useMatches'
import '../student/StudentMatches.css'

/**
 * Company Matches Page
 * Shows real matches from Supabase, not mock data
 */
function CompanyMatches() {
    const { t, i18n } = useTranslation()
    const { matches, loading, error, refresh } = useMatches()

    // Loading state
    if (loading) {
        return (
            <div className="matches-page">
                <div className="container">
                    <div className="matches-header">
                        <h1>{t('matches.yourMatches')}</h1>
                        <p>{t('matches.companiesSubtitle')}</p>
                    </div>
                    <div className="matches-loading">
                        <Loader className="animate-spin" size={48} />
                        <p>{t('matches.loading')}</p>
                    </div>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="matches-page">
                <div className="container">
                    <div className="matches-header">
                        <h1>{t('matches.yourMatches')}</h1>
                        <p>{t('matches.companiesSubtitle')}</p>
                    </div>
                    <div className="matches-error glass-card">
                        <AlertCircle size={48} className="text-red-500" />
                        <h3>{t('matches.loadError')}</h3>
                        <p>{error}</p>
                        <button className="btn btn-primary" onClick={() => refresh()}>
                            <RefreshCw size={18} />
                            {t('common.retry')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="matches-page">
            <div className="container">
                <div className="matches-header">
                    <h1>{t('matches.yourMatches')}</h1>
                    <p>{t('matches.companiesSubtitle')}</p>
                </div>

                {matches.length > 0 ? (
                    <div className="matches-list">
                        {matches.map(match => {
<<<<<<< HEAD
                            // Extract student info from the joined data
                            const studentProfile = match.student_profiles
                            const profile = studentProfile?.profiles
                            const studentName = profile?.name || t('matches.unknownCandidate')
                            const studentBio = studentProfile?.bio || t('matches.studentFallback')
                            const studentSkills = studentProfile?.skills || []
                            const avatarUrl = profile?.avatar_url
=======
                            // Extract student info from joined data (supports legacy + new payload shapes)
                            const student = match.students || match.student_profiles
                            const studentProfile = match.student_profile || match.profiles || match.student_profiles?.profiles
                            const studentName = student?.display_name || studentProfile?.name || 'Unknown Candidate'
                            const studentBio = studentProfile?.bio || student?.bio || 'Student'
                            const studentSkills = Array.isArray(student?.skills) ? student.skills : []
                            const avatarUrl = studentProfile?.avatar_url
                            const isPremiumActive = Boolean(match?.candidate?.is_premium_active)
>>>>>>> 733b7574e39c1223b797609846a289dc896d6eb2
                            const matchedAt = match.matched_at
                                ? new Date(match.matched_at).toLocaleDateString(i18n.language)
                                : t('matches.recently')

                            return (
                                <Link
                                    to={`/company/chat/${match.id}`}
                                    key={match.id}
                                    className={`match-card glass-card ${match.unread ? 'unread' : ''}`}
                                >
                                    <div className="match-avatar">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={studentName} />
                                        ) : (
                                            <span>{studentName.charAt(0)}</span>
                                        )}
                                    </div>

                                    <div className="match-info">
                                        <div className="match-header">
                                            <div className="match-heading">
                                                <h3 className="match-company">{studentName}</h3>
                                                {isPremiumActive && (
                                                    <span className="match-premium-badge">Premium</span>
                                                )}
                                            </div>
                                            <span className="match-time">{matchedAt}</span>
                                        </div>

                                        <p className="match-title">{studentBio.substring(0, 50) || t('matches.studentFallback')}</p>

                                        {studentSkills.length > 0 && (
                                            <div className="match-location">
                                                <GraduationCap size={14} />
                                                <span>{studentSkills.slice(0, 3).join(', ')}</span>
                                            </div>
                                        )}

                                        {match.last_message ? (
                                            <p className="match-message">{match.last_message}</p>
                                        ) : (
                                            <p className="match-message no-message">
                                                <MessageCircle size={14} />
                                                {t('matches.startConversation')}
                                            </p>
                                        )}
                                    </div>

                                    {match.unread && <span className="unread-badge" />}
                                </Link>
                            )
                        })}
                    </div>
                ) : (
                    <div className="no-matches glass-card">
                        <div className="empty-icon" aria-hidden="true">
                            <Users size={64} />
                        </div>
                        <h2>{t('matches.noMatchesYet')}</h2>
                        <p>{t('matches.companyEmptyDesc')}</p>
                        <Link to="/company/candidates" className="btn btn-primary">
                            {t('matches.viewCandidates')}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CompanyMatches
