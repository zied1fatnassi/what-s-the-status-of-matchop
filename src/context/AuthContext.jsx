import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { autoVerifyEmail } from '../lib/verification'
import { clearAuthCookies, getOrCreateCSRFToken } from '../lib/cookieStorage'
import { requestPasswordReset } from '../lib/passwordReset'

/**
 * Auth Context for managing user authentication state with Supabase
 * SECURITY: All authentication goes through Supabase - no demo/bypass mode
 */
const AuthContext = createContext(null)
const isDev = import.meta.env.DEV
const debugLog = (...args) => {
    if (isDev) console.log(...args)
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [authError, setAuthError] = useState(null)

    useEffect(() => {
        debugLog('[Auth] Starting auth initialization...')

        // Simple timeout fallback - set loading to false after 5 seconds max
        const timeoutId = setTimeout(() => {
            debugLog('[Auth] Safety timeout - setting loading=false after 5s')
            setIsLoading(false)
        }, 5000)

        // Get initial session (non-blocking)
        supabase.auth.getSession().then(async ({ data, error }) => {
            debugLog('[Auth] getSession result:', {
                hasSession: !!data?.session,
                userId: data?.session?.user?.id,
                error: error?.message
            })

            if (data?.session?.user) {
                setUser(data.session.user)
                // Fetch profile in background, don't block
                fetchProfile(data.session.user.id)
            }

            // Always set loading to false
            clearTimeout(timeoutId)
            setIsLoading(false)
        }).catch(err => {
            console.error('[Auth] getSession ERROR:', err)
            clearTimeout(timeoutId)
            setIsLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                debugLog('[Auth] onAuthStateChange:', event, session?.user?.id)
                setUser(session?.user ?? null)

                if (session?.user) {
                    // Initialize CSRF token on sign-in (cookie-based sessions)
                    getOrCreateCSRFToken()
                    // Fetch profile in background
                    fetchProfile(session.user.id)
                } else {
                    setProfile(null)
                }

                // Clear error on successful auth events
                if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                    setAuthError(null)
                }

                // Clear all auth cookies on sign-out
                if (event === 'SIGNED_OUT') {
                    clearAuthCookies()
                }
            }
        )

        return () => {
            clearTimeout(timeoutId)
            subscription.unsubscribe()
        }
    }, [])

    const fetchProfile = useCallback(async (userId) => {
        try {
            debugLog('[Auth] fetchProfile called for:', userId)

            // Create a promise that rejects after 5 seconds
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timed out')), 5000)
            )

            // The actual fetch request
            const fetchPromise = (async () => {
                let { data, error } = await supabase
                    .from('profiles')
                    .select('*, students(*), companies(*), user_profiles(*)')
                    .eq('id', userId)
                    .single()

                // If profile doesn't exist, try to create it from user metadata
                if (error?.code === 'PGRST116') {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user?.user_metadata) {
                        const { type, name } = user.user_metadata
                        if (type && name) {
                            debugLog('[Auth] Profile not found, creating from user metadata...')
                            const { error: insertError } = await supabase
                                .from('profiles')
                                .insert({
                                    id: userId,
                                    email: user.email
                                })

                            if (!insertError) {
                                // Create user_profiles row
                                const { data: upData } = await supabase.from('user_profiles').insert({
                                    id: userId,
                                    user_id: userId,
                                    profile_type: type,
                                    is_default: true
                                }).select().single()

                                // Set active_profile_id
                                if (upData) {
                                    await supabase.from('profiles').update({
                                        active_profile_id: upData.id
                                    }).eq('id', userId)
                                }

                                // Also create type-specific profile
                                if (type === 'student') {
                                    await supabase.from('students').insert({
                                        id: userId,
                                        display_name: name || 'Student',
                                        location: '',
                                        skills: []
                                    })
                                } else if (type === 'company') {
                                    await supabase.from('companies').insert({
                                        id: userId,
                                        company_name: name || 'Company',
                                        industry: '',
                                        description: ''
                                    })
                                }

                                // Fetch the newly created profile
                                const result = await supabase
                                    .from('profiles')
                                    .select('*, students(*), companies(*), user_profiles(*)')
                                    .eq('id', userId)
                                    .single()
                                data = result.data
                                error = result.error
                            }
                        }
                    }
                }
                return { data, error }
            })()

            // Race the fetch against the timeout
            const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

            if (error) {
                console.error('[Auth] Error fetching profile:', error)
            }

            if (!error && data) {
                debugLog('[Auth] Profile fetched successfully')
                setProfile(data)
            }
        } catch (err) {
            console.error('[Auth] Critical error (timeout or crash) fetching profile:', err)
        }
    }, [])

    // Auto-verify email when user confirms their email
    useEffect(() => {
        if (user?.email_confirmed_at && profile && !profile.verified) {
            debugLog('[Auth] Auto-verifying email for user:', user.id)
            autoVerifyEmail(user.id, user.email_confirmed_at).then(result => {
                if (result.success) {
                    debugLog('[Auth] Email verification badge added')
                    fetchProfile(user.id) // Refresh profile to show badge
                }
            })
        }
    }, [user, profile, fetchProfile])

    /**
     * Sign up a new user with Supabase Auth
     * Creates profile and type-specific data after signup
     * NOTE: If email verification is required, profile creation is deferred
     * until the user verifies their email and gets a valid session.
     * @param {string} email 
     * @param {string} password 
     * @param {string} userType - 'student' or 'company'
     * @param {object} userData - Additional user data
     * @returns {Promise<{data: object, error: Error|null, needsEmailVerification: boolean}>}
     */
    const signUp = useCallback(async (email, password, userType, userData = {}) => {
        setAuthError(null)

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { type: userType, name: userData.name || 'User' },
                    emailRedirectTo: `${window.location.origin}/auth/callback`
                }
            })

            if (error) {
                setAuthError(error)
                throw error
            }

            // Detect "already registered" case:
            // Supabase returns a fake user with no session and no identities
            // to avoid leaking whether an email is already taken.
            if (data.user && !data.session && data.user.identities?.length === 0) {
                const alreadyRegisteredError = new Error('An account with this email already exists. Please log in instead.')
                setAuthError(alreadyRegisteredError)
                throw alreadyRegisteredError
            }

            // Email verification is required — user was created but needs to confirm
            const needsEmailVerification = data.user && !data.session

            // Only create profile if we have a session (no email verification required)
            // Otherwise, profile will be created when user verifies email and fetchProfile runs
            if (data.user && data.session) {
                try {
                    const { error: profileError } = await supabase.from('profiles').insert({
                        id: data.user.id,
                        email: email
                    })

                    if (profileError && !profileError.message.includes('duplicate')) {
                        console.error('Profile creation error:', profileError)
                    }

                    // Create user_profiles row (profile type link)
                    const { data: upData } = await supabase.from('user_profiles').insert({
                        id: data.user.id,
                        user_id: data.user.id,
                        profile_type: userType,
                        is_default: true
                    }).select().single()

                    // Set active_profile_id
                    if (upData) {
                        await supabase.from('profiles').update({
                            active_profile_id: upData.id
                        }).eq('id', data.user.id)
                    }

                    // Create type-specific profile
                    if (userType === 'student') {
                        await supabase.from('students').insert({
                            id: data.user.id,
                            display_name: userData.name || 'Student',
                            location: userData.location || '',
                            skills: userData.skills || []
                        })
                    } else if (userType === 'company') {
                        await supabase.from('companies').insert({
                            id: data.user.id,
                            company_name: userData.name || 'Company',
                            industry: userData.sector || '',
                            description: userData.description || ''
                        })
                    }
                } catch (profileErr) {
                    // Profile creation failed, but signup succeeded
                    // Profile will be auto-created on next login via fetchProfile
                    debugLog('Profile creation failed, will retry on login:', profileErr)
                }
            }

            return { data, error: null, needsEmailVerification }
        } catch (err) {
            return { data: null, error: err, needsEmailVerification: false }
        }
    }, [])

    /**
     * Sign in with email and password
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<{data: object, error: Error|null}>}
     */
    const signIn = useCallback(async (email, password) => {
        setAuthError(null)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) {
                setAuthError(error)
                throw error
            }

            // Set user immediately so redirect (e.g. to /student/swipe) sees logged-in state.
            // onAuthStateChange will also fire, but updating here avoids race where navigate runs before listener.
            if (data?.session?.user) {
                setUser(data.session.user)
                getOrCreateCSRFToken()
                fetchProfile(data.session.user.id)
            }

            // Track login activity for engagement decay system
            supabase.rpc('touch_activity').catch(err =>
                debugLog('[Auth] Activity tracking failed:', err.message)
            )

            return { data, error: null }
        } catch (err) {
            return { data: null, error: err }
        }
    }, [fetchProfile])

    /**
     * Sign out the current user
     */
    const signOut = useCallback(async () => {
        setAuthError(null)

        const { error } = await supabase.auth.signOut()

        if (error) {
            console.error('[AuthContext] signOut error:', error)
            setAuthError(error)
            throw error
        }

        // Clear all auth cookies (session + CSRF)
        clearAuthCookies()
        setUser(null)
        setProfile(null)
    }, [])

    /**
     * Resend email verification
     * @param {string} email 
     * @returns {Promise<{error: Error|null}>}
     */
    const resendVerificationEmail = useCallback(async (email) => {
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`
                }
            })
            return { error }
        } catch (err) {
            return { error: err }
        }
    }, [])

    /**
     * Request password reset email
     * @param {string} email 
     * @returns {Promise<{error: Error|null}>}
     */
    const resetPassword = useCallback(async (email) => {
        try {
            const result = await requestPasswordReset(email)
            return { error: result?.error || null }
        } catch (err) {
            return { error: err }
        }
    }, [])

    /**
     * Update user profile
     */
    const updateProfile = useCallback(async (updates) => {
        if (!user) return { error: 'Not authenticated' }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)

        if (!error) {
            setProfile(prev => ({ ...prev, ...updates }))
        }

        return { error }
    }, [user])

    // Check if email is verified
    const isEmailVerified = user?.email_confirmed_at != null

    // Derive role from user_profiles (the new single source of truth)
    const activeProfileType = useMemo(() => {
        const ups = profile?.user_profiles
        if (Array.isArray(ups) && ups.length > 0) {
            // Prefer the default profile, otherwise the first one
            const defaultUp = ups.find(up => up.is_default) || ups[0]
            return defaultUp?.profile_type
        }
        // Fallback to user_metadata during the brief window before profile loads
        return user?.user_metadata?.type || null
    }, [profile, user])

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        user,
        profile,
        isLoggedIn: !!user,
        isEmailVerified,
        isStudent: activeProfileType === 'student',
        isCompany: activeProfileType === 'company',
        isAdmin: activeProfileType === 'admin',
        isLoading,
        authError,
        // Auth methods
        signUp,
        signIn,
        signOut,
        // Additional auth methods
        resendVerificationEmail,
        resetPassword,
        // Profile methods
        updateProfile,
        refreshProfile: () => user && fetchProfile(user.id),
        clearError: () => setAuthError(null),
    }), [user, profile, isLoading, isEmailVerified, activeProfileType, authError, signUp, signIn, signOut, resendVerificationEmail, resetPassword, updateProfile, fetchProfile])

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export default AuthContext


