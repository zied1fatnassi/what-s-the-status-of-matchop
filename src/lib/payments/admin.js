import { supabase } from '../supabase'

export async function reviewPaymentRequest({ paymentRequestId, action, admin_note = null }) {
    return supabase.functions.invoke('admin-review-payment', {
        body: {
            paymentRequestId,
            action,
            admin_note
        }
    })
}

export async function revertPaymentRequest(paymentRequestId, note = null) {
    return reviewPaymentRequest({
        paymentRequestId,
        action: 'revert',
        admin_note: note
    })
}

export async function fetchPaymentRequestAudit(paymentRequestId) {
    return supabase
        .from('payment_requests_audit')
        .select('id, payment_request_id, action, actor, note, old_state, new_state, created_at')
        .eq('payment_request_id', paymentRequestId)
        .order('created_at', { ascending: false })
}

export default {
    reviewPaymentRequest,
    revertPaymentRequest,
    fetchPaymentRequestAudit
}
