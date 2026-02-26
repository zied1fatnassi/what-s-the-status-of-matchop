import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Archive, Loader, AlertCircle, RefreshCw, MessageCircle, Clock3 } from 'lucide-react'
import { useCompanyClosedItems } from '../../hooks/useCompanyClosedItems'
import './ViewCandidates.css'

function ViewCandidates() {
    const { t, i18n } = useTranslation()
    const { items, loading, error, refresh } = useCompanyClosedItems()
    const [typeFilter, setTypeFilter] = useState('all')

    const visibleItems = useMemo(() => {
        if (typeFilter === 'all') return items
        return items.filter((item) => item.type === typeFilter)
    }, [items, typeFilter])

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
                        {visibleItems.map((item) => (
                            <article key={item.id} className="archived-card glass-card">
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
                                    {item.matchId ? (
                                        <Link
                                            to={`/company/chat/${item.matchId}`}
                                            className="btn btn-secondary btn-sm"
                                            aria-label={`${t('companyWorkflow.archived.actions.message')} ${item.candidateName}`}
                                        >
                                            <MessageCircle size={16} />
                                            {t('companyWorkflow.archived.actions.message')}
                                        </Link>
                                    ) : (
                                        <button type="button" className="btn btn-secondary btn-sm" disabled>
                                            <MessageCircle size={16} />
                                            {t('companyWorkflow.archived.actions.message')}
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ViewCandidates
