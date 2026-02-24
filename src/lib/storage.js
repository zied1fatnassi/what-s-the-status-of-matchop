import { supabase } from './supabase'

/**
 * Upload user avatar to Supabase Storage
 * @param {string} userId - User ID
 * @param {File} file - Image file to upload
 * @returns {Promise<string>} Public URL of uploaded avatar
 */
export async function uploadAvatar(userId, file) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}.${fileExt}`

    const { data: _data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

    return publicUrl
}

/**
 * Upload CV/Resume to Supabase Storage (private bucket)
 * @param {string} userId - User ID
 * @param {File} file - PDF/DOC file to upload
 * @returns {Promise<string>} File path in the cvs bucket (NOT a URL)
 */
export async function uploadCV(userId, file) {
    const rawExt = (file.name.split('.').pop() || '').toLowerCase()
    const fileExt = ['pdf', 'doc', 'docx'].includes(rawExt) ? rawExt : 'pdf'
    const fileName = `${userId}/cv.${fileExt}`
    const uploadOptions = {
        upsert: true,
        contentType: file.type || undefined
    }

    const { data: _data, error } = await supabase.storage
        .from('cvs')
        .upload(fileName, file, uploadOptions)

    if (!error) {
        // Return the storage path, not a public URL (bucket is private)
        return fileName
    }

    const errorMessage = String(error?.message || '')
    const isRlsError = /row-level security|not allowed|permission/i.test(errorMessage)

    // Fallback path for projects where INSERT is allowed but UPDATE (upsert) is blocked by RLS.
    if (isRlsError) {
        const timestampedPath = `${userId}/cv-${Date.now()}.${fileExt}`
        const { error: retryError } = await supabase.storage
            .from('cvs')
            .upload(timestampedPath, file, {
                upsert: false,
                contentType: file.type || undefined
            })

        if (!retryError) {
            return timestampedPath
        }
    }

    throw error

}

/**
 * Get a signed URL for a CV file (private bucket)
 * @param {string} cvPath - File path in the cvs bucket
 * @param {number} expiresIn - Expiry time in seconds (default 1 hour)
 * @returns {Promise<string|null>} Signed URL or null if failed
 */
export async function getSignedCVUrl(cvPath, expiresIn = 3600) {
    if (!cvPath) return null

    // If cvPath is already a full URL (legacy data), extract the path
    if (cvPath.startsWith('http')) {
        try {
            const url = new URL(cvPath)
            // Match various Supabase storage URL patterns
            const match = url.pathname.match(/\/(?:storage\/v1\/)?object\/(?:public|sign|authenticated)\/cvs\/(.+)/)
            if (match) {
                cvPath = decodeURIComponent(match[1].split('?')[0])
            } else {
                console.warn('[getSignedCVUrl] Could not extract path from legacy URL:', cvPath)
                return null
            }
        } catch {
            return null
        }
    }

    const { data, error } = await supabase.storage
        .from('cvs')
        .createSignedUrl(cvPath, expiresIn)

    if (error) {
        console.error('[getSignedCVUrl] Error:', error)
        return null
    }
    return data.signedUrl
}

/**
 * Upload company logo to Supabase Storage
 * @param {string} companyId - Company ID
 * @param {File} file - Image file to upload
 * @returns {Promise<string>} Public URL of uploaded logo
 */
export async function uploadCompanyLogo(companyId, file) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${companyId}.${fileExt}`

    const { data: _data, error } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName)

    return publicUrl
}

/**
 * Get signed URL for a private file
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 * @param {number} expiresIn - Expiry time in seconds (default 1 hour)
 * @returns {Promise<string>} Signed URL
 */
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

    if (error) throw error
    return data.signedUrl
}
