import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook for uploading profile images to Supabase Storage
 * 
 * STORAGE RLS:
 * - Files are stored in: avatars/{userId}/avatar.{ext}
 * - Policy allows upload when folder name = auth.uid()
 * 
 * TABLE RLS:
 * - Updates 'students' table (NOT 'profiles') where id = auth.uid()
 */
export function useImageUpload(userId, bucket = 'avatars') {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(null)
    const [progress, setProgress] = useState(0)

    const uploadImage = useCallback(async (file) => {
        if (!userId) {
            return { url: null, error: new Error('User not authenticated') }
        }

        if (!file) {
            return { url: null, error: new Error('No file provided') }
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (!validTypes.includes(file.type)) {
            const err = new Error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP.')
            setError(err)
            return { url: null, error: err }
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024
        if (file.size > maxSize) {
            const err = new Error('File too large. Maximum size is 5MB.')
            setError(err)
            return { url: null, error: err }
        }

        setUploading(true)
        setError(null)
        setProgress(0)

        try {
            // File path: {userId}/avatar.{ext} - folder name MUST equal userId for RLS
            const fileExt = file.name.split('.').pop()
            const fileName = `${userId}/avatar.${fileExt}`

            // Delete old avatars (ignore errors)
            try {
                await supabase.storage.from(bucket).remove([
                    `${userId}/avatar.png`,
                    `${userId}/avatar.jpg`,
                    `${userId}/avatar.jpeg`,
                    `${userId}/avatar.webp`,
                    `${userId}/avatar.gif`
                ])
            } catch {
                console.log('No old avatars to delete')
            }

            // Upload new avatar
            const { data: _data, error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                })

            if (uploadError) {
                console.error('[uploadImage] Storage error:', uploadError)
                setError(uploadError)
                return { url: null, error: uploadError }
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName)

            const publicUrl = urlData?.publicUrl

            // Update STUDENTS table (NOT profiles) - this is where our profile data lives
            // RLS requires id = auth.uid()
            const { error: updateError } = await supabase
                .from('students')
                .update({ avatar_url: publicUrl })
                .eq('id', userId)

            if (updateError) {
                console.error('[uploadImage] Failed to update students table:', updateError)
                // Don't fail the whole upload - we still have the URL
            }

            setProgress(100)
            return { url: publicUrl, error: null }
        } catch (err) {
            console.error('[uploadImage] Error:', err)
            setError(err)
            return { url: null, error: err }
        } finally {
            setUploading(false)
        }
    }, [userId, bucket])

    const deleteImage = useCallback(async () => {
        if (!userId) {
            return { error: new Error('User not authenticated') }
        }

        setUploading(true)
        setError(null)

        try {
            await supabase.storage.from(bucket).remove([
                `${userId}/avatar.png`,
                `${userId}/avatar.jpg`,
                `${userId}/avatar.jpeg`,
                `${userId}/avatar.webp`,
                `${userId}/avatar.gif`
            ])

            // Update STUDENTS table to remove avatar URL
            const { error: updateError } = await supabase
                .from('students')
                .update({ avatar_url: null })
                .eq('id', userId)

            if (updateError) {
                setError(updateError)
                return { error: updateError }
            }

            return { error: null }
        } catch (err) {
            setError(err)
            return { error: err }
        } finally {
            setUploading(false)
        }
    }, [userId, bucket])

    return {
        uploadImage,
        deleteImage,
        uploading,
        error,
        progress,
        clearError: () => setError(null)
    }
}

export default useImageUpload
