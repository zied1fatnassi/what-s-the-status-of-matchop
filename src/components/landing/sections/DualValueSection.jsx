import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, Briefcase, Sparkles, ArrowRight, Zap, Target, BarChart3, Clock, CheckCircle2 } from 'lucide-react'
import { TextReveal } from '../motion/TextReveal'
import { SectionReveal } from '../motion/SectionReveal'
import { FloatingCard } from '../motion/FloatingCard'
import { MagneticButton } from '../motion/MagneticButton'
import { useBilingualText } from '../../../lib/useBilingualText'

export function DualValueSection() {
  const { t } = useTranslation()
  const tr = useBilingualText()
  const [activeTab, setActiveTab] = useState('student') // 'student' | 'company'

  const studentFeatures = [
    {
      icon: Target,
      title: tr('Personalized AI Stack Matching', 'Matching IA personnalisé'),
      desc: tr(
        'Never write another generic cover letter. Our engine matches your GitHub, coursework, and personal projects directly to high-conviction roles.',
        'Plus besoin de lettres de motivation génériques. Notre IA relie vos dépôts GitHub et projets aux rôles les plus pertinents.'
      ),
      highlight: tr('98% precision fit', '98% de pertinence'),
    },
    {
      icon: Zap,
      title: tr('Direct Access to Engineering Leads', 'Accès direct aux décideurs techniques'),
      desc: tr(
        'Skip automated applicant tracking systems. When you match, you are immediately introduced to the tech lead or hiring manager.',
        'Évitez les filtres automatiques des ATS. En cas de match, vous parlez directement avec le responsable technique.'
      ),
      highlight: tr('Zero middle-tier gatekeepers', 'Zéro intermédiaire'),
    },
    {
      icon: Clock,
      title: tr('Real-time Status & Instant Feedback', 'Suivi en temps réel & Retours clairs'),
      desc: tr(
        'No more ghosting. Every interaction gives you transparent visibility into company reviews, intro confirmations, and scheduled video sessions.',
        'Fini le silence radio. Visibilité totale sur l’état d’avancement de chaque opportunité.'
      ),
      highlight: tr('Transparent pipeline', 'Pipeline transparent'),
    },
  ]

  const companyFeatures = [
    {
      icon: CheckCircle2,
      title: tr('Pre-Screened High-Intent Candidates', 'Candidats pré-qualifiés & engagés'),
      desc: tr(
        'Stop sorting through 500 random PDF resumes. Every candidate in your intro inbox has passed stack compatibility and actively swiped right on your role.',
        'Ne perdez plus de temps sur 500 CV non ciblés. Chaque profil dans vos intros a validé sa compatibilité et son intérêt pour votre poste.'
      ),
      highlight: tr('10x higher response rate', 'Taux de réponse x10'),
    },
    {
      icon: Clock,
      title: tr('Accelerated 48h Time-to-Interview', 'Délai d’entretien réduit à 48h'),
      desc: tr(
        'Review candidates in a fast, Tinder-style inbox. Accept intros in one tap and immediately coordinate technical chats.',
        'Consultez les candidats en un clin d’œil. Acceptez les intros d’un simple clic et lancez les entretiens techniques.'
      ),
      highlight: tr('4-5x faster time-to-hire', 'Recrutement 4 à 5x plus rapide'),
    },
    {
      icon: BarChart3,
      title: tr('Comprehensive Skill Graph Analytics', 'Analytique approfondie des compétences'),
      desc: tr(
        'Inspect verified skills, academic trajectory, repo statistics, and culture scores directly in your company workspace.',
        'Analysez les compétences vérifiées, le parcours académique et les statistiques de code directement dans votre espace entreprise.'
      ),
      highlight: tr('Full technical transparency', 'Transparence technique complète'),
    },
  ]

  return (
    <section className="landing-dual-value" id="for-both">
      <div className="container landing-dual-value__container">
        {/* Sticky Left Column + Scrolling Right Column Layout */}
        <div className="landing-dual-value__split">
          {/* Left Column: Sticky Narrative & Tab Switcher */}
          <div className="dual-value-sticky-col">
            <div className="landing-badge">
              <Sparkles size={14} className="landing-badge__icon" />
              <span className="landing-badge__text">
                {tr('Two-Sided Platform', 'Plateforme bilatérale')}
              </span>
            </div>

            <h2 className="dual-value-title">
              <TextReveal
                as="span"
                delay={0.1}
                serifWords={['Ambitious', 'Visionary', 'Talent', 'Companies']}
              >
                {tr(
                  'Engineered for ambitious talent and visionary companies.',
                  'Conçu pour les talents ambitieux et les entreprises visionnaires.'
                )}
              </TextReveal>
            </h2>

            <p className="dual-value-desc">
              {tr(
                'Whether you are taking your first career leap or scaling an engineering team, MatchOp delivers unmatched velocity and mutual transparency.',
                'Que vous lanciez votre carrière ou développiez votre équipe tech, MatchOp offre une rapidité et une clarté inégalées.'
              )}
            </p>

            {/* Interactive Mode Toggle */}
            <div className="dual-value-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'student'}
                className={`dual-value-tab ${activeTab === 'student' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('student')}
              >
                <Users size={16} />
                <span>{t('landing.forStudents', 'For Candidates')}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'company'}
                className={`dual-value-tab ${activeTab === 'company' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('company')}
              >
                <Briefcase size={16} />
                <span>{t('landing.forCompanies', 'For Companies')}</span>
              </button>
            </div>

            {/* Direct CTA Link based on active tab */}
            <div className="dual-value-action">
              {activeTab === 'student' ? (
                <MagneticButton to="/student/signup" variant="primary" size="md">
                  <span>{tr('Join as Candidate Free', 'Rejoindre gratuitement')}</span>
                  <ArrowRight size={16} />
                </MagneticButton>
              ) : (
                <MagneticButton to="/company/signup" variant="secondary" size="md">
                  <span>{tr('Start Hiring Talent', 'Commencer à recruter')}</span>
                  <ArrowRight size={16} />
                </MagneticButton>
              )}
            </div>
          </div>

          {/* Right Column: Feature Stream */}
          <div className="dual-value-stream-col">
            <div className="feature-stream-cards">
              {(activeTab === 'student' ? studentFeatures : companyFeatures).map(
                (feat, idx) => {
                  const Icon = feat.icon
                  return (
                    <SectionReveal
                      key={`${activeTab}-${idx}`}
                      delay={idx * 0.1}
                      yOffset={25}
                      className="feature-stream-card-wrapper"
                    >
                      <FloatingCard floatDuration={6 + idx} floatDistance={5} className="feature-stream-card">
                        <div className="feature-stream-card__top">
                          <div className="feature-stream-card__icon-box">
                            <Icon size={22} />
                          </div>
                          <span className="feature-stream-card__highlight">
                            {feat.highlight}
                          </span>
                        </div>

                        <h3 className="feature-stream-card__title">
                          {feat.title}
                        </h3>

                        <p className="feature-stream-card__desc">
                          {feat.desc}
                        </p>
                      </FloatingCard>
                    </SectionReveal>
                  )
                }
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DualValueSection
