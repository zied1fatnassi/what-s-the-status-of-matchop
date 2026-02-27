const REDACTED_VALUE = '[REDACTED]'
const MAX_DEPTH = 4

const SENSITIVE_KEY_PATTERN = /(token|password|secret|authorization|reference|payment|session|cookie|jwt|email|phone|user|id)/i
const DEV_LOGGING_ENABLED = import.meta.env.DEV && import.meta.env.VITE_DEBUG_SAFE_LOGGER === 'true'

function shouldRedactKey(key) {
    if (typeof key !== 'string') return false
    return SENSITIVE_KEY_PATTERN.test(key)
}

export function redactValue(value, depth = 0) {
    if (depth > MAX_DEPTH) return '[MaxDepth]'
    if (value == null) return value

    if (Array.isArray(value)) {
        return value.map((item) => redactValue(item, depth + 1))
    }

    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
        }
    }

    if (typeof value === 'object') {
        return Object.entries(value).reduce((acc, [key, nestedValue]) => {
            acc[key] = shouldRedactKey(key) ? REDACTED_VALUE : redactValue(nestedValue, depth + 1)
            return acc
        }, {})
    }

    if (typeof value === 'string' && value.length > 512) {
        return `${value.slice(0, 512)}…`
    }

    return value
}

function emit(level, message, payload, options = {}) {
    const { devOnly = false } = options
    if (devOnly && !DEV_LOGGING_ENABLED) return

    const safePayload = payload == null ? undefined : redactValue(payload)
    const loggerMethod = console[level] || console.log

    if (safePayload === undefined) {
        loggerMethod(message)
    } else {
        loggerMethod(message, safePayload)
    }
}

export function safeLogDebug(message, payload) {
    emit('debug', message, payload, { devOnly: true })
}

export function safeLogInfo(message, payload) {
    emit('info', message, payload, { devOnly: true })
}

export function safeLogWarn(message, payload) {
    emit('warn', message, payload)
}

export function safeLogError(message, payload) {
    emit('error', message, payload)
}

export default {
    safeLogDebug,
    safeLogInfo,
    safeLogWarn,
    safeLogError,
    redactValue,
}
