import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Plus, Save, Globe, Link as LinkIcon } from 'lucide-react'
import { FormLocationSelector } from '../../components/forms/FormComponents'
import './CompanyProfile.css'

function CompanyProfile() {
    const navigate = useNavigate()
    const [profile, setProfile] = useState({
        name: 'Acme Corporation',
        description: '',
        location: '',
        website: '',
        linkedin: '',
        culture: '',
        benefits: [],
    })

    const availableBenefits = [
        'Remote Work', 'Health Insurance', 'Flexible Hours', '401k', 'Stock Options',
        'Gym Membership', 'Paid Time Off', 'Learning Budget', 'Free Lunch', 'Parental Leave'
    ]

    const handleToggleBenefit = (benefit) => {
        if (profile.benefits.includes(benefit)) {
            setProfile({ ...profile, benefits: profile.benefits.filter(b => b !== benefit) })
        } else {
            setProfile({ ...profile, benefits: [...profile.benefits, benefit] })
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        navigate('/company/post-offer')
    }

    return (
        <div className="company-profile-page">
            <div className="company-profile-container">
                <div className="company-profile-header">
                    <h1>Company Profile</h1>
                    <p>Tell candidates about your company and culture</p>
                </div>

                <form onSubmit={handleSubmit} className="company-profile-form glass-card">
                    <div className="company-profile-photo-section">
                        <div className="company-profile-photo-upload">
                            <div className="company-profile-photo-placeholder">
                                <Camera size={32} />
                            </div>
                            <button type="button" className="company-profile-photo-edit-btn" aria-label="Upload company logo">
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="company-profile-photo-info">
                            <h3>{profile.name}</h3>
                            <p>Add your company logo</p>
                        </div>
                    </div>

                    <div className="company-profile-section">
                        <h3 className="company-profile-section-title">About Your Company</h3>
                        <div className="company-profile-input-group">
                            <label className="company-profile-input-label">Description</label>
                            <textarea
                                className="company-profile-input company-profile-textarea"
                                placeholder="Tell candidates what makes your company special..."
                                value={profile.description}
                                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                                maxLength={1000}
                            />
                            <span className="company-profile-char-count">{profile.description.length}/1000</span>
                        </div>

                        <div className="company-profile-input-row">
                            <div className="company-profile-input-group">
                                <FormLocationSelector
                                    label="Headquarters"
                                    governorateValue={profile.governorate}
                                    cityValue={profile.location}
                                    onGovernorateChange={(val) => setProfile(prev => ({ ...prev, governorate: val }))}
                                    onCityChange={(val) => setProfile(prev => ({ ...prev, location: val }))}
                                />
                            </div>

                            <div className="company-profile-input-group">
                                <label className="company-profile-input-label">
                                    <Globe size={16} />
                                    Website
                                </label>
                                <input
                                    type="url"
                                    className="company-profile-input"
                                    placeholder="https://sofrecom.tn"
                                    value={profile.website}
                                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="company-profile-section">
                        <h3 className="company-profile-section-title">Company Culture</h3>
                        <div className="company-profile-input-group">
                            <label className="company-profile-input-label">What is it like to work here?</label>
                            <textarea
                                className="company-profile-input company-profile-textarea"
                                placeholder="Describe your work environment, team dynamics, and what makes your culture unique..."
                                value={profile.culture}
                                onChange={(e) => setProfile({ ...profile, culture: e.target.value })}
                                maxLength={500}
                            />
                        </div>
                    </div>

                    <div className="company-profile-section">
                        <h3 className="company-profile-section-title">Benefits & Perks</h3>
                        <p className="company-profile-section-description">Select the benefits you offer to employees</p>

                        <div className="company-profile-chip-grid">
                            {availableBenefits.map(benefit => (
                                <button
                                    key={benefit}
                                    type="button"
                                    className={`company-profile-chip ${profile.benefits.includes(benefit) ? 'selected' : ''}`}
                                    onClick={() => handleToggleBenefit(benefit)}
                                >
                                    {profile.benefits.includes(benefit) ? '?' : '+'} {benefit}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="company-profile-section">
                        <h3 className="company-profile-section-title">Social Links</h3>
                        <div className="company-profile-input-group">
                            <label className="company-profile-input-label">
                                <LinkIcon size={16} />
                                LinkedIn
                            </label>
                            <input
                                type="url"
                                className="company-profile-input"
                                placeholder="https://linkedin.com/company/sofrecom"
                                value={profile.linkedin}
                                onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="company-profile-actions">
                        <button type="submit" className="btn btn-primary btn-lg">
                            <Save size={20} />
                            Save & Post Your First Job
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default CompanyProfile