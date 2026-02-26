import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck, CircleAlert, Loader2, Phone, RefreshCw, UploadCloud } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import AuthToast from '../components/AuthToast'
import { CURRENCY, PLANS } from '../config/pricing'
import { useAuth } from '../context/AuthContext'
import { track } from '../lib/analytics'
import { createD17ReferenceCode } from '../lib/payments/providers/d17'
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

function getStatusMeta(status, hasProof, t) {
    if (status === 'approved') {
        return {
            className: 'status-approved',
            label: t('checkout.status.approved.label'),
            detail: t('checkout.status.approved.detail')
        }
    }

    if (status === 'rejected') {
        return {
            className: 'status-rejected',
            label: t('checkout.status.rejected.label'),
            detail: t('checkout.status.rejected.detail')
        }
    }

    if (status === 'reverted') {
        return {
            className: 'status-reverted',
            label: t('checkout.status.reverted.label'),
            detail: t('checkout.status.reverted.detail')
        }
    }

    return {
        className: 'status-pending',
        label: t('checkout.status.pending.label'),
        detail: hasProof
            ? t('checkout.status.pending.detailWithProof')
            : t('checkout.status.pending.detail')
    }
}

function isProofFileAccepted(file) {
    if (!file) return false
    return ACCEPTED_PROOF_TYPES.some((typePrefix) => file.type?.startsWith(typePrefix))
}

function Checkout() {
    const { t, i18n } = useTranslation(undefined, { useSuspense: false })
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
    const entitlements = getEntitlements(profile)
    const requestStatus = paymentRequest?.status || null
    const hasProof = Boolean(paymentRequest?.proof_object_path)
    const isPending = requestStatus === 'pending'
    const isApproved = requestStatus === 'approved'
    const isRejected = requestStatus === 'rejected'
    const isReverted = requestStatus === 'reverted'
    const canCreateRequest = Boolean(user?.id) && !isLoadingRequest && !entitlements.premiumActive && (!paymentRequest || isRejected || isReverted)
    const canUploadProof = isPending && !hasProof
    const hasUploadedProofPending = isPending && hasProof
    const statusMeta = getStatusMeta(requestStatus, hasProof, t)
    const fallbackReference = useMemo(() => createD17ReferenceCode(user?.id, plan.id), [user?.id, plan.id])
    const hasPendingRequest = isPending
    const primaryActionState = useMemo(() => {
        if (isApproved || entitlements.premiumActive) return 'goPremium'
        if (canUploadProof) return 'uploadProof'
        if (hasUploadedProofPending) return 'refreshStatus'
        return 'createRequest'
    }, [isApproved, entitlements.premiumActive, canUploadProof, hasUploadedProofPending])
    const nextStepsMessage = useMemo(() => {
        if (isApproved) return t('checkout.nextStepsApproved')
        if (hasUploadedProofPending) return t('checkout.nextStepsPendingWithProof')
        if (canUploadProof) return t('checkout.nextStepsPendingNoProof')
        if (isRejected) return t('checkout.nextStepsRejected')
        if (isReverted) return t('checkout.nextStepsReverted')
        return t('checkout.nextSteps')
    }, [canUploadProof, hasUploadedProofPending, isApproved, isRejected, isReverted, t])

    useEffect(() => {
        track('checkout_provider_selected', { provider: 'd17' })
    }, [])

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
                    message: t('checkout.toasts.pendingExists')
                })
            } else if (payload?.code === 'COOLDOWN_ACTIVE') {
                track('payment_request_cooldown_triggered', {
                    source,
                    cooldown_minutes: payload?.cooldown_minutes || 10
                })
                setErrorMessage(payload?.message || t('checkout.errors.cooldownActive'))
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
            message: t('checkout.toasts.requestCreated')
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
            setErrorMessage(t('checkout.errors.unsupportedProofType'))
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
            setErrorMessage(uploadRes.error.message || t('checkout.errors.uploadFailed'))
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
            setErrorMessage(updateRes.error.message || t('checkout.errors.proofPathUpdateFailed'))
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
            message: t('checkout.toasts.proofUploaded')
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
                <span className="checkout-eyebrow">{t('checkout.eyebrow')}</span>
                <h1>{t('checkout.title')}</h1>
                <p className="checkout-subtitle">
                    {t('checkout.subtitle')}
                </p>

                <section className="checkout-status-banner" aria-label={t('checkout.aria.status')}>
                    <div className="checkout-status-banner-header">
                        <strong>{t('checkout.statusBanner.title')}</strong>
                        <span className={`status-badge ${statusMeta.className}`}>
                            {statusMeta.label}
                        </span>
                    </div>
                    <p>{statusMeta.detail}</p>
                </section>

                <section className="checkout-steps" aria-label={t('checkout.aria.steps')}>
                    <article className={`checkout-step ${paymentRequest ? 'done' : 'active'}`}>
                        <span className="checkout-step-index">1</span>
                        <div>
                            <h3>{t('checkout.steps.pay.title')}</h3>
                            <p>{t('checkout.steps.pay.description')}</p>
                        </div>
                    </article>
                    <article className={`checkout-step ${paymentRequest?.proof_object_path ? 'done' : (hasPendingRequest ? 'active' : '')}`}>
                        <span className="checkout-step-index">2</span>
                        <div>
                            <h3>{t('checkout.steps.upload.title')}</h3>
                            <p>{t('checkout.steps.upload.description')}</p>
                        </div>
                    </article>
                    <article className={`checkout-step ${paymentRequest?.status === 'approved' ? 'done' : ''}`}>
                        <span className="checkout-step-index">3</span>
                        <div>
                            <h3>{t('checkout.steps.wait.title')}</h3>
                            <p>{t('checkout.steps.wait.description')}</p>
                        </div>
                    </article>
                </section>

                <div className="checkout-overview-grid">
                    <section className="checkout-summary" aria-label={t('checkout.aria.planSummary')}>
                        <h2>{t('checkout.summary.title')}</h2>
                        <div className="checkout-plan-card">
                            <div className="checkout-plan-row">
                                <span className="checkout-plan-name">{plan.label}</span>
                                {plan.badge && <span className="checkout-plan-badge">{plan.badge}</span>}
                            </div>
                            <p className="checkout-plan-price">{plan.price} {CURRENCY}<span>{plan.cadence}</span></p>
                            <p className="checkout-plan-source">
                                {t('checkout.summary.source')}: {source}
                            </p>
                        </div>
                    </section>

                    <section className="checkout-methods" aria-label={t('checkout.aria.methods')}>
                        <h2>{t('checkout.methods.title')}</h2>
                        <ul>
                            <li><Phone size={16} /> {t('checkout.methods.receiverPhone')}: {paymentRequest?.d17_phone || '+21652460278'}</li>
                            <li><BadgeCheck size={16} /> {t('checkout.methods.amount')}: {plan.price} {CURRENCY}</li>
                            <li><CircleAlert size={16} /> {t('checkout.methods.reference')}: {paymentRequest?.reference || fallbackReference}</li>
                        </ul>
                    </section>
                </div>

                {entitlements.premiumActive && (
                    <p className="checkout-inline-subtitle checkout-success-note">
                        {t('checkout.notes.premiumActive')}
                    </p>
                )}

                {hasUploadedProofPending && (
                    <p className="checkout-inline-subtitle checkout-success-note">
                        {t('checkout.notes.proofUploadedPending')}
                    </p>
                )}

                {isRejected && (
                    <p className="checkout-inline-subtitle checkout-error-note">
                        {t('checkout.notes.rejectedNextStep')}
                    </p>
                )}

                {isReverted && (
                    <p className="checkout-inline-subtitle checkout-error-note">
                        {t('checkout.notes.revertedNextStep')}
                    </p>
                )}

                {errorMessage && (
                    <p className="checkout-inline-subtitle checkout-error-note">
                        {errorMessage}
                    </p>
                )}

                <p className="checkout-inline-subtitle checkout-next-steps">
                    {nextStepsMessage}
                </p>

                {paymentRequest && (
                    <section className="checkout-request" aria-label={t('checkout.aria.currentRequest')}>
                        <div className="checkout-request-header">
                            <h2>{t('checkout.request.title')}</h2>
                            <span className={`status-badge ${statusMeta.className}`}>
                                {statusMeta.label}
                            </span>
                        </div>
                        <p className="checkout-inline-subtitle">{statusMeta.detail}</p>
                        <dl className="checkout-request-grid">
                            <div>
                                <dt>{t('checkout.request.fields.reference')}</dt>
                                <dd>{paymentRequest.reference}</dd>
                            </div>
                            <div>
                                <dt>{t('checkout.request.fields.plan')}</dt>
                                <dd>{paymentRequest.plan_id}</dd>
                            </div>
                            <div>
                                <dt>{t('checkout.request.fields.amount')}</dt>
                                <dd>{paymentRequest.amount_tnd} {paymentRequest.currency}</dd>
                            </div>
                            <div>
                                <dt>{t('checkout.request.fields.created')}</dt>
                                <dd>{paymentRequest.created_at ? new Date(paymentRequest.created_at).toLocaleString(i18n.language) : '-'}</dd>
                            </div>
                            <div>
                                <dt>{t('checkout.request.fields.proofPath')}</dt>
                                <dd>{paymentRequest.proof_object_path || t('checkout.request.notUploaded')}</dd>
                            </div>
                            <div>
                                <dt>{t('checkout.request.fields.adminNote')}</dt>
                                <dd>{paymentRequest.admin_note || '-'}</dd>
                            </div>
                        </dl>

                        {canUploadProof && (
                            <div className="checkout-proof-upload">
                                <label htmlFor="proof-file">
                                    {t('checkout.proofUpload.label')}
                                </label>
                                <input
                                    ref={fileInputRef}
                                    id="proof-file"
                                    type="file"
                                    accept="image/*,.pdf,application/pdf"
                                    onChange={handleProofFileChange}
                                />
                                <p className="checkout-file-hint">{t('checkout.proofUpload.hint')}</p>
                            </div>
                        )}
                    </section>
                )}

                <div className="checkout-actions checkout-primary-action">
                    {primaryActionState === 'createRequest' && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleCreatePaymentRequest}
                            disabled={!canCreateRequest}
                        >
                            {isLoadingRequest
                                ? t('checkout.actions.creating')
                                : ((isRejected || isReverted) ? t('checkout.actions.createRequestAgain') : t('checkout.actions.createRequest'))}
                        </button>
                    )}
                    {primaryActionState === 'uploadProof' && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleUploadProof}
                            disabled={!selectedFile || isUploadingProof}
                        >
                            {isUploadingProof ? (
                                <>
                                    <Loader2 size={14} className="is-spinning" />
                                    {t('checkout.proofUpload.uploading')}
                                </>
                            ) : (
                                <>
                                    <UploadCloud size={14} />
                                    {t('checkout.proofUpload.uploadAction')}
                                </>
                            )}
                        </button>
                    )}
                    {primaryActionState === 'refreshStatus' && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleRefreshStatus}
                            disabled={isFetchingRequest}
                        >
                            <RefreshCw size={14} className={isFetchingRequest ? 'is-spinning' : ''} />
                            {t('checkout.actions.refreshStatus')}
                        </button>
                    )}
                    {primaryActionState === 'goPremium' && (
                        <Link to="/premium" className="btn btn-primary">
                            {t('checkout.actions.goToPremium')}
                        </Link>
                    )}
                </div>

                <div className="checkout-actions checkout-secondary-actions">
                    {primaryActionState !== 'refreshStatus' && (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleRefreshStatus}
                            disabled={isFetchingRequest}
                        >
                            <RefreshCw size={14} className={isFetchingRequest ? 'is-spinning' : ''} />
                            {t('checkout.actions.refreshStatus')}
                        </button>
                    )}
                    <Link to="/payments" className="btn btn-secondary">
                        {t('checkout.actions.viewPayments')}
                    </Link>
                    <Link to="/premium" className="btn btn-secondary">
                        {t('checkout.actions.backToPremium')}
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default Checkout
