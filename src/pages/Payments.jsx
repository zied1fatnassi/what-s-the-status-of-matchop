import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AuthToast from '../components/AuthToast'
import { useAuth } from '../context/AuthContext'
import { getEntitlements } from '../lib/premiumEntitlements'
import { supabase } from '../lib/supabase'
import './Checkout.css'
import './Payments.css'

function Payments() {
    const { t } = useTranslation(undefined, { useSuspense: false })
    const { user, profile } = useAuth()
    const entitlements = getEntitlements(profile)
    const [requests, setRequests] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')
    const [toast, setToast] = useState(null)

    const loadRequests = useCallback(async () => {
        if (!user?.id) {
            setRequests([])
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setErrorMessage('')

        const { data, error } = await supabase
            .from('payment_requests')
            .select('id, plan_id, amount_tnd, currency, d17_phone, reference, proof_object_path, status, admin_note, reviewed_at, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
            setErrorMessage(error.message || 'Unable to load payment history.')
            setRequests([])
            setIsLoading(false)
            return
        }

        setRequests(Array.isArray(data) ? data : [])
        setIsLoading(false)
    }, [user?.id])

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
                message: signedRes.error?.message || 'Unable to preview proof.'
            })
            return
        }

        window.open(signedRes.data.signedUrl, '_blank', 'noopener,noreferrer')
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
                        <h1>My payments</h1>
                        <p>Track your D17 payment requests and review status.</p>
                        <p className="payments-status">Premium status: {entitlements.premiumStatusLabel}</p>
                    </div>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={loadRequests}
                        disabled={isLoading}
                    >
                        <RefreshCw size={14} className={isLoading ? 'is-spinning' : ''} />
                        Refresh
                    </button>
                </header>

                {errorMessage && (
                    <p className="payments-error">{errorMessage}</p>
                )}

                {isLoading ? (
                    <p className="payments-empty">Loading payment requests...</p>
                ) : requests.length === 0 ? (
                    <p className="payments-empty">No payment requests yet.</p>
                ) : (
                    <div className="payments-list">
                        {requests.map((request) => (
                            <article key={request.id} className="payments-card">
                                <div className="payments-card-header">
                                    <div className="payments-card-title-wrap">
                                        <h2 className="payments-card-title">{request.reference}</h2>
                                        <p className="payments-card-subtitle">
                                            {request.plan_id} plan - {request.amount_tnd} {request.currency}
                                        </p>
                                    </div>
                                    <span className={`status-badge status-${request.status}`}>
                                        {request.status}
                                    </span>
                                </div>
                                <div className="payments-meta-row">
                                    <span>Submitted: {request.created_at ? new Date(request.created_at).toLocaleString() : '-'}</span>
                                    <span>D17: {request.d17_phone}</span>
                                    {request.reviewed_at && (
                                        <span>Reviewed: {new Date(request.reviewed_at).toLocaleString()}</span>
                                    )}
                                </div>

                                {request.status === 'pending' && (
                                    <p className="payments-pending-hint">
                                        {t('checkout.status.pending.detailWithProof')}
                                    </p>
                                )}

                                {request.admin_note && (
                                    <p className="payments-admin-note">{request.admin_note}</p>
                                )}

                                <div className="payments-card-actions">
                                    <Link to={`/checkout?plan=${request.plan_id}&source=payments`} className="btn btn-secondary">
                                        Open checkout
                                    </Link>
                                    {request.proof_object_path && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => handleViewProof(request.proof_object_path)}
                                        >
                                            <Eye size={14} />
                                            View proof
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}

export default Payments
