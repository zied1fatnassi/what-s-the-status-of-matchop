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
        { id: 'light', icon: Sun, label: t('footer.theme.light') },
        { id: 'dark', icon: Moon, label: t('footer.theme.dark') },
        { id: 'system', icon: Monitor, label: t('footer.theme.auto') },
    ]

    return (
        <footer className="footer" style={{
            background: 'var(--bg-main)',
            borderTop: '1px solid var(--glass-border)',
            padding: 'clamp(1.5rem, 5vw, 3rem) var(--space-3, 1rem)',
            marginTop: 'auto',
            paddingBottom: 'calc(var(--safe-bottom) + clamp(1.5rem, 5vw, 3rem))'
        }}>
            <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-start',
                    alignItems: 'flex-start',
                    gap: 'clamp(1rem, 4vw, 2rem)',
                    marginBottom: 'clamp(1rem, 4vw, 2rem)'
                }}>
                    {/* Brand Section */}
                    <div className="footer-brand" style={{ flex: '1 1 280px', minWidth: '220px', maxWidth: '460px' }}>
                        <div className="footer-brand-logo" style={{ marginBottom: '0.75rem' }}>
                            <Logo showText={true} />
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                            {t('footer.tagline')}
                        </p>
                    </div>

                    <div className="footer-links-group" style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(1rem, 3vw, 1.75rem)', alignItems: 'flex-start' }}>
                        {/* Quick Links */}
                        <div className="footer-links-column footer-links-column--company" style={{ minWidth: '150px' }}>
                            <h4 style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', fontWeight: '600', marginBottom: '0.75rem' }}>
                                {t('footer.sections.company')}
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <Link to="/about" style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                                    {t('footer.links.aboutUs')}
                                </Link>
                                <Link to="/contact" style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                                    {t('footer.links.contact')}
                                </Link>
                            </div>
                        </div>

                        {/* Legal */}
                        <div className="footer-links-column footer-links-column--legal" style={{ minWidth: '170px' }}>
                            <h4 style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', fontWeight: '600', marginBottom: '0.75rem' }}>
                                {t('footer.sections.legal')}
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <Link to="/legal/terms" style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                                    {t('footer.links.termsOfService')}
                                </Link>
                                <Link to="/legal/privacy" style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                                    {t('footer.links.privacyPolicy')}
                                </Link>
                                <Link to="/legal/cookies" style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                                    {t('footer.links.cookiePolicy')}
                                </Link>
                            </div>
                        </div>

                        {/* Theme Toggle */}
                        <div className="footer-links-column footer-theme-column" style={{ minWidth: '170px' }}>
                            <h4 style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', fontWeight: '600', marginBottom: '0.75rem' }}>
                                {t('footer.sections.appearance')}
                            </h4>
                            <div style={{
                                display: 'inline-flex',
                                background: 'var(--glass-surface)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '9999px',
                                padding: '0.25rem'
                            }}>
                                {themeModes.map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setTheme(mode.id)}
                                        title={mode.label}
                                        aria-label={mode.label}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '50%',
                                            border: 'none',
                                            background: theme === mode.id ? 'var(--primary)' : 'transparent',
                                            color: theme === mode.id ? '#fff' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            touchAction: 'manipulation'
                                        }}
                                    >
                                        <mode.icon size={18} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{
                    borderTop: '1px solid var(--glass-border)',
                    paddingTop: '1rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 'clamp(0.75rem, 2vw, 0.85rem)'
                }}>
                    {t('footer.rightsReserved', { year: currentYear })}
                </div>
            </div>
        </footer>
    )
}

export default Footer
