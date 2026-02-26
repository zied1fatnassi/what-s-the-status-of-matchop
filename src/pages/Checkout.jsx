import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck, CircleAlert, Loader2, Phone, RefreshCw, UploadCloud } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthToast from '../components/AuthToast'
import { CURRENCY, PLANS } from '../config/pricing'
import { useAuth } from '../context/AuthContext'
import { track } from '../lib/analytics'
import { getProvider } from '../lib/payments'
import { getEntitlements } from '../lib/premiumEntitlements'
import { supabase } from '../lib/supabase'
import './Checkout.css'

const DEFAULT_PLAN_ID = 'monthly'
const ACCEPTED_PROOF_TYPES = ['image/', 'application/pdf']

function resolvePlan(planId) {
    if (!planId) return PLANS[DEFAULT_PLAN_ID]
    if (planId === PLANS.yearly.id) return PLANS.yearly
    return PLANS.monthly
}

function normalizePaymentRequestRow(row) {
    if (!row) return null

    return {
        id: row.id,
        plan_id: row.plan_id,
        amount_tnd: Number(row.amount_tnd ?? 0),
        currency: row.currency || CURRENCY,
        d17_phone: row.d17_phone || '+21652460278',
        reference: row.reference || '',
        proof_object_path: row.proof_object_path || null,
        status: row.status || 'pending',
        admin_note: row.admin_note || null,
        reviewed_at: row.reviewed_at || null,
        created_at: row.created_at || null,
    }
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

function getStatusMeta(status) {
    if (status === 'approved') {
        return {
            className: 'status-approved',
            label: 'Approved',
            detail: 'Payment approved. Premium should be active after status refresh.'
        }
    }

    if (status === 'rejected') {
        return {
            className: 'status-rejected',
            label: 'Rejected',
            detail: 'Payment rejected. Review admin note and submit a new request.'
        }
    }

    return {
        className: 'status-pending',
        label: 'Pending',
        detail: 'Awaiting admin review. Upload proof if you have not uploaded it yet.'
    }
}

function isProofFileAccepted(file) {
    if (!file) return false
    return ACCEPTED_PROOF_TYPES.some((typePrefix) => file.type?.startsWith(typePrefix))
}

function Checkout() {
    const isPremiumWaitlistMode = import.meta.env.VITE_PREMIUM_WAITLIST_MODE === 'true'
    const [searchParams] = useSearchParams()
    const { user, profile, refreshProfile } = useAuth()
    const [paymentRequest, setPaymentRequest] = useState(null)
    const [isLoadingRequest, setIsLoadingRequest] = useState(false)
    const [isFetchingRequest, setIsFetchingRequest] = useState(true)
    const [selectedFile, setSelectedFile] = useState(null)
    const [isUploadingProof, setIsUploadingProof] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [toast, setToast] = useState(null)
    const fileInputRef = useRef(null)

    const source = searchParams.get('source') || 'direct'
    const plan = resolvePlan(searchParams.get('plan'))
    const provider = useMemo(() => getProvider(), [])
    const entitlements = getEntitlements(profile)
    const statusMeta = getStatusMeta(paymentRequest?.status)
    const canCreateRequest = !isLoadingRequest && paymentRequest?.status !== 'pending'
    const canUploadProof = paymentRequest?.status === 'pending'

    useEffect(() => {
        track('checkout_provider_selected', { provider: provider.id })
    }, [provider.id])

    const loadLatestRequest = useCallback(async () => {
        if (!user?.id) {
            setPaymentRequest(null)
            setIsFetchingRequest(false)
            return
        }

        setIsFetchingRequest(true)
        setErrorMessage('')

        const requestRes = await supabase
            .from('payment_requests')
            .select('id, plan_id, amount_tnd, currency, d17_phone, reference, proof_object_path, status, admin_note, reviewed_at, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (requestRes.error) {
            setErrorMessage(requestRes.error.message || 'Unable to load payment requests right now.')
            setIsFetchingRequest(false)
            return
        }

        const rows = Array.isArray(requestRes.data) ? requestRes.data : []
        const pending = rows.find((row) => row.status === 'pending')
        const latest = pending || rows[0] || null
        setPaymentRequest(normalizePaymentRequestRow(latest))
        setIsFetchingRequest(false)
    }, [user?.id])

    useEffect(() => {
        loadLatestRequest()
    }, [loadLatestRequest])

    const handleCreatePaymentRequest = async () => {
        if (!user?.id) return

        setIsLoadingRequest(true)
        setErrorMessage('')

        const { data, error } = await supabase.functions.invoke('create-d17-payment-request', {
            body: {
                plan_id: plan.id
            }
        })

        if (error) {
            const { message, payload } = await parseInvokeError(error)
            if (payload?.code === 'PENDING_EXISTS' && payload?.payment_request) {
                setPaymentRequest(normalizePaymentRequestRow(payload.payment_request))
                setToast({
                    type: 'info',
                    message: 'You already have a pending payment request. Upload proof or wait for review.'
                })
            } else {
                setErrorMessage(message)
            }
            setIsLoadingRequest(false)
            return
        }

        setPaymentRequest(normalizePaymentRequestRow({
            id: data.paymentRequestId,
            plan_id: data.plan_id || plan.id,
            amount_tnd: data.amount_tnd,
            currency: data.currency,
            d17_phone: data.d17_phone,
            reference: data.reference,
            status: data.status,
            created_at: data.created_at,
            proof_object_path: null,
            admin_note: null,
            reviewed_at: null
        }))
        track('manual_payment_requested', {
            planId: data.plan_id || plan.id,
            source,
            paymentRequestId: data.paymentRequestId
        })
        setToast({
            type: 'success',
            message: 'Payment request created. Continue by uploading proof.'
        })
        setIsLoadingRequest(false)
    }

    const handleProofFileChange = (event) => {
        const file = event.target.files?.[0] || null
        if (!file) {
            setSelectedFile(null)
            return
        }

        if (!isProofFileAccepted(file)) {
            setSelectedFile(null)
            setErrorMessage('Unsupported proof file type. Upload an image or PDF only.')
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
        }

        setErrorMessage('')
        setSelectedFile(file)
    }

    const handleUploadProof = async () => {
        if (!user?.id || !paymentRequest?.id || !selectedFile) return

        setIsUploadingProof(true)
        setErrorMessage('')

        const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const objectPath = `${user.id}/${paymentRequest.id}/${Date.now()}-${safeFileName}`

        const uploadRes = await supabase
            .storage
            .from('payment_proofs')
            .upload(objectPath, selectedFile, { upsert: false })

        if (uploadRes.error) {
            setErrorMessage(uploadRes.error.message || 'Proof upload failed.')
            setIsUploadingProof(false)
            return
        }

        const updateRes = await supabase
            .from('payment_requests')
            .update({ proof_object_path: objectPath })
            .eq('id', paymentRequest.id)
            .eq('user_id', user.id)
            .select('id, plan_id, amount_tnd, currency, d17_phone, reference, proof_object_path, status, admin_note, reviewed_at, created_at')
            .maybeSingle()

        if (updateRes.error) {
            setErrorMessage(updateRes.error.message || 'Proof path update failed.')
            setIsUploadingProof(false)
            return
        }

        setPaymentRequest(normalizePaymentRequestRow(updateRes.data))
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        track('payment_proof_uploaded', {
            paymentRequestId: paymentRequest.id,
            source
        })
        setToast({
            type: 'success',
            message: 'Proof uploaded. Your request is pending review.'
        })
        setIsUploadingProof(false)
    }

    const handleRefreshStatus = async () => {
        await loadLatestRequest()
        if (typeof refreshProfile === 'function') {
            await refreshProfile()
        }
    }

    return (
        <section className="checkout-page">
            {toast && (
                <AuthToast
                    type={toast.type}
                    message={toast.message}
                    duration={3000}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="checkout-shell glass-card">
                <span className="checkout-eyebrow">Checkout</span>
                <h1>Pay with D17</h1>
                <p className="checkout-subtitle">
                    Create your payment request, complete the transfer in D17, then upload your proof for admin review.
                </p>

                <section className="checkout-summary" aria-label="Plan summary">
                    <h2>Selected plan</h2>
                    <div className="checkout-plan-card">
                        <div className="checkout-plan-row">
                            <span className="checkout-plan-name">{plan.label}</span>
                            {plan.badge && <span className="checkout-plan-badge">{plan.badge}</span>}
                        </div>
                        <p className="checkout-plan-price">{plan.price} {CURRENCY}<span>{plan.cadence}</span></p>
                        <p className="checkout-plan-source">Source: {source}</p>
                        <p className="checkout-plan-source">Provider: {provider.label}</p>
                    </div>
                </section>

                <section className="checkout-methods" aria-label="D17 payment instructions">
                    <h2>D17 transfer details</h2>
                    <ul>
                        <li><Phone size={16} /> Receiver phone: {paymentRequest?.d17_phone || '+21652460278'}</li>
                        <li><BadgeCheck size={16} /> Amount: {plan.price} {CURRENCY}</li>
                        <li><CircleAlert size={16} /> Reference: {paymentRequest?.reference || provider.startCheckout({ userId: user?.id, planId: plan.id }).referenceCode}</li>
                    </ul>
                </section>

                <div className="checkout-actions checkout-actions-inline">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleCreatePaymentRequest}
                        disabled={!canCreateRequest || isPremiumWaitlistMode || entitlements.premiumActive}
                    >
                        {isLoadingRequest ? 'Creating...' : 'Create payment request'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleRefreshStatus}
                        disabled={isFetchingRequest}
                    >
                        <RefreshCw size={14} className={isFetchingRequest ? 'is-spinning' : ''} />
                        Refresh status
                    </button>
                </div>

                {entitlements.premiumActive && (
                    <p className="checkout-inline-subtitle checkout-success-note">
                        Premium is already active on your account.
                    </p>
                )}

                {errorMessage && (
                    <p className="checkout-inline-subtitle checkout-error-note">
                        {errorMessage}
                    </p>
                )}

                {paymentRequest && (
                    <section className="checkout-request" aria-label="Current payment request">
                        <div className="checkout-request-header">
                            <h2>Current request</h2>
                            <span className={`status-badge ${statusMeta.className}`}>
                                {statusMeta.label}
                            </span>
                        </div>
                        <p className="checkout-inline-subtitle">{statusMeta.detail}</p>
                        <dl className="checkout-request-grid">
                            <div>
                                <dt>Reference</dt>
                                <dd>{paymentRequest.reference}</dd>
                            </div>
                            <div>
                                <dt>Plan</dt>
                                <dd>{paymentRequest.plan_id}</dd>
                            </div>
                            <div>
                                <dt>Amount</dt>
                                <dd>{paymentRequest.amount_tnd} {paymentRequest.currency}</dd>
                            </div>
                            <div>
                                <dt>Created</dt>
                                <dd>{paymentRequest.created_at ? new Date(paymentRequest.created_at).toLocaleString() : '-'}</dd>
                            </div>
                            <div>
                                <dt>Proof path</dt>
                                <dd>{paymentRequest.proof_object_path || 'Not uploaded yet'}</dd>
                            </div>
                            <div>
                                <dt>Admin note</dt>
                                <dd>{paymentRequest.admin_note || '-'}</dd>
                            </div>
                        </dl>

                        {canUploadProof && (
                            <div className="checkout-proof-upload">
                                <label htmlFor="proof-file">
                                    Upload payment proof (image or PDF)
                                </label>
                                <input
                                    ref={fileInputRef}
                                    id="proof-file"
                                    type="file"
                                    accept="image/*,.pdf,application/pdf"
                                    onChange={handleProofFileChange}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleUploadProof}
                                    disabled={!selectedFile || isUploadingProof}
                                >
                                    {isUploadingProof ? (
                                        <>
                                            <Loader2 size={14} className="is-spinning" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud size={14} />
                                            Upload proof
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </section>
                )}

                <div className="checkout-actions">
                    {isPremiumWaitlistMode && (
                        <Link to="/premium" className="btn btn-secondary">
                            Join waitlist
                        </Link>
                    )}
                    {paymentRequest?.status === 'approved' && (
                        <Link to="/checkout/success" className="btn btn-primary">
                            Continue
                        </Link>
                    )}
                    <Link to="/payments" className="btn btn-secondary">
                        View my payments
                    </Link>
                    <Link to="/premium" className="btn btn-secondary">
                        Back to Premium
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default Checkout
