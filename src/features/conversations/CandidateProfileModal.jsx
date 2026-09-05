import { useEffect, useState } from 'react'
import {
    X,
    User,
    Briefcase,
    GraduationCap,
    FileText,
    Download,
    ExternalLink,
    MapPin,
    Calendar,
    Sparkles,
    Globe,
    FolderGit2,
    CheckCircle,
    Loader2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getSignedCVUrl } from '../../lib/storage'
import './CandidateProfileModal.css'

export function CandidateProfileModal({ studentId, offerId = null, isOpen, onClose }) {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState(null)
    const [experiences, setExperiences] = useState([])
    const [education, setEducation] = useState([])
    const [languages, setLanguages] = useState([])
    const [projects, setProjects] = useState([])
    const [signedCvUrl, setSignedCvUrl] = useState(null)
    const [cvLoading, setCvLoading] = useState(false)
    const [signedPersonalizedCvUrl, setSignedPersonalizedCvUrl] = useState(null)
    const [personalizedCvLoading, setPersonalizedCvLoading] = useState(false)
    const [hasPersonalizedCv, setHasPersonalizedCv] = useState(false)

    useEffect(() => {
        if (!isOpen || !studentId) {
            setProfile(null)
            setExperiences([])
            setEducation([])
            setLanguages([])
            setProjects([])
            setSignedCvUrl(null)
            setSignedPersonalizedCvUrl(null)
            setHasPersonalizedCv(false)
            return
        }

        let isMounted = true
        setLoading(true)

        const fetchFullProfile = async () => {
            try {
                // 1. Fetch student basic profile
                const { data: studentData, error: studentError } = await supabase
                    .from('students')
                    .select('*')
                    .eq('id', studentId)
                    .maybeSingle()

                if (studentError) {
                    console.error('[CandidateProfileModal] student query error:', studentError)
                }

                // 2. Fetch experiences
                const { data: expData } = await supabase
                    .from('experiences')
                    .select('*')
                    .eq('student_id', studentId)
                    .order('start_date', { ascending: false })

                // 3. Fetch education
                const { data: eduData } = await supabase
                    .from('student_education')
                    .select('*')
                    .eq('student_id', studentId)
                    .order('start_date', { ascending: false })

                // 4. Fetch languages
                const { data: langData } = await supabase
                    .from('student_languages')
                    .select('*')
                    .eq('student_id', studentId)

                // 5. Fetch projects
                const { data: projData } = await supabase
                    .from('student_projects')
                    .select('*')
                    .eq('student_id', studentId)

                // 6. Check for personalized CV if offerId is provided
                let personalizedPath = null
                if (offerId) {
                    const { data: introRow } = await supabase
                        .from('intros')
                        .select('personalized_cv_url')
                        .eq('student_id', studentId)
                        .eq('offer_id', offerId)
                        .maybeSingle()

                    if (introRow?.personalized_cv_url) {
                        personalizedPath = introRow.personalized_cv_url
                    } else {
                        const { data: matchRow } = await supabase
                            .from('matches')
                            .select('personalized_cv_url')
                            .eq('student_id', studentId)
                            .eq('offer_id', offerId)
                            .maybeSingle()
                        if (matchRow?.personalized_cv_url) {
                            personalizedPath = matchRow.personalized_cv_url
                        }
                    }
                }

                if (isMounted) {
                    setProfile(studentData || null)
                    setExperiences(expData || [])
                    setEducation(eduData || [])
                    setLanguages(langData || [])
                    setProjects(projData || [])

                    // Resolve personalized CV signed URL if found
                    if (personalizedPath) {
                        setHasPersonalizedCv(true)
                        setPersonalizedCvLoading(true)
                        getSignedCVUrl(personalizedPath)
                            .then((url) => {
                                if (isMounted) setSignedPersonalizedCvUrl(url)
                            })
                            .catch((err) => console.warn('[CandidateProfileModal] Personalized CV error:', err))
                            .finally(() => {
                                if (isMounted) setPersonalizedCvLoading(false)
                            })
                    } else {
                        setHasPersonalizedCv(false)
                        setSignedPersonalizedCvUrl(null)
                    }

                    // Resolve original CV signed URL if available (cv_url or original_docx_url)
                    const originalCv = studentData?.cv_url || studentData?.original_docx_url
                    if (originalCv) {
                        setCvLoading(true)
                        getSignedCVUrl(originalCv)
                            .then((url) => {
                                if (isMounted) setSignedCvUrl(url)
                            })
                            .catch((err) => console.warn('[CandidateProfileModal] CV error:', err))
                            .finally(() => {
                                if (isMounted) setCvLoading(false)
                            })
                    }
                }
            } catch (err) {
                console.error('[CandidateProfileModal] error:', err)
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        fetchFullProfile()

        // Handle Escape key
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            isMounted = false
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, studentId, offerId, onClose])

    if (!isOpen) return null

    return (
        <div className="candidate-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="candidate-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header with Close */}
                <div className="candidate-modal-header">
                    <h2>Profil du Candidat</h2>
                    <button
                        type="button"
                        className="candidate-modal-close"
                        onClick={onClose}
                        aria-label="Fermer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="candidate-modal-loading">
                        <Loader2 className="animate-spin" size={32} />
                        <p>Chargement des informations du candidat...</p>
                    </div>
                ) : !profile ? (
                    <div className="candidate-modal-empty">
                        <User size={48} />
                        <p>Impossible de trouver le profil de ce candidat.</p>
                    </div>
                ) : (
                    <div className="candidate-modal-body">
                        {/* Profile Banner / Identity */}
                        <div className="candidate-identity-card">
                            <div className="candidate-avatar-wrap">
                                {profile.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt={profile.display_name}
                                        className="candidate-avatar-img"
                                    />
                                ) : (
                                    <div className="candidate-avatar-fallback">
                                        {(profile.display_name || 'C').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div className="candidate-identity-details">
                                <div className="candidate-name-row">
                                    <h3>{profile.display_name || 'Candidat'}</h3>
                                    {profile.open_to_work && (
                                        <span className="candidate-badge-open">
                                            <Sparkles size={13} /> À l'écoute
                                        </span>
                                    )}
                                </div>

                                {profile.headline && (
                                    <p className="candidate-headline">{profile.headline}</p>
                                )}

                                {profile.location && (
                                    <p className="candidate-location">
                                        <MapPin size={14} />
                                        <span>{profile.location}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* CV Highlight Action Card */}
                        {hasPersonalizedCv ? (
                            <div className="candidate-cv-banner candidate-cv-banner--personalized">
                                <div className="candidate-cv-badge-row">
                                    <span className="candidate-cv-ai-badge">
                                        <Sparkles size={13} /> CV Personnalisé par IA pour cette offre
                                    </span>
                                </div>

                                <div className="candidate-cv-banner__info">
                                    <FileText size={28} className="candidate-cv-icon candidate-cv-icon--personalized" />
                                    <div>
                                        <h4>Curriculum Vitae Ciblé</h4>
                                        <p>
                                            Ce CV a été valorisé par l&apos;IA pour correspondre aux exigences clés de votre offre.
                                        </p>
                                    </div>
                                </div>

                                <div className="candidate-cv-actions-row">
                                    {signedPersonalizedCvUrl ? (
                                        <a
                                            href={signedPersonalizedCvUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="candidate-cv-btn candidate-cv-btn--personalized"
                                        >
                                            <Download size={16} />
                                            <span>Consulter le CV ciblé (PDF)</span>
                                            <ExternalLink size={14} />
                                        </a>
                                    ) : personalizedCvLoading ? (
                                        <div className="candidate-cv-loading">
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Génération du lien sécurisé...</span>
                                        </div>
                                    ) : (
                                        <span className="candidate-cv-none">Lien non disponible</span>
                                    )}

                                    {signedCvUrl && (
                                        <a
                                            href={signedCvUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="candidate-cv-link-original"
                                        >
                                            <span>Voir le CV original</span>
                                            <ExternalLink size={12} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="candidate-cv-banner">
                                <div className="candidate-cv-banner__info">
                                    <FileText size={28} className="candidate-cv-icon" />
                                    <div>
                                        <h4>Curriculum Vitae</h4>
                                        <p>
                                            {profile.cv_url || profile.original_docx_url
                                                ? 'Le candidat a mis à disposition son CV officiel'
                                                : "Aucun fichier CV n'a été déposé pour l'instant"}
                                        </p>
                                    </div>
                                </div>

                                {signedCvUrl ? (
                                    <a
                                        href={signedCvUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="candidate-cv-btn"
                                    >
                                        <Download size={16} />
                                        <span>Consulter le CV (PDF)</span>
                                        <ExternalLink size={14} />
                                    </a>
                                ) : cvLoading ? (
                                    <div className="candidate-cv-loading">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Génération du lien...</span>
                                    </div>
                                ) : (
                                    <span className="candidate-cv-none">Non disponible</span>
                                )}
                            </div>
                        )}

                        {/* Bio Section */}
                        {profile.bio && (
                            <section className="candidate-section">
                                <h4 className="candidate-section-title">
                                    <User size={16} />
                                    <span>À propos</span>
                                </h4>
                                <p className="candidate-bio-text">{profile.bio}</p>
                            </section>
                        )}

                        {/* Skills Section */}
                        {Array.isArray(profile.skills) && profile.skills.length > 0 && (
                            <section className="candidate-section">
                                <h4 className="candidate-section-title">
                                    <Sparkles size={16} />
                                    <span>Compétences clés</span>
                                </h4>
                                <div className="candidate-skills-list">
                                    {profile.skills.map((skill, i) => (
                                        <span key={i} className="candidate-skill-pill">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Experiences Section */}
                        {experiences.length > 0 && (
                            <section className="candidate-section">
                                <h4 className="candidate-section-title">
                                    <Briefcase size={16} />
                                    <span>Expérience professionnelle ({experiences.length})</span>
                                </h4>
                                <div className="candidate-timeline">
                                    {experiences.map((exp) => (
                                        <div key={exp.id} className="candidate-timeline-item">
                                            <div className="candidate-timeline-bullet" />
                                            <div className="candidate-timeline-content">
                                                <h5>{exp.job_title || 'Poste'}</h5>
                                                <p className="candidate-timeline-sub">
                                                    <strong>{exp.company || 'Entreprise'}</strong>
                                                    {exp.start_date && (
                                                        <span>
                                                            {' • '}
                                                            {exp.start_date} - {exp.is_current ? 'Présent' : exp.end_date || ''}
                                                        </span>
                                                    )}
                                                </p>
                                                {exp.description && (
                                                    <p className="candidate-timeline-desc">{exp.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Education Section */}
                        {education.length > 0 && (
                            <section className="candidate-section">
                                <h4 className="candidate-section-title">
                                    <GraduationCap size={16} />
                                    <span>Formation & Diplômes ({education.length})</span>
                                </h4>
                                <div className="candidate-timeline">
                                    {education.map((edu) => (
                                        <div key={edu.id} className="candidate-timeline-item">
                                            <div className="candidate-timeline-bullet" />
                                            <div className="candidate-timeline-content">
                                                <h5>{edu.degree || edu.field_of_study || 'Formation'}</h5>
                                                <p className="candidate-timeline-sub">
                                                    <strong>{edu.school || 'Établissement'}</strong>
                                                    {edu.field_of_study && edu.degree && (
                                                        <span> • {edu.field_of_study}</span>
                                                    )}
                                                    {edu.start_date && (
                                                        <span>
                                                            {' • '}
                                                            {edu.start_date} - {edu.is_current ? 'En cours' : edu.end_date || ''}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Languages Section */}
                        {languages.length > 0 && (
                            <section className="candidate-section">
                                <h4 className="candidate-section-title">
                                    <Globe size={16} />
                                    <span>Langues</span>
                                </h4>
                                <div className="candidate-languages-grid">
                                    {languages.map((lang) => (
                                        <div key={lang.id} className="candidate-language-card">
                                            <span className="candidate-lang-name">{lang.language}</span>
                                            {lang.proficiency && (
                                                <span className="candidate-lang-level">{lang.proficiency}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Projects Section */}
                        {projects.length > 0 && (
                            <section className="candidate-section">
                                <h4 className="candidate-section-title">
                                    <FolderGit2 size={16} />
                                    <span>Projets personnels ({projects.length})</span>
                                </h4>
                                <div className="candidate-projects-grid">
                                    {projects.map((proj) => (
                                        <div key={proj.id} className="candidate-project-card">
                                            <h5>{proj.title}</h5>
                                            {proj.description && <p>{proj.description}</p>}
                                            {proj.url && (
                                                <a
                                                    href={proj.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="candidate-project-link"
                                                >
                                                    <ExternalLink size={13} />
                                                    <span>Voir le projet</span>
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default CandidateProfileModal
