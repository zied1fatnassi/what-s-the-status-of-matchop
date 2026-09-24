import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook for managing loading and error states
 * Returns state + setters + helper functions
 */
export function useLoadingError(initialLoading = false) {
    const [loading, setLoading] = useState(initialLoading)
    const [error, setError] = useState(null)

    const startLoading = useCallback(() => {
        setLoading(true)
        setError(null)
    }, [])

    const stopLoading = useCallback(() => {
        setLoading(false)
    }, [])

    const setLoadingError = useCallback((err) => {
        setLoading(false)
        setError(err)
    }, [])

    const clearError = useCallback(() => {
        setError(null)
    }, [])

    const reset = useCallback(() => {
        setLoading(false)
        setError(null)
    }, [])

    return {
        loading,
        error,
        setLoading,
        setError,
        startLoading,
        stopLoading,
        setLoadingError,
        clearError,
        reset
    }
}

/**
 * Hook for toast notifications
 * Manages displaying and auto-dismissing toasts
 */
export function useToast() {
    const [toast, setToast] = useState(null)

    const showToast = useCallback((message, type = 'error', duration = 5000) => {
        setToast({ message, type, duration })
    }, [])

    const showError = useCallback((message, duration = 5000) => {
        setToast({ message, type: 'error', duration })
    }, [])

    const showSuccess = useCallback((message, duration = 3000) => {
        setToast({ message, type: 'success', duration })
    }, [])

    const showNetworkError = useCallback((duration = 5000) => {
        setToast({
            message: 'Network error. Please check your connection and try again.',
            type: 'network',
            duration
        })
    }, [])

    const hideToast = useCallback(() => {
        setToast(null)
    }, [])

    return {
        toast,
        showToast,
        showError,
        showSuccess,
        showNetworkError,
        hideToast
    }
}

/**
 * Hook that combines async operation with loading/error states
 * Automatically handles loading state and errors
 */
export function useAsync(asyncFunction, immediate = true) {
    const [status, setStatus] = useState({
        loading: immediate,
        error: null,
        data: null
    })

    const execute = useCallback(
        async (...params) => {
            setStatus({ loading: true, error: null, data: null })
            try {
                const response = await asyncFunction(...params)
                setStatus({ loading: false, error: null, data: response })
                return response
            } catch (error) {
                setStatus({ loading: false, error, data: null })
                throw error
            }
        },
        [asyncFunction]
    )

    useEffect(() => {
        if (immediate) {
            execute()
        }
    }, [execute, immediate])

    return {
        ...status,
        execute
    }
}

/**
 * Hook for network error recovery
 * Tracks network status and retry logic
 */
export function useNetworkError() {
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [retryCount, setRetryCount] = useState(0)

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const retry = useCallback(() => {
        setRetryCount(prev => prev + 1)
    }, [])

    const resetRetry = useCallback(() => {
        setRetryCount(0)
    }, [])

    return {
        isOnline,
        retryCount,
        retry,
        resetRetry
    }
}

export default {
    useLoadingError,
    useToast,
    useAsync,
    useNetworkError
}
