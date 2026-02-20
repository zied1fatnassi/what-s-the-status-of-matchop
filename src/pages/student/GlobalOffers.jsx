import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search, MapPin, Building2, Globe, ExternalLink, Calendar,
    Briefcase, Loader2, Clock, SlidersHorizontal, Grid3X3,
    List, ChevronLeft, ChevronRight, ArrowUp, Heart, Zap,
    Tag, AlertCircle, RefreshCw, Package
} from 'lucide-react'
import { useGlobalOffers } from '../../hooks/useGlobalOffers'
import { useToast } from '../../hooks/useLoadingError'
import ErrorToast from '../../components/ErrorToast'
import './GlobalOffers.css'

/*
┌──────────────────────────────────────────────────────────────┐
│ WIREFRAME LAYOUT                                              │
│                                                                │
│ ┌──────────────── HERO SECTION ─────────────────────┐        │
│ │  [icon] Global Offers                                │        │
│ │  Discover opportunities from 300+ companies          │        │
│ │  [500+ Offers] [200+ Companies] [8 Categories]       │        │
│ └──────────────────────────────────────────────────────┘        │
│                                                                │
│ ┌──── STICKY FILTERS BAR ──────────────────────────┐          │
│ │ [🔍 Search...] [📍 Location] [📂 Category ▼]       │          │
│ │ [↕ Sort ▼]     [Grid|List]   123 results           │          │
│ └──────────────────────────────────────────────────────┘        │
│                                                                │
│ ┌─ OFFERS GRID ──────────────────────────────────────┐        │
│ │ ┌──────┐ ┌──────┐ ┌──────┐                          │        │
│ │ │ Card │ │ Card │ │ Card │   3-col desktop           │        │
│ │ │ Logo │ │ Logo │ │ Logo │   2-col tablet            │        │
│ │ │Title │ │Title │ │Title │   1-col mobile            │        │
│ │ │Badge │ │Badge │ │Badge │                          │        │
│ │ │Skills│ │Skills│ │Skills│  Each card:               │        │
│ │ │Timer │ │Timer │ │Timer │  - Company logo           │        │
│ │ │[CLAIM]│ │[CLAIM]│ │[CLAIM]│  - Title + company    │        │
│ │ └──────┘ └──────┘ └──────┘  - Salary/location badge │        │
│ │                              - Skills tags            │        │
│ │                              - Urgency timer          │        │
│ │                              - Big "Claim" CTA        │        │
│ └──────────────────────────────────────────────────────┘        │
│                                                                │
│ ┌──── PAGINATION ──────────────────────────────────┐          │
│ │ [← Prev] [1] [2] [3] ... [10] [Next →]            │          │
│ └──────────────────────────────────────────────────────┘        │
│                                                                │
│                                    [↑ Scroll to top FAB]       │
└──────────────────────────────────────────────────────────────┘
*/

// ─── CONSTANTS ───────────────────────────────────────────────
const CATEGORIES = [
    { value: '', label: 'All Categories' },
    { value: 'tech', label: 'Technology' },
    { value: 'finance', label: 'Finance' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'design', label: 'Design' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'education', label: 'Education' },
    { value: 'consulting', label: 'Consulting' }
]

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'salary_high', label: 'Salary: High → Low' },
    { value: 'salary_low', label: 'Salary: Low → High' },
    { value: 'title_az', label: 'Title: A → Z' }
]

// ─── ANIMATION VARIANTS ─────────────────────────────────────
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.06 }
    }
}

const cardVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.96 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.2 }
    }
}

// ─── HELPER: Countdown ──────────────────────────────────────
function getTimeRemaining(expiresAt) {
    if (!expiresAt) return null
    const diff = new Date(expiresAt) - new Date()
    if (diff <= 0) return null
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
    if (days > 30) return null // Don't show timer for far-off expiry
    if (days > 0) return `${days}d ${hours}h left`
    const mins = Math.floor((diff / (1000 * 60)) % 60)
    return `${hours}h ${mins}m left`
}

// ─── SKELETON CARD ──────────────────────────────────────────
function OfferSkeleton() {
    return (
        <div className="offer-skeleton" aria-hidden="true">
            <div className="skeleton-row">
                <div className="skeleton-circle" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="skeleton-line h-lg w-80" />
                    <div className="skeleton-line w-40" />
                </div>
            </div>
            <div className="skeleton-row">
                <div className="skeleton-line w-60" />
                <div className="skeleton-line w-40" />
            </div>
            <div className="skeleton-line w-full" />
            <div className="skeleton-line h-btn w-full" />
        </div>
    )
}

// ─── OFFER CARD COMPONENT ───────────────────────────────────
function OfferCard({ offer }) {
    const navigate = useNavigate()
    const timeLeft = useMemo(() => getTimeRemaining(offer.expiresAt), [offer.expiresAt])
    const isUrgent = timeLeft && !timeLeft.includes('d')

    const handleClaim = useCallback((e) => {
        e.stopPropagation()
        if (offer.isExternal && offer.externalUrl) {
            const url = offer.externalUrl.startsWith('http')
                ? offer.externalUrl
                : `https://${offer.externalUrl}`
            window.open(url, '_blank', 'noopener')
        } else {
            // Internal offer: navigate to swipe or detail
            navigate('/student/swipe')
        }
    }, [offer, navigate])

    return (
        <motion.article
            className="offer-card"
            variants={cardVariants}
            layout
            whileHover={{ y: -6 }}
            role="article"
            aria-label={`${offer.title} at ${offer.company}`}
            tabIndex={0}
        >
            {/* Header: Logo + Title */}
            <div className="offer-card-header">
                <div className="offer-company-logo">
                    {offer.companyLogo ? (
                        <img
                            src={offer.companyLogo}
                            alt={`${offer.company} logo`}
                            loading="lazy"
                            decoding="async"
                            width="48"
                            height="48"
                            onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextSibling && (e.target.nextSibling.style.display = 'flex')
                            }}
                        />
                    ) : null}
                    <Building2 size={20} style={offer.companyLogo ? { display: 'none' } : {}} />
                </div>
                <div className="offer-header-text">
                    <h3 className="offer-title">{offer.title}</h3>
                    <span className="offer-company-name">{offer.company}</span>
                </div>
            </div>

            {/* Badges */}
            <div className="offer-badges">
                {offer.salary && offer.salary !== 'Competitive' && (
                    <span className="badge badge-salary">
                        <Tag size={10} /> {offer.salary}
                    </span>
                )}
                {offer.isExternal && (
                    <span className="badge badge-external">
                        <Globe size={10} /> External
                    </span>
                )}
                {isUrgent && (
                    <span className="badge badge-urgent">
                        <Zap size={10} /> Urgent
                    </span>
                )}
                {offer.industry && (
                    <span className="badge badge-category">{offer.industry}</span>
                )}
            </div>

            {/* Details: Location, Type, Date */}
            <div className="offer-details">
                <span className="offer-detail-item">
                    <MapPin size={13} /> {offer.location}
                </span>
                <span className="offer-detail-item">
                    <Calendar size={13} />{' '}
                    {offer.createdAt
                        ? new Date(offer.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                          })
                        : 'Recently'}
                </span>
                {offer.sourceWebsite && (
                    <span className="offer-detail-item">
                        <Globe size={13} /> {offer.sourceWebsite}
                    </span>
                )}
            </div>

            {/* Skills */}
            {offer.skills && offer.skills.length > 0 && (
                <div className="offer-skills">
                    {offer.skills.slice(0, 3).map((skill, i) => (
                        <span key={i} className="skill-tag">{skill}</span>
                    ))}
                    {offer.skills.length > 3 && (
                        <span className="skill-tag more">+{offer.skills.length - 3}</span>
                    )}
                </div>
            )}

            {/* Urgency Timer */}
            {timeLeft && (
                <div className="offer-urgency" role="timer" aria-label={`Expires in ${timeLeft}`}>
                    <Clock size={14} />
                    <span>{timeLeft}</span>
                </div>
            )}

            {/* Actions */}
            <div className="offer-actions">
                <button
                    className={`claim-btn ${offer.isExternal ? 'external' : ''}`}
                    onClick={handleClaim}
                    aria-label={offer.isExternal ? `Apply for ${offer.title} on external site` : `View & apply for ${offer.title}`}
                >
                    {offer.isExternal ? (
                        <><ExternalLink size={16} /> Apply Now</>
                    ) : (
                        <><Zap size={16} /> Claim Offer</>
                    )}
                </button>
                <button
                    className="save-btn"
                    aria-label={`Save ${offer.title}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Heart size={18} />
                </button>
            </div>
        </motion.article>
    )
}

// ─── MAIN PAGE COMPONENT ────────────────────────────────────
export default function GlobalOffers() {
    const {
        offers, loading, error, filters, setFilters,
        page, totalPages, totalCount, nextPage, prevPage,
        goToPage, refresh, stats
    } = useGlobalOffers()

    const { toast, hideToast } = useToast()
    const [viewMode, setViewMode] = useState('grid') // grid | list
    const [showScrollTop, setShowScrollTop] = useState(false)
    const filtersRef = useRef(null)

    // Scroll-to-top FAB visibility
    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 500)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    // Debounced search
    const searchTimeoutRef = useRef(null)
    const handleSearchChange = useCallback((e) => {
        const value = e.target.value
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = setTimeout(() => {
            setFilters(prev => ({ ...prev, query: value }))
        }, 350)
    }, [setFilters])

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

    // Generate page numbers for pagination
    const pageNumbers = useMemo(() => {
        const pages = []
        const maxVisible = 5
        let start = Math.max(1, page - Math.floor(maxVisible / 2))
        let end = Math.min(totalPages, start + maxVisible - 1)
        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1)
        }
        for (let i = start; i <= end; i++) pages.push(i)
        return pages
    }, [page, totalPages])

    return (
        <div className="offers-page animate-fade-in-up">
            {/* ─── HERO SECTION ─── */}
            <header className="offers-hero">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Briefcase size={32} /> Global Offers
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    Discover curated opportunities from top companies — swipe, apply, and land your dream role.
                </motion.p>

                <motion.div
                    className="offers-stats"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <div className="stat-item" aria-label={`${stats.total}+ offers available`}>
                        <span className="stat-value">{stats.total > 0 ? `${stats.total}+` : '—'}</span>
                        <span className="stat-label">Offers Live</span>
                    </div>
                    <div className="stat-item" aria-label={`${stats.companies}+ companies`}>
                        <span className="stat-value">{stats.companies > 0 ? `${stats.companies}+` : '—'}</span>
                        <span className="stat-label">Companies</span>
                    </div>
                    <div className="stat-item" aria-label={`${stats.categories} categories`}>
                        <span className="stat-value">{stats.categories}</span>
                        <span className="stat-label">Categories</span>
                    </div>
                </motion.div>
            </header>

            {/* ─── STICKY FILTERS BAR ─── */}
            <nav
                className="offers-filters-bar"
                ref={filtersRef}
                role="search"
                aria-label="Filter offers"
            >
                {/* Search */}
                <div className="filter-input search-field">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search job title, skill, or company..."
                        defaultValue={filters.query}
                        onChange={handleSearchChange}
                        aria-label="Search offers"
                    />
                </div>

                {/* Location */}
                <div className="filter-input">
                    <MapPin size={18} />
                    <input
                        type="text"
                        placeholder="Location"
                        value={filters.location}
                        onChange={e => setFilters(prev => ({ ...prev, location: e.target.value }))}
                        aria-label="Filter by location"
                    />
                </div>

                {/* Category Dropdown */}
                <div className="filter-input">
                    <SlidersHorizontal size={18} />
                    <select
                        value={filters.category}
                        onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                        aria-label="Filter by category"
                    >
                        {CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                </div>

                {/* Sort */}
                <div className="filter-input">
                    <Calendar size={18} />
                    <select
                        value={filters.sort}
                        onChange={e => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                        aria-label="Sort offers"
                    >
                        {SORT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* View Toggle + Results Count */}
                <div className="filters-controls">
                    <div className="view-toggle" role="radiogroup" aria-label="View mode">
                        <button
                            className={viewMode === 'grid' ? 'active' : ''}
                            onClick={() => setViewMode('grid')}
                            aria-label="Grid view"
                            aria-checked={viewMode === 'grid'}
                            role="radio"
                        >
                            <Grid3X3 size={18} />
                        </button>
                        <button
                            className={viewMode === 'list' ? 'active' : ''}
                            onClick={() => setViewMode('list')}
                            aria-label="List view"
                            aria-checked={viewMode === 'list'}
                            role="radio"
                        >
                            <List size={18} />
                        </button>
                    </div>
                    <span className="results-count" aria-live="polite">
                        {loading ? '...' : `${totalCount} result${totalCount !== 1 ? 's' : ''}`}
                    </span>
                    <button
                        className="save-btn"
                        onClick={refresh}
                        disabled={loading}
                        aria-label="Refresh results"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                    </button>
                </div>
            </nav>

            {/* ─── ERROR BANNER ─── */}
            {error && (
                <div className="offers-error" role="alert">
                    <AlertCircle size={20} />
                    <span>Failed to load offers: {error}</span>
                    <button onClick={refresh}>Retry</button>
                </div>
            )}

            {/* ─── CONTENT ─── */}
            <section className="offers-content" aria-label="Offers list">
                {loading ? (
                    /* Skeleton Loading State */
                    <div className={`offers-grid`} aria-busy="true" aria-label="Loading offers">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <OfferSkeleton key={i} />
                        ))}
                    </div>
                ) : offers.length === 0 ? (
                    /* Empty State */
                    <motion.div
                        className="offers-empty"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                    >
                        <Package size={72} />
                        <h3>No offers found</h3>
                        <p>
                            {filters.query || filters.category || filters.location
                                ? 'Try adjusting your filters or broadening your search terms.'
                                : 'No offers are available right now. Check back soon!'}
                        </p>
                    </motion.div>
                ) : (
                    /* Offers Grid / List */
                    <motion.div
                        className={viewMode === 'grid' ? 'offers-grid' : 'offers-list'}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        key={`${page}-${filters.query}-${filters.category}-${filters.sort}-${viewMode}`}
                    >
                        <AnimatePresence mode="popLayout">
                            {offers.map((offer, index) => (
                                <OfferCard
                                    key={offer.id}
                                    offer={offer}
                                    index={index}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* ─── PAGINATION ─── */}
                {!loading && offers.length > 0 && totalPages > 1 && (
                    <nav className="offers-pagination" role="navigation" aria-label="Pagination">
                        <button
                            className="page-btn"
                            onClick={prevPage}
                            disabled={page === 1}
                            aria-label="Previous page"
                        >
                            <ChevronLeft size={16} /> Prev
                        </button>

                        {pageNumbers[0] > 1 && (
                            <>
                                <button className="page-btn" onClick={() => goToPage(1)}>1</button>
                                {pageNumbers[0] > 2 && <span className="page-info">…</span>}
                            </>
                        )}

                        {pageNumbers.map(p => (
                            <button
                                key={p}
                                className={`page-btn ${p === page ? 'active' : ''}`}
                                onClick={() => goToPage(p)}
                                aria-label={`Page ${p}`}
                                aria-current={p === page ? 'page' : undefined}
                            >
                                {p}
                            </button>
                        ))}

                        {pageNumbers[pageNumbers.length - 1] < totalPages && (
                            <>
                                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                                    <span className="page-info">…</span>
                                )}
                                <button className="page-btn" onClick={() => goToPage(totalPages)}>
                                    {totalPages}
                                </button>
                            </>
                        )}

                        <button
                            className="page-btn"
                            onClick={nextPage}
                            disabled={page >= totalPages}
                            aria-label="Next page"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </nav>
                )}
            </section>

            {/* ─── SCROLL TO TOP FAB ─── */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        className="scroll-top-fab"
                        onClick={scrollToTop}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        aria-label="Scroll to top"
                    >
                        <ArrowUp size={22} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ─── TOAST ─── */}
            {toast && <ErrorToast {...toast} onClose={hideToast} />}
        </div>
    )
}
