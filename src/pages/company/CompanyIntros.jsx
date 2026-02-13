import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Handshake, Check, X, CheckCheck, XCircle,
    Loader, AlertCircle, RefreshCw, Clock,
    Star, MapPin, ChevronDown
} from 'lucide-react'
import { useIntros } from '../../hooks/useIntros'
import MatchToast from '../../components/MatchToast'
import './CompanyIntros.css'

/**
 * CompanyIntros — The "Pending Handshakes" triage page.
 * 
 * Replaces the old "ViewCandidates" flow. Companies see all students
 * who swiped right on their offers, with match scores and quick actions.
 * Supports batch accept/decline and status tab filtering.
 */
function CompanyIntros() {
    const [activeTab, setActiveTab] = useState('pending')
    const { intros, loading, error, stats, acceptIntro, declineIntro, batchAccept, batchDecline, refresh } = useIntros(activeTab)
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [newMatch, setNewMatch] = useState(null)
    const [processing, setProcessing] = useState(new Set())
    const navigate = useNavigate()

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const selectAll = () => {
        if (selectedIds.size === intros.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(intros.map(i => i.id)))
        }
    }

    const handleAccept = async (intro) => {
        setProcessing(prev => new Set(prev).add(intro.id))
        const { error: err } = await acceptIntro(intro.id)
        setProcessing(prev => { const next = new Set(prev); next.delete(intro.id); return next })

        if (!err) {
            setNewMatch({
                id: intro.id,
                companyName: intro.studentName,
                offerTitle: intro.offerTitle,
                matchedAt: new Date().toISOString()
            })
        }
    }

    const handleDecline = async (intro) => {
        setProcessing(prev => new Set(prev).add(intro.id))
        await declineIntro(intro.id)
        setProcessing(prev => { const next = new Set(prev); next.delete(intro.id); return next })
    }

    const handleBatchAccept = async () => {
        const ids = Array.from(selectedIds)
        setProcessing(new Set(ids))
        await batchAccept(ids)
        setSelectedIds(new Set())
        setProcessing(new Set())
    }

    const handleBatchDecline = async () => {
        const ids = Array.from(selectedIds)
        setProcessing(new Set(ids))
        await batchDecline(ids)
        setSelectedIds(new Set())
        setProcessing(new Set())
    }

    const getScoreColor = (score) => {
        if (score >= 80) return 'score-excellent'
        if (score >= 60) return 'score-good'
        if (score >= 40) return 'score-fair'
        return 'score-low'
    }

    const tabs = [
        { key: 'pending', label: 'Pending', count: stats.pending, icon: Clock },
        { key: 'accepted', label: 'Accepted', count: stats.accepted, icon: Check },
        { key: 'declined', label: 'Declined', count: stats.declined, icon: X },
        { key: 'expired', label: 'Expired', count: stats.expired, icon: XCircle }
    ]

    if (loading) {
        return (
            <div className="intros-page">
                <div className="container">
                    <div className="intros-loading">
                        <Loader className="animate-spin" size={48} />
                        <p>Loading handshakes...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="intros-page">
                <div className="container">
                    <div className="intros-error glass-card">
                        <AlertCircle size={48} />
                        <h3>Failed to load handshakes</h3>
                        <p>{error}</p>
                        <button className="btn btn-primary" onClick={refresh}>
                            <RefreshCw size={18} /> Try Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="intros-page">
            <div className="container">
                {/* Header */}
                <div className="intros-header">
                    <div className="header-left">
                        <h1>
                            <Handshake size={28} />
                            Handshakes
                        </h1>
                        <p>Students interested in your offers — review and accept to start chatting</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={refresh}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>

                {/* Status Tabs */}
                <div className="intros-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => { setActiveTab(tab.key); setSelectedIds(new Set()) }}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className="tab-count">{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Batch Actions Bar (only for pending) */}
                {activeTab === 'pending' && intros.length > 0 && (
                    <div className="batch-bar glass-card">
                        <label className="batch-select-all">
                            <input
                                type="checkbox"
                                checked={selectedIds.size === intros.length && intros.length > 0}
                                onChange={selectAll}
                            />
                            Select All ({intros.length})
                        </label>
                        {selectedIds.size > 0 && (
                            <div className="batch-actions">
                                <span className="batch-count">{selectedIds.size} selected</span>
                                <button className="btn btn-accept btn-sm" onClick={handleBatchAccept}>
                                    <CheckCheck size={16} /> Accept All
                                </button>
                                <button className="btn btn-decline btn-sm" onClick={handleBatchDecline}>
                                    <XCircle size={16} /> Decline All
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Intro Cards */}
                {intros.length > 0 ? (
                    <div className="intros-grid">
                        {intros.map(intro => (
                            <div
                                key={intro.id}
                                className={`intro-card glass-card ${processing.has(intro.id) ? 'processing' : ''} ${selectedIds.has(intro.id) ? 'selected' : ''}`}
                            >
                                {/* Selection Checkbox (pending only) */}
                                {activeTab === 'pending' && (
                                    <div className="intro-select">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(intro.id)}
                                            onChange={() => toggleSelect(intro.id)}
                                        />
                                    </div>
                                )}

                                {/* Card Header: Avatar + Score */}
                                <div className="intro-top">
                                    <div className="intro-avatar">
                                        {intro.studentAvatar ? (
                                            <img src={intro.studentAvatar} alt={intro.studentName} />
                                        ) : (
                                            <span>{intro.studentName?.charAt(0) || '?'}</span>
                                        )}
                                    </div>
                                    <div className={`intro-score ${getScoreColor(intro.matchScore)}`}>
                                        <span className="score-value">{intro.matchScore}%</span>
                                        <span className="score-label">Match</span>
                                    </div>
                                </div>

                                {/* Student Info */}
                                <div className="intro-info">
                                    <h3>{intro.studentName}</h3>
                                    <p className="intro-offer">
                                        <Star size={14} />
                                        {intro.offerTitle}
                                    </p>
                                    {intro.studentLocation && (
                                        <p className="intro-location">
                                            <MapPin size={14} />
                                            {intro.studentLocation}
                                        </p>
                                    )}
                                </div>

                                {/* Skills */}
                                <div className="intro-skills">
                                    {intro.studentSkills.slice(0, 5).map(skill => (
                                        <span key={skill} className="skill-badge">{skill}</span>
                                    ))}
                                    {intro.studentSkills.length > 5 && (
                                        <span className="skill-badge more">+{intro.studentSkills.length - 5}</span>
                                    )}
                                </div>

                                {/* Bio Preview */}
                                {intro.studentBio && (
                                    <p className="intro-bio">{intro.studentBio}</p>
                                )}

                                {/* Expiry Timer (pending only) */}
                                {activeTab === 'pending' && intro.timeRemaining && (
                                    <div className="intro-expiry">
                                        <Clock size={12} />
                                        Expires in {intro.timeRemaining}
                                    </div>
                                )}

                                {/* Actions (pending only) */}
                                {activeTab === 'pending' && (
                                    <div className="intro-actions">
                                        <button
                                            className="action-btn decline"
                                            onClick={() => handleDecline(intro)}
                                            disabled={processing.has(intro.id)}
                                            title="Decline"
                                        >
                                            <X size={20} />
                                        </button>
                                        <button
                                            className="action-btn accept"
                                            onClick={() => handleAccept(intro)}
                                            disabled={processing.has(intro.id)}
                                            title="Accept — Creates match & chat"
                                        >
                                            <Check size={20} />
                                        </button>
                                    </div>
                                )}

                                {/* Status badge for non-pending */}
                                {activeTab !== 'pending' && (
                                    <div className={`intro-status-badge status-${intro.status}`}>
                                        {intro.status === 'accepted' && <><Check size={14} /> Accepted</>}
                                        {intro.status === 'declined' && <><X size={14} /> Declined</>}
                                        {intro.status === 'expired' && <><XCircle size={14} /> Expired</>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-intros glass-card">
                        <div className="empty-icon">🤝</div>
                        <h2>
                            {activeTab === 'pending' && 'No pending handshakes'}
                            {activeTab === 'accepted' && 'No accepted handshakes yet'}
                            {activeTab === 'declined' && 'No declined handshakes'}
                            {activeTab === 'expired' && 'No expired handshakes'}
                        </h2>
                        <p>
                            {activeTab === 'pending'
                                ? 'When students swipe right on your offers, their intros will appear here.'
                                : 'Switch to the Pending tab to review new candidates.'}
                        </p>
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

export default CompanyIntros
