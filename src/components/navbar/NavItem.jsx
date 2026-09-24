import { Link } from 'react-router-dom'

function NavItem({
    to,
    label,
    icon = null,
    isActive = false,
    onClick,
    className = '',
    showLabel = true,
    badge,
    ariaLabel,
}) {
    const classes = ['navbar-link', className, isActive ? 'active' : ''].filter(Boolean).join(' ')

    return (
        <Link
            to={to}
            className={classes}
            onClick={onClick}
            aria-label={ariaLabel || label}
            data-active={isActive ? 'true' : 'false'}
        >
            {icon}
            {showLabel && <span>{label}</span>}
            {Number.isFinite(badge) && badge > 0 && (
                <span className="navbar-notification-badge" aria-label={`${badge} unread notifications`}>
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </Link>
    )
}

export default NavItem
