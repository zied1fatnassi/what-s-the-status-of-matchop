import { useState } from 'react'
import { AlertCircle, Archive, Briefcase, Building2, ExternalLink, Globe, Loader, MapPin, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import StudentMatchesTabs from '../../components/student/StudentMatchesTabs'
import { useExternalMatches } from '../../hooks/useExternalMatches'
import './StudentMatches.css'

const EXTERNAL_MATCH_TABS = [
    { id: 'saved', statuses: ['saved'] },
    { id: 'applied', statuses: ['applied', 'interview', 'rejected'] },
    { id: 'archived', statuses: ['archived'] }
]
const FOLLOW_UP_DELAY_MS = 7 * 24 * 60 * 60 * 1000

function getStatusBadgeLabel(status, t) {
    if (status === 'applied') return t('matches.statuses.applied')
    if (status === 'interview') return t('matches.statuses.interview')
    if (status === 'rejected') return t('matches.statuses.rejected')
    if (status === 'archived') return t('matches.statuses.archived')
    return null
}

function getPriorityBadgeLabel(priorityLevel, t) {
    if (priorityLevel === 'high') return t('matches.priority.high')
    if (priorityLevel === 'medium') return t('matches.priority.medium')
    return null
}

function getFocusBadge(match, t) {
    if (match.isFollowUpDue) {
        return {
            label: t('matches.nudges.followUpNow'),
            tone: 'status-follow-up-due'
        }
    }

    if (match.isStaleApplication) {
        return {
            label: t('matches.nudges.noResponseAfter14Days'),
            tone: 'status-stale-application'
        }
    }

    return {
        label: t('matches.statuses.applied'),
        tone: 'status-applied'
    }
}

function formatStatusDate(timestamp, language) {
    if (!timestamp) return null

    return new Date(timestamp).toLocaleDateString(language, {
        month: 'short',
        day: 'numeric'
    })
}

function getStatusDateLabel(match, t, language) {
    if (match.status === 'applied' && match.applied_at) {
        return t('matches.statusDates.appliedOn', { date: formatStatusDate(match.applied_at, language) })
    }

    if (match.status === 'interview' && match.interview_at) {
        return t('matches.statusDates.interviewOn', { date: formatStatusDate(match.interview_at, language) })
    }

    if (match.status === 'rejected' && match.rejected_at) {
        return t('matches.statusDates.rejectedOn', { date: formatStatusDate(match.rejected_at, language) })
    }

    if (match.status === 'archived' && match.archived_at) {
        return t('matches.statusDates.archivedOn', { date: formatStatusDate(match.archived_at, language) })
    }

    return null
}

function getEmptyState(activeTab, t) {
    if (activeTab === 'applied') {
        return {
            title: t('matches.externalEmptyStates.appliedTitle'),
            description: t('matches.externalEmptyStates.appliedDescription')
        }
    }

    if (activeTab === 'archived') {
        return {
            title: t('matches.externalEmptyStates.archivedTitle'),
            description: t('matches.externalEmptyStates.archivedDescription')
        }
    }

    return {
        title: t('matches.externalEmptyStates.savedTitle'),
        description: t('matches.externalEmptyStates.savedDescription')
    }
}

function formatPercentage(value, language) {
    return new Intl.NumberFormat(language, {
        style: 'percent',
        maximumFractionDigits: 0
    }).format(value)
}

function StudentExternalMatches() {
    const { t, i18n } = useTranslation()
    const {
        externalMatches,
        sortedExternalMatches,
        focusMatches,
        insights,
        loading,
        error,
        refresh,
        markAsApplied,
        markAsInterview,
        archiveExternalMatch,
        setFollowUpDate
    } = useExternalMatches()
    const [activeTab, setActiveTab] = useState('saved')
    const [processingIds, setProcessingIds] = useState(() => new Set())
    const [actionError, setActionError] = useState(null)
    const followUpDueCount = externalMatches.filter((match) => match.isFollowUpDue).length

    const filteredMatches = sortedExternalMatches.filter((match) => {
        const tab = EXTERNAL_MATCH_TABS.find((item) => item.id === activeTab)
        return tab ? tab.statuses.includes(match.status) : false
    })
    const emptyState = getEmptyState(activeTab, t)

    const markProcessing = (externalMatchId) => {
        setProcessingIds((prev) => {
            const next = new Set(prev)
            next.add(externalMatchId)
            return next
        })
    }

    const unmarkProcessing = (externalMatchId) => {
        setProcessingIds((prev) => {
            const next = new Set(prev)
            next.delete(externalMatchId)
            return next
        })
    }

    const handleExternalMatchAction = async (externalMatchId, action) => {
        setActionError(null)
        markProcessing(externalMatchId)

        const { error: updateError } = await action(externalMatchId)
        if (updateError) {
            setActionError(updateError.message || t('matches.statusUpdateFailed'))
        }

        unmarkProcessing(externalMatchId)
    }

    if (loading) {
        return (
            <div className="matches-page">
                <div className="container">
                    <div className="matches-header">
                        <h1>{t('matches.externalTitle')}</h1>
                        <p>{t('matches.externalSubtitle')}</p>
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

    if (error) {
        return (
            <div className="matches-page">
                <div className="container">
                    <div className="matches-header">
                        <h1>{t('matches.externalTitle')}</h1>
                        <p>{t('matches.externalSubtitle')}</p>
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
                    <h1>{t('matches.externalTitle')}</h1>
                    <p>{t('matches.externalSubtitle')}</p>
                    <StudentMatchesTabs />
                </div>

                {focusMatches.length > 0 ? (
                    <section className="external-focus-section" aria-labelledby="external-focus-title">
                        <div className="external-focus-header">
                            <h2 id="external-focus-title">{t('matches.focus.title')}</h2>
                        </div>
                        <div className="external-focus-list">
                            {focusMatches.map((match) => {
                                const focusBadge = getFocusBadge(match, t)
                                const priorityBadgeLabel = getPriorityBadgeLabel(match.priorityLevel, t)
                                const isProcessing = processingIds.has(match.id)
                                const focusAction = match.isFollowUpDue
                                    ? {
                                        label: t('matches.actions.markAsFollowedUp'),
                                        onClick: () => handleExternalMatchAction(match.id, (externalMatchId) => (
                                            setFollowUpDate(externalMatchId, new Date(Date.now() + FOLLOW_UP_DELAY_MS).toISOString())
                                        ))
                                    }
                                    : {
                                        label: t('matches.actions.moveToInterview'),
                                        onClick: () => handleExternalMatchAction(match.id, markAsInterview)
                                    }

                                return (
                                    <article key={match.id} className="external-focus-card glass-card">
                                        <div className="external-focus-card-main">
                                            <div className="match-avatar">
                                                <span>{match.company_name.charAt(0) || 'E'}</span>
                                            </div>
                                            <div className="external-focus-copy">
                                                <div className="external-focus-badges">
                                                    <span className={`external-match-badge ${focusBadge.tone}`}>
                                                        {focusBadge.label}
                                                    </span>
                                                    {priorityBadgeLabel ? (
                                                        <span className={`external-match-badge priority-${match.priorityLevel}`}>
                                                            {priorityBadgeLabel}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <h3>{match.company_name}</h3>
                                                <p>{match.title}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={focusAction.onClick}
                                            disabled={isProcessing}
                                        >
                                            {focusAction.label}
                                        </button>
                                    </article>
                                )
                            })}
                        </div>
                    </section>
                ) : null}

                <div className="external-match-follow-up-summary glass-card">
                    <p>{t('matches.followUpSummary', { count: followUpDueCount })}</p>
                </div>

                {insights.totalApplied > 0 ? (
                    <section className="external-insights-section glass-card" aria-label={t('matches.insights.title')}>
                        <div className="external-insights-grid">
                            <div className="external-insight">
                                <span className="external-insight-label">{t('matches.insights.applications')}</span>
                                <strong>{insights.totalApplied}</strong>
                            </div>
                            <div className="external-insight">
                                <span className="external-insight-label">{t('matches.insights.interviews')}</span>
                                <strong>{insights.totalInterview}</strong>
                            </div>
                            <div className="external-insight">
                                <span className="external-insight-label">{t('matches.insights.conversion')}</span>
                                <strong>{formatPercentage(insights.conversionRate, i18n.language)}</strong>
                            </div>
                        </div>
                    </section>
                ) : null}

                <div className="external-match-status-tabs" role="tablist" aria-label={t('matches.statusTabs.ariaLabel')}>
                    {EXTERNAL_MATCH_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            className={`external-match-status-tab${activeTab === tab.id ? ' active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                            aria-pressed={activeTab === tab.id}
                        >
                            {t(`matches.statusTabs.${tab.id}`)}
                        </button>
                    ))}
                </div>

                {actionError ? (
                    <div className="external-match-action-error" role="alert">
                        <AlertCircle size={16} />
                        <span>{actionError}</span>
                    </div>
                ) : null}

                {filteredMatches.length > 0 ? (
                    <div className="matches-list">
                        {filteredMatches.map((match) => {
                            const savedAt = match.saved_at
                                ? new Date(match.saved_at).toLocaleDateString(i18n.language)
                                : t('matches.recently')
                            const badgeLabel = getStatusBadgeLabel(match.status, t)
                            const statusDateLabel = getStatusDateLabel(match, t, i18n.language)
                            const sourceLabel = match.source_website || t('matches.externalSourceFallback')
                            const isProcessing = processingIds.has(match.id)
                            const manualTrackingTooltip = t('matches.externalTrackingTooltip')
                            const followUpDate = new Date(Date.now() + FOLLOW_UP_DELAY_MS).toISOString()
                            const priorityBadgeLabel = getPriorityBadgeLabel(match.priorityLevel, t)

                            return (
                                <article
                                    key={match.id}
                                    className="match-card external-match-card glass-card"
                                >
                                    <div className="match-avatar">
                                        <span>{match.company_name.charAt(0) || 'E'}</span>
                                    </div>

                                    <div className="match-info">
                                        <div className="match-header">
                                            <div className="match-heading">
                                                <h3 className="match-company">{match.company_name}</h3>
                                                {badgeLabel ? (
                                                    <span className={`external-match-badge status-${match.status}`}>
                                                        {badgeLabel}
                                                    </span>
                                                ) : null}
                                                {priorityBadgeLabel ? (
                                                    <span className={`external-match-badge priority-${match.priorityLevel}`}>
                                                        {priorityBadgeLabel}
                                                    </span>
                                                ) : null}
                                                {match.isFollowUpDue ? (
                                                    <span className="external-match-badge status-follow-up-due">
                                                        {t('matches.nudges.followUpNow')}
                                                    </span>
                                                ) : null}
                                                {match.isStaleApplication ? (
                                                    <span className="external-match-badge status-stale-application">
                                                        {t('matches.nudges.noResponseAfter14Days')}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <span className="match-time">{t('matches.savedOn', { date: savedAt })}</span>
                                        </div>

                                        <p className="match-title">{match.title}</p>
                                        {statusDateLabel ? (
                                            <p className="external-match-status-date">{statusDateLabel}</p>
                                        ) : null}

                                        <div className="external-match-meta">
                                            <div className="match-location">
                                                <MapPin size={14} />
                                                <span>{match.location || t('matches.remote')}</span>
                                            </div>
                                            <div className="match-location">
                                                <Globe size={14} />
                                                <span>{match.source_website}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="external-match-actions">
                                        {match.original_url && match.status !== 'archived' ? (
                                            <a
                                                className="btn btn-primary btn-sm"
                                                href={match.original_url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <ExternalLink size={16} />
                                                {t('matches.applyOn', { source: sourceLabel })}
                                            </a>
                                        ) : match.status === 'saved' ? (
                                            <button type="button" className="btn btn-secondary btn-sm" disabled>
                                                <Building2 size={16} />
                                                {t('matches.applyUnavailable')}
                                            </button>
                                        ) : null}

                                        {match.status === 'saved' ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => handleExternalMatchAction(match.id, markAsApplied)}
                                                    disabled={isProcessing}
                                                    title={manualTrackingTooltip}
                                                >
                                                    {t('matches.actions.markAsApplied')}
                                                </button>
                                            </>
                                        ) : null}
                                        {match.status === 'applied' ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => handleExternalMatchAction(match.id, markAsInterview)}
                                                    disabled={isProcessing}
                                                    title={manualTrackingTooltip}
                                                >
                                                    {t('matches.actions.moveToInterview')}
                                                </button>
                                            </>
                                        ) : null}
                                        {match.isFollowUpDue ? (
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => handleExternalMatchAction(match.id, (externalMatchId) => (
                                                    setFollowUpDate(externalMatchId, followUpDate)
                                                ))}
                                                disabled={isProcessing}
                                            >
                                                {t('matches.actions.markAsFollowedUp')}
                                            </button>
                                        ) : null}
                                        {match.status !== 'archived' ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleExternalMatchAction(match.id, archiveExternalMatch)}
                                                    disabled={isProcessing}
                                                >
                                                    <Archive size={16} />
                                                    {t('matches.actions.archive')}
                                                </button>
                                            </>
                                        ) : null}
                                        {match.status !== 'saved' && match.status !== 'archived' && !match.original_url ? (
                                            <button type="button" className="btn btn-secondary btn-sm" disabled>
                                                <Building2 size={16} />
                                                {t('matches.applyUnavailable')}
                                            </button>
                                        ) : null}
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                ) : (
                    <div className="no-matches glass-card">
                        <div className="empty-icon" aria-hidden="true">
                            <Briefcase size={64} />
                        </div>
                        <h2>{emptyState.title}</h2>
                        <p>{emptyState.description}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default StudentExternalMatches
