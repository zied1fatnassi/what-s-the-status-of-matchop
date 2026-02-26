import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, RefreshCw } from 'lucide-react'
import AuthToast from '../../components/AuthToast'
import { supabase } from '../../lib/supabase'
import './Admin.css'

function normalizeRows(rows, emailByUserId) {
    const statusRank = {
        pending: 0,
        approved: 1,
        rejected: 2
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
    return 'status-pending'
}

export default function AdminPayments() {
    const [rows, setRows] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [actionError, setActionError] = useState('')
    const [toast, setToast] = useState(null)
    const [inFlightId, setInFlightId] = useState(null)
    const [noteById, setNoteById] = useState({})

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
            setActionError(requestsRes.error.message || 'Unable to load payment requests.')
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
    }, [statusFilter])

    useEffect(() => {
        loadPayments()
    }, [loadPayments])

    const handleViewProof = async (objectPath) => {
        if (!objectPath) return

        const proofRes = await supabase
            .storage
            .from('payment_proofs')
            .createSignedUrl(objectPath, 300)

        if (proofRes.error || !proofRes.data?.signedUrl) {
            setToast({
                type: 'error',
                message: proofRes.error?.message || 'Unable to open proof.'
            })
            return
        }

        window.open(proofRes.data.signedUrl, '_blank', 'noopener,noreferrer')
    }

    const handleReview = async (paymentRequestId, action) => {
        setInFlightId(paymentRequestId)
        setActionError('')

        const { data, error } = await supabase.functions.invoke('admin-review-payment', {
            body: {
                paymentRequestId,
                action,
                admin_note: noteById[paymentRequestId] || null
            }
        })

        if (error) {
            const { message } = await parseInvokeError(error)
            setActionError(message)
            setInFlightId(null)
            return
        }

        setToast({
            type: 'success',
            message: `Request ${data.status}.`
        })
        setNoteById((prev) => ({
            ...prev,
            [paymentRequestId]: ''
        }))
        setInFlightId(null)
        await loadPayments()
    }

    const rowsCountLabel = useMemo(() => {
        if (statusFilter === 'all') return `${rows.length} requests`
        return `${rows.length} ${statusFilter} requests`
    }, [rows.length, statusFilter])

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

            <div className="admin-header">
                <h1>D17 Payments Review</h1>
                <p>Review pending premium payment requests and approve/reject submissions.</p>
            </div>

            <div className="admin-toolbar">
                <select
                    className="admin-filter"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                >
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>

                <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={loadPayments}
                    disabled={isLoading}
                >
                    <RefreshCw size={14} className={isLoading ? 'is-spinning' : ''} />
                    Refresh
                </button>
            </div>

            <div className="admin-section">
                <h2>Payment Requests</h2>
                <p className="no-activity">{rowsCountLabel}</p>

                {actionError && <p className="admin-message error">{actionError}</p>}

                {isLoading ? (
                    <p className="no-activity">Loading requests...</p>
                ) : rows.length === 0 ? (
                    <p className="no-activity">No requests found.</p>
                ) : (
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Plan</th>
                                    <th>Amount</th>
                                    <th>Reference</th>
                                    <th>Status</th>
                                    <th>Proof</th>
                                    <th>Created</th>
                                    <th>Review</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.id}>
                                        <td data-label="User">{row.user_email}</td>
                                        <td data-label="Plan">{row.plan_id}</td>
                                        <td data-label="Amount">{row.amount_tnd} {row.currency}</td>
                                        <td data-label="Reference">{row.reference}</td>
                                        <td data-label="Status">
                                            <span className={`status-badge ${mapStatusClass(row.status)}`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td data-label="Proof">
                                            {row.proof_object_path ? (
                                                <button
                                                    type="button"
                                                    className="admin-btn admin-btn-primary admin-btn-sm"
                                                    onClick={() => handleViewProof(row.proof_object_path)}
                                                >
                                                    <Eye size={14} />
                                                    View
                                                </button>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td data-label="Created">
                                            {row.created_at ? new Date(row.created_at).toLocaleString() : '-'}
                                        </td>
                                        <td data-label="Review">
                                            {row.status === 'pending' ? (
                                                <div className="admin-actions-cell">
                                                    <input
                                                        type="text"
                                                        className="admin-search"
                                                        value={noteById[row.id] || ''}
                                                        placeholder="Admin note (optional)"
                                                        onChange={(event) => setNoteById((prev) => ({
                                                            ...prev,
                                                            [row.id]: event.target.value
                                                        }))}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="admin-btn admin-btn-success admin-btn-sm"
                                                        onClick={() => handleReview(row.id, 'approve')}
                                                        disabled={inFlightId === row.id}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="admin-btn admin-btn-danger admin-btn-sm"
                                                        onClick={() => handleReview(row.id, 'reject')}
                                                        disabled={inFlightId === row.id}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span>{row.admin_note || '-'}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
