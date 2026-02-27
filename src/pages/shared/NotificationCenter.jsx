import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
    NOTIFICATIONS_UPDATED_EVENT,
    getNotificationStorageKey,
    markAllNotificationsRead,
    readNotifications,
    toggleNotificationRead,
} from '../../lib/notifications'
import './NotificationCenter.css'

function NotificationCenter({ scope }) {
    const { t } = useTranslation(undefined, { useSuspense: false })
    const [filter, setFilter] = useState('all')
    const [notifications, setNotifications] = useState(() => readNotifications(scope))

    useEffect(() => {
        setNotifications(readNotifications(scope))
    }, [scope])

    useEffect(() => {
        const storageKey = getNotificationStorageKey(scope)
        const refresh = () => setNotifications(readNotifications(scope))

        const handleStorage = (event) => {
            if (event.key === storageKey) {
                refresh()
            }
        }

        const handleNotificationUpdate = (event) => {
            const eventScope = event?.detail?.scope
            if (eventScope && eventScope !== scope) return
            refresh()
        }

        window.addEventListener('storage', handleStorage)
        window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationUpdate)
        return () => {
            window.removeEventListener('storage', handleStorage)
            window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationUpdate)
        }
    }, [scope])

    const unreadCount = useMemo(
        () => notifications.filter((item) => !item.read).length,
        [notifications]
    )

    const visibleNotifications = useMemo(() => {
        if (filter === 'unread') {
            return notifications.filter((item) => !item.read)
        }
        return notifications
    }, [filter, notifications])

    const handleToggle = (notificationId) => {
        setNotifications(toggleNotificationRead(scope, notificationId))
    }

    const handleMarkAllRead = () => {
        setNotifications(markAllNotificationsRead(scope))
    }

    return (
        <section className="notifications-page">
            <div className="notifications-shell glass-card">
                <header className="notifications-header">
                    <div>
                        <h1>{t('notifications.title')}</h1>
                        <p>{t('notifications.subtitle')}</p>
                    </div>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleMarkAllRead}
                        disabled={unreadCount === 0}
                    >
                        <CheckCheck size={16} />
                        {t('notifications.actions.markAllRead')}
                    </button>
                </header>

                <div className="notifications-filters" role="tablist" aria-label={t('notifications.filters.ariaLabel')}>
                    <button
                        type="button"
                        className={`notifications-filter ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        {t('notifications.filters.all')}
                    </button>
                    <button
                        type="button"
                        className={`notifications-filter ${filter === 'unread' ? 'active' : ''}`}
                        onClick={() => setFilter('unread')}
                    >
                        {t('notifications.filters.unread')} ({unreadCount})
                    </button>
                </div>

                {visibleNotifications.length === 0 ? (
                    <div className="notifications-empty">
                        <Bell size={28} />
                        <p>{t('notifications.empty')}</p>
                    </div>
                ) : (
                    <ul className="notifications-list">
                        {visibleNotifications.map((notification) => (
                            <li key={notification.id}>
                                <button
                                    type="button"
                                    className={`notifications-item ${notification.read ? '' : 'unread'}`.trim()}
                                    onClick={() => handleToggle(notification.id)}
                                    aria-pressed={notification.read ? 'true' : 'false'}
                                >
                                    <div>
                                        <strong>{notification.title}</strong>
                                        <p>{notification.body}</p>
                                    </div>
                                    <span>{new Date(notification.createdAt).toLocaleString()}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    )
}

export default NotificationCenter
