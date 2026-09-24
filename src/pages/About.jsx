import React from 'react'
import { useTranslation } from 'react-i18next'
import { Target, Globe, Sparkles } from 'lucide-react'
import './About.css'

const About = () => {
    const { t } = useTranslation()

    return (
        <div className="about-page container">
            <div className="about-hero-card">
                <h1 className="about-hero-title">{t('aboutPage.title')}</h1>
                <p className="about-hero-subtitle">
                    {t('aboutPage.subtitle')}
                </p>
                <p className="about-hero-desc">
                    {t('aboutPage.description')}
                </p>
            </div>

            <div className="about-bento-grid">
                <div className="about-feature-card">
                    <div className="about-card-icon about-card-icon--blue">
                        <Target size={28} />
                    </div>
                    <h3 className="about-card-title">{t('aboutPage.cards.mission.title')}</h3>
                    <p className="about-card-desc">{t('aboutPage.cards.mission.description')}</p>
                </div>

                <div className="about-feature-card">
                    <div className="about-card-icon about-card-icon--purple">
                        <Sparkles size={28} />
                    </div>
                    <h3 className="about-card-title">{t('aboutPage.cards.whyStarted.title')}</h3>
                    <p className="about-card-desc">{t('aboutPage.cards.whyStarted.description')}</p>
                </div>

                <div className="about-feature-card">
                    <div className="about-card-icon about-card-icon--teal">
                        <Globe size={28} />
                    </div>
                    <h3 className="about-card-title">{t('aboutPage.cards.globalImpact.title')}</h3>
                    <p className="about-card-desc">{t('aboutPage.cards.globalImpact.description')}</p>
                </div>
            </div>

            <div className="about-cta-card">
                <p className="about-cta-title">{t('aboutPage.cta.title')}</p>
                <p className="about-cta-subtitle">{t('aboutPage.cta.subtitle')}</p>
            </div>
        </div>
    )
}

export default About
