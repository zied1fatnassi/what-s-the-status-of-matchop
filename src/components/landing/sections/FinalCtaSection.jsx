import { useTranslation } from 'react-i18next'
import { ArrowRight, Users, Briefcase, Sparkles, ShieldCheck, Check } from 'lucide-react'
import { TextReveal } from '../motion/TextReveal'
import { SectionReveal } from '../motion/SectionReveal'
import { MagneticButton } from '../motion/MagneticButton'
import { useBilingualText } from '../../../lib/useBilingualText'

export function FinalCtaSection() {
  const { t } = useTranslation()
  const tr = useBilingualText()

  return (
    <section className="landing-final-cta" id="cta">
      {/* Background ambient lighting */}
      <div className="landing-final-cta__ambient" aria-hidden="true">
        <div className="landing-final-cta__glow" />
      </div>

      <div className="container landing-final-cta__container">
        <SectionReveal delay={0.1} yOffset={25} className="final-cta-card">
          <div className="landing-badge landing-badge--accent">
            <Sparkles size={14} className="landing-badge__icon" />
            <span className="landing-badge__text">
              {tr('Shape Your Future Today', 'Construisez votre avenir dès aujourd’hui')}
            </span>
          </div>

          <h2 className="final-cta-title">
            <TextReveal
              as="span"
              delay={0.2}
              serifWords={['Breakthrough', 'Match', 'Avenir', 'Opportunité']}
            >
              {t(
                'landing.ctaTitle',
                'Your next career breakthrough is one match away.'
              )}
            </TextReveal>
          </h2>

          <p className="final-cta-subtitle">
            {t(
              'landing.ctaSubtitle',
              'Join ambitious students and verified companies shaping the future of recruitment. Fast, transparent, and direct.'
            )}
          </p>

          <div className="final-cta-buttons">
            <MagneticButton
              to="/student/signup"
              variant="primary"
              size="lg"
              className="final-cta-btn"
            >
              <Users size={18} />
              <span>{t('landing.signupStudent', 'Sign Up as Candidate')}</span>
              <ArrowRight size={16} />
            </MagneticButton>

            <MagneticButton
              to="/company/signup"
              variant="secondary"
              size="lg"
              className="final-cta-btn"
            >
              <Briefcase size={18} />
              <span>{t('landing.signupCompany', 'Sign Up as Company')}</span>
              <ArrowRight size={16} />
            </MagneticButton>
          </div>

          <div className="final-cta-trust-row">
            <div className="trust-item">
              <Check size={14} className="trust-icon" />
              <span>{tr('100% Free for Candidates', '100% Gratuit pour les candidats')}</span>
            </div>
            <div className="trust-item">
              <ShieldCheck size={14} className="trust-icon" />
              <span>{tr('Verified Tech Companies Only', 'Entreprises tech vérifiées')}</span>
            </div>
            <div className="trust-item">
              <Check size={14} className="trust-icon" />
              <span>{tr('Strict Data Privacy', 'Confidentialité totale des données')}</span>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}

export default FinalCtaSection
