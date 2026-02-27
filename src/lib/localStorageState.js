const VERSION_FIELD = '__v'
const DATA_FIELD = 'data'

function isStorageAvailable() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function safeParseJSON(rawValue, fallbackValue) {
    if (typeof rawValue !== 'string' || rawValue.trim() === '') {
        return fallbackValue
    }

    try {
        return JSON.parse(rawValue)
    } catch {
        return fallbackValue
    }
}

export function readStorageString(key, fallbackValue = '') {
    if (!isStorageAvailable()) return fallbackValue
    try {
        const value = window.localStorage.getItem(key)
        return value == null ? fallbackValue : value
    } catch {
        return fallbackValue
    }
}

export function writeStorageString(key, value) {
    if (!isStorageAvailable()) return
    try {
        window.localStorage.setItem(key, String(value))
    } catch {
        // Ignore storage write errors in restricted environments.
    }
}

export function readStorageJSON(key, fallbackValue, options = {}) {
    if (!isStorageAvailable()) return fallbackValue

    const { version = null, migrate = null } = options

    try {
        const rawValue = window.localStorage.getItem(key)
        if (!rawValue) return fallbackValue

        const parsed = safeParseJSON(rawValue, fallbackValue)

        if (version == null) {
            return parsed
        }

        const parsedIsVersioned = (
            parsed != null
            && typeof parsed === 'object'
            && Object.hasOwn(parsed, VERSION_FIELD)
            && Object.hasOwn(parsed, DATA_FIELD)
        )

        if (parsedIsVersioned) {
            const parsedVersion = Number(parsed[VERSION_FIELD]) || 0
            if (parsedVersion === version) {
                return parsed[DATA_FIELD]
            }

            if (typeof migrate === 'function') {
                const migrated = migrate(parsed[DATA_FIELD], parsedVersion)
                writeStorageJSON(key, migrated, { version })
                return migrated
            }

            return fallbackValue
        }

        if (typeof migrate === 'function') {
            const migrated = migrate(parsed, 0)
            writeStorageJSON(key, migrated, { version })
            return migrated
        }

        return parsed
    } catch {
        return fallbackValue
    }
}

export function writeStorageJSON(key, value, options = {}) {
    if (!isStorageAvailable()) return
    const { version = null } = options

    try {
        const payload = version == null
            ? value
            : { [VERSION_FIELD]: version, [DATA_FIELD]: value }
        window.localStorage.setItem(key, JSON.stringify(payload))
    } catch {
        // Ignore storage write errors in restricted environments.
    }
}

export function removeStorageKey(key) {
    if (!isStorageAvailable()) return
    try {
        window.localStorage.removeItem(key)
    } catch {
        // Ignore storage write errors in restricted environments.
    }
}

export function removeStorageKeys(keys = []) {
    keys.forEach((key) => removeStorageKey(key))
}

