import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, MapPin, Building2, Globe, ExternalLink, Calendar, Briefcase, Loader2, Send } from 'lucide-react'
import { useExternalJobs } from '../../hooks/useExternalJobs'
import { useAuth } from '../../context/AuthContext'
import { useStudentProfile } from '../../hooks/useStudentProfile'
import { useToast } from '../../hooks/useLoadingError'
import ErrorToast from '../../components/ErrorToast'
import './GlobalJobs.css'

export default function GlobalJobs() {
    void motion

    const {
        jobs, loading, error, filters, setFilters,
        page, totalPages, nextPage, prevPage, refresh
    } = useExternalJobs()
    const { user } = useAuth()
    const { profile } = useStudentProfile() // To get data for auto-apply
    const { toast, showSuccess, showError, hideToast } = useToast()

    const [applyingId, setApplyingId] = useState(null)
    const [failedLogos, setFailedLogos] = useState(() => new Set())

    // Simplified One-Click Apply (opens email client or job link)
    const handleSmartApply = async (job) => {
        if (!profile?.cv_url) {
            showError('Please upload your CV in your profile first!')
            return
        }

        setApplyingId(job.id)
        try {
            if (job.contact_email) {
                const subject = `Application for ${job.title} at ${job.company_name}`
                const body = [
                    `Hello ${job.company_name},`,
                    '',
                    `I am interested in the ${job.title} role.`,
                    profile.cv_url ? `My CV: ${profile.cv_url}` : '',
                    `Profile: ${window.location.origin}/profile/${user.id}`,
                    '',
                    'Thank you!'
                ].join('%0D%0A')

                window.location.href = `mailto:${job.contact_email}?subject=${encodeURIComponent(subject)}&body=${body}`
                showSuccess('Opening your email app to apply')
            } else {
                // Fallback chain for external links; normalize protocol to avoid blocked navigation
                const externalUrl = job.original_url || job.apply_url || job.url || job.link
                if (!externalUrl) {
                    showError('No external apply link found for this job')
                    return
                }
                const normalized = externalUrl.startsWith('http') ? externalUrl : `https://${externalUrl}`
                window.open(normalized, '_blank', 'noopener')
            }
        } catch (err) {
            console.error('Apply error:', err)
            showError('Failed to open application link. Please try again.')
        } finally {
            setApplyingId(null)
        }
    }

    return (
        <div className="global-jobs-page animate-fade-in-up">
            <header className="page-header">
                <div className="header-content">
                    <h1><Globe size={32} /> Global Opportunities</h1>
                    <p>Aggregate jobs from top Tunisian & International platforms</p>
                    <button onClick={refresh} className="refresh-btn" disabled={loading}>
                        <Loader2 size={16} className={loading ? 'spin' : ''} /> Refresh Jobs
                    </button>
                </div>
            </header>

            <div className="filters-bar">
                <div className="search-input">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search title, skill, or company..."
                        value={filters.query}
                        onChange={e => setFilters(prev => ({ ...prev, query: e.target.value }))}
                    />
                </div>
                <div className="search-input">
                    <MapPin size={18} />
                    <input
                        type="text"
                        placeholder="Location (e.g. Remote, Tunis)"
                        value={filters.location}
                        onChange={e => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    />
                </div>
            </div>

            {error && <div className="error-message">Error loading jobs: {error}</div>}

            <div className="jobs-grid">
                {loading ? (
                    <div className="loading-state">
                        <Loader2 size={48} className="spin" />
                        <p>Searching the globe...</p>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="empty-state">
                        <Globe size={64} />
                        <h3>No jobs found matching your criteria</h3>
                        <p>Try broadening your search terms</p>
                    </div>
                ) : (
                    jobs.map(job => (
                        <motion.div
                            key={job.id}
                            className="job-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -5 }}
                        >
                            <div className="job-header">
                                <div className="company-logo-placeholder">
                                    {job.logo_url && !failedLogos.has(job.id) ? (
                                        <img
                                            src={job.logo_url}
                                            alt={`${job.company_name || 'Company'} logo`}
                                            loading="lazy"
                                            decoding="async"
                                            width="56"
                                            height="56"
                                            onError={() => {
                                                setFailedLogos(prev => {
                                                    const next = new Set(prev)
                                                    next.add(job.id)
                                                    return next
                                                })
                                            }}
                                        />
                                    ) : (
                                        <Building2 size={24} />
                                    )}
                                </div>
                                <div className="job-info">
                                    <h3>{job.title}</h3>
                                    <span className="company-name">{job.company_name}</span>
                                </div>
                                <span className="source-badge">{job.source_website}</span>
                            </div>

                            <div className="job-details">
                                <div className="detail-item"><MapPin size={14} /> {job.location || 'Remote'}</div>
                                <div className="detail-item"><Briefcase size={14} /> {job.job_type || 'Full-time'}</div>
                                <div className="detail-item"><Calendar size={14} /> {new Date(job.posted_at).toLocaleDateString()}</div>
                            </div>

                            <div className="actions">
                                <button
                                    className={`apply-btn ${job.contact_email ? 'smart' : ''}`}
                                    onClick={() => handleSmartApply(job)}
                                    disabled={applyingId === job.id}
                                >
                                    {applyingId === job.id ? (
                                        <><Loader2 size={16} className="spin" /> Sending...</>
                                    ) : job.contact_email ? (
                                        <><Send size={16} /> Fast Apply</>
                                    ) : (
                                        <><ExternalLink size={16} /> Apply on Site</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {jobs.length > 0 && (
                <div className="pagination-controls">
                    <button
                        onClick={prevPage}
                        disabled={page === 1 || loading}
                        className="page-btn"
                    >
                        Previous
                    </button>

                    <span className="page-info">
                        Page {page} of {totalPages || 1}
                    </span>

                    <button
                        onClick={nextPage}
                        disabled={page >= (totalPages || 1) || loading}
                        className="page-btn"
                    >
                        Next
                    </button>
                </div>
            )}

            {toast && <ErrorToast {...toast} onClose={hideToast} />}
        </div>
    )
}
