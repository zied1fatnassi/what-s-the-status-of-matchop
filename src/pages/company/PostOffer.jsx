import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, MapPin, DollarSign, Clock, FileText, Plus, X, Send, Loader, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { FormLocationSelector } from '../../components/forms/FormComponents'
import ApplicationToast from '../../components/ApplicationToast'
import './PostOffer.css'

function PostOffer() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)
    const [aiError, setAiError] = useState(null)

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

    // Generate job description using AI
    const generateDescription = async () => {
        if (!offer.title.trim()) {
            setAiError('Please enter a job title first')
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
                throw new Error(data?.error || 'Failed to generate description')
            }
        } catch (error) {
            console.warn('AI generation unavailable, using local template:', error)
            setOffer(prev => ({ ...prev, description: generateDescriptionLocally() }))
            setAiError('AI service is unavailable. A smart template was inserted; edit it as needed.')
        } finally {
            setAiLoading(false)
        }
    }

    const [offer, setOffer] = useState({
        title: '',
        department: '',
        type: 'Internship',
        location: '',
        locationType: 'onsite',
        salary: '',
        duration: '',
        description: '',
        requirements: '',
        skills: [],
    })
    const [newSkill, setNewSkill] = useState('')

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

            // Generate embedding for semantic matching
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
                navigate('/company/candidates')
            }, 2000)
        } catch (error) {
            console.error('Error posting offer:', error)
            alert('Failed to post offer: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="post-offer-page">
            <div className="container">
                <div className="page-header">
                    <h1>Post a New Opportunity</h1>
                    <p>Create an engaging job listing to attract top talent</p>
                </div>

                <form onSubmit={handleSubmit} className="offer-form">
                    <div className="form-grid">
                        {/* Left Column - Main Info */}
                        <div className="form-column">
                            <div className="form-card glass-card">
                                <h3 className="card-title">
                                    <Briefcase size={20} />
                                    Basic Information
                                </h3>

                                <div className="input-group">
                                    <label className="input-label">Titre du poste / Job Title *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Stage de fin d'études - Développeur Full Stack"
                                        value={offer.title}
                                        onChange={(e) => setOffer({ ...offer, title: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="input-row">
                                    <div className="input-group">
                                        <label className="input-label">Département / Department</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Technologies de l'Information, Marketing..."
                                            value={offer.department}
                                            onChange={(e) => setOffer({ ...offer, department: e.target.value })}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">Type</label>
                                        <select
                                            className="input"
                                            value={offer.type}
                                            onChange={(e) => setOffer({ ...offer, type: e.target.value })}
                                        >
                                            <option value="Internship">Internship</option>
                                            <option value="Full-time">Full-time</option>
                                            <option value="Part-time">Part-time</option>
                                            <option value="Contract">Contract</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <div className="label-row">
                                        <label className="input-label">
                                            <FileText size={16} />
                                            Description du poste / Job Description *
                                        </label>
                                        <button
                                            type="button"
                                            className="magic-rewrite-btn"
                                            onClick={generateDescription}
                                            disabled={aiLoading || !offer.title.trim()}
                                            title="Generate AI description based on job title"
                                        >
                                            {aiLoading ? (
                                                <>
                                                    <Loader className="animate-spin" size={16} />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={16} />
                                                    ✨ Magic Rewrite
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    {aiError && (
                                        <div className="ai-error-message">{aiError}</div>
                                    )}
                                    <textarea
                                        className="input textarea"
                                        placeholder="Décrivez le rôle, les responsabilités et ce que le candidat apprendra... Or click 'Magic Rewrite' to generate with AI!"
                                        value={offer.description}
                                        onChange={(e) => setOffer({ ...offer, description: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Prérequis / Requirements</label>
                                    <textarea
                                        className="input textarea"
                                        placeholder="Listez les qualifications et l'expérience requises..."
                                        value={offer.requirements}
                                        onChange={(e) => setOffer({ ...offer, requirements: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Details */}
                        <div className="form-column">
                            <div className="form-card glass-card">
                                <h3 className="card-title">
                                    <MapPin size={20} />
                                    Location & Compensation
                                </h3>

                                <div className="location-options">
                                    {['onsite', 'remote', 'hybrid'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            className={`location-option ${offer.locationType === type ? 'active' : ''}`}
                                            onClick={() => setOffer({ ...offer, locationType: type })}
                                        >
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </button>
                                    ))}
                                </div>

                                {offer.locationType !== 'remote' && (
                                    <div className="input-group">
                                        <FormLocationSelector
                                            label="Ville / Location"
                                            governorateValue={offer.governorate}
                                            cityValue={offer.location}
                                            onGovernorateChange={(val) => setOffer(prev => ({ ...prev, governorate: val }))}
                                            onCityChange={(val) => setOffer(prev => ({ ...prev, location: val }))}
                                            required
                                        />
                                    </div>
                                )}

                                <div className="input-row">
                                    <div className="input-group">
                                        <label className="input-label">
                                            <DollarSign size={16} />
                                            Salaire / Compensation
                                        </label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="1500 TND / mois"
                                            value={offer.salary}
                                            onChange={(e) => setOffer({ ...offer, salary: e.target.value })}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">
                                            <Clock size={16} />
                                            Durée / Duration
                                        </label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="3 mois, 6 mois, Indéterminé"
                                            value={offer.duration}
                                            onChange={(e) => setOffer({ ...offer, duration: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-card glass-card">
                                <h3 className="card-title">Required Skills</h3>

                                <div className="skills-input-container">
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Add a skill..."
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
                                        <span className="no-skills-text">No skills added yet</span>
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
                                        Publishing...
                                    </>
                                ) : (
                                    <>
                                        <Send size={20} />
                                        Publish Opportunity
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
                            <h4 className="font-bold">Success!</h4>
                            <p className="text-sm opacity-90">Your opportunity has been published.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default PostOffer
