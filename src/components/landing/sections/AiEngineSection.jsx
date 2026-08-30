import { useState } from 'react'
import { Cpu, Sparkles, Check, BrainCircuit, Activity, Award } from 'lucide-react'
import { TextReveal } from '../motion/TextReveal'
import { SectionReveal } from '../motion/SectionReveal'
import { useBilingualText } from '../../../lib/useBilingualText'

export function AiEngineSection() {
  const tr = useBilingualText()

  // Interactive skill toggles to demo AI calculation
  const [activeSkills, setActiveSkills] = useState(['React', 'TypeScript', 'TailwindCSS', 'AI/LLMs'])

  const availableSkills = [
    { name: 'React', weight: 26 },
    { name: 'TypeScript', weight: 24 },
    { name: 'TailwindCSS', weight: 15 },
    { name: 'AI/LLMs', weight: 22 },
    { name: 'Node.js', weight: 18 },
    { name: 'Python', weight: 20 },
    { name: 'Figma', weight: 12 },
    { name: 'PostgreSQL', weight: 16 },
  ]

  const toggleSkill = (skillName) => {
    setActiveSkills((prev) =>
      prev.includes(skillName)
        ? prev.length > 1
          ? prev.filter((s) => s !== skillName)
          : prev
        : [...prev, skillName]
    )
  }

  // Calculate dynamic match score based on selected skills
  const baseScore = 62
  const activeWeight = availableSkills
    .filter((s) => activeSkills.includes(s.name))
    .reduce((acc, curr) => acc + curr.weight, 0)
  const calculatedScore = Math.min(99, Math.round(baseScore + activeWeight * 0.42))

  return (
    <section className="landing-ai-engine" id="ai-matching">
      <div className="container landing-ai-engine__container">
        {/* Section Header */}
        <SectionReveal delay={0.1} yOffset={20} className="landing-section-header">
          <div className="landing-badge landing-badge--ai">
            <Cpu size={14} className="landing-badge__icon" />
            <span className="landing-badge__text">
              {tr('Neural Alignment Technology', 'Technologie d’alignement neuronal')}
            </span>
          </div>

          <h2 className="landing-section-title">
            <TextReveal
              as="span"
              delay={0.2}
              serifWords={['Intelligence', 'Semantic', 'Precision', 'Précision']}
            >
              {tr(
                'Deep matching beyond keyword scanning.',
                'Un matching sémantique bien au-delà des mots-clés.'
              )}
            </TextReveal>
          </h2>

          <p className="landing-section-subtitle">
            {tr(
              'Our vector embeddings calculate true technical synergy, cultural preferences, and career momentum. Experience the simulation live below:',
              'Nos modèles vectoriels évaluent la synergie technique réelle et les trajectoires de carrière. Testez la simulation en direct ci-dessous :'
            )}
          </p>
        </SectionReveal>

        {/* Interactive AI Simulation Pipeline */}
        <SectionReveal delay={0.3} yOffset={30} className="landing-ai-engine__pipeline">
          {/* Step 1: Candidate Skill Vector */}
          <div className="ai-pipeline-card ai-pipeline-card--input">
            <div className="ai-pipeline-card__header">
              <div className="ai-pipeline-card__badge">
                <BrainCircuit size={15} />
                <span>{tr('1. Candidate Skills', '1. Compétences candidat')}</span>
              </div>
              <span className="ai-pipeline-card__note">
                {tr('Toggle skills to test', 'Cliquez pour tester')}
              </span>
            </div>

            <div className="ai-skills-selector">
              {availableSkills.map((skill) => {
                const isSelected = activeSkills.includes(skill.name)
                return (
                  <button
                    key={skill.name}
                    type="button"
                    onClick={() => toggleSkill(skill.name)}
                    className={`ai-skill-chip ${isSelected ? 'is-active' : ''}`}
                    aria-pressed={isSelected}
                  >
                    {isSelected && <Check size={12} className="ai-skill-chip__check" />}
                    <span>{skill.name}</span>
                  </button>
                )
              })}
            </div>

            <div className="ai-pipeline-card__meta">
              <span className="meta-indicator" />
              <span>{tr('Vector Embedding: Normalized (d=1536)', 'Embedding vectoriel normalisé (d=1536)')}</span>
            </div>
          </div>

          {/* Center Connector: Neural Core */}
          <div className="ai-pipeline-connector" aria-hidden="true">
            <div className="ai-connector-line" />
            <div className="ai-connector-core">
              <Activity size={20} className="ai-connector-core__icon" />
              <span className="ai-connector-core__label">MatchOp AI</span>
            </div>
            <div className="ai-connector-line" />
          </div>

          {/* Step 2: Live AI Match Scoring Output */}
          <div className="ai-pipeline-card ai-pipeline-card--output">
            <div className="ai-pipeline-card__header">
              <div className="ai-pipeline-card__badge ai-pipeline-card__badge--accent">
                <Award size={15} />
                <span>{tr('2. Role Match Result', '2. Résultat de correspondance')}</span>
              </div>
              <div className="ai-score-pill">
                <Sparkles size={14} />
                <span>{calculatedScore}% Match</span>
              </div>
            </div>

            <div className="ai-role-preview">
              <div className="ai-role-preview__header">
                <div className="ai-role-preview__company-logo">VL</div>
                <div>
                  <h4 className="ai-role-preview__title">Senior Frontend Engineer</h4>
                  <p className="ai-role-preview__company">Veloce Labs • Full-time • Remote</p>
                </div>
              </div>

              {/* Match Factors Progress Bars */}
              <div className="ai-role-factors">
                <div className="ai-factor-row">
                  <div className="ai-factor-row__label">
                    <span>{tr('Tech Stack Synergy', 'Synergie technique')}</span>
                    <span>{calculatedScore}%</span>
                  </div>
                  <div className="ai-factor-row__bar">
                    <div
                      className="ai-factor-row__fill"
                      style={{ width: `${calculatedScore}%` }}
                    />
                  </div>
                </div>

                <div className="ai-factor-row">
                  <div className="ai-factor-row__label">
                    <span>{tr('Seniority & Growth Fit', 'Niveau & Potentiel')}</span>
                    <span>{Math.min(98, calculatedScore + 2)}%</span>
                  </div>
                  <div className="ai-factor-row__bar">
                    <div
                      className="ai-factor-row__fill ai-factor-row__fill--teal"
                      style={{ width: `${Math.min(98, calculatedScore + 2)}%` }}
                    />
                  </div>
                </div>

                <div className="ai-factor-row">
                  <div className="ai-factor-row__label">
                    <span>{tr('Workplace Preference (Remote)', 'Préférence travail (Remote)')}</span>
                    <span>100%</span>
                  </div>
                  <div className="ai-factor-row__bar">
                    <div
                      className="ai-factor-row__fill ai-factor-row__fill--purple"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              <div className="ai-role-verdict">
                <Sparkles size={14} className="ai-role-verdict__icon" />
                <span>
                  {calculatedScore >= 90
                    ? tr('High Compatibility: Prioritized in swipe stack', 'Forte compatibilité : Priorisé dans la file de découverte')
                    : tr('Good Fit: Recommended for discovery stack', 'Bon profil : Recommandé pour votre pile')}
                </span>
              </div>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}

export default AiEngineSection
