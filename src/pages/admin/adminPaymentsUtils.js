export const ADMIN_PREMIUM_OVERRIDES_KEY = 'matchop_admin_premium_overrides'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const REPEATED_ATTEMPT_STATUSES = new Set(['pending', 'rejected', 'reverted'])

export function hasProof(row) {
    const proofValue = row?.proof_object_path
    return typeof proofValue === 'string' && proofValue.trim().length > 0
}

export function isPendingOlderThan24Hours(row, nowMs = Date.now()) {
    if (row?.status !== 'pending') return false
    const createdAtMs = Date.parse(row?.created_at || '')
    if (!Number.isFinite(createdAtMs)) return false
    return nowMs - createdAtMs > DAY_IN_MS
}

function getAttemptIdentity(row) {
    return row?.user_id || row?.user_email || ''
}

export function getRepeatedAttemptIdentities(rows) {
    const counts = new Map()

    ;(rows || []).forEach((row) => {
        if (!REPEATED_ATTEMPT_STATUSES.has(row?.status)) return
        const identity = getAttemptIdentity(row)
        if (!identity) return
        counts.set(identity, (counts.get(identity) || 0) + 1)
    })

    return new Set(
        Array.from(counts.entries())
            .filter(([, count]) => count > 1)
            .map(([identity]) => identity)
    )
}

export function applyQuickFilters(rows, quickFilters, nowMs = Date.now()) {
    if (!Array.isArray(rows)) return []
    const {
        needsProof = false,
        pendingOver24h = false,
        repeatedAttempts = false,
    } = quickFilters || {}

    const repeatedIdentities = repeatedAttempts
        ? getRepeatedAttemptIdentities(rows)
        : null

    return rows.filter((row) => {
        if (needsProof && hasProof(row)) return false
        if (pendingOver24h && !isPendingOlderThan24Hours(row, nowMs)) return false
        if (repeatedAttempts && !repeatedIdentities.has(getAttemptIdentity(row))) return false
        return true
    })
}

export function escapeCsvValue(value) {
    if (value == null) return ''
    const stringValue = String(value)
    if (!/[",\n\r]/.test(stringValue)) return stringValue
    return `"${stringValue.replaceAll('"', '""')}"`
}

export function buildFilteredPaymentsCsv(rows) {
    const headers = [
        'payment_request_id',
        'user_email',
        'user_id',
        'plan_id',
        'amount_tnd',
        'currency',
        'reference',
        'proof_object_path',
        'status',
        'created_at',
        'reviewed_at',
        'admin_note',
    ]

    const csvRows = [headers.join(',')]
    ;(rows || []).forEach((row) => {
        const columns = [
            row?.id,
            row?.user_email,
            row?.user_id,
            row?.plan_id,
            row?.amount_tnd,
            row?.currency,
            row?.reference,
            row?.proof_object_path,
            row?.status,
            row?.created_at,
            row?.reviewed_at,
            row?.admin_note,
        ]
        csvRows.push(columns.map(escapeCsvValue).join(','))
    })

    return `${csvRows.join('\n')}\n`
}

export function toPreviewPremiumUntil(plan, now = new Date()) {
    const nextDate = new Date(now)
    if (plan === 'year') {
        nextDate.setFullYear(nextDate.getFullYear() + 1)
    } else {
        nextDate.setMonth(nextDate.getMonth() + 1)
    }
    return nextDate.toISOString()
}

export function isAbsoluteHttpUrl(value) {
    if (typeof value !== 'string') return false
    try {
        const parsed = new URL(value)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
        return false
    }
}

export async function resolveProofUrl(proofValue, getSignedUrl) {
    if (!proofValue || typeof proofValue !== 'string') {
        return {
            url: '',
            error: 'missing',
            source: 'none',
        }
    }

    if (isAbsoluteHttpUrl(proofValue)) {
        return {
            url: proofValue,
            error: null,
            source: 'url',
        }
    }

    if (typeof getSignedUrl !== 'function') {
        return {
            url: '',
            error: 'missing_signer',
            source: 'storage',
        }
    }

    try {
        const signedResult = await getSignedUrl(proofValue)
        if (!signedResult?.signedUrl) {
            return {
                url: '',
                error: signedResult?.error || 'sign_failed',
                source: 'storage',
            }
        }
        return {
            url: signedResult.signedUrl,
            error: null,
            source: 'storage',
        }
    } catch {
        return {
            url: '',
            error: 'sign_failed',
            source: 'storage',
        }
    }
}
