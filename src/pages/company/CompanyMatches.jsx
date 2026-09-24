import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Loader, AlertCircle, RefreshCw, Users, Archive, XCircle, UserCheck, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMatches } from '../../hooks/useMatches'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { CandidateProfileModal } from '../../features/conversations/CandidateProfileModal'
import { RejectionModal } from '../../components/RejectionModal'
import './CompanyMatches.css'

function CompanyMatches() {
    const { t, i18n } = useTranslation()
    const { user } = useAuth()
    const { matches, loading, error, refresh } = useMatches()
    const [processingIds, setProcessingIds] = useState(() => new Set())
    const [selectedCandidate, setSelectedCandidate] = useState(null)
    const [rejectingMatch, setRejectingMatch] = useState(null)
    const [isRejecting, setIsRejecting] = useState(false)

    // Initial triage matches (not yet accepted and not archived)
    const activeMatches = useMemo(
        () => matches.filter((match) => match.status === 'matched' || match.status === 'pending'),
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

    const handleAccept = async (match) => {
        markProcessing(match.id)
        try {
            // 1. Mark match as accepted
            await supabase
                .from('matches')
                .update({ status: 'accepted' })
                .eq('id', match.id)

            // 2. Ensure intro is created or updated as accepted so it appears in /company/candidates
            if (match.student_id && user?.id) {
                const { data: existingIntro } = await supabase
                    .from('intros')
                    .select('id')
                    .eq('company_id', user.id)
                    .eq('student_id', match.student_id)
                    .maybeSingle()

                if (existingIntro) {
                    await supabase
                        .from('intros')
                        .update({ status: 'accepted' })
                        .eq('id', existingIntro.id)
                } else {
                    await supabase
                        .from('intros')
                        .insert({
                            company_id: user.id,
                            student_id: match.student_id,
                            offer_id: match.offer_id,
                            status: 'accepted'
                        })
                }
            }

            // 3. Refresh matches: candidate moves from Matchs triage to Candidats
            refresh()
        } catch (err) {
            console.error('[CompanyMatches] accept failed:', err)
        } finally {
            unmarkProcessing(match.id)
        }
    }

    const handleConfirmReject = async (rejectionText) => {
        if (!rejectingMatch || !user?.id) return
        setIsRejecting(true)

        try {
            // 1. Send polite rejection message to the candidate in chat
            await supabase
                .from('messages')
                .insert({
                    match_id: rejectingMatch.id,
                    sender_id: user.id,
                    content: rejectionText
                })

            // 2. Update match status to archived
            await supabase
                .from('matches')
                .update({ status: 'archived' })
                .eq('id', rejectingMatch.id)

            // 3. Update intro status to declined if it exists
            if (rejectingMatch.student_id) {
                await supabase
                    .from('intros')
                    .update({ status: 'declined' })
                    .eq('company_id', user.id)
                    .eq('student_id', rejectingMatch.student_id)
            }

            setRejectingMatch(null)
            refresh()
        } catch (err) {
            console.error('[CompanyMatches] reject failed:', err)
        } finally {
            setIsRejecting(false)
        }
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
                    <div className="company-matches-header-actions">
                        <Link to="/company/archived" className="btn btn-secondary btn-sm">
                            <Archive size={16} />
                            {t('nav.archived')}
                        </Link>
                        <button className="btn btn-secondary btn-sm" onClick={refresh}>
                            <RefreshCw size={16} />
                            {t('companyWorkflow.matches.actions.refresh')}
                        </button>
                    </div>
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
                                        </div>
                                    </div>

                                    {/* Action buttons: Voir le profil, Accepter, Rejeter. No Message button before accepting! */}
                                    <div className="company-match-actions">
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setSelectedCandidate({ studentId: match.student_id, offerId: match.offer_id })}
                                            aria-label={`${t('common.viewProfile', 'Voir le profil')} ${studentName}`}
                                        >
                                            <UserCheck size={16} />
                                            <span>{t('common.viewProfile', 'Voir le profil')}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleAccept(match)}
                                            disabled={isProcessing}
                                            aria-label={`Accepter ${studentName}`}
                                        >
                                            <Check size={16} />
                                            <span>{t('common.accept', 'Accepter')}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => setRejectingMatch(match)}
                                            disabled={isProcessing}
                                            aria-label={`${t('companyWorkflow.matches.actions.reject')} ${studentName}`}
                                        >
                                            <XCircle size={16} />
                                            <span>{t('companyWorkflow.matches.actions.reject')}</span>
                                        </button>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Candidate Public Profile & CV Modal */}
            {selectedCandidate && (
                <CandidateProfileModal
                    studentId={selectedCandidate.studentId}
                    offerId={selectedCandidate.offerId}
                    isOpen={Boolean(selectedCandidate)}
                    onClose={() => setSelectedCandidate(null)}
                />
            )}

            {/* Polite Rejection Modal */}
            {rejectingMatch && (
                <RejectionModal
                    isOpen={Boolean(rejectingMatch)}
                    candidateName={rejectingMatch.students?.display_name || 'le candidat'}
                    onClose={() => setRejectingMatch(null)}
                    onConfirm={handleConfirmReject}
                    isSubmitting={isRejecting}
                />
            )}
        </div>
    )
}

export default CompanyMatches
