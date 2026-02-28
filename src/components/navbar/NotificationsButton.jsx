import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'

function NotificationsButton({ to, count = 0, label }) {
    const normalizedCount = Number.isFinite(count) ? count : 0
    const badgeLabel = normalizedCount > 99 ? '99+' : String(normalizedCount)
    const ariaLabel = normalizedCount > 0
        ? `${label}, ${normalizedCount} unread`
        : label

    return (
        <Link
            to={to}
            className="navbar-utility-button navbar-notifications-btn"
            aria-label={ariaLabel}
            title={label}
        >
            <Bell size={18} />
            {normalizedCount > 0 && (
                <span className="navbar-notification-badge navbar-notification-badge--utility" aria-hidden="true">
                    {badgeLabel}
                </span>
            )}
        </Link>
    )
}

export default NotificationsButton
