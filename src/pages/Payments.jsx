import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AuthToast from '../components/AuthToast'
import { useAuth } from '../context/AuthContext'
import { track } from '../lib/analytics'
import { fetchPaymentRequestAudit } from '../lib/payments/admin'
import { getEntitlements } from '../lib/premiumEntitlements'
import { supabase } from '../lib/supabase'
import './Checkout.css'
import './Payments.css'

function Payments() {
    const { t } = useTranslation(undefined, { useSuspense: false })
    const { user, profile } = useAuth()
    const userId = user?.id || null
    const entitlements = getEntitlements(profile)
    const [requests, setRequests] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')
    const [toast, setToast] = useState(null)
    const [auditLoadingById, setAuditLoadingById] = useState({})
    const [auditOpenById, setAuditOpenById] = useState({})
    const [auditRowsById, setAuditRowsById] = useState({})

    const loadRequests = useCallback(async () => {
        if (!userId) {
            setRequests([])
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setErrorMessage('')

        const { data, error } = await supabase
            .from('payment_requests')
            .select('id, plan_id, amount_tnd, currency, d17_phone, reference, proof_object_path, status, admin_note, reviewed_at, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) {
            setErrorMessage(error.message || t('payments.errors.loadFailed'))
            setRequests([])
            setIsLoading(false)
            return
        }

        setRequests(Array.isArray(data) ? data : [])
        setIsLoading(false)
    }, [t, userId])

    useEffect(() => {
        loadRequests()
    }, [loadRequests])

    const handleViewProof = async (objectPath) => {
        if (!objectPath) return

        const signedRes = await supabase
            .storage
            .from('payment_proofs')
            .createSignedUrl(objectPath, 300)

        if (signedRes.error || !signedRes.data?.signedUrl) {
            setToast({
                type: 'error',
                message: signedRes.error?.message || t('payments.errors.previewFailed')
            })
            return
        }

        window.open(signedRes.data.signedUrl, '_blank', 'noopener,noreferrer')
    }

    const handleToggleAudit = async (paymentRequestId) => {
        const nextOpen = !auditOpenById[paymentRequestId]
        setAuditOpenById((prev) => ({
            ...prev,
            [paymentRequestId]: nextOpen
        }))

        if (nextOpen) {
            track('student_payment_history_opened', { paymentRequestId })
        }

        if (!nextOpen || auditRowsById[paymentRequestId]) {
            return
        }

        setAuditLoadingById((prev) => ({
            ...prev,
            [paymentRequestId]: true
        }))

        const auditRes = await fetchPaymentRequestAudit(paymentRequestId)
        if (auditRes.error) {
            setToast({
                type: 'error',
                message: auditRes.error.message || t('payments.errors.auditLoadFailed')
            })
            setAuditLoadingById((prev) => ({
                ...prev,
                [paymentRequestId]: false
            }))
            return
        }

        setAuditRowsById((prev) => ({
            ...prev,
            [paymentRequestId]: Array.isArray(auditRes.data) ? auditRes.data : []
        }))
        setAuditLoadingById((prev) => ({
            ...prev,
            [paymentRequestId]: false
        }))
    }

    return (
        <section className="payments-page">
            {toast && (
                <AuthToast
                    type={toast.type}
                    message={toast.message}
                    duration={3000}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="payments-shell glass-card">
                <header className="payments-header">
                    <div>
                        <h1>{t('payments.title')}</h1>
                        <p>{t('payments.subtitle')}</p>
                        <p className="payments-status">
                            {t('payments.premiumStatus')}: {entitlements.premiumStatusLabel}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={loadRequests}
                        disabled={isLoading}
                    >
                        <RefreshCw size={14} className={isLoading ? 'is-spinning' : ''} />
                        {t('payments.actions.refresh')}
                    </button>
                </header>

                {errorMessage && (
                    <p className="payments-error">{errorMessage}</p>
                )}

                {isLoading ? (
                    <p className="payments-empty">{t('payments.loading')}</p>
                ) : requests.length === 0 ? (
                    <p className="payments-empty">{t('payments.empty')}</p>
                ) : (
                    <div className="payments-list">
                        {requests.map((request) => (
                            <article key={request.id} className="payments-card">
                                <div className="payments-card-header">
                                    <div className="payments-card-title-wrap">
                                        <h2 className="payments-card-title">{request.reference}</h2>
                                        <p className="payments-card-subtitle">
                                            {t('payments.planAmount', {
                                                planId: request.plan_id,
                                                amount: request.amount_tnd,
                                                currency: request.currency
                                            })}
                                        </p>
                                    </div>
                                    <span className={`status-badge status-${request.status}`}>
                                        {request.status}
                                    </span>
                                </div>
                                <div className="payments-meta-row">
                                    <span>
                                        {t('payments.labels.submitted')}: {request.created_at ? new Date(request.created_at).toLocaleString() : '-'}
                                    </span>
                                    <span>{t('payments.labels.d17')}: {request.d17_phone}</span>
                                    {request.reviewed_at && (
                                        <span>
                                            {t('payments.labels.reviewed')}: {new Date(request.reviewed_at).toLocaleString()}
                                        </span>
                                    )}
                                </div>

                                {request.status === 'pending' && (
                                    <p className="payments-pending-hint">
                                        {t('payments.pendingHint')}
                                    </p>
                                )}

                                {request.admin_note && (
                                    <p className="payments-admin-note">{request.admin_note}</p>
                                )}

                                <div className="payments-card-actions">
                                    <Link to={`/checkout?plan=${request.plan_id}&source=payments`} className="btn btn-secondary">
                                        {t('payments.actions.openCheckout')}
                                    </Link>
                                    {request.proof_object_path && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => handleViewProof(request.proof_object_path)}
                                        >
                                            <Eye size={14} />
                                            {t('payments.actions.viewProof')}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => handleToggleAudit(request.id)}
                                    >
                                        {auditOpenById[request.id]
                                            ? t('payments.actions.hideHistory')
                                            : t('payments.actions.viewHistory')}
                                    </button>
                                </div>

                                {auditOpenById[request.id] && (
                                    <div className="payments-history">
                                        {auditLoadingById[request.id] ? (
                                            <p className="payments-muted">{t('payments.history.loading')}</p>
                                        ) : (auditRowsById[request.id]?.length ?? 0) === 0 ? (
                                            <p className="payments-muted">{t('payments.history.empty')}</p>
                                        ) : (
                                            auditRowsById[request.id].map((auditRow) => (
                                                <div key={auditRow.id} className="payments-history-row">
                                                    <span className={`payments-chip status-badge status-${auditRow.action}`}>
                                                        {auditRow.action}
                                                    </span>
                                                    <span className="payments-muted">
                                                        {auditRow.created_at ? new Date(auditRow.created_at).toLocaleString() : '-'}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}

export default Payments
