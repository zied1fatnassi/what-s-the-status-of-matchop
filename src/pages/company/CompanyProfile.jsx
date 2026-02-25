import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Edit3, Loader2, Plus, Save, Globe, Link as LinkIcon } from 'lucide-react'
import { FormLocationSelector } from '../../components/forms/FormComponents'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useCompanyLogoUpload } from '../../hooks/useCompanyLogoUpload'
import './CompanyProfile.css'

const SOCIAL_PLATFORM_OPTIONS = [
    {
        value: 'instagram',
        label: 'Instagram',
        placeholder: 'https://instagram.com/your-company',
    },
    {
        value: 'linkedin',
        label: 'LinkedIn',
        placeholder: 'https://linkedin.com/company/your-company',
    },
    {
        value: 'facebook',
        label: 'Facebook',
        placeholder: 'https://facebook.com/your-company',
    },
    {
        value: 'x',
        label: 'X',
        placeholder: 'https://x.com/your-company',
    },
]

function CompanyProfile() {
    const { user, profile } = useAuth()
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        governorate: '',
        location: '',
        website: '',
        logoUrl: '',
        socialLinks: [],
        culture: '',
        benefits: [],
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isUpdatingWebsite, setIsUpdatingWebsite] = useState(false)
    const [isEditingName, setIsEditingName] = useState(false)
    const [websiteBaseline, setWebsiteBaseline] = useState('')
    const [websiteError, setWebsiteError] = useState('')
    const [message, setMessage] = useState({ type: '', text: '' })
    const [logoPreviewUrl, setLogoPreviewUrl] = useState('')
    const [socialSelection, setSocialSelection] = useState('')
    const logoInputRef = useRef(null)
    const tempLogoObjectUrlRef = useRef(null)
    const logoInputId = 'company-logo-upload-input'

    const companyProfileId = useMemo(() => {
        const companyProfiles = (profile?.user_profiles || []).filter((up) => up.profile_type === 'company')
        if (companyProfiles.length === 0) return user?.id || null
        const defaultCompanyProfile = companyProfiles.find((up) => up.is_default) || companyProfiles[0]
        return defaultCompanyProfile.id
    }, [profile?.user_profiles, user?.id])

    const normalizeUrlValue = (value) => String(value || '').trim()
    const normalizedWebsite = normalizeUrlValue(formData.website)
    const normalizedWebsiteBaseline = normalizeUrlValue(websiteBaseline)
    const websiteHasChanges = normalizedWebsite !== normalizedWebsiteBaseline

    const isValidWebsiteUrl = (value) => {
        const cleanValue = normalizeUrlValue(value)
        if (!cleanValue) return true

        try {
            const parsed = new URL(cleanValue)
            return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        } catch {
            return false
        }
    }

    const getSocialPlatformMeta = (platformValue) =>
        SOCIAL_PLATFORM_OPTIONS.find((platform) => platform.value === platformValue)

    const addSocialPlatform = () => {
        if (!socialSelection) return
        const exists = formData.socialLinks.some((socialLink) => socialLink.platform === socialSelection)
        if (exists) return
        setFormData((prev) => ({
            ...prev,
            socialLinks: [
                ...prev.socialLinks,
                {
                    platform: socialSelection,
                    url: '',
                },
            ],
        }))
        setSocialSelection('')
    }

    const removeSocialPlatform = (platformValue) => {
        setFormData((prev) => ({
            ...prev,
            socialLinks: prev.socialLinks.filter((socialLink) => socialLink.platform !== platformValue),
        }))
    }

    const updateSocialLink = (platformValue, urlValue) => {
        setFormData((prev) => ({
            ...prev,
            socialLinks: prev.socialLinks.map((socialLink) =>
                socialLink.platform === platformValue
                    ? { ...socialLink, url: urlValue }
                    : socialLink
            ),
        }))
    }

    const { uploadLogo, uploading: isUploadingLogo } = useCompanyLogoUpload({
        authUserId: user?.id,
        companyProfileId,
        bucket: 'company-logos',
        companyNameFallback: formData.name || user?.user_metadata?.name || 'Company',
    })

    useEffect(() => {
        return () => {
            if (tempLogoObjectUrlRef.current) {
                URL.revokeObjectURL(tempLogoObjectUrlRef.current)
                tempLogoObjectUrlRef.current = null
            }
        }
    }, [])

    useEffect(() => {
        let ignore = false

        async function fetchCompanyProfile() {
            if (!companyProfileId) {
                if (!ignore) {
                    setIsLoading(false)
                    setMessage({ type: 'error', text: 'No company profile found for this account.' })
                }
                return
            }

            try {
                setIsLoading(true)
                setMessage({ type: '', text: '' })

                const { data, error } = await supabase
                    .from('companies')
                    .select('id, company_name, description, location, website, logo_url')
                    .eq('id', companyProfileId)
                    .maybeSingle()

                if (error) throw error

                const dbLocation = data?.location || ''
                let governorate = ''
                let city = dbLocation

                if (dbLocation.includes(',')) {
                    const parts = dbLocation.split(',')
                    governorate = (parts[0] || '').trim()
                    city = parts.slice(1).join(',').trim()
                }

                const fallbackName =
                    data?.company_name ||
                    profile?.companies?.company_name ||
                    user?.user_metadata?.name ||
                    ''
                const fallbackLogo = data?.logo_url || profile?.companies?.logo_url || ''

                if (!ignore) {
                    const initialWebsite = data?.website || ''
                    setFormData((prev) => ({
                        ...prev,
                        name: fallbackName,
                        description: data?.description || '',
                        governorate,
                        location: city,
                        website: initialWebsite,
                        logoUrl: fallbackLogo,
                    }))
                    setWebsiteBaseline(initialWebsite)
                    setWebsiteError('')
                    setLogoPreviewUrl(fallbackLogo)
                    setIsEditingName(!fallbackName)
                }
            } catch (error) {
                if (!ignore) {
                    setMessage({ type: 'error', text: error.message || 'Failed to load company profile.' })
                }
            } finally {
                if (!ignore) {
                    setIsLoading(false)
                }
            }
        }

        fetchCompanyProfile()

        return () => {
            ignore = true
        }
    }, [companyProfileId, profile?.companies?.company_name, profile?.companies?.logo_url, user?.user_metadata?.name])

    const availableBenefits = [
        'Remote Work', 'Health Insurance', 'Flexible Hours', '401k', 'Stock Options',
        'Gym Membership', 'Paid Time Off', 'Learning Budget', 'Free Lunch', 'Parental Leave'
    ]

    const handleToggleBenefit = (benefit) => {
        if (formData.benefits.includes(benefit)) {
            setFormData((prev) => ({ ...prev, benefits: prev.benefits.filter((b) => b !== benefit) }))
        } else {
            setFormData((prev) => ({ ...prev, benefits: [...prev.benefits, benefit] }))
        }
    }

    const getUploadErrorMessage = (err) => {
        const raw = String(err?.message || '')
        const lower = raw.toLowerCase()
        if (lower.includes('5mb') || lower.includes('too large')) {
            return 'Logo file is too large. Maximum size is 5MB.'
        }
        if (lower.includes('row-level security') || lower.includes('permission') || lower.includes('not allowed') || err?.code === 'RLS_DENIED') {
            return 'Upload denied by RLS policy. Ensure this user can write to their own folder in the logo bucket and update their company row.'
        }
        if (lower.includes('invalid file type')) {
            return raw
        }
        return raw || 'Failed to upload company logo.'
    }

    const handleLogoChange = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        const previousPersistedLogo = formData.logoUrl || ''

        try {
            const optimisticPreviewUrl = URL.createObjectURL(file)
            if (tempLogoObjectUrlRef.current) {
                URL.revokeObjectURL(tempLogoObjectUrlRef.current)
            }
            tempLogoObjectUrlRef.current = optimisticPreviewUrl
            setLogoPreviewUrl(optimisticPreviewUrl)

            const { url, error } = await uploadLogo(file)
            if (error || !url) {
                const readableMessage = getUploadErrorMessage(error)
                setMessage({ type: 'error', text: readableMessage })
                if (typeof window !== 'undefined') {
                    window.alert(readableMessage)
                }

                if (tempLogoObjectUrlRef.current) {
                    URL.revokeObjectURL(tempLogoObjectUrlRef.current)
                    tempLogoObjectUrlRef.current = null
                }
                setLogoPreviewUrl(previousPersistedLogo)
                return
            }

            if (tempLogoObjectUrlRef.current) {
                URL.revokeObjectURL(tempLogoObjectUrlRef.current)
                tempLogoObjectUrlRef.current = null
            }

            const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
            setFormData((prev) => ({ ...prev, logoUrl: url }))
            setLogoPreviewUrl(cacheBustedUrl)
            setMessage({ type: 'success', text: 'Company logo uploaded.' })
        } catch (error) {
            const readableMessage = getUploadErrorMessage(error)
            setMessage({ type: 'error', text: readableMessage })
            if (typeof window !== 'undefined') {
                window.alert(readableMessage)
            }

            if (tempLogoObjectUrlRef.current) {
                URL.revokeObjectURL(tempLogoObjectUrlRef.current)
                tempLogoObjectUrlRef.current = null
            }
            setLogoPreviewUrl(previousPersistedLogo)
        } finally {
            // Allow re-selecting the same file
            event.target.value = ''
        }
    }

    const updateWebsite = async () => {
        if (!companyProfileId) {
            setWebsiteError('No company profile found for this account.')
            setMessage({ type: 'error', text: 'No company profile found for this account.' })
            return
        }

        const cleanWebsite = normalizeUrlValue(formData.website)
        if (!isValidWebsiteUrl(cleanWebsite)) {
            const validationMessage = 'Enter a valid URL starting with http:// or https://'
            setWebsiteError(validationMessage)
            setMessage({ type: 'error', text: validationMessage })
            return
        }

        try {
            setIsUpdatingWebsite(true)
            setWebsiteError('')
            setMessage({ type: '', text: '' })

            const { data, error } = await supabase
                .from('companies')
                .update({ website: cleanWebsite || null })
                .eq('id', companyProfileId)
                .select('id, website')
                .maybeSingle()

            if (error) throw error

            const persistedWebsite = data?.website || ''
            setFormData((prev) => ({ ...prev, website: persistedWebsite }))
            setWebsiteBaseline(persistedWebsite)
            setMessage({ type: 'success', text: 'Website URL updated.' })
        } catch (error) {
            const errorMessage = error.message || 'Failed to update website URL.'
            setWebsiteError(errorMessage)
            setMessage({ type: 'error', text: errorMessage })
        } finally {
            setIsUpdatingWebsite(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!companyProfileId) {
            setMessage({ type: 'error', text: 'No company profile found for this account.' })
            return
        }

        if (!formData.name.trim()) {
            setMessage({ type: 'error', text: 'Company name is required.' })
            return
        }

        if (!isValidWebsiteUrl(formData.website)) {
            const validationMessage = 'Enter a valid URL starting with http:// or https://'
            setWebsiteError(validationMessage)
            setMessage({ type: 'error', text: validationMessage })
            return
        }

        const invalidSocialLink = formData.socialLinks.find(
            (socialLink) => socialLink.url && !isValidWebsiteUrl(socialLink.url)
        )
        if (invalidSocialLink) {
            const invalidPlatform = getSocialPlatformMeta(invalidSocialLink.platform)?.label || 'social link'
            setMessage({ type: 'error', text: `Enter a valid ${invalidPlatform} URL starting with http:// or https://` })
            return
        }

        try {
            setIsSaving(true)
            setMessage({ type: '', text: '' })

            const location = formData.governorate
                ? `${formData.governorate}, ${formData.location || ''}`.trim().replace(/,\s*$/, '')
                : formData.location.trim()

            const payload = {
                id: companyProfileId,
                company_name: formData.name.trim(),
                description: formData.description.trim() || null,
                location: location || null,
                website: formData.website.trim() || null,
                logo_url: formData.logoUrl || null,
            }

            const { data, error } = await supabase
                .from('companies')
                .upsert(payload, { onConflict: 'id' })
                .select('id, company_name, description, location, website, logo_url')
                .maybeSingle()

            if (error) throw error

            const dbLocation = data?.location || ''
            let governorate = ''
            let city = dbLocation
            if (dbLocation.includes(',')) {
                const parts = dbLocation.split(',')
                governorate = (parts[0] || '').trim()
                city = parts.slice(1).join(',').trim()
            }

            setFormData((prev) => ({
                ...prev,
                name: data?.company_name || payload.company_name,
                description: data?.description || '',
                governorate,
                location: city,
                website: data?.website || '',
                logoUrl: data?.logo_url || '',
            }))
            setWebsiteBaseline(data?.website || '')
            setWebsiteError('')
            const persistedLogo = (data?.logo_url || '').trim()
            setLogoPreviewUrl(
                persistedLogo
                    ? `${persistedLogo}${persistedLogo.includes('?') ? '&' : '?'}t=${Date.now()}`
                    : ''
            )
            setIsEditingName(false)
            setMessage({ type: 'success', text: 'Company profile saved.' })
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to save company profile.' })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="company-profile-page">
                <div className="company-profile-container company-profile-loading">
                    <Loader2 size={24} className="animate-spin" />
                    <p>Loading company profile...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="company-profile-page">
            <div className="company-profile-container">
                <div className="company-profile-header">
                    <h1>Company Profile</h1>
                    <p>Tell candidates about your company and culture</p>
                </div>

                <form onSubmit={handleSubmit} className="company-profile-form glass-card">
                    {message.text && (
                        <div className={`company-profile-message ${message.type === 'error' ? 'error' : 'success'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="company-profile-photo-section">
                        <div className="company-profile-photo-upload">
                            <div
                                className="company-profile-photo-placeholder"
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                    if (!isUploadingLogo) logoInputRef.current?.click()
                                }}
                                onKeyDown={(event) => {
                                    if (isUploadingLogo) return
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        logoInputRef.current?.click()
                                    }
                                }}
                                aria-label="Choose company logo"
                            >
                                {logoPreviewUrl ? (
                                    <img
                                        src={logoPreviewUrl}
                                        alt={`${formData.name || 'Company'} logo`}
                                        className="company-profile-photo-image"
                                    />
                                ) : (
                                    <Camera size={32} />
                                )}
                            </div>
                            <input
                                id={logoInputId}
                                ref={logoInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                                onChange={handleLogoChange}
                                className="company-profile-file-input"
                            />
                            <label
                                htmlFor={logoInputId}
                                className="company-profile-photo-edit-btn"
                                aria-label="Upload company logo"
                                aria-disabled={isUploadingLogo ? 'true' : 'false'}
                                onClick={(event) => {
                                    if (isUploadingLogo) {
                                        event.preventDefault()
                                    }
                                }}
                            >
                                {isUploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            </label>
                        </div>
                        <div className="company-profile-photo-info">
                            <h3>{formData.name || 'Company'}</h3>
                            {isUploadingLogo && <p>Uploading logo...</p>}
                        </div>
                    </div>

                    <div className="company-profile-section">
                        <h3 className="company-profile-section-title">About Your Company</h3>
                        <div className="company-profile-input-group">
                            <label className="company-profile-input-label">Company Name</label>
                            <div className="company-profile-name-row">
                                <input
                                    type="text"
                                    className={`company-profile-input ${!isEditingName ? 'company-profile-input--readonly' : ''}`}
                                    value={formData.name}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                    readOnly={!isEditingName}
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setIsEditingName((prev) => !prev)}
                                >
                                    <Edit3 size={16} />
                                    {isEditingName ? 'Lock' : 'Edit'}
                                </button>
                            </div>
                        </div>

                        <div className="company-profile-input-group">
                            <label className="company-profile-input-label">Description</label>
                            <textarea
                                className="company-profile-input company-profile-textarea"
                                placeholder="Tell candidates what makes your company special..."
                                value={formData.description}
                                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                maxLength={1000}
                            />
                            <span className="company-profile-char-count">{formData.description.length}/1000</span>
                        </div>

                        <div className="company-profile-input-row">
                            <div className="company-profile-input-group">
                                <FormLocationSelector
                                    label="Headquarters"
                                    governorateValue={formData.governorate}
                                    cityValue={formData.location}
                                    onGovernorateChange={(val) => setFormData((prev) => ({ ...prev, governorate: val }))}
                                    onCityChange={(val) => setFormData((prev) => ({ ...prev, location: val }))}
                                />
                            </div>

                            <div className="company-profile-input-group">
                                <label className="company-profile-input-label">
                                    <Globe size={16} />
                                    Website
                                </label>
                                <input
                                    type="text"
                                    className="company-profile-input"
                                    placeholder="No website on file. Add https://your-company.com"
                                    value={formData.website}
                                    onChange={(e) => {
                                        setFormData((prev) => ({ ...prev, website: e.target.value }))
                                        if (websiteError) setWebsiteError('')
                                    }}
                                    disabled={isUpdatingWebsite}
                                    aria-invalid={websiteError ? 'true' : 'false'}
                                />
                                {websiteError && <span className="company-profile-input-error">{websiteError}</span>}
                                {websiteHasChanges && (
                                    <div className="company-profile-inline-actions">
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={updateWebsite}
                                            disabled={isUpdatingWebsite || isSaving || isUploadingLogo}
                                        >
                                            {isUpdatingWebsite ? <Loader2 size={16} className="animate-spin" /> : null}
                                            {isUpdatingWebsite ? 'Updating...' : 'Update Website'}
                                        </button>
                                    </div>
                                )}
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
                                value={formData.culture}
                                onChange={(e) => setFormData((prev) => ({ ...prev, culture: e.target.value }))}
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
                                    className={`company-profile-chip ${formData.benefits.includes(benefit) ? 'selected' : ''}`}
                                    onClick={() => handleToggleBenefit(benefit)}
                                >
                                    {formData.benefits.includes(benefit) ? '?' : '+'} {benefit}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="company-profile-section">
                        <h3 className="company-profile-section-title">Social Links</h3>
                        <p className="company-profile-section-description">Select and add your company social platforms.</p>
                        <div className="company-profile-social-add-row">
                            <div className="company-profile-input-group">
                                <label htmlFor="company-social-platform-select" className="company-profile-input-label">
                                    <LinkIcon size={16} />
                                    Platform
                                </label>
                                <select
                                    id="company-social-platform-select"
                                    className="company-profile-input"
                                    value={socialSelection}
                                    onChange={(e) => setSocialSelection(e.target.value)}
                                >
                                    <option value="">Select platform</option>
                                    {SOCIAL_PLATFORM_OPTIONS
                                        .filter((platform) => !formData.socialLinks.some((socialLink) => socialLink.platform === platform.value))
                                        .map((platform) => (
                                            <option key={platform.value} value={platform.value}>
                                                {platform.label}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={addSocialPlatform}
                                disabled={!socialSelection}
                            >
                                <Plus size={16} />
                                Add
                            </button>
                        </div>

                        {formData.socialLinks.length > 0 ? (
                            <div className="company-profile-social-links-list">
                                {formData.socialLinks.map((socialLink) => {
                                    const meta = getSocialPlatformMeta(socialLink.platform)
                                    return (
                                        <div key={socialLink.platform} className="company-profile-social-link-item">
                                            <div className="company-profile-input-group">
                                                <label className="company-profile-input-label">
                                                    <LinkIcon size={16} />
                                                    {meta?.label || socialLink.platform}
                                                </label>
                                                <input
                                                    type="url"
                                                    className="company-profile-input"
                                                    placeholder={meta?.placeholder || 'https://'}
                                                    value={socialLink.url}
                                                    onChange={(e) => updateSocialLink(socialLink.platform, e.target.value)}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => removeSocialPlatform(socialLink.platform)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="company-profile-social-empty">No social links added yet.</p>
                        )}
                    </div>

                    <div className="company-profile-actions">
                        <button type="submit" className="btn btn-primary btn-lg" disabled={isSaving || isUploadingLogo || isUpdatingWebsite}>
                            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            {isSaving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default CompanyProfile
