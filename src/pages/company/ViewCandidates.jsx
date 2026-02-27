import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Archive, Loader, AlertCircle, RefreshCw, MessageCircle, Clock3 } from 'lucide-react'
import { useCompanyClosedItems } from '../../hooks/useCompanyClosedItems'
import {
    MATCH_FAIL_REASON_OPTIONS,
    readMatchFailReasons,
    readMatchStatusOverrides,
    setMatchFailReason,
    setMatchStatusOverride,
    shouldShowArchivedItem,
} from '../../lib/companyMatchIntelligence'
import './ViewCandidates.css'

function ViewCandidates() {
    const { t, i18n } = useTranslation()
    const { items, loading, error, refresh } = useCompanyClosedItems()
    const [typeFilter, setTypeFilter] = useState('all')
    const [reasonFilter, setReasonFilter] = useState('all')
    const [failReasons, setFailReasons] = useState(() => readMatchFailReasons())
    const [statusOverrides, setStatusOverrides] = useState(() => readMatchStatusOverrides())

    const visibleItems = useMemo(() => {
        const byType = typeFilter === 'all'
            ? items
            : items.filter((item) => item.type === typeFilter)
        return byType.filter((item) => shouldShowArchivedItem(item, reasonFilter, failReasons, statusOverrides))
    }, [items, typeFilter, reasonFilter, failReasons, statusOverrides])

    const reasonOptions = useMemo(
        () => MATCH_FAIL_REASON_OPTIONS.map((option) => ({
            ...option,
            label: t(option.labelKey),
        })),
        [t]
    )

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

    const getFailReasonLabel = (reasonKey) => {
        const option = reasonOptions.find((entry) => entry.key === reasonKey)
        return option?.label || t('companyWorkflow.archived.reasonFilter.all')
    }

    const handleReasonChange = (matchId, nextReason) => {
        if (!matchId) return
        setMatchFailReason(matchId, nextReason)
        setFailReasons((prev) => {
            const next = { ...prev }
            if (!nextReason || nextReason === 'all') {
                delete next[String(matchId)]
            } else {
                next[String(matchId)] = nextReason
            }
            return next
        })
    }

    const handleReconsider = (matchId) => {
        if (!matchId) return
        setMatchStatusOverride(matchId, 'active')
        setStatusOverrides((prev) => ({
            ...prev,
            [String(matchId)]: 'active',
        }))
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
                        <label className="archived-reason-filter">
                            <span>{t('companyWorkflow.archived.reasonFilter.label')}</span>
                            <select
                                value={reasonFilter}
                                onChange={(event) => setReasonFilter(event.target.value)}
                                aria-label={t('companyWorkflow.archived.reasonFilter.ariaLabel')}
                            >
                                <option value="all">{t('companyWorkflow.archived.reasonFilter.all')}</option>
                                {reasonOptions.map((option) => (
                                    <option key={option.key} value={option.key}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button className="btn btn-secondary btn-sm" onClick={refresh}>
                            <RefreshCw size={16} />
                            {t('companyWorkflow.matches.actions.refresh')}
                        </button>
                    </div>
                </div>
                <p className="archived-preview-note">{t('companyWorkflow.archived.previewNote')}</p>

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

                                {item.type === 'match' && item.matchId && (
                                    <div className="archived-reason-controls">
                                        <label htmlFor={`fail-reason-${item.matchId}`}>
                                            {t('companyWorkflow.archived.reasonPrompt')}
                                        </label>
                                        <select
                                            id={`fail-reason-${item.matchId}`}
                                            value={failReasons[String(item.matchId)] || 'all'}
                                            onChange={(event) => handleReasonChange(item.matchId, event.target.value)}
                                        >
                                            <option value="all">{t('companyWorkflow.archived.reasonFilter.all')}</option>
                                            {reasonOptions.map((option) => (
                                                <option key={option.key} value={option.key}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        {failReasons[String(item.matchId)] && (
                                            <span className="archived-fail-reason-pill">
                                                {getFailReasonLabel(failReasons[String(item.matchId)])}
                                            </span>
                                        )}
                                    </div>
                                )}

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
                                    {item.type === 'match' && item.matchId && (
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleReconsider(item.matchId)}
                                        >
                                            {t('companyWorkflow.archived.actions.reconsider')}
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
