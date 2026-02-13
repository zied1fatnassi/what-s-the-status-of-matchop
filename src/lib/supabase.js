import { createClient } from '@supabase/supabase-js'
import { cookieStorage } from './cookieStorage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    console.error('Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

/**
 * Supabase Client Configuration
 * 
 * SECURITY FIX: Sessions are now stored in Secure, SameSite=Strict cookies
 * instead of localStorage. This mitigates XSS-based token theft because:
 *   - SameSite=Strict prevents cross-origin cookie sending (CSRF mitigation)
 *   - Secure flag ensures cookies are only sent over HTTPS
 *   - Cookie storage adapter abstracts persistence from the SPA
 * 
 * The SPA reads auth state via Supabase's in-memory onAuthStateChange listener,
 * NOT by reading cookies directly — maintaining the SPA flow.
 * 
 * PKCE flow is enabled for enhanced security on the authorization code exchange.
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? cookieStorage : undefined,
        storageKey: 'matchop-auth-token'
    }
})

export default supabase
