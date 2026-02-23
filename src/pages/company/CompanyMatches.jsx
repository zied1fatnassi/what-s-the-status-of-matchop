import { Link } from 'react-router-dom'
import { MessageCircle, GraduationCap, Loader, AlertCircle, RefreshCw } from 'lucide-react'
import { useMatches } from '../../hooks/useMatches'
import '../student/StudentMatches.css'

/**
 * Company Matches Page
 * Shows real matches from Supabase, not mock data
 */
function CompanyMatches() {
    const { matches, loading, error, refresh } = useMatches()

    // Loading state
    if (loading) {
        return (
            <div className="matches-page">
                <div className="container">
                    <div className="matches-header">
                        <h1>Your Matches</h1>
                        <p>Candidates who matched with your opportunities</p>
                    </div>
                    <div className="matches-loading">
                        <Loader className="animate-spin" size={48} />
                        <p>Loading your matches...</p>
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
                        <h1>Your Matches</h1>
                        <p>Candidates who matched with your opportunities</p>
                    </div>
                    <div className="matches-error glass-card">
                        <AlertCircle size={48} className="text-red-500" />
                        <h3>Failed to load matches</h3>
                        <p>{error}</p>
                        <button className="btn btn-primary" onClick={() => refresh()}>
                            <RefreshCw size={18} />
                            Try Again
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
                    <h1>Your Matches</h1>
                    <p>Candidates who matched with your opportunities</p>
                </div>

                {matches.length > 0 ? (
                    <div className="matches-list">
                        {matches.map(match => {
                            // Extract student info from the joined data
                            const studentProfile = match.student_profiles
                            const profile = studentProfile?.profiles
                            const studentName = profile?.name || 'Unknown Candidate'
                            const studentBio = studentProfile?.bio || 'Student'
                            const studentSkills = studentProfile?.skills || []
                            const avatarUrl = profile?.avatar_url
                            const matchedAt = match.matched_at
                                ? new Date(match.matched_at).toLocaleDateString()
                                : 'Recently'

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
                                            <h3 className="match-company">{studentName}</h3>
                                            <span className="match-time">{matchedAt}</span>
                                        </div>

                                        <p className="match-title">{studentBio.substring(0, 50) || 'Student'}</p>

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
                                                Start the conversation!
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
                        <div className="empty-icon">🤝</div>
                        <h2>No matches yet</h2>
                        <p>When you match with candidates, they'll appear here!</p>
                        <Link to="/company/candidates" className="btn btn-primary">
                            View Candidates
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CompanyMatches
