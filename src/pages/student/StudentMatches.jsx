import { Link } from 'react-router-dom'
import { MessageCircle, MapPin, Loader, AlertCircle, RefreshCw, Briefcase } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMatches } from '../../hooks/useMatches'
import StudentMatchesTabs from '../../components/student/StudentMatchesTabs'
import './StudentMatches.css'

/**
 * Student Matches Page
 * Shows real matches from Supabase, not mock data
 */
function StudentMatches() {
    const { t, i18n } = useTranslation()
    const { matches, loading, error, refresh } = useMatches()

    // Loading state
    if (loading) {
        return (
            <div className="matches-page">
                <div className="container">
                    <div className="matches-header">
                        <h1>{t('matches.yourMatches')}</h1>
                        <p>{t('matches.studentsSubtitle')}</p>
                        <StudentMatchesTabs />
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
                        <p>{t('matches.studentsSubtitle')}</p>
                        <StudentMatchesTabs />
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
                    <p>{t('matches.studentsSubtitle')}</p>
                    <StudentMatchesTabs />
                </div>

                {matches.length > 0 ? (
                    <div className="matches-list">
                        {matches.map(match => {
                            // Extract company and job info from the joined data (V2.1 schema)
                            const company = match.offers?.companies
                            const offer = match.offers
                            const companyName = company?.company_name || t('matches.unknownCompany')
                            const jobTitle = offer?.title || t('matches.jobOpportunity')
                            const location = offer?.location || t('matches.remote')
                            const matchedAt = match.matched_at
                                ? new Date(match.matched_at).toLocaleDateString(i18n.language)
                                : t('matches.recently')

                            return (
                                <Link
                                    to={`/student/chat/${match.id}`}
                                    key={match.id}
                                    className={`match-card glass-card ${match.unread ? 'unread' : ''}`}
                                >
                                    <div className="match-avatar">
                                        {company?.logo_url ? (
                                            <img src={company.logo_url} alt={companyName} />
                                        ) : (
                                            <span>{companyName.charAt(0)}</span>
                                        )}
                                    </div>

                                    <div className="match-info">
                                        <div className="match-header">
                                            <h3 className="match-company">{companyName}</h3>
                                            <span className="match-time">{matchedAt}</span>
                                        </div>

                                        <p className="match-title">{jobTitle}</p>

                                        <div className="match-location">
                                            <MapPin size={14} />
                                            <span>{location}</span>
                                        </div>

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
                            <Briefcase size={64} />
                        </div>
                        <h2>{t('matches.noMatchesYet')}</h2>
                        <p>{t('matches.keepSwipingTip')}</p>
                        <Link to="/student/swipe" className="btn btn-primary">
                            {t('matches.startSwiping')}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}

export default StudentMatches
