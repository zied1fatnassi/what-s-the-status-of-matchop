import { useTranslation } from 'react-i18next'
import { UserCheck, HeartHandshake, MessageSquare, Layers } from 'lucide-react'
import { TextReveal } from '../motion/TextReveal'
import { SectionReveal } from '../motion/SectionReveal'
import { FloatingCard } from '../motion/FloatingCard'
import { useBilingualText } from '../../../lib/useBilingualText'

export function IdeaSection() {
  const { t } = useTranslation()
  const tr = useBilingualText()

  const pillars = [
    {
      step: '01',
      icon: UserCheck,
      title: t('landing.step1Title', 'Profile & Aspirations'),
      subtitle: tr('Rich Skill Graphs', 'Cartographie des compétences'),
      desc: t(
        'landing.step1Desc',
        'Showcase your actual technical stack, verified academic track, project repositories, and ideal career trajectory.'
      ),
      tag: tr('Granular Signals', 'Signaux précis'),
      accentColor: 'var(--primary)',
    },
    {
      step: '02',
      icon: HeartHandshake,
      title: t('landing.step2Title', 'Explore & Express Interest'),
      subtitle: tr('Intentional Discovery', 'Découverte intentionnelle'),
      desc: t(
        'landing.step2Desc',
        'Browse high-fit opportunities curated daily by AI in your feed. Express interest on roles you love; companies review and accept intros.'
      ),
      tag: tr('Bilateral Interest', 'Intérêt bilatéral'),
      accentColor: 'var(--accent-teal)',
    },
    {
      step: '03',
      icon: MessageSquare,
      title: t('landing.step3Title', 'Direct Conversation'),
      subtitle: tr('Zero Intermediaries', 'Sans intermédiaire'),
      desc: t(
        'landing.step3Desc',
        'Once matched, unlock direct encrypted messaging with tech leads and hiring decision-makers instantly.'
      ),
      tag: tr('Real-time Chat', 'Chat en temps réel'),
      accentColor: 'var(--accent-purple)',
    },
  ]

  return (
    <section className="landing-idea" id="how-it-works">
      <div className="container landing-idea__container">
        {/* Section Header */}
        <SectionReveal delay={0.1} yOffset={20} className="landing-section-header">
          <div className="landing-badge">
            <Layers size={14} className="landing-badge__icon" />
            <span className="landing-badge__text">
              {t('landing.howItWorks', 'The MatchOp Architecture')}
            </span>
          </div>

          <h2 className="landing-section-title">
            <TextReveal
              as="span"
              delay={0.2}
              serifWords={['Elegance', 'Matching', 'Simplicity', 'Simple']}
            >
              {tr(
                'How MatchOp rewrites career discovery.',
                'Comment MatchOp réinvente l’accès aux opportunités.'
              )}
            </TextReveal>
          </h2>

          <p className="landing-section-subtitle">
            {tr(
              'A streamlined three-step workflow designed to eliminate friction, respect your time, and deliver high-conviction interviews.',
              'Un parcours en trois étapes conçu pour éliminer la friction et maximiser vos chances de recrutement.'
            )}
          </p>
        </SectionReveal>

        {/* 3 Pillars Bento Grid */}
        <div className="landing-idea__grid">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon
            return (
              <SectionReveal
                key={idx}
                delay={0.25 + idx * 0.15}
                yOffset={30}
                className="landing-idea__col"
              >
                <FloatingCard
                  floatDuration={6 + idx}
                  floatDistance={6}
                  className="idea-card"
                  style={{ '--pillar-accent': pillar.accentColor }}
                >
                  <div className="idea-card__top">
                    <span className="idea-card__step">{pillar.step}</span>
                    <span className="idea-card__tag">{pillar.tag}</span>
                  </div>

                  <div className="idea-card__icon-box">
                    <Icon size={28} />
                  </div>

                  <div className="idea-card__body">
                    <span className="idea-card__sub">{pillar.subtitle}</span>
                    <h3 className="idea-card__title">{pillar.title}</h3>
                    <p className="idea-card__desc">{pillar.desc}</p>
                  </div>

                  <div className="idea-card__footer">
                    <span className="idea-card__indicator" aria-hidden="true" />
                  </div>
                </FloatingCard>
              </SectionReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default IdeaSection
