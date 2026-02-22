import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'
import Logo from './Logo'

const Footer = () => {
    const { theme, setTheme } = useTheme()
    const currentYear = new Date().getFullYear()

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
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))',
                    gap: 'clamp(1rem, 4vw, 2rem)',
                    marginBottom: 'clamp(1rem, 4vw, 2rem)'
                }}>
                    {/* Brand Section */}
                    <div>
                        <div style={{ marginBottom: '0.75rem' }}>
                            <Logo showText={true} />
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', lineHeight: '1.6' }}>
                            Matching talent with opportunity through AI-driven discovery.
                        </p>
                    </div>

                    {/* Founder Profile */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <img
                                src="/founder.jpg"
                                alt="Zied Fatnassi - Founder"
                                style={{
                                    width: 'clamp(70px, 15vw, 100px)',
                                    height: 'clamp(70px, 15vw, 100px)',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '3px solid var(--glass-border)',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                }}
                                width="100"
                                height="100"
                            />
                            <div style={{ marginTop: '0.5rem' }}>
                                <h4 style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Zied Fatnassi</h4>
                                <p style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)', color: 'var(--text-secondary)' }}>Founder & Developer</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', fontWeight: '600', marginBottom: '0.75rem' }}>Company</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <Link to="/about" style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', minHeight: '44px', display: 'flex', alignItems: 'center' }}>About Us</Link>
                            <Link to="/contact" style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', minHeight: '44px', display: 'flex', alignItems: 'center' }}>Contact</Link>
                        </div>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', fontWeight: '600', marginBottom: '0.75rem' }}>Legal</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <Link to="/legal/terms" style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', minHeight: '44px', display: 'flex', alignItems: 'center' }}>Terms of Service</Link>
                            <Link to="/legal/privacy" style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', minHeight: '44px', display: 'flex', alignItems: 'center' }}>Privacy Policy</Link>
                            <Link to="/legal/cookies" style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', minHeight: '44px', display: 'flex', alignItems: 'center' }}>Cookie Policy</Link>
                        </div>
                    </div>

                    {/* Theme Toggle */}
                    <div>
                        <h4 style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', fontWeight: '600', marginBottom: '0.75rem' }}>Appearance</h4>
                        <div style={{
                            display: 'inline-flex',
                            background: 'var(--glass-surface)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '9999px',
                            padding: '0.25rem'
                        }}>
                            {[
                                { id: 'light', icon: Sun, label: 'Light' },
                                { id: 'dark', icon: Moon, label: 'Dark' },
                                { id: 'system', icon: Monitor, label: 'Auto' }
                            ].map(mode => (
                                <button
                                    key={mode.id}
                                    onClick={() => setTheme(mode.id)}
                                    title={mode.label}
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

                <div style={{
                    borderTop: '1px solid var(--glass-border)',
                    paddingTop: '1rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 'clamp(0.75rem, 2vw, 0.85rem)'
                }}>
                    &copy; {currentYear} MatchOp. All rights reserved.
                </div>
            </div>
        </footer>
    )
}

export default Footer
