import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Users, Briefcase, Heart, MessageCircle, Sparkles, Zap } from 'lucide-react'
import Logo from '../components/Logo'
import { useBilingualText } from '../lib/useBilingualText'
import './Landing.css'

/**
 * Landing page for MatchOp
 * Features hero section, how it works, features for students/companies, and CTA
 */
function Landing() {
    const { t } = useTranslation()
    const tr = useBilingualText()

    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-bg">
                    <div className="gradient-orb orb-1"></div>
                    <div className="gradient-orb orb-2"></div>
                    <div className="gradient-orb orb-3"></div>
                </div>

                <div className="container hero-content">
                    <div className="hero-logo">
                        <Logo size="large" showText={false} animated={true} />
                    </div>

                    <div className="hero-badge">
                        <Sparkles size={16} />
                        <span>{t('landing.badge')}</span>
                    </div>

                    <h1 className="hero-title">
                        {t('landing.heroTitle')}<br />
                        <span className="gradient-text">{t('landing.heroHighlight')}</span>
                    </h1>

                    <p className="hero-subtitle">
                        {t('landing.heroSubtitle')}
                    </p>

                    <div className="hero-cta">
                        <Link to="/student/signup" className="btn btn-primary btn-lg">
                            <Users size={20} />
                            {t('landing.ctaStudent')}
                            <ArrowRight size={20} />
                        </Link>
                        <Link to="/company/signup" className="btn btn-secondary btn-lg">
                            <Briefcase size={20} />
                            {t('landing.ctaCompany')}
                            <ArrowRight size={20} />
                        </Link>
                    </div>

                    <div className="hero-stats">
                        <div className="stat-item">
                            <span className="stat-number">{t('landing.statsStudentsValue')}</span>
                            <span className="stat-label">{t('landing.statsStudents')}</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                            <span className="stat-number">{t('landing.statsCompaniesValue')}</span>
                            <span className="stat-label">{t('landing.statsCompanies')}</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                            <span className="stat-number">{t('landing.statsMatchesValue')}</span>
                            <span className="stat-label">{t('landing.statsMatches')}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="how-it-works">
                <div className="container">
                    <h2 className="section-title">
                        {t('landing.howItWorks')}
                    </h2>

                    <div className="steps-grid">
                        <div className="step-card glass-card">
                            <div className="step-number">01</div>
                            <div className="step-icon">
                                <Users size={32} />
                            </div>
                            <h3>{t('landing.step1Title')}</h3>
                            <p>{t('landing.step1Desc')}</p>
                        </div>

                        <div className="step-card glass-card">
                            <div className="step-number">02</div>
                            <div className="step-icon">
                                <Heart size={32} />
                            </div>
                            <h3>{t('landing.step2Title')}</h3>
                            <p>{t('landing.step2Desc')}</p>
                        </div>

                        <div className="step-card glass-card">
                            <div className="step-number">03</div>
                            <div className="step-icon">
                                <MessageCircle size={32} />
                            </div>
                            <h3>{t('landing.step3Title')}</h3>
                            <p>{t('landing.step3Desc')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="features">
                <div className="container">
                    <div className="features-grid">
                        <div className="feature-content">
                            <span className="feature-badge">
                                <Zap size={16} />
                                {t('landing.forStudents')}
                            </span>
                            <h2>{t('landing.forStudentsTitle')}</h2>
                            <p>{t('landing.forStudentsDesc')}</p>
                            <ul className="feature-list">
                                <li>{tr('Personalized job recommendations', 'Recommandations personnalisees')}</li>
                                <li>{tr('Direct access to hiring managers', 'Acces direct aux recruteurs')}</li>
                                <li>{tr('Real-time application status', 'Suivi des candidatures en temps reel')}</li>
                                <li>{tr('Interview scheduling built-in', 'Planification des entretiens integree')}</li>
                            </ul>
                            <Link to="/student/signup" className="btn btn-primary">
                                {tr('Get Started Free', 'Commencer gratuitement')}
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>

                    <div className="features-grid reverse">
                        <div className="feature-visual">
                            <div className="dashboard-mockup">
                                <div className="mock-header">
                                    <span className="mock-title">{tr('Candidate Pipeline', 'Pipeline candidats')}</span>
                                </div>
                                <div className="mock-candidates">
                                    <div className="mock-candidate">
                                        <div className="mock-avatar avatar-1"><span>AB</span></div>
                                        <div className="mock-info">
                                            <span>Ahmed Ben Ali</span>
                                            <span className="match-score">95% Match</span>
                                        </div>
                                    </div>
                                    <div className="mock-candidate">
                                        <div className="mock-avatar avatar-2"><span>MS</span></div>
                                        <div className="mock-info">
                                            <span>Mariem Sassi</span>
                                            <span className="match-score">92% Match</span>
                                        </div>
                                    </div>
                                    <div className="mock-candidate">
                                        <div className="mock-avatar avatar-3"><span>YH</span></div>
                                        <div className="mock-info">
                                            <span>Yassine Hammami</span>
                                            <span className="match-score">88% Match</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="feature-content">
                            <span className="feature-badge company">
                                <Briefcase size={16} />
                                {t('landing.forCompanies')}
                            </span>
                            <h2>{t('landing.forCompaniesTitle')}</h2>
                            <p>{t('landing.forCompaniesDesc')}</p>
                            <ul className="feature-list">
                                <li>{tr('Pre-qualified candidates', 'Candidats pre-qualifies')}</li>
                                <li>{tr('Reduced time-to-hire', "Delai d'embauche reduit")}</li>
                                <li>{tr('Built-in screening tools', 'Outils de preselection integres')}</li>
                                <li>{tr('Analytics dashboard', "Tableau de bord d'analyse")}</li>
                            </ul>
                            <Link to="/company/signup" className="btn btn-primary">
                                {tr('Start Hiring', 'Commencer a recruter')}
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-card glass-card">
                        <h2>{t('landing.ctaTitle')}</h2>
                        <p>{t('landing.ctaSubtitle')}</p>
                        <div className="cta-buttons">
                            <Link to="/student/signup" className="btn btn-primary btn-lg">
                                {t('landing.signupStudent')}
                            </Link>
                            <Link to="/company/signup" className="btn btn-secondary btn-lg">
                                {t('landing.signupCompany')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default Landing
