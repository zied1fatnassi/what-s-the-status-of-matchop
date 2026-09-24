import { Link, useLocation } from 'react-router-dom'
import { Compass, Heart, MessageCircle, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './StudentBottomNav.css'

function StudentBottomNav({ unreadMatches = 0, unreadMessages = 0 }) {
    const { t } = useTranslation()
    const location = useLocation()
    const currentPath = location.pathname

    const isPathActive = (paths) => paths.some((path) => currentPath === path || currentPath.startsWith(`${path}/`))

    const navItems = [
        {
            id: 'discover',
            to: '/student/feed',
            icon: Compass,
            label: t('nav.discover', 'Discover'),
            isActive: isPathActive(['/student/feed', '/student/swipe', '/student/discovery', '/student/offers', '/offers']),
        },
        {
            id: 'matches',
            to: '/student/matches',
            icon: Heart,
            label: t('nav.matches', 'Matches'),
            badge: unreadMatches > 0 ? unreadMatches : null,
            isActive: isPathActive(['/student/matches', '/student/external-matches']),
        },
        {
            id: 'chat',
            to: '/student/matches',
            icon: MessageCircle,
            label: t('nav.chat', 'Chat'),
            badge: unreadMessages > 0 ? unreadMessages : null,
            isActive: isPathActive(['/student/chat']),
        },
        {
            id: 'profile',
            to: '/student/profile',
            icon: User,
            label: t('nav.profile', 'Profile'),
            isActive: isPathActive(['/student/profile', '/student/referrals', '/payments', '/premium']),
        },
    ]

    return (
        <nav className="student-bottom-nav" aria-label="Student product navigation">
            <div className="student-bottom-nav__container">
                {navItems.map((item) => {
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.id}
                            to={item.to}
                            className={`student-bottom-nav__item ${item.isActive ? 'is-active' : ''}`}
                            aria-current={item.isActive ? 'page' : undefined}
                            aria-label={item.label}
                        >
                            <div className="student-bottom-nav__icon-wrapper">
                                <Icon size={22} className="student-bottom-nav__icon" />
                                {item.badge && (
                                    <span className="student-bottom-nav__badge" aria-label={`${item.badge} unread`}>
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <span className="student-bottom-nav__label">{item.label}</span>
                            {item.isActive && <span className="student-bottom-nav__indicator" />}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

export default StudentBottomNav
