import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
<<<<<<< HEAD
import {
    Menu,
    X,
    User,
    Briefcase,
    Heart,
    Home,
    LogOut,
    Globe,
    ChevronDown,
    Moon,
    Sun,
    Crown,
    Receipt,
    Users,
    FolderArchive,
    Gift,
    Bell,
} from 'lucide-react'
=======
import { Menu, X, User, Briefcase, Heart, Home, LogOut, Globe, ChevronDown, Moon, Sun, Crown, Users, Bell } from 'lucide-react'
>>>>>>> f1dacb96d3052adf82fd2817d641a859bc707cd6
import { useAuth } from '../context/AuthContext'
import { useApplications } from '../context/ApplicationContext'
import { useTheme } from '../context/ThemeContext'
import { getEntitlements } from '../lib/premiumEntitlements'
import {
    NOTIFICATION_SCOPE_COMPANY,
    NOTIFICATION_SCOPE_STUDENT,
    NOTIFICATIONS_UPDATED_EVENT,
    getNotificationStorageKey,
    getUnreadNotificationCount,
    migrateLegacyNotifications,
} from '../lib/notifications'
import { safeLogError } from '../lib/logger'
import Logo from './Logo'
import NavItem from './navbar/NavItem'
import NotificationsButton from './navbar/NotificationsButton'
import ProfileMenu from './navbar/ProfileMenu'
import './Navbar.css'

function getInitials(value) {
    const tokens = String(value || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)

    if (tokens.length === 0) return 'U'
    return tokens.map((token) => token[0].toUpperCase()).join('')
}

function Navbar({ isLanding = false }) {
    const isPremiumEnabled = import.meta.env.VITE_PREMIUM_ENABLED !== 'false'
    const [isOpen, setIsOpen] = useState(false)
    const [langOpen, setLangOpen] = useState(false)
    const [profileMenuOpen, setProfileMenuOpen] = useState(false)
    const [unreadNotifications, setUnreadNotifications] = useState(0)
    const langSwitcherRef = useRef(null)
    const location = useLocation()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const { isLoggedIn, isStudent, isCompany, isLoading, signOut, user, profile } = useAuth()
    const { openPremiumUpsell } = useApplications()
    const { theme, setTheme } = useTheme()

    const hasSession = isLoggedIn && !!user
    const supportsRoleNav = hasSession && (isStudent || isCompany)
    const languageCode = (i18n.language || 'en').slice(0, 2)

    const notificationScope = isStudent
        ? NOTIFICATION_SCOPE_STUDENT
        : (isCompany ? NOTIFICATION_SCOPE_COMPANY : null)

    const entitlements = getEntitlements(profile)
    const hasActivePremium = entitlements.premiumActive

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
    }

<<<<<<< HEAD
=======
    const handleStudentPremiumNav = (event) => {
        if (hasActivePremium) return
        event.preventDefault()
        openPremiumUpsell('personalized_mode')
        setIsOpen(false)
    }

    const studentLinks = [
        { to: '/student/swipe', icon: <Home size={18} />, label: t('nav.discover') },
        { to: '/student/matches', icon: <Heart size={18} />, label: t('nav.matches') },
        { to: '/student/profile', icon: <User size={18} />, label: t('nav.profile') },
    ]

    if (isPremiumEnabled) {
        studentLinks.splice(2, 0, {
            to: '/premium',
            icon: <Crown size={18} />,
            label: t('nav.personalizedPlan'),
            onClick: handleStudentPremiumNav
        })
    }

    const companyLinks = [
        { to: '/company/intros', icon: <Users size={18} />, label: t('nav.newCandidates') },
        { to: '/company/matches', icon: <Heart size={18} />, label: t('nav.matches') },
        { to: '/company/offers', icon: <Briefcase size={18} />, label: t('nav.myOffers') },
        { to: '/company/post-offer', icon: <Briefcase size={18} />, label: t('nav.postJob') },
        { to: '/company/profile', icon: <User size={18} />, label: t('nav.profile') },
    ]

    const links = isStudent ? studentLinks : isCompany ? companyLinks : []
    const guestMobileLinks = [
        { to: '/student/signup', icon: <User size={18} />, label: t('landing.ctaStudent') },
        { to: '/company/signup', icon: <Briefcase size={18} />, label: t('landing.ctaCompany'), className: 'navbar-link--primary' },
    ]
    const mobileLinks = hasSession ? links : guestMobileLinks
    const notificationsTarget = notificationScope === NOTIFICATION_SCOPE_STUDENT
        ? '/student/notifications'
        : (notificationScope === NOTIFICATION_SCOPE_COMPANY ? '/company/notifications' : null)
    const logoTarget = hasSession
        ? (isCompany ? '/company/intros' : isStudent ? '/student/swipe' : '/discovery')
        : '/'

>>>>>>> f1dacb96d3052adf82fd2817d641a859bc707cd6
    const languages = [
        { code: 'en', label: 'EN', fullLabel: 'English' },
        { code: 'fr', label: 'FR', fullLabel: 'Francais' },
    ]

    const currentLang = languages.find((lang) => lang.code === languageCode) || languages[0]
    const nextLangCode = currentLang.code === 'fr' ? 'en' : 'fr'

    const changeLanguage = (code) => {
        i18n.changeLanguage(code)
        setLangOpen(false)
    }

    const handleStudentPremiumNav = (event) => {
        if (hasActivePremium) return
        event.preventDefault()
        openPremiumUpsell('personalized_mode')
    }

    const handleLogout = async () => {
        try {
            await signOut()
            navigate('/')
            setIsOpen(false)
            setProfileMenuOpen(false)
        } catch (err) {
            safeLogError('[Navbar] logout failed', { error: err })
        }
    }

    const isPathMatch = (pathPrefixes = []) => (
        pathPrefixes.some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`))
    )

    const studentPrimaryLinks = [
        {
            id: 'discover',
            to: '/student/swipe',
            icon: <Home size={18} />,
            label: t('nav.discover'),
            isActive: isPathMatch(['/student/swipe', '/student/offers']) || location.pathname === '/offers',
        },
        {
            id: 'matches',
            to: '/student/matches',
            icon: <Heart size={18} />,
            label: t('nav.matches'),
            isActive: isPathMatch(['/student/matches']),
        },
    ]

    const companyPrimaryLinks = [
        {
            id: 'candidates',
            to: '/company/intros',
            icon: <Users size={18} />,
            label: t('nav.newCandidates'),
            isActive: isPathMatch(['/company/intros']) || location.pathname === '/company/candidates',
        },
        {
            id: 'matches',
            to: '/company/matches',
            icon: <Heart size={18} />,
            label: t('nav.matches'),
            isActive: isPathMatch(['/company/matches']),
        },
        {
            id: 'offers',
            to: '/company/offers',
            icon: <Briefcase size={18} />,
            label: t('nav.myOffers'),
            isActive: isPathMatch(['/company/offers']),
        },
    ]

    const primaryLinks = isStudent
        ? studentPrimaryLinks
        : isCompany
            ? companyPrimaryLinks
            : []

    const notificationRoute = isStudent
        ? '/student/notifications'
        : isCompany
            ? '/company/notifications'
            : null

    const profileLabel = useMemo(() => {
        if (isStudent) {
            return (
                profile?.students?.display_name ||
                profile?.students?.full_name ||
                user?.user_metadata?.name ||
                t('nav.profile')
            )
        }

        if (isCompany) {
            return (
                profile?.companies?.company_name ||
                user?.user_metadata?.name ||
                t('nav.profile')
            )
        }

        return user?.user_metadata?.name || user?.email?.split('@')[0] || t('nav.profile')
    }, [isCompany, isStudent, profile, t, user])

    const avatarUrl = isStudent
        ? (profile?.students?.avatar_url || profile?.avatar_url || null)
        : (isCompany ? (profile?.companies?.logo_url || profile?.logo_url || null) : null)

    const profileInitials = useMemo(() => getInitials(profileLabel), [profileLabel])

    const profileMenuItems = (() => {
        if (!supportsRoleNav) return []

        const sharedControls = [
            {
                id: 'language',
                type: 'action',
                icon: <Globe size={16} />,
                label: `${t('nav.language')}: ${currentLang.fullLabel}`,
                onSelect: () => changeLanguage(nextLangCode),
            },
            {
                id: 'theme',
                type: 'action',
                icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />,
                label: `${t('nav.theme')}: ${theme === 'dark' ? t('footer.theme.dark') : t('footer.theme.light')}`,
                onSelect: toggleTheme,
            },
            { id: 'divider-logout', type: 'divider' },
            {
                id: 'logout',
                kind: 'logout',
                label: t('nav.logout'),
                icon: <LogOut size={16} />,
                danger: true,
            },
        ]

        if (isStudent) {
            return [
                {
                    id: 'profile',
                    type: 'link',
                    to: '/student/profile',
                    icon: <User size={16} />,
                    label: t('nav.profile'),
                    active: isPathMatch(['/student/profile']),
                },
                ...(isPremiumEnabled
                    ? [{
                        id: 'plan',
                        type: 'link',
                        to: '/premium',
                        icon: <Crown size={16} />,
                        label: t('nav.personalizedPlan'),
                        active: isPathMatch(['/premium']),
                        onSelect: handleStudentPremiumNav,
                    }]
                    : []),
                {
                    id: 'payments',
                    type: 'link',
                    to: '/payments',
                    icon: <Receipt size={16} />,
                    label: t('nav.payments'),
                    active: isPathMatch(['/payments']),
                },
                {
                    id: 'referrals',
                    type: 'link',
                    to: '/student/referrals',
                    icon: <Gift size={16} />,
                    label: t('nav.referrals'),
                    active: isPathMatch(['/student/referrals']) || location.pathname === '/referrals',
                },
                ...sharedControls,
            ]
        }

        if (isCompany) {
            return [
                {
                    id: 'profile',
                    type: 'link',
                    to: '/company/profile',
                    icon: <User size={16} />,
                    label: t('nav.profile'),
                    active: isPathMatch(['/company/profile']),
                },
                {
                    id: 'post-job',
                    type: 'link',
                    to: '/company/post-offer',
                    icon: <Briefcase size={16} />,
                    label: t('nav.postJob'),
                    active: isPathMatch(['/company/post-offer']),
                },
                {
                    id: 'archived',
                    type: 'link',
                    to: '/company/archived',
                    icon: <FolderArchive size={16} />,
                    label: t('nav.archived'),
                    active: isPathMatch(['/company/archived']),
                },
                ...sharedControls,
            ]
        }

        return []
    })()

    const guestMobileLinks = [
        { id: 'student-signup', to: '/student/signup', icon: <User size={18} />, label: t('landing.ctaStudent') },
        {
            id: 'company-signup',
            to: '/company/signup',
            icon: <Briefcase size={18} />,
            label: t('landing.ctaCompany'),
            className: 'navbar-link--primary',
        },
    ]

    const studentMobileLinks = [
        ...studentPrimaryLinks,
        {
            id: 'mobile-notifications',
            to: '/student/notifications',
            icon: <Bell size={18} />,
            label: t('nav.notifications'),
            badge: unreadNotifications,
            isActive: isPathMatch(['/student/notifications']),
        },
        {
            id: 'mobile-profile',
            to: '/student/profile',
            icon: <User size={18} />,
            label: t('nav.profile'),
            isActive: isPathMatch(['/student/profile']),
        },
        ...(isPremiumEnabled
            ? [{
                id: 'mobile-plan',
                to: '/premium',
                icon: <Crown size={18} />,
                label: t('nav.personalizedPlan'),
                onClick: handleStudentPremiumNav,
                isActive: isPathMatch(['/premium']),
            }]
            : []),
        {
            id: 'mobile-payments',
            to: '/payments',
            icon: <Receipt size={18} />,
            label: t('nav.payments'),
            isActive: isPathMatch(['/payments']),
        },
        {
            id: 'mobile-referrals',
            to: '/student/referrals',
            icon: <Gift size={18} />,
            label: t('nav.referrals'),
            isActive: isPathMatch(['/student/referrals']) || location.pathname === '/referrals',
        },
    ]

    const companyMobileLinks = [
        ...companyPrimaryLinks,
        {
            id: 'mobile-notifications',
            to: '/company/notifications',
            icon: <Bell size={18} />,
            label: t('nav.notifications'),
            badge: unreadNotifications,
            isActive: isPathMatch(['/company/notifications']),
        },
        {
            id: 'mobile-profile',
            to: '/company/profile',
            icon: <User size={18} />,
            label: t('nav.profile'),
            isActive: isPathMatch(['/company/profile']),
        },
        {
            id: 'mobile-post-job',
            to: '/company/post-offer',
            icon: <Briefcase size={18} />,
            label: t('nav.postJob'),
            isActive: isPathMatch(['/company/post-offer']),
        },
        {
            id: 'mobile-archived',
            to: '/company/archived',
            icon: <FolderArchive size={18} />,
            label: t('nav.archived'),
            isActive: isPathMatch(['/company/archived']),
        },
    ]

    const mobileLinks = hasSession
        ? (isStudent ? studentMobileLinks : isCompany ? companyMobileLinks : [])
        : guestMobileLinks

    const logoTarget = hasSession
        ? (isCompany ? '/company/intros' : isStudent ? '/student/swipe' : '/discovery')
        : '/'

    useEffect(() => {
        setIsOpen(false)
        setLangOpen(false)
        setProfileMenuOpen(false)
    }, [location.pathname])

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false)
                setLangOpen(false)
                setProfileMenuOpen(false)
            }
        }

        document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    }, [])

    useEffect(() => {
        if (!langOpen) return undefined

        const handleOutsideClick = (event) => {
            if (!langSwitcherRef.current?.contains(event.target)) {
                setLangOpen(false)
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)
        return () => document.removeEventListener('mousedown', handleOutsideClick)
    }, [langOpen])

    useEffect(() => {
        if (!hasSession || !notificationScope) {
            setUnreadNotifications(0)
            return undefined
        }

        migrateLegacyNotifications()
        const scopeStorageKey = getNotificationStorageKey(notificationScope)
        const refreshUnreadCount = () => {
            setUnreadNotifications(getUnreadNotificationCount(notificationScope))
        }

        const handleStorage = (event) => {
            if (!event.key || event.key === scopeStorageKey) {
                refreshUnreadCount()
            }
        }

        const handleScopedUpdate = (event) => {
            const eventScope = event?.detail?.scope
            if (!eventScope || eventScope === notificationScope) {
                refreshUnreadCount()
            }
        }

        refreshUnreadCount()
        window.addEventListener('storage', handleStorage)
        window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleScopedUpdate)

        return () => {
            window.removeEventListener('storage', handleStorage)
            window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleScopedUpdate)
        }
    }, [hasSession, notificationScope])

    useEffect(() => {
        document.body.classList.toggle('navbar-menu-open', isOpen)
        return () => document.body.classList.remove('navbar-menu-open')
    }, [isOpen])

    const renderLanguageSwitcher = () => (
        <div className="lang-switcher" ref={langSwitcherRef}>
            <button
                type="button"
                className="lang-btn"
                onClick={() => setLangOpen((prev) => !prev)}
                aria-label="Change language"
                aria-expanded={langOpen}
            >
                <Globe size={16} />
                <span>{currentLang.label}</span>
                <ChevronDown size={14} />
            </button>

            {langOpen && (
                <div className="lang-dropdown">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            type="button"
                            className={`lang-option ${languageCode === lang.code ? 'active' : ''}`}
                            onClick={() => changeLanguage(lang.code)}
                        >
                            <span>{lang.fullLabel}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )

    return (
        <nav className={`navbar${isLanding ? ' navbar--landing' : ''}`}>
            <div className="navbar-container">
                <Link to={logoTarget} className="navbar-logo" aria-label="Go to Discover">
                    <Logo size="small" showText={true} />
                </Link>

<<<<<<< HEAD
                {supportsRoleNav ? (
                    <div className="navbar-primary" aria-label="Primary navigation">
                        {primaryLinks.map((link) => (
                            <NavItem
                                key={link.id}
                                to={link.to}
                                icon={link.icon}
                                label={link.label}
                                isActive={link.isActive}
                                className="navbar-primary-link"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="navbar-primary-spacer" aria-hidden="true" />
                )}

                <div className="navbar-right">
                    {hasSession && supportsRoleNav && (
                        <div className="navbar-utility-cluster">
                            {notificationRoute && (
                                <NotificationsButton
                                    to={notificationRoute}
                                    count={unreadNotifications}
                                    label={t('nav.notifications')}
                                />
                            )}

                            <ProfileMenu
                                menuId="profile-menu"
                                isOpen={profileMenuOpen}
                                onToggle={() => setProfileMenuOpen((prev) => !prev)}
                                onClose={() => setProfileMenuOpen(false)}
                                triggerLabel={profileLabel}
                                avatarUrl={avatarUrl}
                                initials={profileInitials}
                                items={profileMenuItems}
                                onLogout={handleLogout}
                            />
=======
                <div
                    id="navbar-links"
                    className={`navbar-links ${hasSession ? '' : 'navbar-links--guest'} ${isOpen ? 'active' : ''}`}
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setIsOpen(false)
                        }
                    }}
                >
                    {mobileLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`navbar-link ${link.className || ''} ${location.pathname === link.to ? 'active' : ''}`}
                            onClick={(event) => {
                                link.onClick?.(event)
                                if (!event.defaultPrevented) {
                                    setIsOpen(false)
                                }
                            }}
                        >
                            {link.icon}
                            <span>{link.label}</span>
                            {Number.isFinite(link.badge) && link.badge > 0 && (
                                <span className="navbar-notification-badge" aria-label={t('uiAria.unreadNotifications', { count: link.badge })}>
                                    {link.badge > 99 ? '99+' : link.badge}
                                </span>
                            )}
                        </Link>
                    ))}

                    {hasSession && (
                        <button onClick={handleLogout} className="btn btn-secondary btn-sm logout-btn logout-btn--mobile">
                            <LogOut size={16} />
                            <span>{t('nav.logout')}</span>
                        </button>
                    )}
                </div>

                <div className="navbar-right">
                    <div className="lang-switcher" ref={langSwitcherRef}>
                        <button
                            className="lang-btn"
                            onClick={() => setLangOpen(!langOpen)}
                            aria-label={t('uiAria.changeLanguage')}
                            aria-expanded={langOpen}
                        >
                            <Globe size={16} />
                            <span>{currentLang.label}</span>
                            <ChevronDown size={14} />
                        </button>

                        {langOpen && (
                            <div className="lang-dropdown">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        className={`lang-option ${i18n.language === lang.code ? 'active' : ''}`}
                                        onClick={() => changeLanguage(lang.code)}
                                    >
                                        <span>{lang.fullLabel}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {hasSession && notificationsTarget && (
                        <Link
                            to={notificationsTarget}
                            className={`navbar-icon-link navbar-notification-btn ${location.pathname === notificationsTarget ? 'active' : ''}`}
                            aria-label={t('nav.notifications')}
                            title={t('nav.notifications')}
                        >
                            <Bell size={18} />
                            {unreadNotifications > 0 && (
                                <span className="navbar-notification-badge navbar-notification-badge--floating" aria-label={t('uiAria.unreadNotifications', { count: unreadNotifications })}>
                                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                                </span>
                            )}
                        </Link>
                    )}

                    <button
                        className="theme-toggle-btn"
                        onClick={toggleTheme}
                        aria-label={theme === 'dark' ? t('uiAria.switchToLightMode') : t('uiAria.switchToDarkMode')}
                        title={theme === 'dark' ? t('uiAria.switchToLightMode') : t('uiAria.switchToDarkMode')}
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {!hasSession && (
                        <div className={`navbar-auth ${isLoading ? 'is-loading' : ''}`} aria-hidden={isLoading}>
                            <Link to="/student/signup" className="btn btn-secondary btn-sm">
                                {t('landing.ctaStudent')}
                            </Link>
                            <Link to="/company/signup" className="btn btn-primary btn-sm">
                                {t('landing.ctaCompany')}
                            </Link>
>>>>>>> f1dacb96d3052adf82fd2817d641a859bc707cd6
                        </div>
                    )}

                    {hasSession && !supportsRoleNav && (
                        <>
                            {renderLanguageSwitcher()}
                            <button
                                type="button"
                                className="theme-toggle-btn"
                                onClick={toggleTheme}
                                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            >
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                            <button onClick={handleLogout} className="btn btn-secondary btn-sm logout-btn logout-btn--fallback">
                                <LogOut size={16} />
                                <span>{t('nav.logout')}</span>
                            </button>
                        </>
                    )}

                    {!hasSession && (
                        <>
                            {renderLanguageSwitcher()}
                            <button
                                type="button"
                                className="theme-toggle-btn"
                                onClick={toggleTheme}
                                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            >
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            </button>

                            <div className={`navbar-auth ${isLoading ? 'is-loading' : ''}`} aria-hidden={isLoading}>
                                <Link to="/student/signup" className="btn btn-secondary btn-sm">
                                    {t('landing.ctaStudent')}
                                </Link>
                                <Link to="/company/signup" className="btn btn-primary btn-sm">
                                    {t('landing.ctaCompany')}
                                </Link>
                            </div>
                        </>
                    )}

                    <button
                        type="button"
                        className="navbar-toggle"
<<<<<<< HEAD
                        onClick={() => setIsOpen((prev) => !prev)}
                        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
=======
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label={isOpen ? t('uiAria.closeNavigationMenu') : t('uiAria.openNavigationMenu')}
>>>>>>> f1dacb96d3052adf82fd2817d641a859bc707cd6
                        aria-expanded={isOpen}
                        aria-controls="navbar-links"
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            <div
                id="navbar-links"
                className={`navbar-links ${hasSession ? '' : 'navbar-links--guest'} ${isOpen ? 'active' : ''}`}
                onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        setIsOpen(false)
                    }
                }}
            >
                {mobileLinks.map((link) => (
                    <NavItem
                        key={link.id}
                        to={link.to}
                        icon={link.icon}
                        label={link.label}
                        badge={link.badge}
                        className={link.className || ''}
                        isActive={link.isActive}
                        onClick={(event) => {
                            link.onClick?.(event)
                            setIsOpen(false)
                        }}
                    />
                ))}

                {hasSession && (
                    <button onClick={handleLogout} className="btn btn-secondary btn-sm logout-btn logout-btn--mobile">
                        <LogOut size={16} />
                        <span>{t('nav.logout')}</span>
                    </button>
                )}
            </div>
        </nav>
    )
}

export default Navbar
