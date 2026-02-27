import {
    readStorageJSON,
    readStorageString,
    removeStorageKey,
    writeStorageJSON,
} from './localStorageState'

export const NOTIFICATION_SCOPE_STUDENT = 'student'
export const NOTIFICATION_SCOPE_COMPANY = 'company'
export const NOTIFICATIONS_UPDATED_EVENT = 'matchop:notifications-updated'
export const NOTIFICATION_DEDUPE_WINDOW_MS = 30 * 1000

const STORAGE_VERSION = 1
const LEGACY_NOTIFICATIONS_KEY = 'matchop_notifications'
const SCOPE_TO_STORAGE_KEY = {
    [NOTIFICATION_SCOPE_STUDENT]: 'matchop_notifications_student',
    [NOTIFICATION_SCOPE_COMPANY]: 'matchop_notifications_company',
}

let migrationApplied = false

function normalizeScope(scope) {
    return scope === NOTIFICATION_SCOPE_COMPANY
        ? NOTIFICATION_SCOPE_COMPANY
        : NOTIFICATION_SCOPE_STUDENT
}

function getScopeStorageKey(scope) {
    return SCOPE_TO_STORAGE_KEY[normalizeScope(scope)]
}

function normalizeNotification(raw) {
    if (!raw || typeof raw !== 'object') return null
    const title = String(raw.title || '').trim()
    const body = String(raw.body || '').trim()
    if (!title || !body) return null

    const createdAt = raw.createdAt && !Number.isNaN(Date.parse(raw.createdAt))
        ? raw.createdAt
        : new Date().toISOString()

    return {
        id: String(raw.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        createdAt,
        title,
        body,
        read: Boolean(raw.read),
    }
}

function buildDedupeKey(notification) {
    return `${notification.title.toLowerCase()}::${notification.body.toLowerCase()}`
}

function normalizeNotificationList(rawList) {
    if (!Array.isArray(rawList)) return []
    return rawList
        .map((entry) => normalizeNotification(entry))
        .filter(Boolean)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

function dispatchNotificationsUpdated(scope) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, {
        detail: { scope: normalizeScope(scope) }
    }))
}

export function migrateLegacyNotifications() {
    if (migrationApplied) return
    migrationApplied = true

    const studentKey = getScopeStorageKey(NOTIFICATION_SCOPE_STUDENT)
    const companyKey = getScopeStorageKey(NOTIFICATION_SCOPE_COMPANY)
    const hasScopedData = Boolean(readStorageString(studentKey, '') || readStorageString(companyKey, ''))
    const legacyRaw = readStorageString(LEGACY_NOTIFICATIONS_KEY, '')

    if (!legacyRaw) return

    if (hasScopedData) {
        removeStorageKey(LEGACY_NOTIFICATIONS_KEY)
        return
    }

    const legacyData = readStorageJSON(LEGACY_NOTIFICATIONS_KEY, [], {
        migrate: (value) => normalizeNotificationList(value)
    })
    const normalizedLegacyList = normalizeNotificationList(legacyData)

    const studentNotifications = []
    const companyNotifications = []

    normalizedLegacyList.forEach((entry) => {
        const scope = normalizeScope(entry.scope)
        const normalizedEntry = normalizeNotification(entry)
        if (!normalizedEntry) return
        if (scope === NOTIFICATION_SCOPE_COMPANY) {
            companyNotifications.push(normalizedEntry)
        } else {
            studentNotifications.push(normalizedEntry)
        }
    })

    writeStorageJSON(studentKey, studentNotifications, { version: STORAGE_VERSION })
    writeStorageJSON(companyKey, companyNotifications, { version: STORAGE_VERSION })
    removeStorageKey(LEGACY_NOTIFICATIONS_KEY)
}

function readScopedNotifications(scope) {
    migrateLegacyNotifications()
    return readStorageJSON(
        getScopeStorageKey(scope),
        [],
        {
            version: STORAGE_VERSION,
            migrate: (legacyValue) => normalizeNotificationList(legacyValue)
        }
    )
}

function writeScopedNotifications(scope, notifications) {
    const normalized = normalizeNotificationList(notifications)
    writeStorageJSON(getScopeStorageKey(scope), normalized, { version: STORAGE_VERSION })
    dispatchNotificationsUpdated(scope)
    return normalized
}

export function readNotifications(scope) {
    return readScopedNotifications(scope)
}

export function addNotification(scope, notification) {
    const nextNotification = normalizeNotification(notification)
    if (!nextNotification) return null

    const notifications = readScopedNotifications(scope)
    const nextCreatedAtMs = Date.parse(nextNotification.createdAt)
    const nextDedupeKey = buildDedupeKey(nextNotification)
    const hasRecentDuplicate = notifications.some((entry) => {
        const entryCreatedAtMs = Date.parse(entry.createdAt)
        if (!Number.isFinite(entryCreatedAtMs) || !Number.isFinite(nextCreatedAtMs)) return false
        if (buildDedupeKey(entry) !== nextDedupeKey) return false
        const ageMs = nextCreatedAtMs - entryCreatedAtMs
        return ageMs >= 0 && ageMs <= NOTIFICATION_DEDUPE_WINDOW_MS
    })

    if (hasRecentDuplicate) {
        return null
    }

    writeScopedNotifications(scope, [nextNotification, ...notifications])
    return nextNotification
}

export function toggleNotificationRead(scope, notificationId) {
    if (!notificationId) return []

    const notifications = readScopedNotifications(scope)
    return writeScopedNotifications(scope, notifications.map((notification) => (
        notification.id === notificationId
            ? { ...notification, read: !notification.read }
            : notification
    )))
}

export function markAllNotificationsRead(scope) {
    const notifications = readScopedNotifications(scope)
    return writeScopedNotifications(scope, notifications.map((notification) => ({
        ...notification,
        read: true,
    })))
}

export function getUnreadNotificationCount(scope) {
    return readScopedNotifications(scope).filter((notification) => !notification.read).length
}

export function getNotificationStorageKey(scope) {
    return getScopeStorageKey(scope)
}

export default {
    NOTIFICATION_SCOPE_STUDENT,
    NOTIFICATION_SCOPE_COMPANY,
    NOTIFICATIONS_UPDATED_EVENT,
    migrateLegacyNotifications,
    readNotifications,
    addNotification,
    toggleNotificationRead,
    markAllNotificationsRead,
    getUnreadNotificationCount,
}
