import { supabase } from './supabase'

const SWIPE_STACK_FN = 'swipe-stack'

function makeError({
    code = 'SWIPE_STACK_ERROR',
    message = 'Failed to fetch swipe stack',
    status = null,
    upgradeHint = false
} = {}) {
    const err = new Error(message)
    err.code = code
    err.status = status
    err.upgradeHint = upgradeHint
    return err
}

async function parseFunctionError(error) {
    const status = error?.context?.status ?? null
    let payload = null

    try {
        if (error?.context && typeof error.context.clone === 'function') {
            payload = await error.context.clone().json()
        }
    } catch {
        payload = null
    }

    const code = payload?.code || error?.code || 'SWIPE_STACK_ERROR'
    const message = payload?.message || error?.message || 'Failed to fetch swipe stack'
    const upgradeHint = Boolean(payload?.upgrade_hint)
    return makeError({ code, message, status, upgradeHint })
}

export function isPaywallError(error) {
    return error?.code === 'PAYWALL'
}

export function isNoProfileError(error) {
    return error?.code === 'NO_PROFILE'
}

export async function fetchSwipeStack({ mode, limit = 20, cursor = null }) {
    const { data, error } = await supabase.functions.invoke(SWIPE_STACK_FN, {
        body: { mode, limit, cursor }
    })

    if (error) {
        throw await parseFunctionError(error)
    }

    if (!data || !Array.isArray(data.items)) {
        throw makeError({
            code: 'INVALID_RESPONSE',
            message: 'Swipe stack function returned an invalid payload'
        })
    }

    return data
}
