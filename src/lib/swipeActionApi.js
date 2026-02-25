import { supabase } from './supabase'
import { isLimitReachedCode } from './swipeLimit'

const RECORD_SWIPE_FN = 'record-swipe'

function makeSwipeError({
    code = 'SWIPE_ACTION_ERROR',
    message = 'Failed to record swipe',
    status = null,
    usage = null
} = {}) {
    const error = new Error(message)
    error.code = code
    error.status = status
    error.usage = usage
    return error
}

function parsePayload(payload, fallbackStatus = null) {
    if (!payload || typeof payload !== 'object') {
        return makeSwipeError({
            code: 'SWIPE_ACTION_ERROR',
            message: 'Failed to record swipe',
            status: fallbackStatus
        })
    }

    return makeSwipeError({
        code: String(payload.code ?? 'SWIPE_ACTION_ERROR'),
        message: String(payload.message ?? 'Failed to record swipe'),
        status: fallbackStatus,
        usage: payload.usage ?? null
    })
}

async function parseInvokeError(error) {
    const status = error?.context?.status ?? null

    if (error?.context && typeof error.context.clone === 'function') {
        try {
            const payload = await error.context.clone().json()
            return parsePayload(payload, status)
        } catch {
            return makeSwipeError({
                code: error?.code || 'SWIPE_ACTION_ERROR',
                message: error?.message || 'Failed to record swipe',
                status
            })
        }
    }

    return makeSwipeError({
        code: error?.code || 'SWIPE_ACTION_ERROR',
        message: error?.message || 'Failed to record swipe',
        status
    })
}

export function isSwipeLimitReachedError(error) {
    return isLimitReachedCode(error?.code)
}

export async function recordSwipeAction({ offerId, direction, studentId }) {
    const { data, error } = await supabase.functions.invoke(RECORD_SWIPE_FN, {
        body: {
            offer_id: offerId,
            direction,
            student_id: studentId
        }
    })

    if (error) {
        throw await parseInvokeError(error)
    }

    if (!data || typeof data !== 'object') {
        throw makeSwipeError({
            code: 'INVALID_RESPONSE',
            message: 'record-swipe returned an invalid payload'
        })
    }

    if (data.success === false || data.code === 'LIMIT_REACHED' || data.code === 'ALREADY_SWIPED') {
        throw parsePayload(data, null)
    }

    return data
}

