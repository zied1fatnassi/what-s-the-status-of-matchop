import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Download, FileDown, History, RefreshCw, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AuthToast from '../../components/AuthToast'
import { track } from '../../lib/analytics'
import { fetchPaymentRequestAudit, reviewPaymentRequest } from '../../lib/payments/admin'
import { supabase } from '../../lib/supabase'
import { readStorageJSON, writeStorageJSON } from '../../lib/localStorageState'
import {
    ADMIN_PREMIUM_OVERRIDES_KEY,
    applyQuickFilters,
    buildFilteredPaymentsCsv,
    resolveProofUrl,
    toPreviewPremiumUntil,
} from './adminPaymentsUtils'
import { addNotification, NOTIFICATION_SCOPE_STUDENT } from '../../lib/notifications'
import './Admin.css'

function normalizeRows(rows, emailByUserId) {
    const statusRank = {
        pending: 0,
        approved: 1,
        rejected: 2,
        reverted: 3
    }

    return [...rows]
        .map((row) => ({
            ...row,
            user_email: emailByUserId.get(row.user_id) || row.user_id
        }))
        .sort((a, b) => {
            const rankDiff = (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99)
            if (rankDiff !== 0) return rankDiff

            const aTime = Date.parse(a.created_at || 0)
            const bTime = Date.parse(b.created_at || 0)
            return bTime - aTime
        })
}

async function parseInvokeError(error) {
    if (!error) return { message: 'Request failed', payload: null }

    let payload = null
    if (error.context && typeof error.context.json === 'function') {
        try {
            payload = await error.context.json()
        } catch {
            payload = null
        }
    }

    return {
        message: payload?.message || error.message || 'Request failed',
        payload,
    }
}

function mapStatusClass(status) {
    if (status === 'approved') return 'status-active'
    if (status === 'rejected') return 'status-suspended'
    if (status === 'reverted') return 'status-inactive'
    return 'status-pending'
}

function mapAuditActionClass(action) {
    if (action === 'approved') return 'status-active'
    if (action === 'rejected') return 'status-suspended'
    if (action === 'reverted') return 'status-inactive'
    if (action === 'proof_uploaded') return 'status-proof'
    if (action === 'created') return 'status-created'
    if (action === 'updated') return 'status-updated'
    return 'status-pending'
}

export default function AdminPayments() {
    const { t, i18n } = useTranslation(undefined, { useSuspense: false })
    const [rows, setRows] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [quickFilters, setQuickFilters] = useState({
        needsProof: false,
        pendingOver24h: false,
        repeatedAttempts: false,
    })
    const [expandedId, setExpandedId] = useState(null)
    const [actionError, setActionError] = useState('')
    const [toast, setToast] = useState(null)
    const [inFlightId, setInFlightId] = useState(null)
    const [copiedReferenceId, setCopiedReferenceId] = useState('')
    const [noteById, setNoteById] = useState({})
    const [reviewIntent, setReviewIntent] = useState(null)
    const [premiumOverrides, setPremiumOverrides] = useState(() => readStorageJSON(
        ADMIN_PREMIUM_OVERRIDES_KEY,
        {}
    ))
    const [auditModal, setAuditModal] = useState({
        open: false,
        paymentRequestId: '',
        loading: false,
        rows: [],
        error: ''
    })

    const loadPayments = useCallback(async () => {
        setIsLoading(true)
        setActionError('')

        let query = supabase
            .from('payment_requests')
            .select('id, user_id, plan_id, amount_tnd, currency, d17_phone, reference, proof_object_path, status, admin_note, reviewed_by, reviewed_at, created_at')
            .order('created_at', { ascending: false })
            .limit(300)

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter)
        }

        const requestsRes = await query

        if (requestsRes.error) {
            setRows([])
            setActionError(requestsRes.error.message || t('adminPayments.errors.loadFailed'))
            setIsLoading(false)
            return
        }

        const requestRows = Array.isArray(requestsRes.data) ? requestsRes.data : []
        const userIds = Array.from(new Set(requestRows.map((row) => row.user_id).filter(Boolean)))

        let emailByUserId = new Map()
        if (userIds.length > 0) {
            const profilesRes = await supabase
                .from('profiles')
                .select('id, email')
                .in('id', userIds)

            if (!profilesRes.error && Array.isArray(profilesRes.data)) {
                emailByUserId = new Map(
                    profilesRes.data.map((profile) => [profile.id, profile.email || profile.id])
                )
            }
        }

        setRows(normalizeRows(requestRows, emailByUserId))
        setIsLoading(false)
    }, [statusFilter, t])

    useEffect(() => {
        loadPayments()
    }, [loadPayments])

    const filteredRows = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase()
        const searchedRows = !normalizedSearch
            ? rows
            : rows.filter((row) => (
            row.user_email?.toLowerCase().includes(normalizedSearch) ||
            row.user_id?.toLowerCase().includes(normalizedSearch) ||
            row.reference?.toLowerCase().includes(normalizedSearch)
        ))

        return applyQuickFilters(searchedRows, quickFilters)
    }, [rows, searchTerm, quickFilters])

    const formatDateTime = useCallback((value) => {
        if (!value) return '-'
        return new Intl.DateTimeFormat(i18n.language || 'en', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(value))
    }, [i18n.language])

    const toggleQuickFilter = (filterKey) => {
        setQuickFilters((prev) => ({
            ...prev,
            [filterKey]: !prev[filterKey],
        }))
    }

    const handleCopyReference = async (rowId, reference) => {
        if (!reference) return
        try {
            if (!navigator?.clipboard?.writeText) {
                throw new Error('Clipboard API unavailable')
            }
            await navigator.clipboard.writeText(reference)
            setCopiedReferenceId(rowId)
            setToast({
                type: 'success',
                message: t('adminPayments.toasts.referenceCopied')
            })
            setTimeout(() => setCopiedReferenceId(''), 1800)
        } catch {
            setToast({
                type: 'error',
                message: t('adminPayments.errors.copyReferenceFailed')
            })
        }
    }

    const getSignedProofUrl = useCallback(async (objectPath) => {
        const proofRes = await supabase
            .storage
            .from('payment_proofs')
            .createSignedUrl(objectPath, 300)

        return {
            signedUrl: proofRes.data?.signedUrl || '',
            error: proofRes.error?.message || null
        }
    }, [])

    const handleDownloadProof = async (proofObjectPath) => {
        try {
            const resolved = await resolveProofUrl(proofObjectPath, getSignedProofUrl)
            if (!resolved.url) {
                setToast({
                    type: 'error',
                    message: t('adminPayments.errors.openProofFailed')
                })
                return
            }

            const opened = window.open(resolved.url, '_blank', 'noopener,noreferrer')
            if (!opened) {
                setToast({
                    type: 'error',
                    message: t('adminPayments.errors.openProofFailed')
                })
                return
            }

            setToast({
                type: 'success',
                message: t('adminPayments.toasts.proofOpened')
            })
        } catch {
            setToast({
                type: 'error',
                message: t('adminPayments.errors.openProofFailed')
            })
        }
    }

    const handleReview = async (paymentRequestId, action) => {
        setInFlightId(paymentRequestId)
        setActionError('')

        const note = noteById[paymentRequestId] || null
        const { data, error } = await reviewPaymentRequest({
            paymentRequestId,
            action,
            admin_note: note
        })

        if (error) {
            const { message } = await parseInvokeError(error)
            setActionError(message)
            setInFlightId(null)
            return false
        }

        setToast({
            type: 'success',
            message: t('adminPayments.toasts.requestUpdated', { status: data.status })
        })
        if (action === 'revert') {
            track('admin_payment_reverted', {
                paymentRequestId,
                note
            })
        } else if (action === 'approve') {
            addNotification(NOTIFICATION_SCOPE_STUDENT, {
                title: 'Payment approved',
                body: 'Your payment was approved by admin.',
                read: false,
            })
        }
        setNoteById((prev) => ({
            ...prev,
            [paymentRequestId]: ''
        }))
        setInFlightId(null)
        await loadPayments()
        return true
    }

    const storePremiumOverride = (userId, plan) => {
        if (!userId) return ''
        const until = toPreviewPremiumUntil(plan)
        const next = {
            ...premiumOverrides,
            [userId]: {
                until,
                plan,
            }
        }
        setPremiumOverrides(next)
        writeStorageJSON(ADMIN_PREMIUM_OVERRIDES_KEY, next)
        return until
    }

    const handleApproveWithPreset = async (row, plan) => {
        if (!row?.id) return
        const approved = await handleReview(row.id, 'approve')
        if (!approved) return

        const until = storePremiumOverride(row.user_id, plan)
        if (!until) return

        setToast({
            type: 'success',
            message: t('adminPayments.toasts.previewPremiumExtended', {
                plan: t(`adminPayments.planPresets.${plan}`),
                until: formatDateTime(until),
            })
        })
    }

    const handleExportCsv = () => {
        const csvContent = buildFilteredPaymentsCsv(filteredRows)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const exportUrl = URL.createObjectURL(blob)
        const fileName = `matchop-admin-payments-${new Date().toISOString().slice(0, 10)}.csv`
        const downloadAnchor = document.createElement('a')
        downloadAnchor.href = exportUrl
        downloadAnchor.download = fileName
        document.body.appendChild(downloadAnchor)
        downloadAnchor.click()
        downloadAnchor.remove()
        URL.revokeObjectURL(exportUrl)
        setToast({
            type: 'success',
            message: t('adminPayments.toasts.csvExported')
        })
    }

    const rowsCountLabel = useMemo(() => {
        if (statusFilter === 'all') {
            return t('adminPayments.counts.all', { count: filteredRows.length })
        }
        return t('adminPayments.counts.filtered', { count: filteredRows.length, status: statusFilter })
    }, [filteredRows.length, statusFilter, t])

    const handleOpenAudit = async (paymentRequestId) => {
        track('admin_payment_audit_opened', { paymentRequestId })
        setAuditModal({
            open: true,
            paymentRequestId,
            loading: true,
            rows: [],
            error: ''
        })

        const auditRes = await fetchPaymentRequestAudit(paymentRequestId)
        if (auditRes.error) {
            setAuditModal({
                open: true,
                paymentRequestId,
                loading: false,
                rows: [],
                error: auditRes.error.message || t('adminPayments.errors.auditLoadFailed')
            })
            return
        }

        setAuditModal({
            open: true,
            paymentRequestId,
            loading: false,
            rows: Array.isArray(auditRes.data) ? auditRes.data : [],
            error: ''
        })
    }

    const handleConfirmReview = async () => {
        if (!reviewIntent?.id || !reviewIntent?.action) return
        if (reviewIntent.action === 'revert') {
            track('admin_payment_revert_requested', {
                paymentRequestId: reviewIntent.id
            })
        }
        const didSucceed = await handleReview(reviewIntent.id, reviewIntent.action)
        if (didSucceed) {
            setReviewIntent(null)
        }
    }

    return (
        <div className="admin-container">
            {toast && (
                <AuthToast
                    type={toast.type}
                    message={toast.message}
                    duration={3000}
                    onClose={() => setToast(null)}
                />
            )}

            {reviewIntent && (
                <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label={t(`adminPayments.actions.${reviewIntent.action}`)}>
                    <div className="admin-modal admin-review-modal">
                        <h2>{reviewIntent.action === 'revert'
                            ? t('adminPayments.revertConfirm.title')
                            : t(`adminPayments.actions.${reviewIntent.action}`)}
                        </h2>
                        <p className="checkout-inline-subtitle">
                            {t('adminPayments.fields.reference')}: {reviewIntent.reference || '-'}
                        </p>
                        {reviewIntent.action === 'revert' && (
                            <p className="checkout-inline-subtitle">
                                {t('adminPayments.revertConfirm.body')}
                            </p>
                        )}
                        <div className="admin-modal-actions">
                            <button
                                type="button"
                                className="admin-btn admin-btn-secondary"
                                onClick={() => setReviewIntent(null)}
                                disabled={inFlightId === reviewIntent.id}
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="button"
                                className={`admin-btn ${reviewIntent.action === 'approve' ? 'admin-btn-success' : 'admin-btn-danger'}`}
                                onClick={handleConfirmReview}
                                disabled={inFlightId === reviewIntent.id}
                            >
                                {inFlightId === reviewIntent.id
                                    ? t('common.continue')
                                    : (reviewIntent.action === 'revert'
                                        ? t('adminPayments.actions.undoApproval')
                                        : t(`adminPayments.actions.${reviewIntent.action}`))}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {auditModal.open && (
                <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label={t('adminPayments.auditModal.title')}>
                    <div className="admin-modal admin-audit-modal">
                        <div className="admin-proof-modal-header">
                            <h2>{t('adminPayments.auditModal.title')}</h2>
                            <button
                                type="button"
                                className="admin-btn admin-btn-secondary admin-btn-sm"
                                onClick={() => setAuditModal({
                                    open: false,
                                    paymentRequestId: '',
                                    loading: false,
                                    rows: [],
                                    error: ''
                                })}
                                aria-label={t('adminPayments.auditModal.closeAria')}
                            >
                                <X size={14} />
                                {t('common.close')}
                            </button>
                        </div>
                        {auditModal.paymentRequestId && (
                            <p className="checkout-inline-subtitle">
                                {t('adminPayments.auditModal.paymentRequestId')}: {auditModal.paymentRequestId}
                            </p>
                        )}
                        {auditModal.loading ? (
                            <p className="checkout-inline-subtitle">{t('adminPayments.auditModal.loading')}</p>
                        ) : auditModal.error ? (
                            <p className="checkout-inline-subtitle checkout-error-note">{auditModal.error}</p>
                        ) : auditModal.rows.length === 0 ? (
                            <p className="checkout-inline-subtitle">{t('adminPayments.auditModal.empty')}</p>
                        ) : (
                            <div className="admin-audit-list">
                                {auditModal.rows.map((row) => (
                                    <article key={row.id} className="admin-audit-item">
                                        <div className="admin-audit-row">
                                            <span className={`status-badge ${mapAuditActionClass(row.action)}`}>
                                                {t(`adminPayments.auditActions.${row.action}`)}
                                            </span>
                                            <span className="admin-status-meta">{formatDateTime(row.created_at)}</span>
                                        </div>
                                        <p className="admin-audit-meta">
                                            {t('adminPayments.auditModal.actor')}: {row.actor || '-'}
                                        </p>
                                        {row.note && <p className="admin-audit-meta">{row.note}</p>}
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="admin-header">
                <h1>{t('adminPayments.title')}</h1>
                <p>{t('adminPayments.subtitle')}</p>
            </div>

            <div className="admin-toolbar admin-toolbar-compact">
                <div className="admin-toolbar-main">
                    <div className="admin-search-wrap">
                        <Search size={16} />
                        <input
                            type="search"
                            className="admin-search"
                            value={searchTerm}
                            placeholder={t('adminPayments.searchPlaceholder')}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            aria-label={t('adminPayments.searchAria')}
                        />
                    </div>
                    <select
                        className="admin-filter"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        aria-label={t('adminPayments.filterAria')}
                    >
                        <option value="all">{t('adminPayments.filters.all')}</option>
                        <option value="pending">{t('adminPayments.filters.pending')}</option>
                        <option value="approved">{t('adminPayments.filters.approved')}</option>
                        <option value="rejected">{t('adminPayments.filters.rejected')}</option>
                        <option value="reverted">{t('adminPayments.filters.reverted')}</option>
                    </select>
                    <div className="admin-quick-filter-chips" role="group" aria-label={t('adminPayments.quickFilters.ariaLabel')}>
                        <button
                            type="button"
                            className={`admin-chip ${quickFilters.needsProof ? 'active' : ''}`}
                            onClick={() => toggleQuickFilter('needsProof')}
                        >
                            {t('adminPayments.quickFilters.needsProof')}
                        </button>
                        <button
                            type="button"
                            className={`admin-chip ${quickFilters.pendingOver24h ? 'active' : ''}`}
                            onClick={() => toggleQuickFilter('pendingOver24h')}
                        >
                            {t('adminPayments.quickFilters.pendingOver24h')}
                        </button>
                        <button
                            type="button"
                            className={`admin-chip ${quickFilters.repeatedAttempts ? 'active' : ''}`}
                            onClick={() => toggleQuickFilter('repeatedAttempts')}
                        >
                            {t('adminPayments.quickFilters.repeatedAttempts')}
                        </button>
                    </div>
                </div>
                <div className="admin-toolbar-actions">
                    <p className="admin-toolbar-count">{rowsCountLabel}</p>
                    <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={handleExportCsv}
                        disabled={filteredRows.length === 0}
                    >
                        <FileDown size={14} />
                        {t('adminPayments.actions.exportCsv')}
                    </button>
                    <button
                        type="button"
                        className="admin-btn admin-btn-primary"
                        onClick={loadPayments}
                        disabled={isLoading}
                    >
                        <RefreshCw size={14} className={isLoading ? 'is-spinning' : ''} />
                        {t('adminPayments.refresh')}
                    </button>
                </div>
            </div>
            <p className="admin-preview-note">{t('adminPayments.previewNote')}</p>

            <div className="admin-section">
                <h2>{t('adminPayments.sectionTitle')}</h2>

                {actionError && <p className="admin-message error">{actionError}</p>}

                {isLoading ? (
                    <p className="no-activity">{t('adminPayments.loading')}</p>
                ) : filteredRows.length === 0 ? (
                    <p className="no-activity">{t('adminPayments.empty')}</p>
                ) : (
                    <div className="admin-table-container">
                        <table className="admin-table admin-table-compact">
                            <thead>
                                <tr>
                                    <th>{t('adminPayments.columns.user')}</th>
                                    <th>{t('adminPayments.columns.plan')}</th>
                                    <th>{t('adminPayments.columns.status')}</th>
                                    <th>{t('adminPayments.columns.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((row) => {
                                    const isExpanded = expandedId === row.id
                                    return (
                                        <Fragment key={row.id}>
                                            <tr>
                                                <td data-label={t('adminPayments.columns.user')}>
                                                    <div className="admin-user-cell">
                                                        <strong>{row.user_email}</strong>
                                                        <span>{t('adminPayments.fields.reference')}: {row.reference}</span>
                                                    </div>
                                                </td>
                                                <td data-label={t('adminPayments.columns.plan')}>
                                                    <div className="admin-plan-cell">
                                                        <strong>{row.plan_id}</strong>
                                                        <span>{row.amount_tnd} {row.currency}</span>
                                                        <span>
                                                            {t('adminPayments.columns.created')}: {formatDateTime(row.created_at)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td data-label={t('adminPayments.columns.status')}>
                                                    <div className="admin-status-cell">
                                                        <span className={`status-badge ${mapStatusClass(row.status)}`}>
                                                            {row.status}
                                                        </span>
                                                        {row.reviewed_at && (
                                                            <span className="admin-status-meta">
                                                                {formatDateTime(row.reviewed_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td data-label={t('adminPayments.columns.actions')}>
                                                    <div className="admin-row-actions">
                                                        <button
                                                            type="button"
                                                            className="admin-btn admin-btn-secondary admin-btn-sm"
                                                            onClick={() => handleOpenAudit(row.id)}
                                                        >
                                                            <History size={14} />
                                                            {t('adminPayments.actions.viewAudit')}
                                                        </button>
                                                        {row.proof_object_path && (
                                                            <button
                                                                type="button"
                                                                className="admin-btn admin-btn-secondary admin-btn-sm"
                                                                onClick={() => handleDownloadProof(row.proof_object_path)}
                                                            >
                                                                <Download size={14} />
                                                                {t('adminPayments.actions.downloadProof')}
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="admin-btn admin-btn-secondary admin-btn-sm"
                                                            onClick={() => handleCopyReference(row.id, row.reference)}
                                                        >
                                                            <Copy size={14} />
                                                            {copiedReferenceId === row.id
                                                                ? t('adminPayments.actions.copied')
                                                                : t('adminPayments.actions.copyReference')}
                                                        </button>
                                                        {row.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="admin-btn admin-btn-success admin-btn-sm"
                                                                    onClick={() => setReviewIntent({
                                                                        id: row.id,
                                                                        action: 'approve',
                                                                        reference: row.reference
                                                                    })}
                                                                    disabled={inFlightId === row.id}
                                                                >
                                                                    {t('adminPayments.actions.approve')}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="admin-btn admin-btn-secondary admin-btn-danger-outline admin-btn-sm"
                                                                    onClick={() => setReviewIntent({
                                                                        id: row.id,
                                                                        action: 'reject',
                                                                        reference: row.reference
                                                                    })}
                                                                    disabled={inFlightId === row.id}
                                                                >
                                                                    {t('adminPayments.actions.reject')}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="admin-btn admin-btn-secondary admin-btn-sm"
                                                                    onClick={() => handleApproveWithPreset(row, 'month')}
                                                                    disabled={inFlightId === row.id}
                                                                >
                                                                    {t('adminPayments.actions.approveExtendMonth')}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="admin-btn admin-btn-secondary admin-btn-sm"
                                                                    onClick={() => handleApproveWithPreset(row, 'year')}
                                                                    disabled={inFlightId === row.id}
                                                                >
                                                                    {t('adminPayments.actions.approveExtendYear')}
                                                                </button>
                                                            </>
                                                        )}
                                                        {row.status === 'approved' && (
                                                            <button
                                                                type="button"
                                                                className="admin-btn admin-btn-danger admin-btn-sm"
                                                                onClick={() => setReviewIntent({
                                                                    id: row.id,
                                                                    action: 'revert',
                                                                    reference: row.reference
                                                                })}
                                                                disabled={inFlightId === row.id}
                                                            >
                                                                {t('adminPayments.actions.undoApproval')}
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="admin-btn admin-btn-secondary admin-btn-sm"
                                                            onClick={() => setExpandedId(isExpanded ? null : row.id)}
                                                        >
                                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                            {isExpanded ? t('adminPayments.actions.hideDetails') : t('adminPayments.actions.showDetails')}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="admin-details-row">
                                                    <td colSpan={4}>
                                                        <div className="admin-details-grid">
                                                            <div>
                                                                <dt>{t('adminPayments.fields.reference')}</dt>
                                                                <dd>{row.reference}</dd>
                                                            </div>
                                                            <div>
                                                                <dt>{t('adminPayments.fields.userId')}</dt>
                                                                <dd>{row.user_id}</dd>
                                                            </div>
                                                            <div>
                                                                <dt>{t('adminPayments.fields.d17Phone')}</dt>
                                                                <dd>{row.d17_phone}</dd>
                                                            </div>
                                                            <div>
                                                                <dt>{t('adminPayments.fields.proofPath')}</dt>
                                                                <dd>{row.proof_object_path || '-'}</dd>
                                                            </div>
                                                            <div>
                                                                <dt>{t('adminPayments.fields.reviewedAt')}</dt>
                                                                <dd>{formatDateTime(row.reviewed_at)}</dd>
                                                            </div>
                                                            <div>
                                                                <dt>{t('adminPayments.fields.adminNote')}</dt>
                                                                <dd>{row.admin_note || '-'}</dd>
                                                            </div>
                                                            <div>
                                                                <dt>{t('adminPayments.fields.previewPremium')}</dt>
                                                                <dd>
                                                                    {premiumOverrides[row.user_id]
                                                                        ? t('adminPayments.previewPlanValue', {
                                                                            plan: t(`adminPayments.planPresets.${premiumOverrides[row.user_id].plan}`),
                                                                            until: formatDateTime(premiumOverrides[row.user_id].until),
                                                                        })
                                                                        : '-'}
                                                                </dd>
                                                            </div>
                                                        </div>
                                                        {row.status === 'pending' && (
                                                            <div className="admin-details-note">
                                                                <label htmlFor={`admin-note-${row.id}`}>{t('adminPayments.fields.addNote')}</label>
                                                                <input
                                                                    id={`admin-note-${row.id}`}
                                                                    type="text"
                                                                    className="admin-search"
                                                                    value={noteById[row.id] || ''}
                                                                    placeholder={t('adminPayments.fields.notePlaceholder')}
                                                                    onChange={(event) => setNoteById((prev) => ({
                                                                        ...prev,
                                                                        [row.id]: event.target.value
                                                                    }))}
                                                                />
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
