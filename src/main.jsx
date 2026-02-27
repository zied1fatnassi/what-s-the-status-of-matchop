import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ApplicationProvider } from './context/ApplicationContext'
import { ThemeProvider } from './context/ThemeContext'
import './lib/i18n' // Initialize i18n before App
import './index.css'
import './accessibility-contrast.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import MissingConfigurationScreen from './components/MissingConfigurationScreen'
import { isSupabaseConfigMissing } from './lib/supabase'
import { initWebVitalsDebug } from './lib/webVitalsDebug'

/**
 * MatchOp - Match the Opportunity
 * Student-Company matching platform
 *
 * Entry point that initializes:
 * - React 19 with Strict Mode
 * - React Router for navigation
 * - AuthProvider for authentication state
 * - ApplicationProvider for managing job applications
 * - i18next for internationalization
 */
initWebVitalsDebug()

const root = createRoot(document.getElementById('root'))

if (isSupabaseConfigMissing) {
  root.render(
    <StrictMode>
      <MissingConfigurationScreen />
    </StrictMode>,
  )
} else {
  root.render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <ApplicationProvider>
            <ThemeProvider>
              <ErrorBoundary fallbackMessage="The app encountered an unexpected error. Please reload.">
                <App />
              </ErrorBoundary>
            </ThemeProvider>
          </ApplicationProvider>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}
