import React from 'react'
import { useTranslation } from 'react-i18next'
import { Target, Globe, Sparkles } from 'lucide-react'

const About = () => {
    const { t } = useTranslation()

    return (
        <div className="container" style={{ padding: '4rem 1rem' }}>
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{t('aboutPage.title')}</h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 600, margin: '0 auto 1.5rem', textAlign: 'center' }}>
                    {t('aboutPage.subtitle')}
                </p>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto', lineHeight: 1.7 }}>
                    {t('aboutPage.description')}
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div className="glass-card hover-lift" style={{ padding: '2rem' }}>
                    <div style={{ background: 'rgba(37, 99, 235, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                        <Target size={30} />
                    </div>
                    <h3>{t('aboutPage.cards.mission.title')}</h3>
                    <p>{t('aboutPage.cards.mission.description')}</p>
                </div>

                <div className="glass-card hover-lift" style={{ padding: '2rem' }}>
                    <div style={{ background: 'rgba(139, 92, 246, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--accent-purple)' }}>
                        <Sparkles size={30} />
                    </div>
                    <h3>{t('aboutPage.cards.whyStarted.title')}</h3>
                    <p>{t('aboutPage.cards.whyStarted.description')}</p>
                </div>

                <div className="glass-card hover-lift" style={{ padding: '2rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--accent-teal)' }}>
                        <Globe size={30} />
                    </div>
                    <h3>{t('aboutPage.cards.globalImpact.title')}</h3>
                    <p>{t('aboutPage.cards.globalImpact.description')}</p>
                </div>
            </div>

            <div
                className="glass-card"
                style={{
                    padding: '2.5rem',
                    marginTop: '3rem',
                    minHeight: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                }}
            >
                <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>{t('aboutPage.cta.title')}</p>
                <p style={{ fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>{t('aboutPage.cta.subtitle')}</p>
            </div>
        </div>
    )
}

export default About
