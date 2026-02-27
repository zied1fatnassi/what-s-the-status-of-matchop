import { readStorageJSON, writeStorageJSON } from './localStorageState'

const STORAGE_VERSION = 1

export const MATCH_FAIL_REASONS_KEY = 'matchop_company_match_fail_reasons'
export const MATCH_STATUS_OVERRIDES_KEY = 'matchop_company_match_status_overrides'

export const MATCH_FAIL_REASON_OPTIONS = [
    { key: 'not_fit', labelKey: 'companyWorkflow.archived.failReasons.notFit' },
    { key: 'no_response', labelKey: 'companyWorkflow.archived.failReasons.noResponse' },
    { key: 'wrong_location', labelKey: 'companyWorkflow.archived.failReasons.wrongLocation' },
    { key: 'skill_gap', labelKey: 'companyWorkflow.archived.failReasons.skillGap' },
    { key: 'other', labelKey: 'companyWorkflow.archived.failReasons.other' },
]

function normalizeObjectMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

    return Object.entries(value).reduce((acc, [key, mapValue]) => {
        if (typeof key !== 'string' || key.length === 0) return acc
        if (mapValue == null) return acc
        acc[key] = String(mapValue)
        return acc
    }, {})
}

export function readMatchFailReasons() {
    return readStorageJSON(
        MATCH_FAIL_REASONS_KEY,
        {},
        { version: STORAGE_VERSION, migrate: (legacy) => normalizeObjectMap(legacy) }
    )
}

export function writeMatchFailReasons(value) {
    writeStorageJSON(
        MATCH_FAIL_REASONS_KEY,
        normalizeObjectMap(value),
        { version: STORAGE_VERSION }
    )
}

export function setMatchFailReason(matchId, reasonKey) {
    if (!matchId) return
    const matchIdKey = String(matchId)
    const next = { ...readMatchFailReasons() }

    if (!reasonKey || reasonKey === 'all') {
        delete next[matchIdKey]
    } else {
        next[matchIdKey] = reasonKey
    }

    writeMatchFailReasons(next)
}

export function readMatchStatusOverrides() {
    return readStorageJSON(
        MATCH_STATUS_OVERRIDES_KEY,
        {},
        { version: STORAGE_VERSION, migrate: (legacy) => normalizeObjectMap(legacy) }
    )
}

export function writeMatchStatusOverrides(value) {
    writeStorageJSON(
        MATCH_STATUS_OVERRIDES_KEY,
        normalizeObjectMap(value),
        { version: STORAGE_VERSION }
    )
}

export function setMatchStatusOverride(matchId, status) {
    if (!matchId) return
    if (status !== 'active' && status !== 'archived') return

    const matchIdKey = String(matchId)
    const next = {
        ...readMatchStatusOverrides(),
        [matchIdKey]: status,
    }
    writeMatchStatusOverrides(next)
}

export function getMatchStatus(match, overrides = {}) {
    if (!match) return ''
    const overrideStatus = overrides[String(match.id)]
    if (overrideStatus === 'active' || overrideStatus === 'archived') {
        return overrideStatus
    }
    return match.status
}

export function applyMatchStatusOverrides(matches, overrides = {}) {
    if (!Array.isArray(matches) || matches.length === 0) return []

    return matches.map((match) => {
        const status = getMatchStatus(match, overrides)
        if (status === match.status) return match
        return { ...match, status }
    })
}

export function shouldShowArchivedItem(item, reasonFilter, failReasons = {}, statusOverrides = {}) {
    if (!item) return false

    const isArchivedMatchEntity = item.type === 'match' && item.matchId
    if (!isArchivedMatchEntity) {
        return reasonFilter === 'all'
    }

    const overrideStatus = statusOverrides[String(item.matchId)]
    if (overrideStatus === 'active') {
        return false
    }

    if (reasonFilter === 'all') return true
    return failReasons[String(item.matchId)] === reasonFilter
}
