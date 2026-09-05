import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    Users,
    Loader,
    AlertCircle,
    RefreshCw,
    MapPin,
    Clock3,
    MessageCircle,
    Archive,
    XCircle,
    Star,
    FolderArchive,
    UserCheck,
    Check
} from 'lucide-react'
import { useIntros } from '../../hooks/useIntros'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { CandidateProfileModal } from '../../features/conversations/CandidateProfileModal'
import { RejectionModal } from '../../components/RejectionModal'
import './CompanyIntros.css'

function CompanyIntros() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('all')
    const { intros, loading, error, stats, acceptIntro, declineIntro, refresh } = useIntros(activeTab)
    const [processingIds, setProcessingIds] = useState(() => new Set())
    const [actionError, setActionError] = useState('')
    const [selectedCandidate, setSelectedCandidate] = useState(null)
    const [rejectingIntro, setRejectingIntro] = useState(null)
    const [isRejecting, setIsRejecting] = useState(false)
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    const pendingCount = useMemo(() => stats?.pending ?? 0, [stats?.pending])
    const acceptedCount = useMemo(() => stats?.accepted ?? 0, [stats?.accepted])
    const totalActiveCount = useMemo(() => pendingCount + acceptedCount, [pendingCount, acceptedCount])

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

    const findCreatedMatchId = async (intro) => {
        if (!intro?.studentId) return null

        const authResult = await supabase.auth.getUser()
        const companyId = authResult?.data?.user?.id
        if (!companyId) return null

        const retryDelays = [0, 150, 300, 600, 900]
        for (const delayMs of retryDelays) {
            if (delayMs > 0) {
                await wait(delayMs)
            }

            let matchQuery = supabase
                .from('matches')
                .select('id')
                .eq('company_id', companyId)
                .eq('student_id', intro.studentId)
                .order('matched_at', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(1)

            if (intro.offerId) {
                matchQuery = matchQuery.eq('offer_id', intro.offerId)
            }

            const { data, error: matchError } = await matchQuery.maybeSingle()

            if (!matchError && data?.id) {
                return data.id
            }
        }

        return null
    }

    const handleAccept = async (intro) => {
        setActionError('')
        startProcessing(intro.id)
        try {
            const { error: actionErrorMessage } = await acceptIntro(intro.id)
            if (actionErrorMessage) {
                setActionError(actionErrorMessage)
                return
            }
            refresh()
        } catch (err) {
            setActionError(err?.message || t('common.error'))
        } finally {
            stopProcessing(intro.id)
        }
    }

    const handleMessage = async (intro) => {
        setActionError('')
        startProcessing(intro.id)
        try {
            // If intro was still pending, accept it first
            if (intro.status === 'pending') {
                await acceptIntro(intro.id)
            }

            const matchId = await findCreatedMatchId(intro)

            if (matchId) {
                navigate(`/company/chat/${matchId}`)
                return
            }

            navigate('/company/matches')
        } catch (err) {
            setActionError(err?.message || t('common.error'))
        } finally {
            stopProcessing(intro.id)
        }
    }

    const handleArchive = async (intro) => {
        setActionError('')
        startProcessing(intro.id)
        try {
            const result = await declineIntro(intro.id)
            if (result?.error) {
                setActionError(result.error)
            }
        } catch (err) {
            setActionError(err?.message || t('common.error'))
        } finally {
            stopProcessing(intro.id)
        }
    }

    const handleConfirmRejectIntro = async (rejectionText) => {
        if (!rejectingIntro || !user?.id) return
        setIsRejecting(true)
        setActionError('')

        try {
            // 1. Find or create a match record to hold the chat message
            let matchId = await findCreatedMatchId(rejectingIntro)
            if (!matchId) {
                const { data: newMatch } = await supabase
                    .from('matches')
                    .insert({
                        company_id: user.id,
                        student_id: rejectingIntro.studentId,
                        offer_id: rejectingIntro.offerId,
                        status: 'archived',
                        matched_at: new Date().toISOString()
                    })
                    .select('id')
                    .maybeSingle()
                matchId = newMatch?.id
            } else {
                await supabase
                    .from('matches')
                    .update({ status: 'archived' })
                    .eq('id', matchId)
            }

            // 2. Send polite rejection message in messages table
            if (matchId) {
                await supabase
                    .from('messages')
                    .insert({
                        match_id: matchId,
                        sender_id: user.id,
                        content: rejectionText
                    })
            }

            // 3. Update intro status to declined
            await declineIntro(rejectingIntro.id)
            setRejectingIntro(null)
            refresh()
        } catch (err) {
            console.error('[CompanyIntros] rejection error:', err)
            setActionError(err?.message || t('common.error'))
        } finally {
            setIsRejecting(false)
        }
    }

    if (loading && intros.length === 0) {
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

    if (error && intros.length === 0) {
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
                        <button className="btn btn-secondary btn-sm" onClick={refresh} title={t('companyWorkflow.newCandidates.actions.refresh')}>
                            <RefreshCw size={16} />
                            {t('companyWorkflow.newCandidates.actions.refresh')}
                        </button>
                        <Link to="/company/archived" className="btn btn-secondary btn-sm">
                            <FolderArchive size={16} />
                            {t('nav.archived')}
                        </Link>
                    </div>
                </div>

                {/* Filter tabs: Tous, En attente, Acceptes */}
                <div className="intros-tabs" role="tablist" aria-label="Filtrer les candidats">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'all'}
                        className={`intros-tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        <span>Tous les candidats</span>
                        <span className="intros-tab-count">{totalActiveCount}</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'pending'}
                        className={`intros-tab ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        <span>En attente</span>
                        {pendingCount > 0 && <span className="intros-tab-count highlight">{pendingCount}</span>}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'accepted'}
                        className={`intros-tab ${activeTab === 'accepted' ? 'active' : ''}`}
                        onClick={() => setActiveTab('accepted')}
                    >
                        <span>Acceptés</span>
                        <span className="intros-tab-count">{acceptedCount}</span>
                    </button>
                </div>

                {actionError && (
                    <div className="intros-action-error glass-card" role="alert">
                        <AlertCircle size={18} />
                        <span>{actionError}</span>
                    </div>
                )}

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
                            const isAccepted = intro.status === 'accepted'
                            const isPending = intro.status === 'pending'

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

                                    {/* Status Pill */}
                                    {isAccepted && (
                                        <span className="intro-status-pill intro-status-pill--accepted">
                                            <Check size={12} /> {t('common.accepted', 'Accepté')}
                                        </span>
                                    )}
                                    {isPending && (
                                        <span className="intro-status-pill intro-status-pill--pending">
                                            {t('common.pendingDecision', 'En attente')}
                                        </span>
                                    )}
                                    {intro.status === 'declined' && (
                                        <span className="intro-status-pill intro-status-pill--declined">
                                            {t('common.declined', 'Refusé')}
                                        </span>
                                    )}

                                    <div className="intro-info">
                                        <h3>{intro.studentName || t('companyWorkflow.common.unknownCandidate')}</h3>
                                        <p className="intro-offer">{t('companyWorkflow.newCandidates.meta.forOffer', { offer: intro.offerTitle || t('companyWorkflow.common.unknownOffer') })}</p>
                                        {intro.studentLocation && (
                                            <p className="intro-location">
                                                <MapPin size={14} />
                                                {intro.studentLocation}
                                            </p>
                                        )}
                                        {intro.timeRemaining && intro.timeRemaining !== 'Unknown' && isPending && (
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
                                        {/* 1. Voir le profil — Always available */}
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setSelectedCandidate({ studentId: intro.studentId, offerId: intro.offerId })}
                                            disabled={isProcessing}
                                            aria-label={`${t('common.viewProfile', 'Voir le profil')} ${intro.studentName}`}
                                        >
                                            <UserCheck size={16} />
                                            <span>{t('common.viewProfile', 'Voir le profil')}</span>
                                        </button>

                                        {/* 2. When Pending: Accepter and Rejeter. No messaging before accept! */}
                                        {isPending && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleAccept(intro)}
                                                    disabled={isProcessing}
                                                    aria-label={`Accepter ${intro.studentName}`}
                                                >
                                                    <Check size={16} />
                                                    <span>{t('common.accept', 'Accepter')}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => setRejectingIntro(intro)}
                                                    disabled={isProcessing}
                                                    aria-label={`${t('companyWorkflow.newCandidates.actions.reject')} ${intro.studentName}`}
                                                >
                                                    <XCircle size={16} />
                                                    <span>{t('companyWorkflow.newCandidates.actions.reject')}</span>
                                                </button>
                                            </>
                                        )}

                                        {/* 3. When Accepted: Can message the candidate directly */}
                                        {isAccepted && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleMessage(intro)}
                                                    disabled={isProcessing}
                                                    aria-label={`${t('companyWorkflow.newCandidates.actions.message')} ${intro.studentName}`}
                                                >
                                                    <MessageCircle size={16} />
                                                    <span>{t('companyWorkflow.newCandidates.actions.message')}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => handleArchive(intro)}
                                                    disabled={isProcessing}
                                                    aria-label={`${t('companyWorkflow.newCandidates.actions.archive')} ${intro.studentName}`}
                                                >
                                                    <Archive size={16} />
                                                </button>
                                            </>
                                        )}
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
            {rejectingIntro && (
                <RejectionModal
                    isOpen={Boolean(rejectingIntro)}
                    candidateName={rejectingIntro.studentName || 'le candidat'}
                    onClose={() => setRejectingIntro(null)}
                    onConfirm={handleConfirmRejectIntro}
                    isSubmitting={isRejecting}
                />
            )}
        </div>
    )
}

export default CompanyIntros
