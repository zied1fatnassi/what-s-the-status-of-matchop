import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Briefcase, MapPin, DollarSign, Clock, FileText, Plus, X, Send, Loader, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { FormLocationSelector } from '../../components/forms/FormComponents'
import './PostOffer.css'

function PostOffer() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)
    const [aiError, setAiError] = useState(null)

    const [offer, setOffer] = useState({
        title: '',
        department: '',
        type: 'Internship',
        location: '',
        governorate: '',
        locationType: 'onsite',
        salary: '',
        duration: '',
        description: '',
        requirements: '',
        skills: [],
    })
    const [newSkill, setNewSkill] = useState('')

    const generateDescriptionLocally = () => {
        const title = offer.title?.trim() || 'this role'
        const department = offer.department?.trim()
        const type = offer.type?.trim() || 'Internship'
        const location = offer.locationType === 'remote'
            ? 'Remote'
            : (offer.location?.trim() || 'our office')

        return `## About the role
We are looking for a motivated candidate to join us as **${title}**${department ? ` in our ${department} team` : ''}. In this ${type.toLowerCase()} opportunity, you will work closely with experienced teammates and contribute to real projects from day one.

## Key Responsibilities
- Collaborate with the team to deliver high-quality work on active projects.
- Support daily execution, documentation, and reporting for assigned tasks.
- Communicate progress clearly and raise blockers early.
- Participate in planning, feedback sessions, and continuous improvement.

## What You'll Learn
- Practical project execution in a real company environment.
- Collaboration and communication across technical and non-technical teams.
- Industry best practices for quality, delivery, and ownership.

## Qualifications
- Strong interest in ${department || 'the field'} and willingness to learn quickly.
- Good communication and teamwork skills.
- Reliability, curiosity, and attention to detail.
- Availability for a ${type.toLowerCase()} based in ${location}.`
    }

    const generateDescription = async () => {
        if (!offer.title.trim()) {
            setAiError(t('postJob.errors.enterTitleFirst'))
            return
        }

        setAiLoading(true)
        setAiError(null)

        try {
            const { data, error } = await supabase.functions.invoke('ai-job-description', {
                body: {
                    jobTitle: offer.title,
                    department: offer.department,
                    jobType: offer.type,
                    tone: 'professional'
                }
            })

            if (error) throw error

            if (data?.success && data?.description) {
                setOffer(prev => ({ ...prev, description: data.description }))
            } else {
                throw new Error(data?.error || t('postJob.errors.failedGenerateDescription'))
            }
        } catch (error) {
            console.warn('AI generation unavailable, using local template:', error)
            setOffer(prev => ({ ...prev, description: generateDescriptionLocally() }))
            setAiError(t('postJob.errors.aiUnavailableFallback'))
        } finally {
            setAiLoading(false)
        }
    }

    const handleAddSkill = () => {
        if (newSkill.trim() && !offer.skills.includes(newSkill.trim())) {
            setOffer({ ...offer, skills: [...offer.skills, newSkill.trim()] })
            setNewSkill('')
        }
    }

    const handleRemoveSkill = (skill) => {
        setOffer({ ...offer, skills: offer.skills.filter(s => s !== skill) })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!user) return

        setLoading(true)
        try {
            const { data, error } = await supabase.from('offers').insert({
                company_id: user.id,
                title: offer.title,
                description: offer.description,
                req_skills: offer.skills,
                location: offer.location || 'Remote',
                salary_range: offer.salary || 'Competitive',
                status: 'active'
            }).select('id').single()

            if (error) throw error

            if (data?.id) {
                const textForEmbedding = [
                    offer.title,
                    offer.description,
                    (offer.skills || []).join(', ')
                ].filter(Boolean).join('. ')

                supabase.functions.invoke('generate-embedding', {
                    body: { text: textForEmbedding, type: 'job', id: data.id }
                }).catch(err => console.warn('[Embedding] Failed:', err))
            }

            setShowSuccess(true)
            setTimeout(() => {
                navigate('/company/intros')
            }, 2000)
        } catch (error) {
            console.error('Error posting offer:', error)
            alert(t('postJob.errors.failedPost', { message: error.message }))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="post-offer-page">
            <div className="container">
                <div className="page-header">
                    <h1>{t('postJob.title')}</h1>
                    <p>{t('postJob.subtitle')}</p>
                </div>

                <form onSubmit={handleSubmit} className="offer-form">
                    <div className="form-grid">
                        <div className="form-column">
                            <div className="form-card glass-card">
                                <h3 className="card-title">
                                    <Briefcase size={20} />
                                    {t('postJob.basicInfo')}
                                </h3>

                                <div className="input-group">
                                    <label className="input-label">{t('postJob.jobTitle')} *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder={t('postJob.titlePlaceholder')}
                                        value={offer.title}
                                        onChange={(e) => setOffer({ ...offer, title: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="input-row">
                                    <div className="input-group">
                                        <label className="input-label">{t('postJob.department')}</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder={t('postJob.departmentPlaceholder')}
                                            value={offer.department}
                                            onChange={(e) => setOffer({ ...offer, department: e.target.value })}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">{t('postJob.type')}</label>
                                        <select
                                            className="input"
                                            value={offer.type}
                                            onChange={(e) => setOffer({ ...offer, type: e.target.value })}
                                        >
                                            <option value="Internship">{t('postJob.jobTypes.internship')}</option>
                                            <option value="Full-time">{t('postJob.jobTypes.fullTime')}</option>
                                            <option value="Part-time">{t('postJob.jobTypes.partTime')}</option>
                                            <option value="Contract">{t('postJob.jobTypes.contract')}</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <div className="label-row">
                                        <label className="input-label">
                                            <FileText size={16} />
                                            {t('postJob.jobDescription')} *
                                        </label>
                                        <button
                                            type="button"
                                            className="magic-rewrite-btn"
                                            onClick={generateDescription}
                                            disabled={aiLoading || !offer.title.trim()}
                                            title={t('postJob.magicRewriteTooltip')}
                                        >
                                            {aiLoading ? (
                                                <>
                                                    <Loader className="animate-spin" size={16} />
                                                    {t('postJob.generating')}
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={16} />
                                                    {t('postJob.magicRewrite')}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    {aiError && (
                                        <div className="ai-error-message">{aiError}</div>
                                    )}
                                    <textarea
                                        className="input textarea"
                                        placeholder={t('postJob.descriptionPlaceholder')}
                                        value={offer.description}
                                        onChange={(e) => setOffer({ ...offer, description: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">{t('postJob.requirements')}</label>
                                    <textarea
                                        className="input textarea"
                                        placeholder={t('postJob.requirementsPlaceholder')}
                                        value={offer.requirements}
                                        onChange={(e) => setOffer({ ...offer, requirements: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-column">
                            <div className="form-card glass-card">
                                <h3 className="card-title">
                                    <MapPin size={20} />
                                    {t('postJob.locationCompensation')}
                                </h3>

                                <div className="location-options">
                                    {['onsite', 'remote', 'hybrid'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            className={`location-option ${offer.locationType === type ? 'active' : ''}`}
                                            onClick={() => setOffer({ ...offer, locationType: type })}
                                        >
                                            {t(`postJob.${type}`)}
                                        </button>
                                    ))}
                                </div>

                                {offer.locationType !== 'remote' && (
                                    <div className="input-group">
                                        <FormLocationSelector
                                            label={t('postJob.locationLabel')}
                                            governorateValue={offer.governorate}
                                            cityValue={offer.location}
                                            onGovernorateChange={(val) => setOffer(prev => ({ ...prev, governorate: val }))}
                                            onCityChange={(val) => setOffer(prev => ({ ...prev, location: val }))}
                                            governoratePlaceholder={t('postJob.governoratePlaceholder')}
                                            cityPlaceholder={t('postJob.cityPlaceholder')}
                                            cityDisabledPlaceholder={t('postJob.citySelectGovernorateFirst')}
                                            required
                                        />
                                    </div>
                                )}

                                <div className="input-row">
                                    <div className="input-group">
                                        <label className="input-label">
                                            <DollarSign size={16} />
                                            {t('postJob.compensation')}
                                        </label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder={t('postJob.compensationPlaceholder')}
                                            value={offer.salary}
                                            onChange={(e) => setOffer({ ...offer, salary: e.target.value })}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">
                                            <Clock size={16} />
                                            {t('postJob.duration')}
                                        </label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder={t('postJob.durationPlaceholder')}
                                            value={offer.duration}
                                            onChange={(e) => setOffer({ ...offer, duration: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-card glass-card">
                                <h3 className="card-title">{t('postJob.requiredSkills')}</h3>

                                <div className="skills-input-container">
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder={t('postJob.addSkill')}
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                                    />
                                    <button
                                        type="button"
                                        className="add-skill-btn"
                                        onClick={handleAddSkill}
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>

                                <div className="skills-list">
                                    {offer.skills.map(skill => (
                                        <span key={skill} className="skill-tag">
                                            {skill}
                                            <button type="button" onClick={() => handleRemoveSkill(skill)}>
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                    {offer.skills.length === 0 && (
                                        <span className="no-skills-text">{t('postJob.noSkillsAdded')}</span>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg w-full"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        {t('postJob.publishing')}
                                    </>
                                ) : (
                                    <>
                                        <Send size={20} />
                                        {t('postJob.publish')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {showSuccess && (
                    <div className="fixed bottom-8 right-8 bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up">
                        <div className="bg-white/20 p-2 rounded-full">
                            <Send size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold">{t('postJob.successTitle')}</h4>
                            <p className="text-sm opacity-90">{t('postJob.successMessage')}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default PostOffer
