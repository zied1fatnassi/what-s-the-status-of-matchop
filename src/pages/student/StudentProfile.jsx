import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import {
    Camera, Plus, X, Save, MapPin, Briefcase, Loader2, Calendar, Trash2,
    AlertCircle, CheckCircle, User, Eye, GraduationCap, Award, FolderGit2,
    Languages, Heart, ExternalLink, Building2,
    FileText, Upload, Download, Sparkles
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStudentProfile } from '../../hooks/useStudentProfile'
import { useImageUpload } from '../../hooks/useImageUpload'
import { useCVUpload } from '../../hooks/useCVUpload'
import { getSignedCVUrl } from '../../lib/storage'
import { useToast } from '../../hooks/useLoadingError'
import { TUNISIAN_UNIVERSITIES } from '../../lib/validation'
import { FormLocationSelector, FormEducationSelector } from '../../components/forms/FormComponents'
import SuggestionInput from '../../components/forms/SuggestionInput'
import { JOB_TITLES } from '../../data/jobTitles'
import { TUNISIAN_COMPANIES } from '../../data/companies'
import { ALL_SKILLS } from '../../data/skills'
import ErrorToast from '../../components/ErrorToast'
import ErrorBoundary from '../../components/ErrorBoundary'
import { useBilingualText } from '../../lib/useBilingualText'
import { buildReferralInviteLink, resolveMyReferralCode } from '../../lib/referrals'
import { addNotification, NOTIFICATION_SCOPE_STUDENT } from '../../lib/notifications'
import './StudentProfile.css'
import './StudentProfileEditor.css'

// ============================================================================
// PROFILE PREVIEW MODAL
// ============================================================================
function ProfilePreviewModal({ isOpen, onClose, profile, experiences, education, languages, completion, tr }) {
    useEffect(() => {
        if (!isOpen) return

        // Ensure the viewport and common page containers are at top before showing full-screen preview.
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
        document.querySelector('.app-main')?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        document.querySelector('.profile-page')?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }, [isOpen])
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div className="preview-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
                <motion.div className="preview-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                    <button className="preview-close" onClick={onClose}><X size={24} /></button>
                    <div className="preview-card">
                        <div className="preview-avatar">
                            {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" /> : <div className="preview-avatar-fallback"><User size={64} /></div>}
                        </div>
                        <h2 className="preview-name">{profile?.display_name || tr('Student', 'Etudiant')}</h2>
                        {profile?.headline && <p className="preview-headline">{profile.headline}</p>}
                        {profile?.location && <p className="preview-location"><MapPin size={16} /> {profile.location}</p>}
                        <div className="preview-completion"><CheckCircle size={16} /><span>{completion}% {tr('Complete', 'Complete')}</span></div>
                        {profile?.bio && <div className="preview-section"><h3>{tr('About', 'A propos')}</h3><p>{profile.bio}</p></div>}
                        {profile?.skills?.length > 0 && (
                            <div className="preview-section">
                                <h3>{tr('Skills', 'Competences')}</h3>
                                <div className="preview-skills">{profile.skills.map(s => <span key={s} className="preview-skill-tag">{s}</span>)}</div>
                            </div>
                        )}
                        {experiences?.length > 0 && (
                            <div className="preview-section">
                                <h3><Briefcase size={16} /> {tr('Experience', 'Experience')}</h3>
                                <div className="preview-experiences">{experiences.map(exp => (
                                    <div key={exp.id} className="preview-exp">
                                        <strong>{exp.job_title}</strong>
                                        <span className="preview-exp-company">{exp.company}</span>
                                        <span className="preview-exp-date">{exp.start_date} — {exp.is_current ? tr('Present', 'Present') : exp.end_date}</span>
                                    </div>
                                ))}</div>
                            </div>
                        )}
                        {education?.length > 0 && (
                            <div className="preview-section">
                                <h3><GraduationCap size={16} /> {tr('Education', 'Education')}</h3>
                                {education.map(edu => (
                                    <div key={edu.id} className="preview-exp">
                                        <strong>{edu.school}</strong>
                                        <span className="preview-exp-company">{edu.degree} {edu.field_of_study && tr(`in ${edu.field_of_study}`, `en ${edu.field_of_study}`)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {languages?.length > 0 && (
                            <div className="preview-section">
                                <h3><Languages size={16} /> {tr('Languages', 'Langues')}</h3>
                                <div className="preview-skills">{languages.map(l => <span key={l.id} className="preview-skill-tag">{l.language} ({l.proficiency})</span>)}</div>
                            </div>
                        )}
                    </div>
                    <p className="preview-hint">{tr('This is how companies will see your profile', 'Voici comment les entreprises verront votre profil')}</p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

// ============================================================================
// SECTION WRAPPER COMPONENT
// ============================================================================
function ProfileSection({ icon: Icon, title, children, error }) {
    const IconComponent = Icon

    return (
        <section className="profile-section">
            <h2><IconComponent size={20} /> {title}</h2>
            {error && <div className="section-error"><AlertCircle size={16} />{error}</div>}
            {children}
        </section>
    )
}

// ============================================================================
// MAIN PROFILE COMPONENT
// ============================================================================
function StudentProfile() {
    void motion
    const tr = useBilingualText()

    const { user } = useAuth()
    const location = useLocation()
    const {
        profile, experiences, education, certifications, projects, languages, volunteer,
        loading, error, experiencesError, educationError, completion,
        updateProfile, addExperience, deleteExperience,
        addEducation, removeEducation,
        addCertification, removeCertification,
        addProject, removeProject,
        addLanguage, removeLanguage,
        addVolunteer, removeVolunteer
    } = useStudentProfile()
    const { uploadImage, uploading } = useImageUpload(user?.id)
    const { uploadCV, uploading: uploadingCV } = useCVUpload(user?.id)
    const { toast, showError, showSuccess, hideToast } = useToast()
    const fileInputRef = useRef(null)
    const cvInputRef = useRef(null)

    // Form data for profile header
    const [formData, setFormData] = useState({
        display_name: '', headline: '', bio: '', location: '', skills: [], avatar_url: '', open_to_work: false, cv_url: ''
    })
    const [newSkill, setNewSkill] = useState('')

    // New item forms
    const [newExp, setNewExp] = useState({ job_title: '', company: '', start_date: '', end_date: '', is_current: false, description: '' })
    const [newEdu, setNewEdu] = useState({ school: '', degree: '', field_of_study: '', start_date: '', end_date: '', is_current: false })
    const [newCert, setNewCert] = useState({ name: '', issuing_organization: '', issue_date: '', credential_url: '' })
    const [newProject, setNewProject] = useState({ name: '', description: '', url: '', start_date: '', end_date: '' })
    const [newLang, setNewLang] = useState({ language: '', proficiency: 'professional' })
    const [newVol, setNewVol] = useState({ organization: '', role: '', cause: '', start_date: '', end_date: '', is_current: false })

    const [saving, setSaving] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [showReferralFollowup, setShowReferralFollowup] = useState(() => Boolean(location.state?.referralFollowUp))
    const [addingEducation, setAddingEducation] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)
    const [aiError, setAiError] = useState('')

    // Sync form with loaded profile
    useEffect(() => {
        if (profile) {
            setFormData({
                display_name: profile.display_name || '',
                headline: profile.headline || '',
                bio: profile.bio || '',
                location: profile.location || '',
                skills: profile.skills || [],
                avatar_url: profile.avatar_url || '',
                open_to_work: profile.open_to_work || false,
                cv_url: profile.cv_url || ''
            })
        }
    }, [profile])

    // Avatar upload
    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const { url, error } = await uploadImage(file)
        if (error) showError(error.message || tr('Failed to upload', "Echec du telechargement"))
        else if (url) { setFormData(prev => ({ ...prev, avatar_url: url })); showSuccess(tr('Avatar uploaded!', 'Avatar telecharge !')) }
    }





    // CV upload
    const [cvSignedUrl, setCvSignedUrl] = useState(null)
    const [cvFileName, setCvFileName] = useState(null)

    // Generate signed URL when cv_url (path) changes
    useEffect(() => {
        let cancelled = false
        if (formData.cv_url) {
            getSignedCVUrl(formData.cv_url).then(url => {
                if (!cancelled) setCvSignedUrl(url)
            })
        } else {
            setCvSignedUrl(null)
        }
        return () => { cancelled = true }
    }, [formData.cv_url])

    const handleCVUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // 5MB limit
        if (file.size > 5 * 1024 * 1024) {
            showError(tr('File too large (Max 5MB)', 'Fichier trop volumineux (max 5 Mo)'))
            if (cvInputRef.current) cvInputRef.current.value = ''
            return
        }

        // Immediately show the file as uploaded with a local blob URL
        setCvFileName(file.name)
        const localBlobUrl = URL.createObjectURL(file)
        setCvSignedUrl(localBlobUrl)

        try {
            const { path, error } = await uploadCV(file)
            if (error) throw error

            if (path) {
                setFormData(prev => ({ ...prev, cv_url: path }))
                const { error: saveError } = await updateProfile({ cv_url: path })
                if (saveError) {
                    showError(tr('CV uploaded but failed to save to profile', "CV telecharge mais impossible de l'enregistrer sur le profil"))
                } else {
                    showSuccess(tr('CV uploaded successfully!', 'CV telecharge avec succes !'))
                    // Replace local blob URL with a proper signed URL
                    const signedUrl = await getSignedCVUrl(path)
                    if (signedUrl) setCvSignedUrl(signedUrl)
                }
            }
        } catch (error) {
            console.error('[CV Upload] Error:', error)
            showError(`${tr('Failed to upload CV:', 'Echec du telechargement du CV :')} ${error?.message || error}`)
            // Keep showing the file locally — don't revert the UI
        }
    }


    // CV upload


    // Skills
    const handleAddSkill = () => {
        const skill = newSkill.trim()
        if (skill && !formData.skills.includes(skill)) {
            setFormData(prev => ({ ...prev, skills: [...prev.skills, skill] }))
            setNewSkill('')
        }
    }
    const handleRemoveSkill = (skill) => setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))

    // AI Bio Improvement — with local fallback when edge function is unavailable
    const improveBioLocally = (bio, skills, headline) => {
        let improved = bio.trim()

        // Capitalize first letter of each sentence
        improved = improved.replace(/(^|\.\s+)([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase())

        // Ensure it starts with a capital letter
        improved = improved.charAt(0).toUpperCase() + improved.slice(1)

        // Add a professional intro if missing common patterns
        if (!improved.match(/^(I am|I'm|As a|With|A passionate|A dedicated|A motivated)/i)) {
            const role = headline || 'professional'
            improved = `As a dedicated ${role}, ${improved.charAt(0).toLowerCase()}${improved.slice(1)}`
        }

        // Ensure it ends with a period
        if (!improved.endsWith('.') && !improved.endsWith('!') && !improved.endsWith('?')) {
            improved += '.'
        }

        // Append skills summary if skills exist and bio doesn't mention them
        if (skills && skills.length > 0) {
            const skillsMentioned = skills.some(s => improved.toLowerCase().includes(s.toLowerCase()))
            if (!skillsMentioned) {
                improved += ` My key skills include ${skills.slice(0, 5).join(', ')}.`
            }
        }

        return improved
    }

    const improveBio = async () => {
        if (!formData.bio || formData.bio.trim().length < 10) {
            showError(tr('Please enter at least a short bio first', 'Veuillez saisir une courte bio avant'))
            return
        }
        setAiLoading(true)
        setAiError('')
        try {
            const { data, error } = await supabase.functions.invoke('ai-profile-polisher', {
                body: {
                    bio: formData.bio,
                    skills: formData.skills,
                    headline: formData.headline
                }
            })
            if (error) throw error
            if (data?.success && data?.bio) {
                setFormData(prev => ({ ...prev, bio: data.bio }))
                showSuccess(tr('Bio improved with AI! Review and save.', "Bio amelioree par IA ! Verifiez et enregistrez."))
            } else {
                throw new Error(data?.error || 'AI service unavailable')
            }
        } catch (err) {
            console.warn('AI bio service unavailable, using local improvement:', err.message)
            // Fallback: improve locally
            const improved = improveBioLocally(formData.bio, formData.skills, formData.headline)
            if (improved !== formData.bio) {
                setFormData(prev => ({ ...prev, bio: improved }))
                showSuccess(tr('Bio polished! Review and save.', 'Bio amelioree ! Verifiez et enregistrez.'))
            } else {
                setAiError(tr('Could not improve bio. Try adding more detail first.', "Impossible d'ameliorer la bio. Ajoutez plus de details d'abord."))
            }
        } finally {
            setAiLoading(false)
        }
    }

    // Save profile
    const handleSave = async () => {
        setSaving(true)
        const { error } = await updateProfile(formData)
        setSaving(false)
        if (error) showError(error)
        else { showSuccess(tr('Profile saved!', 'Profil enregistre !')); setShowPreview(true) }
    }

    const handleCopyInviteLink = async () => {
        const code = resolveMyReferralCode(user?.id)
        const link = buildReferralInviteLink(code)

        try {
            if (!navigator?.clipboard?.writeText) {
                throw new Error('Clipboard API unavailable')
            }
            await navigator.clipboard.writeText(link)
            showSuccess(tr('Invite link copied.', "Lien d'invitation copie."))
        } catch {
            showError(tr('Unable to copy invite link right now.', "Impossible de copier le lien d'invitation pour le moment."))
        }
    }

    useEffect(() => {
        if (!showPreview) return
        addNotification(NOTIFICATION_SCOPE_STUDENT, {
            title: tr('Company viewed your profile', 'Une entreprise a consulte votre profil'),
            body: tr('Preview activity: a company viewed your profile.', "Activite d'apercu : une entreprise a consulte votre profil."),
            read: false,
        })
    }, [showPreview, tr])

    // Experience handlers (Supabase connected)
    const handleAddExperience = async () => {
        if (!newExp.job_title || !newExp.company || !newExp.start_date) { showError(tr('Fill required fields', 'Remplissez les champs obligatoires')); return }
        const { error } = await addExperience(newExp)
        if (error) showError(error)
        else { showSuccess(tr('Experience added!', 'Experience ajoutee !')); setNewExp({ job_title: '', company: '', start_date: '', end_date: '', is_current: false, description: '' }) }
    }

    // Education handlers (Supabase connected)
    const handleAddEducation = async () => {
        if (!newEdu.school) { showError(tr('School is required', "L'ecole est obligatoire")); return }
        setAddingEducation(true)
        const { error } = await addEducation(newEdu)
        setAddingEducation(false)
        if (error) {
            showError(error)
        } else {
            showSuccess(tr('Education added!', 'Formation ajoutee !'))
            setNewEdu({ school: '', degree: '', field_of_study: '', start_date: '', end_date: '', is_current: false })
        }
    }

    const handleRemoveEducation = async (id) => {
        const { error } = await removeEducation(id)
        if (error) showError(error)
        else showSuccess(tr('Education removed', 'Formation supprimee'))
    }

    // Certification handlers (local state)
    const handleAddCertification = () => {
        if (!newCert.name || !newCert.issuing_organization) { showError(tr('Name and organization required', 'Nom et organisme obligatoires')); return }
        addCertification(newCert)
        showSuccess(tr('Certification added!', 'Certification ajoutee !'))
        setNewCert({ name: '', issuing_organization: '', issue_date: '', credential_url: '' })
    }

    // Project handlers (local state)
    const handleAddProject = () => {
        if (!newProject.name) { showError(tr('Project name required', 'Nom du projet obligatoire')); return }
        addProject(newProject)
        showSuccess(tr('Project added!', 'Projet ajoute !'))
        setNewProject({ name: '', description: '', url: '', start_date: '', end_date: '' })
    }

    // Language handlers (local state)
    const handleAddLanguage = () => {
        if (!newLang.language) { showError(tr('Language required', 'Langue obligatoire')); return }
        addLanguage(newLang)
        showSuccess(tr('Language added!', 'Langue ajoutee !'))
        setNewLang({ language: '', proficiency: 'professional' })
    }

    // Volunteer handlers (local state)
    const handleAddVolunteer = () => {
        if (!newVol.organization || !newVol.role) { showError(tr('Organization and role required', 'Organisation et role obligatoires')); return }
        addVolunteer(newVol)
        showSuccess(tr('Volunteer experience added!', 'Experience benevole ajoutee !'))
        setNewVol({ organization: '', role: '', cause: '', start_date: '', end_date: '', is_current: false })
    }

    if (loading) return <div className="profile-page"><div className="loading-state"><Loader2 size={48} className="spin" /><p>{tr('Loading profile...', 'Chargement du profil...')}</p></div></div>
    if (error) return <div className="profile-page"><div className="error-state"><AlertCircle size={64} /><h2>{tr('Failed to Load', 'Echec du chargement')}</h2><p>{error}</p><button onClick={() => window.location.reload()}>{tr('Reload', 'Recharger')}</button></div></div>

    return (
        <div className="profile-page animate-fade-in-up">
            <div className="profile-container">
                {/* Header */}
                <header className="profile-header">
                    <h1>{tr('My Profile', 'Mon profil')}</h1>
                    <div className="completion-indicator"><CheckCircle size={18} /><span>{completion}% {tr('Complete', 'Complete')}</span></div>
                    <div className="profile-header-actions">
                        <Link to="/payments" className="btn btn-primary btn-sm profile-payments-btn">
                            <span aria-hidden="true">€</span>
                            {tr('My payments', 'Mes paiements')}
                        </Link>
                    </div>
                </header>

                {showReferralFollowup && (
                    <section className="profile-referral-followup" aria-label={tr('Invite your friends too', 'Invitez vos amis aussi')}>
                        <div>
                            <h2>{tr('Invite your friends too', 'Invitez vos amis aussi')}</h2>
                            <p>{tr('Share your invite link to unlock referral benefits (Preview).', "Partagez votre lien d'invitation pour debloquer les avantages de parrainage (Apercu).")}</p>
                        </div>
                        <div className="profile-referral-followup-actions">
                            <Link to="/student/referrals" className="btn btn-secondary">
                                {tr('Open Referrals', 'Ouvrir parrainage')}
                            </Link>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleCopyInviteLink}
                            >
                                {tr("Copy invite link", "Copier le lien d'invitation")}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowReferralFollowup(false)}
                            >
                                {tr('Dismiss', 'Fermer')}
                            </button>
                        </div>
                    </section>
                )}

                <div className="completion-bar-wrapper"><motion.div className="completion-bar-fill" initial={{ width: 0 }} animate={{ width: `${completion}%` }} /></div>

                {/* ============ SECTION 1: Profile Header ============ */}
                <ProfileSection icon={User} title={tr('Profile Header', 'En-tete du profil')}>
                    <div className="avatar-area">
                        <div className="avatar" onClick={() => fileInputRef.current?.click()}>
                            {formData.avatar_url ? <img src={formData.avatar_url} alt="Avatar" /> : <div className="avatar-fallback">{uploading ? <Loader2 className="spin" /> : <User size={40} />}</div>}
                            <div className="avatar-overlay"><Camera size={20} /></div>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} hidden />
                        <span className="avatar-hint">{tr('Click to change photo', 'Cliquez pour changer la photo')}</span>
                    </div>
                    <div className="field">
                        <label>{tr('Display Name *', 'Nom affiche *')}</label>
                        <input type="text" value={formData.display_name} onChange={e => setFormData(prev => ({ ...prev, display_name: e.target.value }))} placeholder={tr('Your full name', 'Votre nom complet')} />
                    </div>
                    <div className="field">
                        <label>{tr('Headline', 'Titre')}</label>
                        <input type="text" value={formData.headline} onChange={e => setFormData(prev => ({ ...prev, headline: e.target.value }))} placeholder={tr('e.g. Full Stack Developer | React & Node.js', 'ex. Developpeur Full Stack | React & Node.js')} />
                    </div>
                    <div className="field">
                        <FormLocationSelector
                            label="Localisation / Location"
                            governorateValue={formData.governorate}
                            cityValue={formData.location} // Storing city in 'location' field for backward compatibility
                            onGovernorateChange={(val) => setFormData(prev => ({ ...prev, governorate: val }))}
                            onCityChange={(val) => setFormData(prev => ({ ...prev, location: val }))}
                        />
                    </div>
                </ProfileSection>

                {/* ============ SECTION: CV / Resume ============ */}
                <ProfileSection icon={FileText} title={tr('CV / Resume', 'CV')}>
                    <div className="cv-upload-area">
                        {(formData.cv_url || cvFileName) ? (
                            <div className="cv-display">
                                <FileText size={48} className="cv-icon" />
                                <div className="cv-info">
                                    <span className="cv-label">{cvFileName || tr('Current CV', 'CV actuel')}</span>
                                    <div className="cv-actions">
                                        {cvSignedUrl && (
                                            <a href={cvSignedUrl} target="_blank" rel="noopener noreferrer" className="view-cv-btn">
                                                <Download size={14} /> {tr('Download / View', 'Telecharger / Voir')}
                                            </a>
                                        )}
                                        <button onClick={() => cvInputRef.current?.click()} className="change-cv-btn">
                                            {tr('Change', 'Modifier')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="cv-placeholder" onClick={() => cvInputRef.current?.click()}>
                                <div className="placeholder-icon"><Upload size={24} /></div>
                                <p>{tr('Upload your CV / Resume', 'Telechargez votre CV')}</p>
                                <span>{tr('PDF or Word (Max 5MB)', 'PDF ou Word (max 5 Mo)')}</span>
                            </div>
                        )}
                        <input
                            ref={cvInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleCVUpload}
                            hidden
                        />
                        {uploadingCV && <div className="uploading-overlay"><Loader2 className="spin" /> {tr('Uploading...', 'Telechargement...')}</div>}
                    </div>
                </ProfileSection>

                {/* ============ SECTION 2: About ============ */}
                <ProfileSection icon={User} title={tr('About', 'A propos')}>
                    <div className="field">
                        <div className="bio-header">
                            <label>{tr('Tell your story', 'Parlez de vous')}</label>
                            <button
                                type="button"
                                className="ai-improve-btn"
                                onClick={improveBio}
                                disabled={aiLoading || !formData.bio || formData.bio.length < 10}
                            >
                                {aiLoading ? (
                                    <><Loader2 size={14} className="spin" /> {tr('Improving...', 'Amelioration...')}</>
                                ) : (
                                    <><Sparkles size={14} /> {tr('Improve my Bio', 'Ameliorer ma bio')}</>
                                )}
                            </button>
                        </div>
                        {aiError && <div className="ai-error"><AlertCircle size={14} />{aiError}</div>}
                        <textarea value={formData.bio} onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))} placeholder={tr('Write a summary about yourself, your experience, and career goals...', 'Ecrivez un resume sur vous, vos experiences et vos objectifs...')} rows={5} maxLength={2000} />
                        <span className="char-count">{formData.bio.length}/2000</span>
                    </div>
                </ProfileSection>

                {/* ============ SECTION 3: Experience ============ */}
                <ProfileSection icon={Briefcase} title={tr('Experience', 'Experience')} error={experiencesError}>
                    {experiences.length > 0 ? (
                        <div className="items-list">
                            {experiences.map(exp => (
                                <div key={exp.id} className="item-card">
                                    <div className="item-icon"><Building2 size={24} /></div>
                                    <div className="item-info">
                                        <h3>{exp.job_title}</h3>
                                        <p className="item-subtitle">{exp.company}</p>
                                        <p className="item-meta">{exp.start_date} — {exp.is_current ? tr('Present', 'Present') : exp.end_date || tr('N/A', 'N/A')}</p>
                                        {exp.description && <p className="item-desc">{exp.description}</p>}
                                    </div>
                                    <button onClick={() => deleteExperience(exp.id)} className="delete-btn"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="empty-text">{tr('No experience added yet', 'Aucune experience ajoutee')}</p>}
                    <div className="add-form">
                        <h4><Plus size={16} /> {tr('Add Experience', "Ajouter une experience")}</h4>
                        <div className="form-grid">
                            <SuggestionInput
                                placeholder={tr('Job Title *', 'Poste *')}
                                value={newExp.job_title}
                                onChange={val => setNewExp(prev => ({ ...prev, job_title: val }))}
                                options={JOB_TITLES}
                            />
                            <SuggestionInput
                                placeholder={tr('Company *', 'Entreprise *')}
                                value={newExp.company}
                                onChange={val => setNewExp(prev => ({ ...prev, company: val }))}
                                options={TUNISIAN_COMPANIES}
                            />
                            <input type="month" placeholder={tr('Start Date *', 'Date de debut *')} value={newExp.start_date} onChange={e => setNewExp(prev => ({ ...prev, start_date: e.target.value }))} />
                            <input type="month" placeholder={tr('End Date', 'Date de fin')} value={newExp.end_date} onChange={e => setNewExp(prev => ({ ...prev, end_date: e.target.value }))} disabled={newExp.is_current} />
                        </div>
                        <label className="checkbox-row"><input type="checkbox" checked={newExp.is_current} onChange={e => setNewExp(prev => ({ ...prev, is_current: e.target.checked, end_date: '' }))} /> {tr('I currently work here', 'Je travaille actuellement ici')}</label>
                        <textarea placeholder={tr('Description (optional)', 'Description (optionnelle)')} value={newExp.description} onChange={e => setNewExp(prev => ({ ...prev, description: e.target.value }))} rows={3} />
                        <button onClick={handleAddExperience} className="add-item-btn"><Plus size={16} /> {tr('Add Experience', "Ajouter une experience")}</button>
                    </div>
                </ProfileSection>

                {/* ============ SECTION 4: Education (Supabase Connected) ============ */}
                <ProfileSection icon={GraduationCap} title={tr('Education', 'Education')} error={educationError}>
                    {education.length > 0 ? (
                        <div className="items-list">
                            {education.map(edu => (
                                <div key={edu.id} className="item-card">
                                    <div className="item-icon"><GraduationCap size={24} /></div>
                                    <div className="item-info">
                                        <h3>{edu.school}</h3>
                                        <p className="item-subtitle">{edu.degree}{edu.field_of_study && `, ${edu.field_of_study}`}</p>
                                        <p className="item-meta">{edu.start_date} — {edu.is_current ? tr('Present', 'Present') : edu.end_date || tr('N/A', 'N/A')}</p>
                                    </div>
                                    <button onClick={() => handleRemoveEducation(edu.id)} className="delete-btn"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="empty-text">{tr('No education added yet', 'Aucune formation ajoutee')}</p>}
                    <div className="add-form">
                        <h4><Plus size={16} /> {tr('Add Education', 'Ajouter une formation')}</h4>
                        <div className="form-grid">
                            <input
                                type="text"
                                list="education-schools"
                                placeholder="ESPRIT, INSAT, Université de Tunis..."
                                value={newEdu.school}
                                onChange={e => setNewEdu(prev => ({ ...prev, school: e.target.value }))}
                            />
                            <datalist id="education-schools">
                                {TUNISIAN_UNIVERSITIES.map(uni => (
                                    <option key={uni} value={uni} />
                                ))}
                            </datalist>

                            <FormEducationSelector
                                degreeValue={newEdu.degree}
                                programValue={newEdu.field_of_study}
                                onDegreeChange={(val) => setNewEdu(prev => ({ ...prev, degree: val }))}
                                onProgramChange={(val) => setNewEdu(prev => ({ ...prev, field_of_study: val }))}
                            />

                            <input type="month" placeholder={tr('Start Date', 'Date de debut')} value={newEdu.start_date} onChange={e => setNewEdu(prev => ({ ...prev, start_date: e.target.value }))} />

                            <input type="month" placeholder={tr('End Date', 'Date de fin')} value={newEdu.end_date} onChange={e => setNewEdu(prev => ({ ...prev, end_date: e.target.value }))} disabled={newEdu.is_current} />
                        </div>
                        <label className="checkbox-row"><input type="checkbox" checked={newEdu.is_current} onChange={e => setNewEdu(prev => ({ ...prev, is_current: e.target.checked, end_date: '' }))} /> {tr('Currently studying here', 'Je suis actuellement en etudes ici')}</label>
                        <button onClick={handleAddEducation} disabled={addingEducation} className="add-item-btn">
                            {addingEducation ? <><Loader2 size={16} className="spin" /> {tr('Adding...', 'Ajout...')}</> : <><Plus size={16} /> {tr('Add Education', 'Ajouter une formation')}</>}
                        </button>
                    </div>
                </ProfileSection>

                {/* ============ SECTION 5: Licenses & Certifications ============ */}
                <ProfileSection icon={Award} title={tr('Licenses & Certifications', 'Licences et certifications')}>
                    {certifications.length > 0 ? (
                        <div className="items-list">
                            {certifications.map(cert => (
                                <div key={cert.id} className="item-card">
                                    <div className="item-icon"><Award size={24} /></div>
                                    <div className="item-info">
                                        <h3>{cert.name}</h3>
                                        <p className="item-subtitle">{cert.issuing_organization}</p>
                                        <p className="item-meta">{tr('Issued', 'Delivre')} {cert.issue_date}</p>
                                        {cert.credential_url && <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="item-link"><ExternalLink size={14} /> {tr('View credential', "Voir l'attestation")}</a>}
                                    </div>
                                    <button onClick={() => removeCertification(cert.id)} className="delete-btn"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="empty-text">{tr('No certifications added yet', 'Aucune certification ajoutee')}</p>}
                    <div className="add-form">
                        <h4><Plus size={16} /> {tr('Add Certification', 'Ajouter une certification')}</h4>
                        <div className="form-grid">
                            <input type="text" placeholder={tr('Certification Name *', 'Nom de certification *')} value={newCert.name} onChange={e => setNewCert(prev => ({ ...prev, name: e.target.value }))} />
                            <input type="text" placeholder={tr('Issuing Organization *', 'Organisme emetteur *')} value={newCert.issuing_organization} onChange={e => setNewCert(prev => ({ ...prev, issuing_organization: e.target.value }))} />
                            <input type="month" placeholder={tr('Issue Date', "Date d'emission")} value={newCert.issue_date} onChange={e => setNewCert(prev => ({ ...prev, issue_date: e.target.value }))} />
                            <input type="url" placeholder={tr('Credential URL', "URL de l'attestation")} value={newCert.credential_url} onChange={e => setNewCert(prev => ({ ...prev, credential_url: e.target.value }))} />
                        </div>
                        <button onClick={handleAddCertification} className="add-item-btn"><Plus size={16} /> {tr('Add Certification', 'Ajouter une certification')}</button>
                    </div>
                </ProfileSection>

                {/* ============ SECTION 6: Skills ============ */}

                <ProfileSection icon={CheckCircle} title={tr('Skills', 'Competences')}>
                    <div className="skills-container">
                        {formData.skills.length > 0 ? formData.skills.map(skill => (
                            <span key={skill} className="skill-chip">{skill}<button onClick={() => handleRemoveSkill(skill)}><X size={14} /></button></span>
                        )) : <span className="empty-text">{tr('No skills added yet', 'Aucune competence ajoutee')}</span>}
                    </div>
                    <div className="skills-input-container">
                        <div className="skills-input-wrapper">
                            <SuggestionInput
                                placeholder={tr('Add a skill (e.g. Python, Leadership...)', 'Ajouter une competence (ex. Python, Leadership...)')}
                                value={newSkill}
                                onChange={setNewSkill}
                                onSelect={(val) => {
                                    setNewSkill(val)
                                    // Optional: auto-add on select
                                }}
                                onEnter={handleAddSkill}
                                options={ALL_SKILLS}
                            />
                        </div>
                        <button onClick={handleAddSkill} className="add-btn"><Plus size={16} /> {tr('Add', 'Ajouter')}</button>
                    </div>
                </ProfileSection>

                {/* ============ SECTION 7: Projects ============ */}
                <ProfileSection icon={FolderGit2} title={tr('Projects', 'Projets')}>
                    {projects.length > 0 ? (
                        <div className="items-list">
                            {projects.map(proj => (
                                <div key={proj.id} className="item-card">
                                    <div className="item-icon"><FolderGit2 size={24} /></div>
                                    <div className="item-info">
                                        <h3>{proj.name}</h3>
                                        {proj.description && <p className="item-desc">{proj.description}</p>}
                                        {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" className="item-link"><ExternalLink size={14} /> {tr('View project', 'Voir le projet')}</a>}
                                    </div>
                                    <button onClick={() => removeProject(proj.id)} className="delete-btn"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="empty-text">{tr('No projects added yet', 'Aucun projet ajoute')}</p>}
                    <div className="add-form">
                        <h4><Plus size={16} /> {tr('Add Project', 'Ajouter un projet')}</h4>
                        <div className="form-grid">
                            <input type="text" placeholder={tr('Project Name *', 'Nom du projet *')} value={newProject.name} onChange={e => setNewProject(prev => ({ ...prev, name: e.target.value }))} />
                            <input type="url" placeholder={tr('Project URL', 'URL du projet')} value={newProject.url} onChange={e => setNewProject(prev => ({ ...prev, url: e.target.value }))} />
                        </div>
                        <textarea placeholder={tr('Description', 'Description')} value={newProject.description} onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))} rows={3} />
                        <button onClick={handleAddProject} className="add-item-btn"><Plus size={16} /> {tr('Add Project', 'Ajouter un projet')}</button>
                    </div>
                </ProfileSection>

                {/* ============ SECTION 8: Languages ============ */}
                <ProfileSection icon={Languages} title={tr('Languages', 'Langues')}>
                    {languages.length > 0 ? (
                        <div className="items-list compact">
                            {languages.map(lang => (
                                <div key={lang.id} className="item-card compact">
                                    <div className="item-info">
                                        <h3>{lang.language}</h3>
                                        <p className="item-meta">{lang.proficiency}</p>
                                    </div>
                                    <button onClick={() => removeLanguage(lang.id)} className="delete-btn"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="empty-text">{tr('No languages added yet', 'Aucune langue ajoutee')}</p>}
                    <div className="add-form compact">
                        <h4><Plus size={16} /> {tr('Add Language', 'Ajouter une langue')}</h4>
                        <div className="form-grid">
                            <input type="text" placeholder={tr('Language *', 'Langue *')} value={newLang.language} onChange={e => setNewLang(prev => ({ ...prev, language: e.target.value }))} />
                            <select value={newLang.proficiency} onChange={e => setNewLang(prev => ({ ...prev, proficiency: e.target.value }))}>
                                <option value="native">{tr('Native', 'Natif')}</option>
                                <option value="fluent">{tr('Fluent', 'Courant')}</option>
                                <option value="professional">{tr('Professional', 'Professionnel')}</option>
                                <option value="conversational">{tr('Conversational', 'Conversationnel')}</option>
                                <option value="elementary">{tr('Elementary', 'Elementaire')}</option>
                            </select>
                        </div>
                        <button onClick={handleAddLanguage} className="add-item-btn"><Plus size={16} /> {tr('Add Language', 'Ajouter une langue')}</button>
                    </div>
                </ProfileSection>

                {/* ============ SECTION 9: Volunteer Experience ============ */}
                <ProfileSection icon={Heart} title={tr('Volunteer Experience', 'Experience benevole')}>
                    {volunteer.length > 0 ? (
                        <div className="items-list">
                            {volunteer.map(vol => (
                                <div key={vol.id} className="item-card">
                                    <div className="item-icon"><Heart size={24} /></div>
                                    <div className="item-info">
                                        <h3>{vol.role}</h3>
                                        <p className="item-subtitle">{vol.organization}</p>
                                        {vol.cause && <p className="item-meta">{vol.cause}</p>}
                                        <p className="item-meta">{vol.start_date} — {vol.is_current ? tr('Present', 'Present') : vol.end_date || tr('N/A', 'N/A')}</p>
                                    </div>
                                    <button onClick={() => removeVolunteer(vol.id)} className="delete-btn"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="empty-text">{tr('No volunteer experience added yet', 'Aucune experience benevole ajoutee')}</p>}
                    <div className="add-form">
                        <h4><Plus size={16} /> {tr('Add Volunteer Experience', 'Ajouter une experience benevole')}</h4>
                        <div className="form-grid">
                            <input type="text" placeholder={tr('Organization *', 'Organisation *')} value={newVol.organization} onChange={e => setNewVol(prev => ({ ...prev, organization: e.target.value }))} />
                            <input type="text" placeholder={tr('Role *', 'Role *')} value={newVol.role} onChange={e => setNewVol(prev => ({ ...prev, role: e.target.value }))} />
                            <input type="text" placeholder={tr('Cause', 'Cause')} value={newVol.cause} onChange={e => setNewVol(prev => ({ ...prev, cause: e.target.value }))} />
                            <input type="month" placeholder={tr('Start Date', 'Date de debut')} value={newVol.start_date} onChange={e => setNewVol(prev => ({ ...prev, start_date: e.target.value }))} />
                            <input type="month" placeholder={tr('End Date', 'Date de fin')} value={newVol.end_date} onChange={e => setNewVol(prev => ({ ...prev, end_date: e.target.value }))} disabled={newVol.is_current} />
                        </div>
                        <label className="checkbox-row"><input type="checkbox" checked={newVol.is_current} onChange={e => setNewVol(prev => ({ ...prev, is_current: e.target.checked, end_date: '' }))} /> {tr('Currently volunteering', 'Je fais actuellement du benevolat')}</label>
                        <button onClick={handleAddVolunteer} className="add-item-btn"><Plus size={16} /> {tr('Add Volunteer', 'Ajouter un benevolat')}</button>
                    </div>
                </ProfileSection>

                {/* ============ BOTTOM ACTION BUTTONS ============ */}
                <div className="bottom-actions">
                    <button onClick={() => setShowPreview(true)} className="preview-btn"><Eye size={20} /> {tr('Preview Profile', 'Apercu du profil')}</button>
                    <button onClick={handleSave} disabled={saving} className="save-btn">
                        {saving ? <><Loader2 size={20} className="spin" /> {tr('Saving...', 'Enregistrement...')}</> : <><Save size={20} /> {tr('Save Profile', 'Enregistrer le profil')}</>}
                    </button>
                </div>
            </div>

            {/* Preview Modal */}
            <ProfilePreviewModal
                isOpen={showPreview} onClose={() => setShowPreview(false)}
                profile={formData} experiences={experiences} education={education}
                languages={languages}
                completion={completion}
                tr={tr}
            />

            {toast && <ErrorToast {...toast} onClose={hideToast} />}        </div>
    )
}

export default function StudentProfileWithErrorBoundary() {
    const tr = useBilingualText()
    return (
        <ErrorBoundary fallbackMessage={tr('Profile page encountered an error. Please reload.', 'La page profil a rencontre une erreur. Veuillez recharger.')}>
            <StudentProfile />
        </ErrorBoundary>
    )
}
