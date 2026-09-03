import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    Archive,
    Loader,
    AlertCircle,
    RefreshCw,
    MessageCircle,
    Clock3,
    UserCheck,
    RotateCcw,
    Trash2,
    X
} from 'lucide-react'
import {
    useCompanyClosedItems,
    addDeletedArchivedId,
    clearDeletedArchivedId
} from '../../hooks/useCompanyClosedItems'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { CandidateProfileModal } from '../../features/conversations/CandidateProfileModal'
import './ViewCandidates.css'

function ViewCandidates() {
    const { t, i18n } = useTranslation()
    const { user } = useAuth()
    const navigate = useNavigate()
    const { items, loading, error, refresh } = useCompanyClosedItems()
    const [typeFilter, setTypeFilter] = useState('all')
    const [selectedStudentId, setSelectedStudentId] = useState(null)
    const [processingIds, setProcessingIds] = useState(() => new Set())
    const [deletingItem, setDeletingItem] = useState(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const visibleItems = useMemo(() => {
        if (typeFilter === 'all') return items
        return items.filter((item) => {
            if (typeFilter === 'match') return item.type === 'match' || Boolean(item.matchId)
            if (typeFilter === 'intro') return item.type === 'intro' || Boolean(item.introId)
            return item.type === typeFilter
        })
    }, [items, typeFilter])

    const markProcessing = (itemId) => {
        setProcessingIds((prev) => {
            const next = new Set(prev)
            next.add(itemId)
            return next
        })
    }

    const unmarkProcessing = (itemId) => {
        setProcessingIds((prev) => {
            const next = new Set(prev)
            next.delete(itemId)
            return next
        })
    }

    const formatDate = (value) => {
        if (!value) return '-'
        return new Date(value).toLocaleString(i18n.language, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusLabel = (status) => {
        if (status === 'declined') return t('companyWorkflow.archived.labels.declined')
        if (status === 'expired') return t('companyWorkflow.archived.labels.expired')
        return t('companyWorkflow.archived.labels.archived')
    }

    const handleRestore = async (item) => {
        if (!user?.id) return
        markProcessing(item.id)

        try {
            // Clear any persistent deletion tracking
            if (item.id) clearDeletedArchivedId(item.id)
            if (item.matchId) clearDeletedArchivedId(item.matchId)
            if (item.introId) clearDeletedArchivedId(item.introId)
            if (item.sourceId) clearDeletedArchivedId(item.sourceId)
            if (item.studentId) {
                clearDeletedArchivedId(item.studentId)
                clearDeletedArchivedId(`${item.studentId}_${item.offerTitle || item.offerId || ''}`)
            }

            // 1. If match: update status to accepted
            if (item.matchId) {
                await supabase
                    .from('matches')
                    .update({ status: 'accepted' })
                    .eq('id', item.matchId)
            }

            // 2. If studentId exists: update or insert intro as accepted
            if (item.studentId) {
                await supabase
                    .from('intros')
                    .update({ status: 'accepted' })
                    .eq('company_id', user.id)
                    .eq('student_id', item.studentId)
            } else if (item.type === 'intro' && item.sourceId) {
                await supabase
                    .from('intros')
                    .update({ status: 'accepted' })
                    .eq('id', item.sourceId)
            }

            // 3. Refresh archives list
            refresh()

            // 4. Optionally navigate to chat if match exists, or to candidates
            if (item.matchId) {
                navigate(`/company/chat/${item.matchId}`)
            } else {
                navigate('/company/candidates')
            }
        } catch (err) {
            console.error('[ViewCandidates] restore candidate failed:', err)
        } finally {
            unmarkProcessing(item.id)
        }
    }

    const handleConfirmDelete = async () => {
        if (!deletingItem || !user?.id) return
        setIsDeleting(true)

        try {
            // 1. Record in persistent exclusion so the candidate disappears forever immediately
            if (deletingItem.id) addDeletedArchivedId(deletingItem.id)
            if (deletingItem.matchId) addDeletedArchivedId(deletingItem.matchId)
            if (deletingItem.introId) addDeletedArchivedId(deletingItem.introId)
            if (deletingItem.sourceId) addDeletedArchivedId(deletingItem.sourceId)
            if (deletingItem.studentId) {
                addDeletedArchivedId(deletingItem.studentId)
                const compositeKey = `${deletingItem.studentId}_${deletingItem.offerTitle || deletingItem.offerId || ''}`
                addDeletedArchivedId(compositeKey)
            }

            // 2. Call RPC to delete from database if available
            try {
                await supabase.rpc('delete_company_archived_candidate', {
                    p_match_id: deletingItem.matchId || null,
                    p_intro_id: deletingItem.introId || deletingItem.sourceId || null,
                    p_student_id: deletingItem.studentId || null
                })
            } catch (rpcErr) {
                console.warn('[ViewCandidates] RPC delete fallback:', rpcErr)
            }

            // 3. Direct table delete fallback
            if (deletingItem.matchId) {
                await supabase
                    .from('messages')
                    .delete()
                    .eq('match_id', deletingItem.matchId)

                await supabase
                    .from('matches')
                    .delete()
                    .eq('id', deletingItem.matchId)
            }

            if (deletingItem.studentId) {
                await supabase
                    .from('intros')
                    .delete()
                    .eq('company_id', user.id)
                    .eq('student_id', deletingItem.studentId)
            }
            if (deletingItem.introId) {
                await supabase
                    .from('intros')
                    .delete()
                    .eq('id', deletingItem.introId)
            }
            if (deletingItem.type === 'intro' && deletingItem.sourceId) {
                await supabase
                    .from('intros')
                    .delete()
                    .eq('id', deletingItem.sourceId)
            }

            setDeletingItem(null)
            refresh()
        } catch (err) {
            console.error('[ViewCandidates] permanent delete failed:', err)
        } finally {
            setIsDeleting(false)
        }
    }

    if (loading) {
        return (
            <div className="archived-page">
                <div className="container">
                    <div className="archived-loading">
                        <Loader className="animate-spin" size={44} />
                        <p>{t('companyWorkflow.archived.loading')}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="archived-page">
                <div className="container">
                    <div className="archived-error glass-card">
                        <AlertCircle size={40} />
                        <h2>{t('companyWorkflow.archived.loadError')}</h2>
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
        <div className="archived-page">
            <div className="container">
                <div className="archived-header">
                    <div>
                        <h1>
                            <Archive size={26} />
                            {t('companyWorkflow.archived.title')}
                        </h1>
                        <p>{t('companyWorkflow.archived.subtitle')}</p>
                    </div>

                    <div className="archived-header-actions">
                        <div className="archived-filters" role="tablist" aria-label={t('companyWorkflow.archived.title')}>
                            {[
                                { key: 'all', label: t('companyWorkflow.archived.filters.all') },
                                { key: 'intro', label: t('companyWorkflow.archived.filters.intro') },
                                { key: 'match', label: t('companyWorkflow.archived.filters.match') }
                            ].map((option) => (
                                <button
                                    key={option.key}
                                    type="button"
                                    className={`archived-filter-btn ${typeFilter === option.key ? 'active' : ''}`}
                                    onClick={() => setTypeFilter(option.key)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>

                        <button className="btn btn-secondary btn-sm" onClick={refresh}>
                            <RefreshCw size={16} />
                            {t('companyWorkflow.matches.actions.refresh')}
                        </button>
                    </div>
                </div>

                {visibleItems.length === 0 ? (
                    <div className="archived-empty glass-card">
                        <div className="empty-icon" aria-hidden="true">
                            <Archive size={62} />
                        </div>
                        <h2>{t('companyWorkflow.archived.emptyTitle')}</h2>
                        <p>{t('companyWorkflow.archived.emptyDescription')}</p>
                        <Link to="/company/intros" className="btn btn-primary">
                            {t('companyWorkflow.matches.reviewCandidates')}
                        </Link>
                    </div>
                ) : (
                    <div className="archived-list">
                        {visibleItems.map((item) => {
                            const isProcessing = processingIds.has(item.id)

                            return (
                                <article key={item.id} className={`archived-card glass-card ${isProcessing ? 'processing' : ''}`}>
                                    <div className="archived-top">
                                        <div className="archived-labels">
                                            <span className={`item-type-badge type-${item.type}`}>
                                                {item.type === 'intro'
                                                    ? t('companyWorkflow.archived.labels.intro')
                                                    : t('companyWorkflow.archived.labels.match')}
                                            </span>
                                            <span className={`item-status-badge status-${item.status}`}>
                                                {getStatusLabel(item.status)}
                                            </span>
                                        </div>
                                        <p className="archived-date">
                                            <Clock3 size={13} />
                                            {t('companyWorkflow.archived.labels.closedOn', { date: formatDate(item.closedAt) })}
                                        </p>
                                    </div>

                                    <h3>{item.candidateName || t('companyWorkflow.common.unknownCandidate')}</h3>
                                    <p className="archived-offer">
                                        {t('companyWorkflow.archived.labels.offer')}: {item.offerTitle || t('companyWorkflow.common.unknownOffer')}
                                    </p>

                                    {Array.isArray(item.candidateSkills) && item.candidateSkills.length > 0 && (
                                        <div className="archived-skills">
                                            {item.candidateSkills.slice(0, 5).map((skill) => (
                                                <span key={skill} className="skill-badge">{skill}</span>
                                            ))}
                                            {item.candidateSkills.length > 5 && (
                                                <span className="skill-badge more">+{item.candidateSkills.length - 5}</span>
                                            )}
                                        </div>
                                    )}

                                    {item.lastMessage && <p className="archived-last-message">{item.lastMessage}</p>}

                                    <div className="archived-actions">
                                        {/* 1. Voir le profil */}
                                        {item.studentId && (
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setSelectedStudentId(item.studentId)}
                                                disabled={isProcessing}
                                                aria-label={`Voir le profil de ${item.candidateName}`}
                                            >
                                                <UserCheck size={16} />
                                                <span>{t('common.viewProfile', 'Voir le profil')}</span>
                                            </button>
                                        )}

                                        {/* 2. Recuperer / Contacter */}
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleRestore(item)}
                                            disabled={isProcessing}
                                            aria-label={`Récupérer ${item.candidateName}`}
                                        >
                                            <RotateCcw size={16} />
                                            <span>{t('common.restore', 'Récupérer / Contacter')}</span>
                                        </button>

                                        {/* 3. Direct Message Link if match exists */}
                                        {item.matchId && (
                                            <Link
                                                to={`/company/chat/${item.matchId}`}
                                                className="btn btn-secondary btn-sm"
                                                aria-label={`${t('companyWorkflow.archived.actions.message')} ${item.candidateName}`}
                                            >
                                                <MessageCircle size={16} />
                                                <span>{t('companyWorkflow.archived.actions.message')}</span>
                                            </Link>
                                        )}

                                        {/* 4. Supprimer definitivement */}
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => setDeletingItem(item)}
                                            disabled={isProcessing}
                                            title="Supprimer définitivement"
                                            aria-label={`Supprimer définitivement ${item.candidateName}`}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Candidate Public Profile Modal */}
            {selectedStudentId && (
                <CandidateProfileModal
                    studentId={selectedStudentId}
                    isOpen={Boolean(selectedStudentId)}
                    onClose={() => setSelectedStudentId(null)}
                />
            )}

            {/* Permanent Delete Confirmation Modal */}
            {deletingItem && (
                <div className="delete-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
                    <div className="delete-modal-backdrop" onClick={!isDeleting ? () => setDeletingItem(null) : undefined} />
                    <div className="delete-modal-card glass-card animate-scale-up">
                        <div className="delete-modal-header">
                            <div className="delete-modal-icon-wrap">
                                <Trash2 size={22} />
                            </div>
                            <div className="delete-modal-title-wrap">
                                <h2 id="delete-dialog-title">Supprimer définitivement</h2>
                                <p className="delete-modal-subtitle">
                                    Candidat : {deletingItem.candidateName || 'le candidat'}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="delete-modal-close"
                                onClick={() => setDeletingItem(null)}
                                disabled={isDeleting}
                                aria-label="Fermer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="delete-modal-body">
                            <p>
                                Êtes-vous sûr de vouloir supprimer définitivement la candidature de <strong>{deletingItem.candidateName}</strong> ?
                            </p>
                            <div className="delete-modal-warning">
                                ⚠️ Cette action est <strong>irréversible</strong>. La candidature, les messages et l'historique associés seront complètement effacés de la base de données.
                            </div>
                        </div>

                        <div className="delete-modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setDeletingItem(null)}
                                disabled={isDeleting}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                            >
                                <Trash2 size={16} />
                                <span>{isDeleting ? 'Suppression...' : 'Supprimer définitivement'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ViewCandidates
