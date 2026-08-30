import { useTranslation } from 'react-i18next'
import { ArrowRight, Users, Briefcase, Sparkles, ShieldCheck, Zap, Compass } from 'lucide-react'
import Logo from '../../Logo'
import { TextReveal } from '../motion/TextReveal'
import { SectionReveal } from '../motion/SectionReveal'
import { FloatingCard } from '../motion/FloatingCard'
import { MagneticButton } from '../motion/MagneticButton'
import { useBilingualText } from '../../../lib/useBilingualText'

export function HeroSection() {
  const { t } = useTranslation()
  const tr = useBilingualText()

  return (
    <section className="landing-hero" id="hero">
      {/* Background ambient lighting and mesh */}
      <div className="landing-hero__ambient" aria-hidden="true">
        <div className="landing-hero__mesh" />
        <div className="landing-hero__glow landing-hero__glow--1" />
        <div className="landing-hero__glow landing-hero__glow--2" />
        <div className="landing-hero__glow landing-hero__glow--3" />
        <div className="landing-hero__grid-pattern" />
      </div>

      <div className="container landing-hero__container">
        {/* Top MatchOp Pill Badge */}
        <SectionReveal delay={0.1} yOffset={20} className="landing-hero__badge-wrapper">
          <div className="landing-badge">
            <span className="landing-badge__pulse" aria-hidden="true" />
            <Sparkles size={14} className="landing-badge__icon" />
            <span className="landing-badge__text">
              {t('landing.badge', 'The Next Generation Recruitment Intelligence')}
            </span>
          </div>
        </SectionReveal>

        {/* MatchOp Animated Brand Centerpiece */}
        <SectionReveal delay={0.2} yOffset={24} className="landing-hero__logo-wrapper">
          <div className="landing-hero__logo-card">
            <Logo size="large" showText={false} animated={true} />
          </div>
        </SectionReveal>

        {/* Oversized Kinetic Headline */}
        <div className="landing-hero__title-wrapper">
          <h1 className="landing-hero__title">
            <TextReveal
              as="span"
              className="landing-hero__title-line"
              delay={0.3}
              stagger={0.05}
              serifWords={['Opportunity', 'Opportunité', 'Match']}
            >
              {t('landing.heroTitle', 'Match Your Opportunity')}
            </TextReveal>
          </h1>
          <p className="landing-hero__highlight-statement">
            <span className="font-serif-accent">
              {t('landing.heroHighlight', 'Curated career discovery powered by mutual alignment.')}
            </span>
          </p>
        </div>

        {/* Editorial Subtitle */}
        <SectionReveal delay={0.5} yOffset={20} className="landing-hero__subtitle-wrapper">
          <p className="landing-hero__subtitle">
            {t(
              'landing.heroSubtitle',
              'Connect ambitious candidates with forward-thinking companies through an intelligent matching platform. Zero noise. Zero black holes. Real direct connections.'
            )}
          </p>
        </SectionReveal>

        {/* Dual Magnetic Action Portals */}
        <SectionReveal delay={0.65} yOffset={24} className="landing-hero__cta-group">
          <MagneticButton
            to="/student/signup"
            variant="primary"
            size="lg"
            className="landing-cta-btn landing-cta-btn--student"
          >
            <Users size={18} />
            <span>{t('landing.ctaStudent', "I'm a Candidate / Student")}</span>
            <ArrowRight size={16} />
          </MagneticButton>

          <MagneticButton
            to="/company/signup"
            variant="secondary"
            size="lg"
            className="landing-cta-btn landing-cta-btn--company"
          >
            <Briefcase size={18} />
            <span>{t('landing.ctaCompany', "I'm a Company")}</span>
            <ArrowRight size={16} />
          </MagneticButton>
        </SectionReveal>

        {/* Floating Verified Telemetry Floating Cards */}
        <SectionReveal delay={0.8} yOffset={30} className="landing-hero__telemetry">
          <div className="landing-hero__telemetry-grid">
            <FloatingCard floatDuration={5} floatDistance={6} className="hero-stat-card">
              <div className="hero-stat-card__icon hero-stat-card__icon--primary">
                <Zap size={18} />
              </div>
              <div className="hero-stat-card__content">
                <span className="hero-stat-card__value">98.4%</span>
                <span className="hero-stat-card__label">
                  {tr('Match Precision Score', 'Précision de matching')}
                </span>
              </div>
            </FloatingCard>

            <FloatingCard floatDuration={6} floatDistance={8} className="hero-stat-card">
              <div className="hero-stat-card__icon hero-stat-card__icon--teal">
                <ShieldCheck size={18} />
              </div>
              <div className="hero-stat-card__content">
                <span className="hero-stat-card__value">100%</span>
                <span className="hero-stat-card__label">
                  {tr('Verified Opportunities', 'Opportunités vérifiées')}
                </span>
              </div>
            </FloatingCard>

            <FloatingCard floatDuration={5.5} floatDistance={7} className="hero-stat-card">
              <div className="hero-stat-card__icon hero-stat-card__icon--purple">
                <Compass size={18} />
              </div>
              <div className="hero-stat-card__content">
                <span className="hero-stat-card__value">&lt; 48h</span>
                <span className="hero-stat-card__label">
                  {tr('Average Intro Time', 'Délai moyen de mise en relation')}
                </span>
              </div>
            </FloatingCard>
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}

export default HeroSection
