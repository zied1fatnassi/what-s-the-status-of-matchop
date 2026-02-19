import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ApplicationProvider } from './context/ApplicationContext'
import { ThemeProvider } from './context/ThemeContext'
import './lib/i18n' // Initialize i18n before App
import './index.css'
import App from './App.jsx'

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
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ApplicationProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </ApplicationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
