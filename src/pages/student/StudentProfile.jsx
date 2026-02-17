import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import './StudentProfile.css'

// ============================================================================
// PROFILE PREVIEW MODAL
// ============================================================================
function ProfilePreviewModal({ isOpen, onClose, profile, experiences, education, certifications, projects, languages, completion }) {
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
                        <h2 className="preview-name">{profile?.display_name || 'Student'}</h2>
                        {profile?.headline && <p className="preview-headline">{profile.headline}</p>}
                        {profile?.location && <p className="preview-location"><MapPin size={16} /> {profile.location}</p>}
                        <div className="preview-completion"><CheckCircle size={16} /><span>{completion}% Complete</span></div>
                        {profile?.bio && <div className="preview-section"><h3>About</h3><p>{profile.bio}</p></div>}
                        {profile?.skills?.length > 0 && (
                            <div className="preview-section">
                                <h3>Skills</h3>
                                <div className="preview-skills">{profile.skills.map(s => <span key={s} className="preview-skill-tag">{s}</span>)}</div>
                            </div>
                        )}
                        {experiences?.length > 0 && (
                            <div className="preview-section">
                                <h3><Briefcase size={16} /> Experience</h3>
                                <div className="preview-experiences">{experiences.map(exp => (
                                    <div key={exp.id} className="preview-exp">
                                        <strong>{exp.job_title}</strong>
                                        <span className="preview-exp-company">{exp.company}</span>
                                        <span className="preview-exp-date">{exp.start_date} — {exp.is_current ? 'Present' : exp.end_date}</span>
                                    </div>
                                ))}</div>
                            </div>
                        )}
                        {education?.length > 0 && (
                            <div className="preview-section">
                                <h3><GraduationCap size={16} /> Education</h3>
                                {education.map(edu => (
                                    <div key={edu.id} className="preview-exp">
                                        <strong>{edu.school}</strong>
                                        <span className="preview-exp-company">{edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {languages?.length > 0 && (
                            <div className="preview-section">
                                <h3><Languages size={16} /> Languages</h3>
                                <div className="preview-skills">{languages.map(l => <span key={l.id} className="preview-skill-tag">{l.language} ({l.proficiency})</span>)}</div>
                            </div>
                        )}
                    </div>
                    <p className="preview-hint">This is how companies will see your profile</p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

// ============================================================================
// SECTION WRAPPER COMPONENT
// ============================================================================
function ProfileSection({ icon: Icon, title, children, error }) {
    return (
        <section className="profile-section">
            <h2><Icon size={20} /> {title}</h2>
            {error && <div className="section-error"><AlertCircle size={16} />{error}</div>}
            {children}
        </section>
    )
}

// ============================================================================
// MAIN PROFILE COMPONENT
// ============================================================================
function StudentProfile() {
    const { user } = useAuth()
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
        if (error) showError(error.message || 'Failed to upload')
        else if (url) { setFormData(prev => ({ ...prev, avatar_url: url })); showSuccess('Avatar uploaded!') }
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
            showError('File too large (Max 5MB)')
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
                    showError('CV uploaded but failed to save to profile')
                } else {
                    showSuccess('CV uploaded successfully!')
                    // Replace local blob URL with a proper signed URL
                    const signedUrl = await getSignedCVUrl(path)
                    if (signedUrl) setCvSignedUrl(signedUrl)
                }
            }
        } catch (error) {
            console.error('[CV Upload] Error:', error)
            showError('Failed to upload CV: ' + (error?.message || error))
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
            showError('Please enter at least a short bio first')
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
                showSuccess('Bio improved with AI! Review and save.')
            } else {
                throw new Error(data?.error || 'AI service unavailable')
            }
        } catch (err) {
            console.warn('AI bio service unavailable, using local improvement:', err.message)
            // Fallback: improve locally
            const improved = improveBioLocally(formData.bio, formData.skills, formData.headline)
            if (improved !== formData.bio) {
                setFormData(prev => ({ ...prev, bio: improved }))
                showSuccess('Bio polished! Review and save.')
            } else {
                setAiError('Could not improve bio. Try adding more detail first.')
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
        else { showSuccess('Profile saved!'); setShowPreview(true) }
    }

    // Experience handlers (Supabase connected)
    const handleAddExperience = async () => {
        if (!newExp.job_title || !newExp.company || !newExp.start_date) { showError('Fill required fields'); return }
        const { error } = await addExperience(newExp)
        if (error) showError(error)
        else { showSuccess('Experience added!'); setNewExp({ job_title: '', company: '', start_date: '', end_date: '', is_current: false, description: '' }) }
    }

    // Education handlers (Supabase connected)
    const handleAddEducation = async () => {
        if (!newEdu.school) { showError('School is required'); return }
        setAddingEducation(true)
        const { error } = await addEducation(newEdu)
        setAddingEducation(false)
        if (error) {
            showError(error)
        } else {
            showSuccess('Education added!')
            setNewEdu({ school: '', degree: '', field_of_study: '', start_date: '', end_date: '', is_current: false })
        }
    }

    const handleRemoveEducation = async (id) => {
        const { error } = await removeEducation(id)
        if (error) showError(error)
        else showSuccess('Education removed')
    }

    // Certification handlers (local state)
    const handleAddCertification = () => {
        if (!newCert.name || !newCert.issuing_organization) { showError('Name and organization required'); return }
        addCertification(newCert)
        showSuccess('Certification added!')
        setNewCert({ name: '', issuing_organization: '', issue_date: '', credential_url: '' })
    }

    // Project handlers (local state)
    const handleAddProject = () => {
        if (!newProject.name) { showError('Project name required'); return }
        addProject(newProject)
        showSuccess('Project added!')
        setNewProject({ name: '', description: '', url: '', start_date: '', end_date: '' })
    }

    // Language handlers (local state)
    const handleAddLanguage = () => {
        if (!newLang.language) { showError('Language required'); return }
        addLanguage(newLang)
        showSuccess('Language added!')
        setNewLang({ language: '', proficiency: 'professional' })
    }

    // Volunteer handlers (local state)
    const handleAddVolunteer = () => {
        if (!newVol.organization || !newVol.role) { showError('Organization and role required'); return }
        addVolunteer(newVol)
        showSuccess('Volunteer experience added!')
        setNewVol({ organization: '', role: '', cause: '', start_date: '', end_date: '', is_current: false })
    }

    if (loading) return <div className="profile-page"><div className="loading-state"><Loader2 size={48} className="spin" /><p>Loading profile...</p></div></div>
    if (error) return <div className="profile-page"><div className="error-state"><AlertCircle size={64} /><h2>Failed to Load</h2><p>{error}</p><button onClick={() => window.location.reload()}>Reload</button></div></div>

    return (
        <div className="profile-page animate-fade-in-up">
            <div className="profile-container">
                {/* Header */}
                <header className="profile-header">
                    <h1>My Profile</h1>
                    <div className="completion-indicator"><CheckCircle size={18} /><span>{completion}% Complete</span></div>
                </header>
                <div className="completion-bar-wrapper"><motion.div className="completion-bar-fill" initial={{ width: 0 }} animate={{ width: `${completion}%` }} /></div>

                {/* ============ SECTION 1: Profile Header ============ */}
                <ProfileSection icon={User} title="Profile Header">
                    <div className="avatar-area">
                        <div className="avatar" onClick={() => fileInputRef.current?.click()}>
                            {formData.avatar_url ? <img src={formData.avatar_url} alt="Avatar" /> : <div className="avatar-fallback">{uploading ? <Loader2 className="spin" /> : <User size={40} />}</div>}
                            <div className="avatar-overlay"><Camera size={20} /></div>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} hidden />
                        <span className="avatar-hint">Click to change photo</span>
                    </div>
                    <div className="field">
                        <label>Display Name *</label>
                        <input type="text" value={formData.display_name} onChange={e => setFormData(prev => ({ ...prev, display_name: e.target.value }))} placeholder="Your full name" />
                    </div>
                    <div className="field">
                        <label>Headline</label>
                        <input type="text" value={formData.headline} onChange={e => setFormData(prev => ({ ...prev, headline: e.target.value }))} placeholder="e.g. Full Stack Developer | React & Node.js" />
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
                <ProfileSection icon={FileText} title="CV / Resume">
                    <div className="cv-upload-area">
                        {(formData.cv_url || cvFileName) ? (
                            <div className="cv-display">
                                <FileText size={48} className="cv-icon" />
                                <div className="cv-info">
                                    <span className="cv-label">{cvFileName || 'Current CV'}</span>
                                    <div className="cv-actions">
                                        {cvSignedUrl && (
                                            <a href={cvSignedUrl} target="_blank" rel="noopener noreferrer" className="view-cv-btn">
                                                <Download size={14} /> Download / View
                                            </a>
                                        )}
                                        <button onClick={() => cvInputRef.current?.click()} className="change-cv-btn">
                                            Change
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="cv-placeholder" onClick={() => cvInputRef.current?.click()}>
                                <div className="placeholder-icon"><Upload size={24} /></div>
                                <p>Upload your CV / Resume</p>
                                <span>PDF or Word (Max 5MB)</span>
                            </div>
                        )}
                        <input
                            ref={cvInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleCVUpload}
                            hidden
                        />
                        {uploadingCV && <div className="uploading-overlay"><Loader2 className="spin" /> Uploading...</div>}
                    </div>
                </ProfileSection>

                {/* ============ SECTION 2: About ============ */}
                <ProfileSection icon={User} title="About">
                    <div className="field">
                        <div className="bio-header">
                            <label>Tell your story</label>
                            <button
                                type="button"
                                className="ai-improve-btn"
                                onClick={improveBio}
                                disabled={aiLoading || !formData.bio || formData.bio.length < 10}
                            >
                                {aiLoading ? (
                                    <><Loader2 size={14} className="spin" /> Improving...</>
                                ) : (
                                    <><Sparkles size={14} /> Improve my Bio</>
                                )}
                            </button>
                        </div>
                        {aiError && <div className="ai-error"><AlertCircle size={14} />{aiError}</div>}
                        <textarea value={formData.bio} onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))} placeholder="Write a summary about yourself, your experience, and career goals..." rows={5} maxLength={2000} />
                        <span className="char-count">{formData.bio.length}/2000</span>
                    </div>
                </ProfileSection>

                {/* ============ SECTION 3: Experience ============ */}
                <ProfileSection icon={Briefcase} title="Experience" error={experiencesError}>
                    {experiences.length > 0 ? (
                        <div className="items-list">
                            {experiences.map(exp => (
                                <div key={exp.id} className="item-card">
                                    <div className="item-icon"><Building2 size={24} /></div>
                                    <div className="item-info">
                                        <h3>{exp.job_title}</h3>
                                        <p className="item-subtitle">{exp.company}</p>
                                        <p className="item-meta">{exp.start_date} — {exp.is_current ? 'Present' : exp.end_date || 'N/A'}</p>
                                        {exp.description && <p className="item-desc">{exp.description}</p>}
                                    </div>
                                    <button onClick={() => deleteExperience(exp.id)} className="delete-btn"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="empty-text">No experience added yet</p>}
                    <div className="add-form">
                        <h4><Plus size={16} /> Add Experience</h4>
                        <div className="form-grid">
                            <SuggestionInput
                                placeholder="Job Title *"
                                value={newExp.job_title}
                                onChange={val => setNewExp(prev => ({ ...prev, job_title: val }))}
                                options={JOB_TITLES}
                            />
                            <SuggestionInput
                                placeholder="Company *"
                                value={newExp.company}
                                onChange={val => setNewExp(prev => ({ ...prev, company: val }))}
                                options={TUNISIAN_COMPANIES}
                            />
                            <input type="month" placeholder="Start Date *" value={newExp.start_date} onChange={e => setNewExp(prev => ({ ...prev, start_date: e.target.value }))} />
                            <input type="month" placeholder="End Date" value={newExp.end_date} onChange={e => setNewExp(prev => ({ ...prev, end_date: e.target.value }))} disabled={newExp.is_current} />
                        </div>
                        <label className="checkbox-row"><input type="checkbox" checked={newExp.is_current} onChange={e => setNewExp(prev => ({ ...prev, is_current: e.target.checked, end_date: '' }))} /> I currently work here</label>
                        <textarea placeholder="Description (optional)" value={newExp.description} onChange={e => setNewExp(prev => ({ ...prev, description: e.target.value }))} rows={3} />
                        <button onClick={handleAddExperience} className="add-item-btn"><Plus size={16} /> Add Experience</button>
                    </div>
                </ProfileSection>

                {/* ============ SECTION 4: Education (Supabase Connected) ============ */}
                <ProfileSection icon={GraduationCap} title="Education" error={educationError}>
                    {education.length > 0 ? (
                        <div className="items-list">
                            {education.map(edu => (
                                <div key={edu.id} className="item-card">
                                    <div className="item-icon"><GraduationCap size={24} /></div>
                                    <div className="item-info">
                                        <h3>{edu.school}</h3>
                                        <p className="item-subtitle">{edu.degree}{edu.field_of_study && `, ${edu.field_of_study}`}</p>
                                        <p className="item-meta">{edu.start_date} — {edu.is_current ? 'Present' : edu.end_date || 'N/A'}</p>
                                    </div>
                                    <button onClick={() => handleRemoveEducation(edu.id)} className="delete-btn"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="empty-text">No education added yet</p>}
                    <div className="add-form">
                        <h4><Plus size={16} /> Add Education</h4>
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

                            <input type="month" placeholder="Start Date" value={newEdu.start_date} onChange={e => setNewEdu(prev => ({ ...prev, start_date: e.target.value }))} />

                            <input type="month" placeholder="End Date" value={newEdu.end_date} onChange={e => setNewEdu(prev => ({ ...prev, end_date: e.target.value }))} disabled={newEdu.is_current} />
                        </div>
                        <label className="checkbox-row"><input type="checkbox" checked={newEdu.is_current} onChange={e => setNewEdu(prev => ({ ...prev, is_current: e.target.checked, end_date: '' }))} /> Currently studying here</label>
                        <button onClick={handleAddEducation} disabled={addingEducation} className="add-item-btn">
                            {addingEducation ? <><Loader2 size={16} className="spin" /> Adding...</> : <><Plus size={16} /> Add Education</>}
                        </button>
                    </div>
                </ProfileSection>

                {/* ============ SECTION 5: Licenses & Certifications ============ */}
                <ProfileSection icon={Award} title="Licenses & Certifications">
                    {certifications.length > 0 ? (
                        <div className="items-list">
                            {certifications.map(cert => (
                                <div key={cert.id} className="item-card">
                                    <div className="item-icon"><Award size={24} /></div>
                                    <div className="item-info">
                                        <h3>{cert.name}</h3>
                                        <p className="item-subtitle">{cert.issuing_organization}</p>
                                        <p className="item-meta">Issued {cert.issue_date}</p>
                                        {cert.credential_url && <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="item-link"><ExternalLink size={14} /> View credential</a>}
                                    </div>
                                    <button onClick={() => removeCertification(cert.id)} className="delete-btn"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="empty-text">No certifications added yet</p>}
                    <div className="add-form">
                        <h4><Plus size={16} /> Add Certification</h4>
                        <div className="form-grid">
                            <input type="text" placeholder="Certification Name *" value={newCert.name} onChange={e => setNewCert(prev => ({ ...prev, name: e.target.value }))} />
                            <input type="text" placeholder="Issuing Organization *" value={newCert.issuing_organization} onChange={e => setNewCert(prev => ({ ...prev, issuing_organization: e.target.value }))} />
                            <input type="month" placeholder="Issue Date" value={newCert.issue_date} onChange={e => setNewCert(prev => ({ ...prev, issue_date: e.target.value }))} />
                            <input type="url" placeholder="Credential URL" value={newCert.credential_url} onChange={e => setNewCert(prev => ({ ...prev, credential_url: e.target.value }))} />
                        </div>
                        <button onClick={handleAddCertification} className="add-item-btn"><Plus size={16} /> Add Certification</button>
                    </div>
                </ProfileSection>

                {/* ============ SECTION 6: Skills ============ */}

                <ProfileSection icon={CheckCircle} title="Skills">
                    <div className="skills-container">
                        {formData.skills.length > 0 ? formData.skills.map(skill => (
                            <span key={skill} className="skill-chip">{skill}<button onClick={() => handleRemoveSkill(skill)}><X size={14} /></button></span>
                        )) : <span className="empty-text">No skills added yet</span>}
                    </div>
                    <div className="skills-input-container">
                        <div className="skills-input-wrapper">
                            <SuggestionInput
                                placeholder="Add a skill (e.g. Python, Leadership...)"
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
                        <button onClick={handleAddSkill} className="add-btn"><Plus size={16} /> Add</button>
                    </div>
                </ProfileSection>

                {/* ============ SECTION 7: Projects ============ */}
                <ProfileSection icon={FolderGit2} title="Projects">
                    {projects.length > 0 ? (
                        <div className="items-list">
                            {projects.map(proj => (
                                <div key={proj.id} className="item-card">
                                    <div className="item-icon"><FolderGit2 size={24} /></div>
                                    <div className="item-info">
                                        <h3>{proj.name}</h3>
                                        {proj.description && <p className="item-desc">{proj.description}</p>}
                                        {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" className="item-link"><ExternalLink size={14} /> View project</a>}
                                    </div>
                                    <button onClick={() => removeProject(proj.id)} className="delete-btn"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="empty-text">No projects added yet</p>}
                    <div className="add-form">
                        <h4><Plus size={16} /> Add Project</h4>
                        <div className="form-grid">
                            <input type="text" placeholder="Project Name *" value={newProject.name} onChange={e => setNewProject(prev => ({ ...prev, name: e.target.value }))} />
                            <input type="url" placeholder="Project URL" value={newProject.url} onChange={e => setNewProject(prev => ({ ...prev, url: e.target.value }))} />
                        </div>
                        <textarea placeholder="Description" value={newProject.description} onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))} rows={3} />
                        <button onClick={handleAddProject} className="add-item-btn"><Plus size={16} /> Add Project</button>
                    </div>
                </ProfileSection>

                {/* ============ SECTION 8: Languages ============ */}
                <ProfileSection icon={Languages} title="Languages">
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
                    ) : <p className="empty-text">No languages added yet</p>}
                    <div className="add-form compact">
                        <h4><Plus size={16} /> Add Language</h4>
                        <div className="form-grid">
                            <input type="text" placeholder="Language *" value={newLang.language} onChange={e => setNewLang(prev => ({ ...prev, language: e.target.value }))} />
                            <select value={newLang.proficiency} onChange={e => setNewLang(prev => ({ ...prev, proficiency: e.target.value }))}>
                                <option value="native">Native</option>
                                <option value="fluent">Fluent</option>
                                <option value="professional">Professional</option>
                                <option value="conversational">Conversational</option>
                                <option value="elementary">Elementary</option>
                            </select>
                        </div>
                        <button onClick={handleAddLanguage} className="add-item-btn"><Plus size={16} /> Add Language</button>
                    </div>
                </ProfileSection>

                {/* ============ SECTION 9: Volunteer Experience ============ */}
                <ProfileSection icon={Heart} title="Volunteer Experience">
                    {volunteer.length > 0 ? (
                        <div className="items-list">
                            {volunteer.map(vol => (
                                <div key={vol.id} className="item-card">
                                    <div className="item-icon"><Heart size={24} /></div>
                                    <div className="item-info">
                                        <h3>{vol.role}</h3>
                                        <p className="item-subtitle">{vol.organization}</p>
                                        {vol.cause && <p className="item-meta">{vol.cause}</p>}
                                        <p className="item-meta">{vol.start_date} — {vol.is_current ? 'Present' : vol.end_date || 'N/A'}</p>
                                    </div>
                                    <button onClick={() => removeVolunteer(vol.id)} className="delete-btn"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="empty-text">No volunteer experience added yet</p>}
                    <div className="add-form">
                        <h4><Plus size={16} /> Add Volunteer Experience</h4>
                        <div className="form-grid">
                            <input type="text" placeholder="Organization *" value={newVol.organization} onChange={e => setNewVol(prev => ({ ...prev, organization: e.target.value }))} />
                            <input type="text" placeholder="Role *" value={newVol.role} onChange={e => setNewVol(prev => ({ ...prev, role: e.target.value }))} />
                            <input type="text" placeholder="Cause" value={newVol.cause} onChange={e => setNewVol(prev => ({ ...prev, cause: e.target.value }))} />
                            <input type="month" placeholder="Start Date" value={newVol.start_date} onChange={e => setNewVol(prev => ({ ...prev, start_date: e.target.value }))} />
                            <input type="month" placeholder="End Date" value={newVol.end_date} onChange={e => setNewVol(prev => ({ ...prev, end_date: e.target.value }))} disabled={newVol.is_current} />
                        </div>
                        <label className="checkbox-row"><input type="checkbox" checked={newVol.is_current} onChange={e => setNewVol(prev => ({ ...prev, is_current: e.target.checked, end_date: '' }))} /> Currently volunteering</label>
                        <button onClick={handleAddVolunteer} className="add-item-btn"><Plus size={16} /> Add Volunteer</button>
                    </div>
                </ProfileSection>

                {/* ============ BOTTOM ACTION BUTTONS ============ */}
                <div className="bottom-actions">
                    <button onClick={() => setShowPreview(true)} className="preview-btn"><Eye size={20} /> Preview Profile</button>
                    <button onClick={handleSave} disabled={saving} className="save-btn">
                        {saving ? <><Loader2 size={20} className="spin" /> Saving...</> : <><Save size={20} /> Save Profile</>}
                    </button>
                </div>
            </div>

            {/* Preview Modal */}
            <ProfilePreviewModal
                isOpen={showPreview} onClose={() => setShowPreview(false)}
                profile={formData} experiences={experiences} education={education}
                certifications={certifications} projects={projects} languages={languages}
                completion={completion}
            />

            {toast && <ErrorToast {...toast} onClose={hideToast} />}

            <style>{`
                .profile-page { min-height: 100vh; background: var(--bento-bg); padding: 24px 16px; }
                .profile-container { max-width: 800px; margin: 0 auto; }
                .profile-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                .profile-header h1 { color: var(--text-primary); font-size: 28px; font-weight: 700; margin: 0; }
                .completion-indicator { display: flex; align-items: center; gap: 6px; background: var(--glass-surface); color: var(--accent-teal); padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; border: 1px solid var(--accent-teal); }
                .completion-bar-wrapper { height: 6px; background: var(--glass-border); border-radius: 3px; margin-bottom: 24px; overflow: hidden; }
                .completion-bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent-teal), var(--primary)); border-radius: 3px; }
                
                .profile-section { background: var(--bento-card); border-radius: 16px; padding: 28px; margin-bottom: 16px; box-shadow: var(--shadow-md); border: 1px solid var(--bento-card-border-subtle); }
                .profile-section h2 { display: flex; align-items: center; gap: 10px; font-size: 18px; color: var(--text-primary); margin: 0 0 20px; padding-bottom: 12px; border-bottom: 1px solid var(--glass-border); }
                
                .avatar-area { display: flex; flex-direction: column; align-items: center; margin-bottom: 24px; }
                .avatar { width: 120px; height: 120px; border-radius: 50%; overflow: hidden; cursor: pointer; position: relative; background: var(--glass-surface); border: 4px solid var(--glass-border); box-shadow: var(--shadow-md); }
                .avatar img { width: 100%; height: 100%; object-fit: cover; }
                .avatar-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); }
                .avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; opacity: 0; transition: opacity 0.2s; }
                .avatar:hover .avatar-overlay { opacity: 1; }
                .avatar-hint { margin-top: 8px; font-size: 13px; color: var(--text-secondary); }
                
                .field { margin-bottom: 16px; }
                .field label { display: flex; align-items: center; gap: 6px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; font-size: 14px; }
                .field input, .field textarea, .add-row input, .form-grid input, .form-grid select, .add-form textarea { width: 100%; padding: 12px 14px; border: 1.5px solid var(--input-border); border-radius: 10px; font-size: 15px; transition: all 0.2s; background: var(--input-bg); color: var(--text-primary); }
                .field input:focus, .field textarea:focus, .add-row input:focus, .form-grid input:focus, .form-grid select:focus, .add-form textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-glow); background: var(--input-focus-bg); }
                .char-count { display: block; text-align: right; font-size: 12px; color: var(--text-muted); margin-top: 4px; }
                
                .bio-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                .ai-improve-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .ai-improve-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4); }
                .ai-improve-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .ai-error { display: flex; align-items: center; gap: 6px; background: rgba(239, 68, 68, 0.1); color: var(--accent-red); padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 10px; border: 1px solid rgba(239, 68, 68, 0.2); }
                
                .checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 14px; margin-bottom: 12px; cursor: pointer; color: var(--text-primary); }
                .checkbox-row input { width: auto; }
                
                .skills-container { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; min-height: 32px; }
                .skill-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--primary-light); color: var(--primary-dark); padding: 8px 14px; border-radius: 20px; font-size: 14px; font-weight: 500; opacity: 0.8; }
                .skill-chip button { background: none; border: none; padding: 0; cursor: pointer; color: var(--primary-dark); display: flex; }
                .empty-text { color: var(--text-muted); font-style: italic; font-size: 14px; }
                
                .add-row { display: flex; gap: 10px; }
                .add-btn { display: flex; align-items: center; gap: 4px; padding: 12px 20px; background: var(--primary); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.2s; }
                .add-btn:hover { background: var(--primary-hover); }
                
                .items-list { margin-bottom: 20px; }
                .items-list.compact { display: flex; flex-wrap: wrap; gap: 12px; }
                .item-card { display: flex; align-items: flex-start; gap: 16px; padding: 16px; background: var(--glass-surface); border-radius: 12px; margin-bottom: 12px; border: 1px solid var(--glass-border); }
                .item-card.compact { flex: 1; min-width: 200px; margin-bottom: 0; }
                .item-icon { width: 48px; height: 48px; border-radius: 8px; background: var(--primary-light); display: flex; align-items: center; justify-content: center; color: var(--primary); flex-shrink: 0; opacity: 0.7; }
                .item-info { flex: 1; min-width: 0; }
                .item-info h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0 0 4px; }
                .item-subtitle { color: var(--primary); font-weight: 500; font-size: 14px; margin: 0 0 4px; }
                .item-meta { font-size: 13px; color: var(--text-secondary); margin: 0 0 4px; }
                .item-desc { font-size: 14px; color: var(--text-secondary); margin: 8px 0 0; line-height: 1.5; }
                .item-link { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--primary); text-decoration: none; margin-top: 6px; }
                .item-link:hover { text-decoration: underline; }
                
                .delete-btn { background: rgba(239, 68, 68, 0.1); color: var(--accent-red); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 10px; cursor: pointer; transition: background 0.2s; flex-shrink: 0; }
                .delete-btn:hover { background: rgba(239, 68, 68, 0.2); }
                
                .add-form { background: var(--glass-surface); border-radius: 12px; padding: 20px; border: 1px dashed var(--glass-border); margin-top: 16px; }
                .add-form.compact { padding: 16px; }
                .add-form h4 { display: flex; align-items: center; gap: 6px; margin: 0 0 14px; color: var(--text-primary); font-size: 15px; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
                @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
                .add-form textarea { margin-bottom: 12px; }
                .add-item-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; background: var(--accent-green); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
                .add-item-btn:hover:not(:disabled) { transform: translateY(-2px); }
                .add-item-btn:disabled { opacity: 0.7; cursor: not-allowed; }
                
                .section-error { display: flex; align-items: center; gap: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: var(--accent-red); padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 14px; }
                
                .bottom-actions { display: flex; gap: 12px; margin-top: 8px; }
                .preview-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 18px; background: var(--bento-card); color: var(--primary); border: 2px solid var(--primary); border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .preview-btn:hover { background: var(--glass-surface); }
                .save-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 18px; background: var(--primary); color: white; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .save-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
                .save-btn:disabled { opacity: 0.7; cursor: not-allowed; }
                
                .loading-state, .error-state { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-primary); text-align: center; }
                .error-state { background: var(--bento-card); border-radius: 16px; padding: 48px; color: var(--text-primary); max-width: 400px; margin: 80px auto; }
                .error-state h2 { margin: 16px 0 8px; }
                .error-state p { color: var(--text-secondary); margin-bottom: 24px; }
                .error-state button { padding: 12px 32px; background: var(--primary); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                /* Preview Modal */
                .preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
                .preview-modal { background: var(--bento-card); border-radius: 24px; max-width: 440px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: var(--shadow-xl); border: 1px solid var(--glass-border); }
                .preview-close { position: absolute; top: 16px; right: 16px; background: var(--glass-surface); border: 1px solid var(--glass-border); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); z-index: 10; }
                .preview-close:hover { background: var(--glass-surface-hover); color: var(--primary); }
                .preview-card { padding: 32px 24px; }
                .preview-avatar { width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 16px; overflow: hidden; background: var(--primary); box-shadow: 0 8px 24px var(--primary-glow); }
                .preview-avatar img { width: 100%; height: 100%; object-fit: cover; }
                .preview-avatar-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; }
                .preview-name { text-align: center; font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
                .preview-headline { text-align: center; color: var(--text-secondary); font-size: 14px; margin: 0 0 8px; }
                .preview-location { display: flex; align-items: center; justify-content: center; gap: 4px; color: var(--text-secondary); font-size: 14px; margin: 0 0 12px; }
                .preview-completion { display: flex; align-items: center; justify-content: center; gap: 6px; background: var(--accent-green); background: rgba(74, 222, 128, 0.1); color: var(--accent-green); padding: 6px 14px; border-radius: 16px; font-size: 12px; font-weight: 600; margin: 0 auto 20px; width: fit-content; }
                .preview-section { margin-bottom: 16px; }
                .preview-section h3 { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px; }
                .preview-section p { color: var(--text-secondary); font-size: 14px; line-height: 1.6; margin: 0; }
                .preview-skills { display: flex; flex-wrap: wrap; gap: 6px; }
                .preview-skill-tag { background: var(--primary-light); color: var(--primary-dark); padding: 5px 12px; border-radius: 14px; font-size: 12px; font-weight: 500; opacity: 0.8; }
                .preview-experiences { display: flex; flex-direction: column; gap: 10px; }
                .preview-exp { background: var(--glass-surface); padding: 10px 14px; border-radius: 8px; border-left: 3px solid var(--primary); }
                .preview-exp strong { display: block; color: var(--text-primary); font-size: 14px; }
                .preview-exp-company { display: block; color: var(--primary); font-size: 13px; }
                .preview-exp-date { display: block; color: var(--text-muted); font-size: 11px; margin-top: 2px; }
                .preview-hint { text-align: center; color: var(--text-muted); font-size: 12px; padding: 14px; border-top: 1px solid var(--glass-border); margin: 0; }
                
                /* CV Section */
                .cv-upload-area { position: relative; }
                .cv-display { display: flex; align-items: center; gap: 16px; background: var(--glass-surface); padding: 16px; border-radius: 12px; border: 1px solid var(--glass-border); }
                .cv-icon { color: var(--accent-red); }
                .cv-info { flex: 1; }
                .cv-label { display: block; font-weight: 600; color: var(--text-primary); font-size: 15px; margin-bottom: 6px; }
                .cv-actions { display: flex; gap: 8px; }
                .view-cv-btn, .change-cv-btn { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; padding: 6px 12px; border-radius: 8px; font-weight: 500; cursor: pointer; text-decoration: none; }
                .view-cv-btn { background: var(--primary-light); color: var(--primary-dark); }
                .view-cv-btn:hover { background: var(--primary-light); opacity: 0.7; }
                .change-cv-btn { background: var(--bento-card); border: 1px solid var(--glass-border); color: var(--text-secondary); }
                .change-cv-btn:hover { background: var(--glass-surface); }
                
                .cv-placeholder { border: 2px dashed var(--glass-border); border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.2s; background: var(--glass-surface); }
                .cv-placeholder:hover { border-color: var(--primary); background: var(--primary-light); opacity: 0.7; }
                .placeholder-icon { width: 48px; height: 48px; background: var(--bento-card); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: var(--text-muted); box-shadow: var(--shadow-sm); }
                .cv-placeholder:hover .placeholder-icon { color: var(--primary); }
                .cv-placeholder p { color: #374151; font-weight: 600; margin: 0 0 4px; }
                .cv-placeholder span { color: #9ca3af; font-size: 13px; }
                
                .uploading-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; gap: 8px; color: #3b82f6; font-weight: 600; border-radius: 12px; }
            `}</style>
        </div>
    )
}

export default function StudentProfileWithErrorBoundary() {
    return (
        <ErrorBoundary fallbackMessage="Profile page encountered an error. Please reload.">
            <StudentProfile />
        </ErrorBoundary>
    )
}
