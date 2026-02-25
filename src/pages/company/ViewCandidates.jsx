<<<<<<< HEAD
import { useState } from 'react'
import { Heart, X, Filter, Grid, List, Loader, AlertCircle, RefreshCw, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
=======
import { useMemo, useState } from 'react'
import { Heart, X, Filter, Grid, List, Loader, AlertCircle, RefreshCw, Sparkles } from 'lucide-react'
>>>>>>> 733b7574e39c1223b797609846a289dc896d6eb2
import { useCandidates } from '../../hooks/useCandidates'
import MatchToast from '../../components/MatchToast'
import './ViewCandidates.css'

function ViewCandidates() {
    const { t } = useTranslation()
    const { candidates, loading, error, filters, setFilters, swipeOnCandidate, refresh } = useCandidates()
    const [viewMode, setViewMode] = useState('grid')
    const [premiumBoostEnabled, setPremiumBoostEnabled] = useState(false)
    const [newMatch, setNewMatch] = useState(null)
    const [showFilters, setShowFilters] = useState(false)
    const [filterForm, setFilterForm] = useState({
        skills: '',
        location: ''
    })

    const handleLike = async (candidate) => {
        const { error: swipeError } = await swipeOnCandidate(candidate.id, 'right', candidate.offerId)

        if (!swipeError) {
            // Show match toast
            setNewMatch({
                id: `temp-${Date.now()}`, // Temporary ID until real match is created
                companyName: candidate.name,
                offerTitle: candidate.offerTitle,
                matchedAt: new Date().toISOString()
            })
        }
    }

    const handlePass = async (candidate) => {
        await swipeOnCandidate(candidate.id, 'left', candidate.offerId)
    }

    const applyFilters = () => {
        const skillsArray = filterForm.skills
            .split(',')
            .map(s => s.trim())
            .filter(s => s)

        setFilters({
            skills: skillsArray,
            location: filterForm.location
        })
        setShowFilters(false)
    }

    const clearFilters = () => {
        setFilterForm({ skills: '', location: '' })
        setFilters({ skills: [], location: '' })
    }

    const visibleCandidates = useMemo(() => {
        const nextCandidates = [...candidates]

        if (!premiumBoostEnabled) {
            return nextCandidates
        }

        return nextCandidates.sort((a, b) => {
            const premiumDelta = Number(Boolean(b.is_premium_active)) - Number(Boolean(a.is_premium_active))
            if (premiumDelta !== 0) return premiumDelta

            const bTime = Date.parse(b.swipedAt || 0)
            const aTime = Date.parse(a.swipedAt || 0)
            const hasBothTimes = Number.isFinite(aTime) && Number.isFinite(bTime)
            if (hasBothTimes) return bTime - aTime

            return 0
        })
    }, [candidates, premiumBoostEnabled])

    if (loading) {
        return (
            <div className="candidates-page">
                <div className="container">
                    <div className="candidates-loading">
                        <Loader className="animate-spin" size={48} />
                        <p>{t('candidates.loading')}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="candidates-page">
                <div className="container">
                    <div className="candidates-error glass-card">
                        <AlertCircle size={48} className="text-red-500" />
                        <h3>{t('candidates.loadError')}</h3>
                        <p>{error}</p>
                        <button className="btn btn-primary" onClick={refresh}>
                            <RefreshCw size={18} />
                            {t('common.retry')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="candidates-page">
            <div className="container">
                <div className="candidates-header">
                    <div className="header-left">
<<<<<<< HEAD
                        <h1>{t('candidates.title')}</h1>
                        <p>{t('candidates.subtitle', { count: candidates.length })}</p>
=======
                        <h1>Candidates</h1>
                        <p>{visibleCandidates.length} students interested in your offers</p>
>>>>>>> 733b7574e39c1223b797609846a289dc896d6eb2
                        {(filters.skills.length > 0 || filters.location) && (
                            <div className="active-filters">
                                {filters.skills.map(skill => (
                                    <span key={skill} className="filter-tag">
                                        {skill}
                                        <button onClick={() => setFilters({
                                            ...filters,
                                            skills: filters.skills.filter(s => s !== skill)
                                        })}>
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                {filters.location && (
                                    <span className="filter-tag">
                                        {t('candidates.locationLabel')}: {filters.location}
                                        <button onClick={() => setFilters({
                                            ...filters,
                                            location: ''
                                        })}>
                                            <X size={12} />
                                        </button>
                                    </span>
                                )}
                                <button className="clear-filters-btn" onClick={clearFilters}>
                                    {t('candidates.clearAll')}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="header-actions">
                        <button
                            className={`btn btn-secondary btn-sm premium-sort-toggle ${premiumBoostEnabled ? 'active' : ''}`}
                            onClick={() => setPremiumBoostEnabled((prev) => !prev)}
                            aria-pressed={premiumBoostEnabled}
                            title="Prioritize premium candidates without removing standard candidates"
                        >
                            <Sparkles size={16} />
                            {premiumBoostEnabled ? 'Premium Boost On' : 'Premium Boost Off'}
                        </button>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter size={18} />
                            {t('candidates.filter')}
                        </button>
                        <div className="view-toggle">
                            <button
                                className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {showFilters && (
                    <div className="filters-panel glass-card">
                        <h3>{t('candidates.filterCandidates')}</h3>
                        <div className="filter-inputs">
                            <div className="input-group">
                                <label>{t('candidates.skillsLabel')}</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder={t('candidates.skillsPlaceholder')}
                                    value={filterForm.skills}
                                    onChange={(e) => setFilterForm({ ...filterForm, skills: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>{t('candidates.locationLabel')}</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder={t('candidates.locationPlaceholder')}
                                    value={filterForm.location}
                                    onChange={(e) => setFilterForm({ ...filterForm, location: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="filter-actions">
                            <button className="btn btn-secondary" onClick={() => setShowFilters(false)}>
                                {t('common.cancel')}
                            </button>
                            <button className="btn btn-primary" onClick={applyFilters}>
                                {t('candidates.applyFilters')}
                            </button>
                        </div>
                    </div>
                )}

                {visibleCandidates.length > 0 ? (
                    <div className={`candidates-grid ${viewMode}`}>
                        {visibleCandidates.map(candidate => (
                            <div key={candidate.id} className="candidate-card glass-card">
                                <div className="candidate-header">
                                    <div className="candidate-avatar">
                                        <span>{candidate.name.charAt(0)}</span>
                                        {candidate.hasLiked && (
                                            <span className="interested-badge">
                                                <Heart size={12} fill="currentColor" />
                                            </span>
                                        )}
                                    </div>
<<<<<<< HEAD
                                    <span className="interested-tag">{t('candidates.interested')}</span>
=======
                                    <div className="candidate-tags">
                                        <span className="interested-tag">Interested</span>
                                        {candidate.is_premium_active && (
                                            <span className="premium-tag">Premium</span>
                                        )}
                                    </div>
>>>>>>> 733b7574e39c1223b797609846a289dc896d6eb2
                                </div>

                                <div className="candidate-info">
                                    <h3>{candidate.name}</h3>
                                    <p className="candidate-title">{t('candidates.appliedFor')}: {candidate.offerTitle}</p>
                                    <p className="candidate-location">{t('candidates.locationLabel')}: {candidate.location}</p>
                                </div>

                                <div className="candidate-skills">
                                    {candidate.skills.slice(0, 6).map(skill => (
                                        <span key={skill} className="skill-badge">{skill}</span>
                                    ))}
                                    {candidate.skills.length > 6 && (
                                        <span className="skill-badge more">+{candidate.skills.length - 6}</span>
                                    )}
                                </div>

                                <div className="candidate-actions">
                                    <button
                                        className="action-btn pass"
                                        onClick={() => handlePass(candidate)}
                                        title={t('candidates.pass')}
                                    >
                                        <X size={20} />
                                    </button>
                                    <button
                                        className="action-btn like"
                                        onClick={() => handleLike(candidate)}
                                        title={t('candidates.acceptCreateMatch')}
                                    >
                                        <Heart size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-candidates glass-card">
                        <div className="empty-icon" aria-hidden="true">
                            <Users size={64} />
                        </div>
                        <h2>{t('candidates.noCandidates')}</h2>
                        <p>{t('candidates.noCandidatesDesc')}</p>
                        {(filters.skills.length > 0 || filters.location) && (
                            <button className="btn btn-secondary" onClick={clearFilters}>
                                {t('candidates.clearFilters')}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Match Toast */}
            {newMatch && (
                <MatchToast
                    match={newMatch}
                    onClose={() => setNewMatch(null)}
                />
            )}
        </div>
    )
}

export default ViewCandidates
