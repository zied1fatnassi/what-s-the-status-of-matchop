import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('notifications storage helpers', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.resetModules()
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-02-27T10:00:00.000Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('adds notifications and tracks unread counts per scope', async () => {
        const notifications = await import('./notifications')

        notifications.addNotification('student', {
            id: 'n-1',
            createdAt: '2026-02-27T10:00:00.000Z',
            title: 'New intro',
            body: 'A new intro arrived.',
            read: false
        })

        notifications.addNotification('company', {
            id: 'c-1',
            createdAt: '2026-02-27T10:01:00.000Z',
            title: 'New intro',
            body: 'A candidate replied.',
            read: false
        })

        expect(notifications.readNotifications('student')).toHaveLength(1)
        expect(notifications.readNotifications('company')).toHaveLength(1)
        expect(notifications.getUnreadNotificationCount('student')).toBe(1)
        expect(notifications.getUnreadNotificationCount('company')).toBe(1)
    })

    it('dedupes the same title/body within the 30s MVP window', async () => {
        const notifications = await import('./notifications')

        notifications.addNotification('student', {
            title: 'Company viewed your profile',
            body: 'Preview activity: a company viewed your profile.',
            read: false,
        })

        notifications.addNotification('student', {
            title: 'Company viewed your profile',
            body: 'Preview activity: a company viewed your profile.',
            read: false,
        })

        expect(notifications.readNotifications('student')).toHaveLength(1)

        vi.advanceTimersByTime(31_000)

        notifications.addNotification('student', {
            title: 'Company viewed your profile',
            body: 'Preview activity: a company viewed your profile.',
            read: false,
        })

        expect(notifications.readNotifications('student')).toHaveLength(2)
    })

    it('toggles read status and marks all as read', async () => {
        const notifications = await import('./notifications')

        notifications.addNotification('student', {
            id: 'n-1',
            createdAt: '2026-02-27T10:00:00.000Z',
            title: 'Payment approved',
            body: 'Your payment is approved.',
            read: false
        })
        notifications.addNotification('student', {
            id: 'n-2',
            createdAt: '2026-02-27T11:00:00.000Z',
            title: 'Referral progress updated',
            body: 'You reached 2/3 invites.',
            read: false
        })

        notifications.toggleNotificationRead('student', 'n-1')
        expect(notifications.getUnreadNotificationCount('student')).toBe(1)

        notifications.markAllNotificationsRead('student')
        expect(notifications.getUnreadNotificationCount('student')).toBe(0)
    })

    it('migrates legacy key to scoped keys once and clears the legacy key', async () => {
        localStorage.setItem('matchop_notifications', JSON.stringify([
            {
                id: 'legacy-student-1',
                createdAt: '2026-02-27T10:00:00.000Z',
                title: 'Legacy event',
                body: 'Legacy data',
                read: false
            }
        ]))

        const notifications = await import('./notifications')
        notifications.migrateLegacyNotifications()

        expect(localStorage.getItem('matchop_notifications')).toBeNull()
        expect(notifications.readNotifications('student')).toHaveLength(1)
        expect(notifications.readNotifications('company')).toHaveLength(0)

        notifications.migrateLegacyNotifications()
        expect(notifications.readNotifications('student')).toHaveLength(1)
    })
})
