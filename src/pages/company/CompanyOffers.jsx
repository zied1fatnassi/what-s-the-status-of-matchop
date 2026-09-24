import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, BarChart3, Briefcase, FolderArchive, Loader, Pencil, RefreshCw, Search, Trash2, TrendingUp } from 'lucide-react'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { useCompanyOffers } from '../../hooks/useCompanyOffers'
import './CompanyOffers.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

function CompanyOffers() {
    const { t, i18n } = useTranslation()
    const {
        offers,
        loading,
        error,
        filters,
        setFilters,
        pagination,
        setPage,
        analytics,
        trends30d,
        refresh,
        updateOffer,
        toggleStatus,
        deleteOffer
    } = useCompanyOffers()

    const [editOffer, setEditOffer] = useState(null)
    const [editForm, setEditForm] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleteText, setDeleteText] = useState('')
    const [editError, setEditError] = useState(null)
    const [actionError, setActionError] = useState(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [statusBusyId, setStatusBusyId] = useState(null)

    const lineData = useMemo(() => ({
        labels: trends30d.map((point) => point.label),
        datasets: [
            {
                label: t('companyOffers.analytics.rightSwipes'),
                data: trends30d.map((point) => point.right_swipes),
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                tension: 0.35,
                fill: true
            },
            {
                label: t('companyOffers.analytics.acceptedIntros'),
                data: trends30d.map((point) => point.accepted_intros),
                borderColor: '#0d9488',
                backgroundColor: 'rgba(13, 148, 136, 0.2)',
                tension: 0.35,
                fill: true
            },
            {
                label: t('companyOffers.analytics.matches'),
                data: trends30d.map((point) => point.matches),
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.2)',
                tension: 0.35,
                fill: true
            }
        ]
    }), [trends30d, t])

    const barData = useMemo(() => ({
        labels: [
            t('companyOffers.analytics.rightSwipes'),
            t('companyOffers.analytics.pendingIntros'),
            t('companyOffers.analytics.acceptedIntros'),
            t('companyOffers.analytics.matches')
        ],
        datasets: [
            {
                label: t('companyOffers.analytics.lifetimeTitle'),
                data: [
                    analytics.lifetime.right_swipes,
                    analytics.lifetime.pending_intros,
                    analytics.lifetime.accepted_intros,
                    analytics.lifetime.matches
                ],
                backgroundColor: ['#2563eb', '#f59e0b', '#0d9488', '#7c3aed'],
                borderRadius: 8
            }
        ]
    }), [analytics.lifetime, t])

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { position: 'bottom' } }
    }), [])

    const formatDate = (value) => {
        if (!value) return '--'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return '--'
        return date.toLocaleDateString(i18n.language || undefined)
    }

    const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`

    const openEdit = (offer) => {
        setActionError(null)
        setEditError(null)
        setEditOffer(offer)
        setEditForm({
            title: offer.title || '',
            description: offer.description || '',
            req_skills: Array.isArray(offer.req_skills) ? offer.req_skills.join(', ') : '',
            location: offer.location || '',
            salary_range: offer.salary_range || '',
            status: offer.status || 'active'
        })
    }

    const closeEdit = () => {
        if (saving) return
        setEditOffer(null)
        setEditForm(null)
        setEditError(null)
    }

    const closeDelete = () => {
        if (deleting) return
        setDeleteTarget(null)
        setDeleteText('')
    }

    const onSaveEdit = async (event) => {
        event.preventDefault()
        if (!editOffer || !editForm) return
        const title = editForm.title.trim()

        if (!title) {
            setEditError(t('companyOffers.validation.titleRequired'))
            return
        }

        setSaving(true)
        setEditError(null)
        const result = await updateOffer(editOffer.id, {
            title,
            description: editForm.description.trim(),
            req_skills: editForm.req_skills.split(',').map((item) => item.trim()).filter(Boolean),
            location: editForm.location.trim(),
            salary_range: editForm.salary_range.trim(),
            status: editForm.status
        })
        setSaving(false)

        if (result?.error) {
            setEditError(result.error)
            return
        }

        closeEdit()
    }

    const onToggleStatus = async (offer) => {
        setActionError(null)
        setStatusBusyId(offer.id)
        const nextStatus = offer.status === 'active' ? 'closed' : 'active'
        const result = await toggleStatus(offer.id, nextStatus)
        setStatusBusyId(null)

        if (result?.error) {
            setActionError(result.error)
        }
    }

    const onConfirmDelete = async () => {
        if (!deleteTarget) return
        setActionError(null)
        setDeleting(true)
        const result = await deleteOffer(deleteTarget.id)
        setDeleting(false)

        if (result?.error) {
            setActionError(result.error)
            return
        }

        closeDelete()
    }

    const canDelete = !!deleteTarget && deleteText.trim() === deleteTarget.title

    return (
        <div className="company-offers-page">
            <div className="container">
                <div className="company-offers-header">
                    <div>
                        <h1>{t('companyOffers.title')}</h1>
                        <p>{t('companyOffers.subtitle')}</p>
                    </div>
                    <div className="company-offers-header-actions">
                        <button type="button" className="btn btn-secondary" onClick={refresh} disabled={loading}>
                            <RefreshCw size={16} />
                            {t('companyOffers.actions.refresh')}
                        </button>
                        <Link to="/company/archived" className="btn btn-secondary">
                            <FolderArchive size={16} />
                            {t('nav.archived')}
                        </Link>
                        <Link to="/company/post-offer" className="btn btn-primary">
                            <Briefcase size={16} />
                            {t('companyOffers.actions.postOffer')}
                        </Link>
                    </div>
                </div>

                {actionError && (
                    <div className="company-offers-message company-offers-message--error">
                        <AlertCircle size={16} />
                        <span>{actionError}</span>
                    </div>
                )}

                <div className="company-offers-toolbar glass-card">
                    <label className="company-offers-search">
                        <Search size={16} />
                        <input
                            className="input"
                            value={filters.search}
                            onChange={(event) => setFilters({ search: event.target.value })}
                            placeholder={t('companyOffers.filters.searchPlaceholder')}
                            aria-label={t('companyOffers.filters.searchLabel')}
                        />
                    </label>

                    <label className="company-offers-status-filter">
                        <span>{t('companyOffers.filters.statusLabel')}</span>
                        <select className="input" value={filters.status} onChange={(event) => setFilters({ status: event.target.value })}>
                            <option value="all">{t('companyOffers.filters.statusAll')}</option>
                            <option value="active">{t('companyOffers.filters.statusActive')}</option>
                            <option value="closed">{t('companyOffers.filters.statusClosed')}</option>
                        </select>
                    </label>
                </div>

                <div className="company-offers-kpis">
                    <div className="kpi-card glass-card">
                        <span className="kpi-label">{t('companyOffers.analytics.totalOffers')}</span>
                        <strong className="kpi-value">{analytics.lifetime.offers_total}</strong>
                    </div>
                    <div className="kpi-card glass-card">
                        <span className="kpi-label">{t('companyOffers.analytics.rightSwipes')}</span>
                        <strong className="kpi-value">{analytics.lifetime.right_swipes}</strong>
                    </div>
                    <div className="kpi-card glass-card">
                        <span className="kpi-label">{t('companyOffers.analytics.matches')}</span>
                        <strong className="kpi-value">{analytics.lifetime.matches}</strong>
                    </div>
                    <div className="kpi-card glass-card">
                        <span className="kpi-label">{t('companyOffers.analytics.matchRate')}</span>
                        <strong className="kpi-value">{formatPercent(analytics.lifetime.match_rate)}</strong>
                    </div>
                </div>

                <div className="company-offers-charts">
                    <div className="chart-card glass-card">
                        <h3><TrendingUp size={18} /> {t('companyOffers.charts.trendTitle')}</h3>
                        <div className="chart-body">
                            <Line data={lineData} options={chartOptions} />
                        </div>
                    </div>
                    <div className="chart-card glass-card">
                        <h3><BarChart3 size={18} /> {t('companyOffers.charts.funnelTitle')}</h3>
                        <div className="chart-body">
                            <Bar data={barData} options={chartOptions} />
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="company-offers-state glass-card">
                        <Loader className="animate-spin" size={40} />
                        <p>{t('companyOffers.loading')}</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="company-offers-state glass-card company-offers-state--error">
                        <AlertCircle size={40} />
                        <h3>{t('companyOffers.error.loadFailed')}</h3>
                        <p>{error}</p>
                        <button type="button" className="btn btn-primary" onClick={refresh}>
                            <RefreshCw size={16} />
                            {t('common.retry')}
                        </button>
                    </div>
                )}

                {!loading && !error && offers.length === 0 && (
                    <div className="company-offers-state glass-card">
                        <h3>{t('companyOffers.empty.title')}</h3>
                        <p>{t('companyOffers.empty.description')}</p>
                        <Link to="/company/post-offer" className="btn btn-primary">
                            <Briefcase size={16} />
                            {t('companyOffers.actions.postOffer')}
                        </Link>
                    </div>
                )}

                {!loading && !error && offers.length > 0 && (
                    <div className="company-offers-list glass-card">
                        <div className="offers-table-desktop">
                            <table className="offers-table">
                                <thead>
                                    <tr>
                                        <th>{t('companyOffers.table.title')}</th>
                                        <th>{t('companyOffers.table.status')}</th>
                                        <th>{t('companyOffers.table.location')}</th>
                                        <th>{t('companyOffers.table.created')}</th>
                                        <th>{t('companyOffers.table.rightSwipes')}</th>
                                        <th>{t('companyOffers.table.matches')}</th>
                                        <th>{t('companyOffers.table.matchRate')}</th>
                                        <th>{t('companyOffers.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {offers.map((offer) => (
                                        <tr key={offer.id}>
                                            <td className="offer-title-cell">
                                                <strong>{offer.title}</strong>
                                                <span>{offer.salary_range || '--'}</span>
                                            </td>
                                            <td><span className={`status-badge status-${offer.status}`}>{t(`companyOffers.status.${offer.status}`)}</span></td>
                                            <td>{offer.location || '--'}</td>
                                            <td>{formatDate(offer.created_at)}</td>
                                            <td>{offer.metrics.lifetime.right_swipes}</td>
                                            <td>{offer.metrics.lifetime.matches}</td>
                                            <td>{formatPercent(offer.metrics.lifetime.match_rate)}</td>
                                            <td>
                                                <div className="offer-actions">
                                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(offer)}>
                                                        <Pencil size={14} /> {t('companyOffers.actions.edit')}
                                                    </button>
                                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => onToggleStatus(offer)} disabled={statusBusyId === offer.id}>
                                                        {offer.status === 'active' ? t('companyOffers.actions.close') : t('companyOffers.actions.reopen')}
                                                    </button>
                                                    <button type="button" className="btn btn-secondary btn-sm btn-danger-inline" onClick={() => { setDeleteTarget(offer); setDeleteText('') }}>
                                                        <Trash2 size={14} /> {t('companyOffers.actions.delete')}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="offers-mobile-list">
                            {offers.map((offer) => (
                                <article key={offer.id} className="offer-mobile-card">
                                    <div className="offer-mobile-top">
                                        <h3>{offer.title}</h3>
                                        <span className={`status-badge status-${offer.status}`}>{t(`companyOffers.status.${offer.status}`)}</span>
                                    </div>
                                    <p>{offer.location || '--'} • {formatDate(offer.created_at)}</p>
                                    <div className="offer-mobile-metrics">
                                        <span>{t('companyOffers.table.rightSwipes')}: {offer.metrics.lifetime.right_swipes}</span>
                                        <span>{t('companyOffers.table.matches')}: {offer.metrics.lifetime.matches}</span>
                                        <span>{t('companyOffers.table.matchRate')}: {formatPercent(offer.metrics.lifetime.match_rate)}</span>
                                    </div>
                                    <div className="offer-mobile-actions">
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(offer)}>
                                            <Pencil size={14} /> {t('companyOffers.actions.edit')}
                                        </button>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onToggleStatus(offer)} disabled={statusBusyId === offer.id}>
                                            {offer.status === 'active' ? t('companyOffers.actions.close') : t('companyOffers.actions.reopen')}
                                        </button>
                                        <button type="button" className="btn btn-secondary btn-sm btn-danger-inline" onClick={() => { setDeleteTarget(offer); setDeleteText('') }}>
                                            <Trash2 size={14} /> {t('companyOffers.actions.delete')}
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <div className="offers-pagination">
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPage(pagination.page - 1)} disabled={pagination.page <= 1}>
                                {t('companyOffers.pagination.previous')}
                            </button>
                            <span>{t('companyOffers.pagination.pageOf', { page: pagination.page, totalPages: pagination.totalPages })}</span>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
                                {t('companyOffers.pagination.next')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {editOffer && editForm && (
                <div className="company-offers-modal-overlay" onClick={closeEdit}>
                    <div className="company-offers-modal" onClick={(event) => event.stopPropagation()}>
                        <h2>{t('companyOffers.modals.editTitle')}</h2>
                        {editError && (
                            <div className="company-offers-message company-offers-message--error">
                                <AlertCircle size={16} />
                                <span>{editError}</span>
                            </div>
                        )}
                        <form onSubmit={onSaveEdit} className="company-offers-form">
                            <div className="input-group">
                                <label className="input-label">{t('companyOffers.form.title')}</label>
                                <input className="input" value={editForm.title} onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))} required />
                            </div>
                            <div className="input-group">
                                <label className="input-label">{t('companyOffers.form.description')}</label>
                                <textarea className="input textarea" rows={4} value={editForm.description} onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">{t('companyOffers.form.skills')}</label>
                                <input className="input" value={editForm.req_skills} onChange={(event) => setEditForm((prev) => ({ ...prev, req_skills: event.target.value }))} placeholder={t('companyOffers.form.skillsPlaceholder')} />
                            </div>
                            <div className="input-row">
                                <div className="input-group">
                                    <label className="input-label">{t('companyOffers.form.location')}</label>
                                    <input className="input" value={editForm.location} onChange={(event) => setEditForm((prev) => ({ ...prev, location: event.target.value }))} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">{t('companyOffers.form.salary')}</label>
                                    <input className="input" value={editForm.salary_range} onChange={(event) => setEditForm((prev) => ({ ...prev, salary_range: event.target.value }))} />
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="input-label">{t('companyOffers.form.status')}</label>
                                <select className="input" value={editForm.status} onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}>
                                    <option value="active">{t('companyOffers.status.active')}</option>
                                    <option value="closed">{t('companyOffers.status.closed')}</option>
                                </select>
                            </div>
                            <div className="company-offers-form-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeEdit} disabled={saving}>{t('companyOffers.actions.cancel')}</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('companyOffers.actions.saving') : t('companyOffers.actions.save')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="company-offers-modal-overlay" onClick={closeDelete}>
                    <div className="company-offers-modal company-offers-modal--danger" onClick={(event) => event.stopPropagation()}>
                        <h2>{t('companyOffers.modals.deleteTitle')}</h2>
                        <p>{t('companyOffers.modals.deleteWarning', { title: deleteTarget.title })}</p>
                        <p>{t('companyOffers.modals.deleteImpact')}</p>
                        <div className="input-group">
                            <label className="input-label">{t('companyOffers.modals.deleteConfirmLabel')}</label>
                            <input className="input" value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder={t('companyOffers.modals.deleteConfirmPlaceholder')} />
                            <small>{t('companyOffers.modals.deleteConfirmHint')}</small>
                        </div>
                        <div className="company-offers-form-actions">
                            <button type="button" className="btn btn-secondary" onClick={closeDelete} disabled={deleting}>{t('companyOffers.actions.cancel')}</button>
                            <button type="button" className="btn btn-danger" onClick={onConfirmDelete} disabled={!canDelete || deleting}>
                                {deleting ? t('companyOffers.actions.deleting') : t('companyOffers.actions.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CompanyOffers
