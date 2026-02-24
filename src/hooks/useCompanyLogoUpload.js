import { useCallback, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

function toAppError(message, code, cause) {
    const error = new Error(message)
    if (code) error.code = code
    if (cause) error.cause = cause
    return error
}

function isRlsLikeError(err) {
    const message = String(err?.message || '').toLowerCase()
    return (
        message.includes('row-level security') ||
        message.includes('permission denied') ||
        message.includes('not allowed') ||
        message.includes('forbidden') ||
        message.includes('42501')
    )
}

/**
 * Upload and persist a company logo.
 *
 * Flow:
 * 1. Upload to Storage bucket path: {authUserId}/logo.{ext}
 * 2. Resolve public URL
 * 3. Update companies.logo_url for the current company profile
 */
function shouldTryFallbackBucket(err) {
    const message = String(err?.message || '').toLowerCase()
    return (
        message.includes('bucket not found') ||
        message.includes('not found') ||
        message.includes('does not exist') ||
        isRlsLikeError(err)
    )
}

export function useCompanyLogoUpload({
    authUserId,
    companyProfileId,
    bucket = 'company-logos',
    companyNameFallback = 'Company'
}) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(null)
    const candidateBuckets = useMemo(
        () => Array.from(new Set([bucket, 'avatars'])),
        [bucket]
    )

    const uploadLogo = useCallback(async (file) => {
        if (!authUserId || !companyProfileId) {
            const authErr = toAppError('Not authenticated.', 'AUTH_REQUIRED')
            setError(authErr)
            return { url: null, error: authErr }
        }

        if (!file) {
            const noFileErr = toAppError('No file provided.', 'NO_FILE')
            setError(noFileErr)
            return { url: null, error: noFileErr }
        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            const typeErr = toAppError('Invalid file type. Please upload JPEG, PNG, GIF, or WebP.', 'INVALID_TYPE')
            setError(typeErr)
            return { url: null, error: typeErr }
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            const sizeErr = toAppError('File too large. Maximum size is 5MB.', 'FILE_TOO_LARGE')
            setError(sizeErr)
            return { url: null, error: sizeErr }
        }

        setUploading(true)
        setError(null)

        try {
            const rawExt = (file.name.split('.').pop() || '').toLowerCase()
            const fileExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(rawExt) ? rawExt : 'png'
            const timestamp = Date.now()
            const filePath = `${authUserId}/logo-${timestamp}.${fileExt}`

            let uploadedBucket = null
            let lastUploadError = null

            for (const bucketId of candidateBuckets) {
                const { error: uploadError } = await supabase.storage
                    .from(bucketId)
                    .upload(filePath, file, {
                        // Keep insert-only behavior to avoid UPDATE-policy dependency.
                        upsert: false,
                        contentType: file.type || undefined,
                        cacheControl: '3600',
                    })

                if (!uploadError) {
                    uploadedBucket = bucketId
                    break
                }

                lastUploadError = uploadError
                if (!shouldTryFallbackBucket(uploadError)) {
                    throw uploadError
                }
            }

            if (!uploadedBucket) {
                throw lastUploadError || toAppError('Logo upload failed in all candidate buckets.', 'UPLOAD_FAILED')
            }

            const { data: publicUrlData } = supabase.storage.from(uploadedBucket).getPublicUrl(filePath)
            const publicUrl = publicUrlData?.publicUrl
            if (!publicUrl) {
                throw toAppError('Failed to generate public URL for uploaded logo.', 'URL_GENERATION_FAILED')
            }

            const { data: updatedRow, error: updateError } = await supabase
                .from('companies')
                .update({ logo_url: publicUrl })
                .eq('id', companyProfileId)
                .select('id')
                .maybeSingle()

            if (updateError) throw updateError
            if (!updatedRow) {
                const { data: upsertedRow, error: upsertError } = await supabase
                    .from('companies')
                    .upsert({
                        id: companyProfileId,
                        company_name: companyNameFallback || 'Company',
                        logo_url: publicUrl
                    }, { onConflict: 'id' })
                    .select('id')
                    .maybeSingle()

                if (upsertError) throw upsertError
                if (!upsertedRow) {
                    throw toAppError('Company profile row not found and could not be created.', 'COMPANY_ROW_NOT_FOUND')
                }
            }

            return { url: publicUrl, error: null }
        } catch (err) {
            let normalizedError = err
            if (isRlsLikeError(err)) {
                normalizedError = toAppError(
                    'Upload blocked by Row Level Security policy.',
                    'RLS_DENIED',
                    err
                )
            }
            setError(normalizedError)
            return { url: null, error: normalizedError }
        } finally {
            setUploading(false)
        }
    }, [authUserId, candidateBuckets, companyNameFallback, companyProfileId])

    return {
        uploadLogo,
        uploading,
        error,
        clearError: () => setError(null),
    }
}

export default useCompanyLogoUpload
