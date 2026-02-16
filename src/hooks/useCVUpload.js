import { useState } from 'react'
import { uploadCV } from '../lib/storage'

export function useCVUpload(userId) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(null)

    const upload = async (file) => {
        if (!userId) return { error: { message: 'User ID required' } }

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        if (!allowedTypes.includes(file.type)) {
            return { error: { message: 'Invalid file type. Please upload PDF or Word document.' } }
        }

        // Validate size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return { error: { message: 'File too large (max 5MB)' } }
        }

        setUploading(true)
        setError(null)

        try {
            const path = await uploadCV(userId, file)
            setUploading(false)
            return { path }
        } catch (err) {
            console.error('Upload failed:', err)
            setError(err)
            setUploading(false)
            return { error: err }
        }
    }

    return { uploadCV: upload, uploading, error }
}
