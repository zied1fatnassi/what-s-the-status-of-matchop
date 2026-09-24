import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { TUNISIAN_GOVERNORATES } from '../lib/validation'

/**
 * Simplified Student Profile Hook
 * 
 * SUPABASE-CONNECTED:
 * - profile (students table)
 * - experiences (experiences table)
 * - education (student_education table)
 * 
 * LOCAL STATE:
 * - certifications, projects, languages, volunteer
 */
export function useStudentProfile() {
    const { user, isLoading: authLoading } = useAuth()

    // Supabase state
    const [profile, setProfile] = useState(null)
    const [experiences, setExperiences] = useState([])
    const [education, setEducation] = useState([])

    // Local state
    const [certifications, setCertifications] = useState([])
    const [projects, setProjects] = useState([])
    const [languages, setLanguages] = useState([])
    const [volunteer, setVolunteer] = useState([])

    // Loading/error states
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [experiencesError, setExperiencesError] = useState(null)
    const [educationError, setEducationError] = useState(null)
    const [completion, setCompletion] = useState(0)

    // ========================================================================
    // COMPLETION CALCULATION
    // ========================================================================
    const calculateCompletion = (prof, exps = experiences, edu = education, certs = certifications, langs = languages) => {
        if (!prof) return setCompletion(0)

        let filled = 0
        const total = 11

        if (prof.avatar_url) filled++
        if (prof.display_name) filled++
        if (prof.headline) filled++
        if (prof.bio && prof.bio.length > 20) filled++
        if (prof.location) filled++
        if (prof.skills && prof.skills.length >= 3) filled++
        if (exps && exps.length > 0) filled++
        if (edu && edu.length > 0) filled++
        if (certs && certs.length > 0) filled++
        if (langs && langs.length > 0) filled++
        if (prof.cv_url) filled++

        setCompletion(Math.round((filled / total) * 100))
    }

    // ========================================================================
    // FETCH PROFILE - Simple, no timeouts
    // ========================================================================
    const fetchProfile = useCallback(async () => {
        // Wait for auth to finish
        if (authLoading) {
            return
        }

        // No user = clear state
        if (!user?.id) {
            setProfile(null)
            setExperiences([])
            setEducation([])
            setLoading(false)
            return
        }

        const userId = user.id

        try {
            setLoading(true)
            setError(null)
            setExperiencesError(null)
            setEducationError(null)

            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
                .from('students')
                .select('*')
                .eq('id', userId)
                .maybeSingle()

            if (profileError) {
                console.error('[Profile] Error:', profileError.message)
            }

            // Fetch experiences
            const { data: expData, error: expError } = await supabase
                .from('experiences')
                .select('*')
                .eq('student_id', userId)
                .order('start_date', { ascending: false })

            if (expError) {
                console.error('[Experiences] Error:', expError.code, expError.message)
                setExperiencesError(expError.code === '42501' ? 'Permission denied. Please re-login.' : 'Failed to load experiences')
            }

            // Fetch education
            const { data: eduData, error: eduError } = await supabase
                .from('student_education')
                .select('*')
                .eq('student_id', userId)
                .order('start_date', { ascending: false })

            if (eduError) {
                console.error('[Education] Error:', eduError.code, eduError.message)
                setEducationError(eduError.code === '42501' ? 'Permission denied. Please re-login.' : 'Failed to load education')
            }

            const finalProfile = profileData ? {
                ...profileData,
                original_docx_url: profileData?.original_docx_url || ''
            } : {
                id: userId,
                display_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Student',
                headline: '',
                bio: '',
                location: '',
                skills: [],
                avatar_url: '',
                open_to_work: false,
                cv_url: '',
                original_docx_url: ''
            }

            // Parse location to extract governorate if present
            // Format: "Governorate, City" or just "City"
            let governorate = ''
            let city = finalProfile.location || ''

            if (city && city.includes(',')) {
                const parts = city.split(',')
                const potentialGov = parts[0].trim()
                if (TUNISIAN_GOVERNORATES.includes(potentialGov)) {
                    governorate = potentialGov
                    city = parts.slice(1).join(',').trim()
                }
            }

            // Fetch profile verification data (verified certifications & proofs)
            let certsFromProfile = []
            let expProofs = {}
            try {
                const { data: profileRow } = await supabase
                    .from('profiles')
                    .select('verification_data')
                    .eq('id', userId)
                    .maybeSingle()

                certsFromProfile = profileRow?.verification_data?.certifications || []
                expProofs = profileRow?.verification_data?.experience_proofs || {}
            } catch (vErr) {
                console.warn('[Profile] Could not fetch verification_data:', vErr)
            }

            const enrichedExperiences = (expData || []).map(exp => {
                const proof = expProofs[exp.id]
                return proof ? { ...exp, ...proof } : exp
            })

            setProfile({
                ...finalProfile,
                governorate, // Add extracted governorate to state
                location: city // Keep only city in location field for UI
            })
            setExperiences(enrichedExperiences)
            setEducation(eduData || [])
            setCertifications(certsFromProfile)
            calculateCompletion(finalProfile, enrichedExperiences, eduData || [], certsFromProfile)

        } catch (err) {
            console.error('[Profile] Fatal error:', err)
            setError('Failed to load profile')
        } finally {
            setLoading(false)
        }
    }, [user?.id, authLoading])

    // ========================================================================
    // EFFECTS
    // ========================================================================
    useEffect(() => {
        if (!authLoading) {
            fetchProfile()
        }
    }, [fetchProfile, authLoading])

    // ========================================================================
    // PROFILE UPDATE
    // ========================================================================
    const updateProfile = async (updates) => {
        if (!user?.id) return { error: 'Not authenticated' }

        try {
            // Remove fields that don't exist in DB
            const { governorate, location } = updates

            // WHITELIST: Only send columns that exist in the DB
            const validCols = ['display_name', 'bio', 'skills', 'avatar_url', 'headline', 'open_to_work', 'cv_url', 'original_docx_url']
            const dbUpdates = {}

            // Only include location when it was explicitly provided in the updates
            if (location !== undefined || governorate !== undefined) {
                let dbLocation = location
                if (governorate) {
                    dbLocation = `${governorate}, ${location}`
                }
                dbUpdates.location = dbLocation
            }

            validCols.forEach(col => {
                if (updates[col] !== undefined) dbUpdates[col] = updates[col]
            })

            const { error: updateError } = await supabase
                .from('students')
                .upsert({
                    id: user.id,
                    ...dbUpdates,
                })

            if (updateError) {
                console.error('[updateProfile]', updateError)
                return { error: updateError.code === '42501' ? 'Permission denied. Please re-login.' : 'Failed to update profile' }
            }

            setProfile(prev => ({ ...prev, ...updates }))
            calculateCompletion({ ...profile, ...updates }, experiences, education)

            // Generate embedding for semantic matching (async, don't wait)
            if (updates.bio || updates.skills || updates.headline) {
                const textForEmbedding = [
                    updates.headline || profile?.headline || '',
                    updates.bio || profile?.bio || '',
                    (updates.skills || profile?.skills || []).join(', ')
                ].filter(Boolean).join('. ')

                if (textForEmbedding.length > 20) {
                    supabase.functions.invoke('generate-embedding', {
                        body: { text: textForEmbedding, type: 'student', id: user.id }
                    }).catch(() => {})
                }
            }

            return { error: null }
        } catch (err) {
            console.error('[updateProfile]', err)
            return { error: 'Failed to update profile' }
        }
    }

    // ========================================================================
    // EXPERIENCES - Simplified CRUD
    // ========================================================================
    const addExperience = async (experience) => {
        if (!user?.id) {
            setExperiencesError('Not authenticated')
            return { error: 'Not authenticated' }
        }

        setExperiencesError(null)

        try {
            const { data, error } = await supabase
                .from('experiences')
                .insert({
                    ...experience,
                    student_id: user.id
                })
                .select()
                .single()

            if (error) {
                console.error('[addExperience]', error.code, error.message)
                const errMsg = error.code === '42501' ? 'Permission denied. Please re-login.' : 'Failed to add experience'
                setExperiencesError(errMsg)
                return { error: errMsg }
            }

            const newExps = [data, ...experiences]
            setExperiences(newExps)
            calculateCompletion(profile, newExps, education)
            return { error: null, data }
        } catch (err) {
            console.error('[addExperience]', err)
            setExperiencesError('Failed to add experience')
            return { error: 'Failed to add experience' }
        }
    }

    const updateExperience = async (id, updates) => {
        if (!user?.id) {
            setExperiencesError('Not authenticated')
            return { error: 'Not authenticated' }
        }

        setExperiencesError(null)

        try {
            const safeUpdates = { ...updates }
            delete safeUpdates.student_id

            const { data, error } = await supabase
                .from('experiences')
                .update(safeUpdates)
                .eq('id', id)
                .eq('student_id', user.id)
                .select()
                .single()

            if (error) {
                console.error('[updateExperience]', error.code, error.message)
                const errMsg = error.code === '42501' ? 'Permission denied. Please re-login.' : 'Failed to update experience'
                setExperiencesError(errMsg)
                return { error: errMsg }
            }

            const updated = experiences.map(e => e.id === id ? data : e)
            setExperiences(updated)
            return { error: null, data }
        } catch (err) {
            console.error('[updateExperience]', err)
            setExperiencesError('Failed to update experience')
            return { error: 'Failed to update experience' }
        }
    }

    const deleteExperience = async (id) => {
        if (!user?.id) {
            setExperiencesError('Not authenticated')
            return { error: 'Not authenticated' }
        }

        setExperiencesError(null)

        try {
            const { error } = await supabase
                .from('experiences')
                .delete()
                .eq('id', id)
                .eq('student_id', user.id)

            if (error) {
                console.error('[deleteExperience]', error.code, error.message)
                const errMsg = error.code === '42501' ? 'Permission denied. Please re-login.' : 'Failed to delete experience'
                setExperiencesError(errMsg)
                return { error: errMsg }
            }

            const newExps = experiences.filter(exp => exp.id !== id)
            setExperiences(newExps)
            calculateCompletion(profile, newExps, education)
            return { error: null }
        } catch (err) {
            console.error('[deleteExperience]', err)
            setExperiencesError('Failed to delete experience')
            return { error: 'Failed to delete experience' }
        }
    }

    // ========================================================================
    // EDUCATION - Simplified CRUD
    // ========================================================================
    const addEducation = async (edu) => {
        if (!user?.id) {
            setEducationError('Not authenticated')
            return { error: 'Not authenticated' }
        }

        setEducationError(null)

        try {
            const { data, error } = await supabase
                .from('student_education')
                .insert({
                    ...edu,
                    student_id: user.id
                })
                .select()
                .single()

            if (error) {
                console.error('[addEducation]', error.code, error.message)
                const errMsg = error.code === '42501' ? 'Permission denied. Please re-login.' : 'Failed to add education'
                setEducationError(errMsg)
                return { error: errMsg }
            }

            const updated = [data, ...education]
            setEducation(updated)
            calculateCompletion(profile, experiences, updated)
            return { error: null, data }
        } catch (err) {
            console.error('[addEducation]', err)
            setEducationError('Failed to add education')
            return { error: 'Failed to add education' }
        }
    }

    const updateEducation = async (id, updates) => {
        if (!user?.id) {
            setEducationError('Not authenticated')
            return { error: 'Not authenticated' }
        }

        setEducationError(null)

        try {
            const safeUpdates = { ...updates }
            delete safeUpdates.student_id

            const { data, error } = await supabase
                .from('student_education')
                .update(safeUpdates)
                .eq('id', id)
                .eq('student_id', user.id)
                .select()
                .single()

            if (error) {
                console.error('[updateEducation]', error.code, error.message)
                const errMsg = error.code === '42501' ? 'Permission denied. Please re-login.' : 'Failed to update education'
                setEducationError(errMsg)
                return { error: errMsg }
            }

            const updated = education.map(e => e.id === id ? data : e)
            setEducation(updated)
            return { error: null, data }
        } catch (err) {
            console.error('[updateEducation]', err)
            setEducationError('Failed to update education')
            return { error: 'Failed to update education' }
        }
    }

    const removeEducation = async (id) => {
        if (!user?.id) {
            setEducationError('Not authenticated')
            return { error: 'Not authenticated' }
        }

        setEducationError(null)

        try {
            const { error } = await supabase
                .from('student_education')
                .delete()
                .eq('id', id)
                .eq('student_id', user.id)

            if (error) {
                console.error('[removeEducation]', error.code, error.message)
                const errMsg = error.code === '42501' ? 'Permission denied. Please re-login.' : 'Failed to delete education'
                setEducationError(errMsg)
                return { error: errMsg }
            }

            const updated = education.filter(e => e.id !== id)
            setEducation(updated)
            calculateCompletion(profile, experiences, updated)
            return { error: null }
        } catch (err) {
            console.error('[removeEducation]', err)
            setEducationError('Failed to delete education')
            return { error: 'Failed to delete education' }
        }
    }

    // ========================================================================
    // CERTIFICATIONS (SUPABASE & VERIFICATION INTEGRATION)
    // ========================================================================
    const addCertification = async (cert) => {
        const newCert = {
            id: cert.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            ...cert
        }
        const updated = [newCert, ...certifications]
        setCertifications(updated)

        if (user?.id) {
            try {
                const { data: current } = await supabase
                    .from('profiles')
                    .select('verification_data')
                    .eq('id', user.id)
                    .maybeSingle()

                const currentData = current?.verification_data || {}
                await supabase
                    .from('profiles')
                    .update({
                        verification_data: {
                            ...currentData,
                            certifications: updated
                        }
                    })
                    .eq('id', user.id)
            } catch (err) {
                console.error('[addCertification] Failed to sync to profile:', err)
            }
        }

        calculateCompletion(profile, experiences, education, updated)
        return { error: null, data: newCert }
    }

    const removeCertification = async (id) => {
        const updated = certifications.filter(c => c.id !== id)
        setCertifications(updated)

        if (user?.id) {
            try {
                const { data: current } = await supabase
                    .from('profiles')
                    .select('verification_data')
                    .eq('id', user.id)
                    .maybeSingle()

                const currentData = current?.verification_data || {}
                await supabase
                    .from('profiles')
                    .update({
                        verification_data: {
                            ...currentData,
                            certifications: updated
                        }
                    })
                    .eq('id', user.id)
            } catch (err) {
                console.error('[removeCertification] Failed to sync to profile:', err)
            }
        }

        calculateCompletion(profile, experiences, education, updated)
        return { error: null }
    }

    const attachExperienceProof = async (experienceId, proofData) => {
        const updatedExperiences = experiences.map(exp => {
            if (exp.id === experienceId) {
                return { ...exp, ...proofData }
            }
            return exp
        })
        setExperiences(updatedExperiences)

        if (user?.id) {
            try {
                const { data: current } = await supabase
                    .from('profiles')
                    .select('verification_data')
                    .eq('id', user.id)
                    .maybeSingle()

                const currentData = current?.verification_data || {}
                const proofs = { ...(currentData.experience_proofs || {}), [experienceId]: proofData }
                await supabase
                    .from('profiles')
                    .update({
                        verification_data: {
                            ...currentData,
                            experience_proofs: proofs
                        }
                    })
                    .eq('id', user.id)
            } catch (err) {
                console.error('[attachExperienceProof] Error:', err)
            }
        }
        return { error: null }
    }

    // ========================================================================
    // PROJECTS (LOCAL)
    // ========================================================================
    const addProject = (proj) => {
        const newProj = { id: crypto.randomUUID(), ...proj }
        const updated = [newProj, ...projects]
        setProjects(updated)
        calculateCompletion(profile, experiences, education, certifications, updated)
        return { error: null, data: newProj }
    }

    const removeProject = (id) => {
        const updated = projects.filter(p => p.id !== id)
        setProjects(updated)
        calculateCompletion(profile, experiences, education, certifications, updated)
        return { error: null }
    }

    // ========================================================================
    // LANGUAGES (LOCAL)
    // ========================================================================
    const addLanguage = (lang) => {
        const newLang = { id: crypto.randomUUID(), ...lang }
        const updated = [...languages, newLang]
        setLanguages(updated)
        calculateCompletion(profile, experiences, education, certifications, projects, updated)
        return { error: null, data: newLang }
    }

    const removeLanguage = (id) => {
        const updated = languages.filter(l => l.id !== id)
        setLanguages(updated)
        calculateCompletion(profile, experiences, education, certifications, projects, updated)
        return { error: null }
    }

    // ========================================================================
    // VOLUNTEER (LOCAL)
    // ========================================================================
    const addVolunteer = (vol) => {
        const newVol = { id: crypto.randomUUID(), ...vol }
        setVolunteer(prev => [newVol, ...prev])
        return { error: null, data: newVol }
    }

    const removeVolunteer = (id) => {
        setVolunteer(prev => prev.filter(v => v.id !== id))
        return { error: null }
    }

    // ========================================================================
    // RETURN
    // ========================================================================
    const isLoading = authLoading || loading

    return {
        // Profile & core data
        profile,
        experiences,
        loading: isLoading,
        error,
        experiencesError,
        completion,

        // Education
        education,
        educationError,

        // Local sections
        certifications,
        projects,
        languages,
        volunteer,

        // Actions
        updateProfile,
        addExperience,
        updateExperience,
        deleteExperience,
        addEducation,
        updateEducation,
        removeEducation,
        addCertification,
        removeCertification,
        attachExperienceProof,
        addProject,
        removeProject,
        addLanguage,
        removeLanguage,
        addVolunteer,
        removeVolunteer,
        refresh: fetchProfile
    }
}

export default useStudentProfile
