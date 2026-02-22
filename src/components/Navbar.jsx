import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, User, Briefcase, Heart, Home, LogOut, Globe, ChevronDown, Moon, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import Logo from './Logo'
import './Navbar.css'

/**
 * Main navigation component with:
 * - Role-based navigation (Student vs Company)
 * - Language switcher (EN/FR)
 * - Mobile responsive menu
 * - Auth state persistence
 */
function Navbar({ isLanding = false }) {
    const [isOpen, setIsOpen] = useState(false)
    const [langOpen, setLangOpen] = useState(false)
    const langSwitcherRef = useRef(null)
    const location = useLocation()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const { isLoggedIn, isStudent, isCompany, isLoading, signOut, user } = useAuth()
    const { theme, setTheme } = useTheme()
    const hasSession = isLoggedIn && !!user

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
    }

    const studentLinks = [
        { to: '/student/matches', icon: <Heart size={18} />, label: t('nav.matches') },
        { to: '/student/swipe', icon: <Home size={18} />, label: t('nav.discover') },
        { to: '/student/global-jobs', icon: <Globe size={18} />, label: 'Global Jobs' },
        { to: '/student/profile', icon: <User size={18} />, label: t('nav.profile') },
    ]

    const companyLinks = [
        { to: '/company/candidates', icon: <User size={18} />, label: t('nav.candidates') },
        { to: '/company/matches', icon: <Heart size={18} />, label: t('nav.matches') },
        { to: '/company/post-offer', icon: <Briefcase size={18} />, label: t('nav.postJob') },
        { to: '/company/profile', icon: <User size={18} />, label: t('nav.profile') },
    ]

    const links = isStudent ? studentLinks : isCompany ? companyLinks : []
    const logoTarget = hasSession ? '/discovery' : '/'

    const languages = [
        { code: 'en', label: 'EN', fullLabel: 'English' },
        { code: 'fr', label: 'FR', fullLabel: 'Francais' },
    ]

    const currentLang = languages.find((lang) => lang.code === i18n.language) || languages[0]

    const changeLanguage = (code) => {
        i18n.changeLanguage(code)
        setLangOpen(false)
    }

    const handleLogout = async () => {
        try {
            await signOut()
            navigate('/')
            setIsOpen(false)
        } catch (err) {
            console.error('[Navbar] Logout failed:', err)
        }
    }

    useEffect(() => {
        setIsOpen(false)
        setLangOpen(false)
    }, [location.pathname])

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false)
                setLangOpen(false)
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
        document.body.classList.toggle('navbar-menu-open', isOpen)
        return () => document.body.classList.remove('navbar-menu-open')
    }, [isOpen])

    return (
        <nav className={`navbar${isLanding ? ' navbar--landing' : ''}`}>
            <div className="navbar-container">
                <Link to={logoTarget} className="navbar-logo">
                    <Logo size="small" showText={true} />
                </Link>

                {hasSession && (
                    <div
                        className={`navbar-links ${isOpen ? 'active' : ''}`}
                        onClick={(event) => {
                            if (event.target === event.currentTarget) {
                                setIsOpen(false)
                            }
                        }}
                    >
                        {links.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`navbar-link ${location.pathname === link.to ? 'active' : ''}`}
                                onClick={() => setIsOpen(false)}
                            >
                                {link.icon}
                                <span>{link.label}</span>
                            </Link>
                        ))}

                        <button onClick={handleLogout} className="btn btn-secondary btn-sm logout-btn logout-btn--mobile">
                            <LogOut size={16} />
                            <span>{t('nav.logout')}</span>
                        </button>
                    </div>
                )}

                <div className="navbar-right">
                    <div className="lang-switcher" ref={langSwitcherRef}>
                        <button
                            className="lang-btn"
                            onClick={() => setLangOpen(!langOpen)}
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
                                        className={`lang-option ${i18n.language === lang.code ? 'active' : ''}`}
                                        onClick={() => changeLanguage(lang.code)}
                                    >
                                        <span>{lang.fullLabel}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        className="theme-toggle-btn"
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
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
                        </div>
                    )}

                    {hasSession && (
                        <button onClick={handleLogout} className="btn btn-secondary btn-sm logout-btn logout-btn--desktop">
                            <LogOut size={16} />
                            <span>{t('nav.logout')}</span>
                        </button>
                    )}

                    {hasSession && (
                        <button className="navbar-toggle" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle navigation menu" aria-expanded={isOpen}>
                            {isOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    )}
                </div>
            </div>
        </nav>
    )
}

export default Navbar
