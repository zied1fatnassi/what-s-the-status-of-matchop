import { XCircle, CheckCircle2, Clock, AlertTriangle, ShieldAlert, Sparkles, Inbox, RefreshCcw } from 'lucide-react'
import { TextReveal } from '../motion/TextReveal'
import { SectionReveal } from '../motion/SectionReveal'
import { useBilingualText } from '../../../lib/useBilingualText'

export function ProblemSection() {
  const tr = useBilingualText()

  const oldWayItems = [
    {
      icon: Inbox,
      title: tr('The 200-CV Black Hole', 'Le trou noir des 200 candidatures'),
      desc: tr(
        'Candidates send hundreds of tailored applications into automated ATS filters, only to receive silence or automated rejections weeks later.',
        'Les candidats envoient des centaines de CV dans des robots ATS pour ne recevoir que du silence ou des refus automatiques.'
      ),
    },
    {
      icon: AlertTriangle,
      title: tr('Unqualified Resume Spam', 'Spam de profils non qualifiés'),
      desc: tr(
        'Hiring managers drown in 500+ irrelevant PDF resumes, burning valuable engineering and HR hours manually parsing credentials.',
        'Les recruteurs croulent sous 500+ CVs non ciblés et perdent des heures précieuses à trier manuellement.'
      ),
    },
    {
      icon: Clock,
      title: tr('Slow 4-6 Week Cycles', 'Délais interminables de 4 à 6 semaines'),
      desc: tr(
        'Endless back-and-forth emails just to establish basic interest, mutual salary expectations, or project availability.',
        'Dizaines d’échanges d’emails fastidieux simplement pour valider l’intérêt mutuel et les attentes.'
      ),
    },
  ]

  const matchopWayItems = [
    {
      icon: Sparkles,
      title: tr('Direct Mutual Discovery', 'Découverte mutuelle directe'),
      desc: tr(
        'Both student and company evaluate opportunities proactively. No cold applications: every intro starts with mutual verified interest.',
        'Étudiants et entreprises valident leur intérêt mutuel en direct. Zéro candidature à l’aveugle.'
      ),
    },
    {
      icon: CheckCircle2,
      title: tr('AI-Driven Fit Intelligence', 'Intelligence d’alignement par IA'),
      desc: tr(
        'Neural semantic scoring matches hard technical skills, culture values, and growth potential before anyone spends time applying.',
        'Le matching sémantique analyse les compétences techniques, la culture et le potentiel avant tout échange.'
      ),
    },
    {
      icon: RefreshCcw,
      title: tr('Instant Direct Chat & Intros', 'Chat direct & Intros instantanées'),
      desc: tr(
        'A mutual match instantly opens direct encrypted chat with hiring managers. Schedule interviews and close offers in days, not months.',
        'Un match bilatéral ouvre immédiatement la discussion directe avec les recruteurs. Recrutez en quelques jours.'
      ),
    },
  ]

  return (
    <section className="landing-problem" id="problem">
      <div className="container landing-problem__container">
        {/* Section Pill Badge */}
        <SectionReveal delay={0.1} yOffset={20} className="landing-section-header">
          <div className="landing-badge landing-badge--warning">
            <ShieldAlert size={14} className="landing-badge__icon" />
            <span className="landing-badge__text">
              {tr('The Reality of Job Searching', 'La réalité du recrutement traditionnel')}
            </span>
          </div>

          <h2 className="landing-section-title">
            <TextReveal
              as="span"
              delay={0.2}
              serifWords={['Broken', 'Cassé', 'Black Hole', 'Silence']}
            >
              {tr(
                'Traditional recruitment is fundamentally broken.',
                'Le recrutement classique est fondamentalement dépassé.'
              )}
            </TextReveal>
          </h2>

          <p className="landing-section-subtitle">
            {tr(
              'Job boards treat talent like commodity PDF files and companies like spam magnets. We replaced the entire friction loop with mutual alignment.',
              'Les plateformes traditionnelles traitent les talents comme de simples fichiers PDF. MatchOp remplace cette friction par un alignement mutuel fluide.'
            )}
          </p>
        </SectionReveal>

        {/* Side-by-side comparison cards */}
        <div className="landing-problem__comparison-grid">
          {/* Old Way Column */}
          <SectionReveal delay={0.3} yOffset={30} className="comparison-card comparison-card--old">
            <div className="comparison-card__header">
              <div className="comparison-card__badge comparison-card__badge--old">
                <XCircle size={16} />
                <span>{tr('The Old Broken Way', 'L’ancienne méthode')}</span>
              </div>
              <h3 className="comparison-card__title">
                {tr('Endless Applications & Ghosting', 'Candidatures infinies & Silence')}
              </h3>
            </div>

            <div className="comparison-card__items">
              {oldWayItems.map((item, idx) => {
                const Icon = item.icon
                return (
                  <div key={idx} className="comparison-item comparison-item--negative">
                    <div className="comparison-item__icon-wrapper">
                      <Icon size={18} />
                    </div>
                    <div className="comparison-item__content">
                      <h4 className="comparison-item__title">{item.title}</h4>
                      <p className="comparison-item__desc">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionReveal>

          {/* MatchOp Way Column */}
          <SectionReveal delay={0.45} yOffset={30} className="comparison-card comparison-card--new">
            <div className="comparison-card__header">
              <div className="comparison-card__badge comparison-card__badge--new">
                <CheckCircle2 size={16} />
                <span>{tr('The MatchOp Paradigm', 'Le modèle MatchOp')}</span>
              </div>
              <h3 className="comparison-card__title">
                {tr('Curated Matching & Direct Intros', 'Matching ciblé & Connexion directe')}
              </h3>
            </div>

            <div className="comparison-card__items">
              {matchopWayItems.map((item, idx) => {
                const Icon = item.icon
                return (
                  <div key={idx} className="comparison-item comparison-item--positive">
                    <div className="comparison-item__icon-wrapper">
                      <Icon size={18} />
                    </div>
                    <div className="comparison-item__content">
                      <h4 className="comparison-item__title">{item.title}</h4>
                      <p className="comparison-item__desc">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionReveal>
        </div>
      </div>
    </section>
  )
}

export default ProblemSection
