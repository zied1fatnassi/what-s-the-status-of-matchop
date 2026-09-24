import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'
import Logo from './Logo'
import './Footer.css'

const Footer = () => {
    const { t } = useTranslation()
    const { theme, setTheme } = useTheme()
    const currentYear = new Date().getFullYear()
    const themeModes = [
        { id: 'light', icon: Sun, label: t('footer.theme.light', 'Light') },
        { id: 'dark', icon: Moon, label: t('footer.theme.dark', 'Dark') },
        { id: 'system', icon: Monitor, label: t('footer.theme.auto', 'System') },
    ]

    return (
        <footer className="matchop-footer">
            <div className="footer-container">
                <div className="footer-grid">
                    {/* Brand Section */}
                    <div className="footer-brand">
                        <div className="footer-brand-logo">
                            <Logo showText={true} />
                        </div>
                        <p className="footer-tagline">
                            {t('footer.tagline')}
                        </p>
                    </div>

                    {/* Links Grid */}
                    <div className="footer-links-group">
                        {/* Company Links */}
                        <div className="footer-column">
                            <h4 className="footer-column-title">
                                {t('footer.sections.company')}
                            </h4>
                            <div className="footer-links-list">
                                <Link to="/about" className="footer-nav-link">
                                    {t('footer.links.aboutUs')}
                                </Link>
                                <Link to="/contact" className="footer-nav-link">
                                    {t('footer.links.contact')}
                                </Link>
                            </div>
                        </div>

                        {/* Legal Links */}
                        <div className="footer-column">
                            <h4 className="footer-column-title">
                                {t('footer.sections.legal')}
                            </h4>
                            <div className="footer-links-list">
                                <Link to="/legal/terms" className="footer-nav-link">
                                    {t('footer.links.termsOfService')}
                                </Link>
                                <Link to="/legal/privacy" className="footer-nav-link">
                                    {t('footer.links.privacyPolicy')}
                                </Link>
                                <Link to="/legal/cookies" className="footer-nav-link">
                                    {t('footer.links.cookiePolicy')}
                                </Link>
                            </div>
                        </div>

                        {/* Appearance / Theme */}
                        <div className="footer-column">
                            <h4 className="footer-column-title">
                                {t('footer.sections.appearance')}
                            </h4>
                            <div className="footer-theme-switcher" role="group" aria-label="Theme mode switcher">
                                {themeModes.map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setTheme(mode.id)}
                                        title={mode.label}
                                        aria-label={mode.label}
                                        className={`footer-theme-btn ${theme === mode.id ? 'active' : ''}`}
                                    >
                                        <mode.icon size={17} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom-bar">
                    <span>{t('footer.rightsReserved', { year: currentYear })}</span>
                    <span>MatchOp — AI Career Discovery Platform</span>
                </div>
            </div>
        </footer>
    )
}

export default Footer
