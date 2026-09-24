import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Edit3, Loader2, Plus, Save, Globe, Link as LinkIcon, Trash2 } from 'lucide-react'
import { FormLocationSelector } from '../../components/forms/FormComponents'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useCompanyLogoUpload } from '../../hooks/useCompanyLogoUpload'
import './CompanyProfile.css'

const SOCIAL_PLATFORM_DEFS = [
    {
        value: 'instagram',
        labelKey: 'companyProfile.social.platforms.instagram',
        placeholderKey: 'companyProfile.social.placeholders.instagram',
    },
    {
        value: 'linkedin',
        labelKey: 'companyProfile.social.platforms.linkedin',
        placeholderKey: 'companyProfile.social.placeholders.linkedin',
    },
    {
        value: 'facebook',
        labelKey: 'companyProfile.social.platforms.facebook',
        placeholderKey: 'companyProfile.social.placeholders.facebook',
    },
    {
        value: 'x',
        labelKey: 'companyProfile.social.platforms.x',
        placeholderKey: 'companyProfile.social.placeholders.x',
    },
]

const BENEFIT_OPTION_DEFS = [
    { value: 'Remote Work', labelKey: 'companyProfile.benefitsOptions.remoteWork' },
    { value: 'Health Insurance', labelKey: 'companyProfile.benefitsOptions.healthInsurance' },
    { value: 'Flexible Hours', labelKey: 'companyProfile.benefitsOptions.flexibleHours' },
    { value: '401k', labelKey: 'companyProfile.benefitsOptions.k401' },
    { value: 'Stock Options', labelKey: 'companyProfile.benefitsOptions.stockOptions' },
    { value: 'Gym Membership', labelKey: 'companyProfile.benefitsOptions.gymMembership' },
    { value: 'Paid Time Off', labelKey: 'companyProfile.benefitsOptions.paidTimeOff' },
    { value: 'Learning Budget', labelKey: 'companyProfile.benefitsOptions.learningBudget' },
    { value: 'Free Lunch', labelKey: 'companyProfile.benefitsOptions.freeLunch' },
    { value: 'Parental Leave', labelKey: 'companyProfile.benefitsOptions.parentalLeave' },
]

function CompanyProfile() {
    const { t, i18n } = useTranslation()
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

    const socialPlatformOptions = useMemo(
        () =>
            SOCIAL_PLATFORM_DEFS.map((platform) => ({
                ...platform,
                label: t(platform.labelKey),
                placeholder: t(platform.placeholderKey),
            })),
        [t, i18n.language]
    )

    const availableBenefits = useMemo(
        () =>
            BENEFIT_OPTION_DEFS.map((benefit) => ({
                ...benefit,
                label: t(benefit.labelKey),
            })),
        [t, i18n.language]
    )

    const getSocialPlatformMeta = (platformValue) =>
        socialPlatformOptions.find((platform) => platform.value === platformValue)

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
        companyNameFallback: formData.name || user?.user_metadata?.name || t('companyProfile.companyFallbackName'),
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
                    setMessage({ type: 'error', text: t('companyProfile.messages.noProfile') })
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
                    setMessage({ type: 'error', text: error.message || t('companyProfile.messages.loadFailed') })
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
            return t('companyProfile.errors.logoTooLarge')
        }
        if (lower.includes('row-level security') || lower.includes('permission') || lower.includes('not allowed') || err?.code === 'RLS_DENIED') {
            return t('companyProfile.errors.uploadDeniedByRls')
        }
        if (lower.includes('invalid file type')) {
            return raw
        }
        return raw || t('companyProfile.errors.uploadFailedDefault')
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
            setMessage({ type: 'success', text: t('companyProfile.messages.logoUploaded') })
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
            setWebsiteError(t('companyProfile.messages.noProfile'))
            setMessage({ type: 'error', text: t('companyProfile.messages.noProfile') })
            return
        }

        const cleanWebsite = normalizeUrlValue(formData.website)
        if (!isValidWebsiteUrl(cleanWebsite)) {
            const validationMessage = t('companyProfile.validation.validUrlRequired')
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
            setMessage({ type: 'success', text: t('companyProfile.messages.websiteUpdated') })
        } catch (error) {
            const errorMessage = error.message || t('companyProfile.messages.websiteUpdateFailed')
            setWebsiteError(errorMessage)
            setMessage({ type: 'error', text: errorMessage })
        } finally {
            setIsUpdatingWebsite(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!companyProfileId) {
            setMessage({ type: 'error', text: t('companyProfile.messages.noProfile') })
            return
        }

        if (!formData.name.trim()) {
            setMessage({ type: 'error', text: t('companyProfile.validation.companyNameRequired') })
            return
        }

        if (!isValidWebsiteUrl(formData.website)) {
            const validationMessage = t('companyProfile.validation.validUrlRequired')
            setWebsiteError(validationMessage)
            setMessage({ type: 'error', text: validationMessage })
            return
        }

        const invalidSocialLink = formData.socialLinks.find(
            (socialLink) => socialLink.url && !isValidWebsiteUrl(socialLink.url)
        )
        if (invalidSocialLink) {
            const invalidPlatform = getSocialPlatformMeta(invalidSocialLink.platform)?.label || t('companyProfile.social.fallbackPlatform')
            setMessage({
                type: 'error',
                text: t('companyProfile.validation.validPlatformUrl', { platform: invalidPlatform }),
            })
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
            setMessage({ type: 'success', text: t('companyProfile.messages.saved') })
        } catch (error) {
            setMessage({ type: 'error', text: error.message || t('companyProfile.messages.saveFailed') })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="company-profile-page">
                <div className="company-profile-container company-profile-loading">
                    <Loader2 size={24} className="animate-spin" />
                    <p>{t('companyProfile.loading')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="company-profile-page">
            <div className="company-profile-container">
                <div className="company-profile-header">
                    <h1>{t('companyProfile.title')}</h1>
                    <p>{t('companyProfile.subtitle')}</p>
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
                                aria-label={t('companyProfile.photo.chooseLogo')}
                            >
                                {logoPreviewUrl ? (
                                    <img
                                        src={logoPreviewUrl}
                                        alt={`${formData.name || t('companyProfile.companyFallbackName')} logo`}
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
                                aria-label={t('companyProfile.photo.uploadLogo')}
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
                            <h3>{formData.name || t('companyProfile.companyFallbackName')}</h3>
                            {isUploadingLogo && <p>{t('companyProfile.photo.uploadingLogo')}</p>}
                        </div>
                    </div>

                    <div className="company-profile-section">
                        <h3 className="company-profile-section-title">{t('companyProfile.sections.about')}</h3>
                        <div className="company-profile-input-group">
                            <label className="company-profile-input-label">{t('companyProfile.fields.companyName')}</label>
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
                                    {isEditingName ? t('companyProfile.actions.lock') : t('companyProfile.actions.edit')}
                                </button>
                            </div>
                        </div>

                        <div className="company-profile-input-group">
                            <label className="company-profile-input-label">{t('companyProfile.fields.description')}</label>
                            <textarea
                                className="company-profile-input company-profile-textarea"
                                placeholder={t('companyProfile.fields.descriptionPlaceholder')}
                                value={formData.description}
                                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                maxLength={1000}
                            />
                            <span className="company-profile-char-count">{formData.description.length}/1000</span>
                        </div>

                        <div className="company-profile-input-row">
                            <div className="company-profile-input-group">
                                <FormLocationSelector
                                    label={t('companyProfile.fields.headquarters')}
                                    governorateValue={formData.governorate}
                                    cityValue={formData.location}
                                    onGovernorateChange={(val) => setFormData((prev) => ({ ...prev, governorate: val }))}
                                    onCityChange={(val) => setFormData((prev) => ({ ...prev, location: val }))}
                                    governoratePlaceholder={t('companyProfile.location.governoratePlaceholder')}
                                    cityPlaceholder={t('companyProfile.location.cityPlaceholder')}
                                    cityDisabledPlaceholder={t('companyProfile.location.citySelectGovernorateFirst')}
                                />
                            </div>

                            <div className="company-profile-input-group">
                                <label className="company-profile-input-label">
                                    <Globe size={16} />
                                    {t('companyProfile.fields.website')}
                                </label>
                                <input
                                    type="text"
                                    className="company-profile-input"
                                    placeholder={t('companyProfile.fields.websitePlaceholder')}
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
                                            {isUpdatingWebsite ? t('companyProfile.actions.updating') : t('companyProfile.actions.updateWebsite')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="company-profile-section">
                        <h3 className="company-profile-section-title">{t('companyProfile.sections.culture')}</h3>
                        <div className="company-profile-input-group">
                            <label className="company-profile-input-label">{t('companyProfile.fields.culturePrompt')}</label>
                            <textarea
                                className="company-profile-input company-profile-textarea"
                                placeholder={t('companyProfile.fields.culturePlaceholder')}
                                value={formData.culture}
                                onChange={(e) => setFormData((prev) => ({ ...prev, culture: e.target.value }))}
                                maxLength={500}
                            />
                        </div>
                    </div>

                    <div className="company-profile-section">
                        <h3 className="company-profile-section-title">{t('companyProfile.sections.benefits')}</h3>
                        <p className="company-profile-section-description">{t('companyProfile.benefitsDescription')}</p>

                        <div className="company-profile-chip-grid">
                            {availableBenefits.map((benefit) => (
                                <button
                                    key={benefit.value}
                                    type="button"
                                    className={`company-profile-chip ${formData.benefits.includes(benefit.value) ? 'selected' : ''}`}
                                    onClick={() => handleToggleBenefit(benefit.value)}
                                >
                                    {formData.benefits.includes(benefit.value) ? '?' : '+'} {benefit.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="company-profile-section">
                        <h3 className="company-profile-section-title">{t('companyProfile.sections.social')}</h3>
                        <p className="company-profile-section-description">{t('companyProfile.socialDescription')}</p>
                        <div className="company-profile-social-add-row">
                            <div className="company-profile-input-group">
                                <label htmlFor="company-social-platform-select" className="company-profile-input-label">
                                    <LinkIcon size={16} />
                                    {t('companyProfile.fields.platform')}
                                </label>
                                <select
                                    id="company-social-platform-select"
                                    className="company-profile-input"
                                    value={socialSelection}
                                    onChange={(e) => setSocialSelection(e.target.value)}
                                >
                                    <option value="">{t('companyProfile.fields.selectPlatform')}</option>
                                    {socialPlatformOptions
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
                                {t('companyProfile.actions.add')}
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
                                                className="btn btn-secondary company-profile-remove-btn"
                                                onClick={() => removeSocialPlatform(socialLink.platform)}
                                            >
                                                <Trash2 size={16} />
                                                {t('companyProfile.actions.remove')}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="company-profile-social-empty">{t('companyProfile.fields.socialLinksEmpty')}</p>
                        )}
                    </div>

                    <div className="company-profile-actions">
                        <button type="submit" className="btn btn-primary btn-lg" disabled={isSaving || isUploadingLogo || isUpdatingWebsite}>
                            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            {isSaving ? t('companyProfile.actions.saving') : t('companyProfile.actions.saveProfile')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default CompanyProfile
