import { supabase } from './supabase'

// ============================================
// FILE UPLOAD SECURITY
// ============================================

const ALLOWED_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const ALLOWED_IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])
const ALLOWED_CV_MIMES = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
const ALLOWED_CV_EXTS = new Set(['pdf', 'doc', 'docx'])
const MAX_IMAGE_SIZE = 5 * 1024 * 1024  // 5MB
const MAX_CV_SIZE = 10 * 1024 * 1024    // 10MB

/**
 * Validate file type and size before upload.
 * @param {File} file
 * @param {Set<string>} allowedMimes
 * @param {Set<string>} allowedExts
 * @param {number} maxSize
 * @throws {Error} if validation fails
 */
function validateFile(file, allowedMimes, allowedExts, maxSize) {
    if (!file || !(file instanceof File)) {
        throw new Error('Invalid file object')
    }
    if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`)
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!allowedExts.has(ext)) {
        throw new Error(`File type .${ext} is not allowed. Allowed: ${[...allowedExts].join(', ')}`)
    }
    if (file.type && !allowedMimes.has(file.type)) {
        throw new Error(`MIME type ${file.type} is not allowed. Allowed: ${[...allowedMimes].join(', ')}`)
    }
}

/**
 * Sanitize filename — strip path traversal and special chars
 * @param {string} name
 * @returns {string}
 */
function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.')
}

/**
 * Upload user avatar to Supabase Storage
 * @param {string} userId - User ID
 * @param {File} file - Image file to upload
 * @returns {Promise<string>} Public URL of uploaded avatar
 */
export async function uploadAvatar(userId, file) {
    validateFile(file, ALLOWED_IMAGE_MIMES, ALLOWED_IMAGE_EXTS, MAX_IMAGE_SIZE)
    const fileExt = (file.name.split('.').pop() || 'png').toLowerCase()
    const fileName = `${userId}.${fileExt}`

    const { data: _data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type })

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
    validateFile(file, ALLOWED_CV_MIMES, ALLOWED_CV_EXTS, MAX_CV_SIZE)
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
    validateFile(file, ALLOWED_IMAGE_MIMES, ALLOWED_IMAGE_EXTS, MAX_IMAGE_SIZE)
    const fileExt = (file.name.split('.').pop() || 'png').toLowerCase()
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
