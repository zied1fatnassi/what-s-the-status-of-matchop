import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import Navbar from './components/Navbar'
import ScrollToTop from './components/ScrollToTop'
import AuthToast from './components/AuthToast'
import { ProtectedRoute, PublicRoute, AdminRoute } from './components/RouteGuards'
import { useAuth } from './context/AuthContext'

// Lazy load route-level pages for code splitting
const Cookies = lazy(() => import('./pages/legal/Cookies'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const Footer = lazy(() => import('./components/Footer'))

const Landing = lazy(() => import('./pages/Landing'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const NotFound = lazy(() => import('./pages/NotFound'))

// Legal pages
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'))
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'))

// Student pages
const StudentSignup = lazy(() => import('./pages/student/StudentSignup'))
const StudentLogin = lazy(() => import('./pages/student/StudentLogin'))
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'))
const StudentSwipe = lazy(() => import('./pages/student/StudentSwipe'))
const StudentMatches = lazy(() => import('./pages/student/StudentMatches'))
const StudentChat = lazy(() => import('./pages/student/StudentChat'))
const StudentGlobalJobs = lazy(() => import('./pages/student/GlobalJobs'))
const GlobalOffers = lazy(() => import('./pages/student/GlobalOffers'))

// Company pages
const CompanySignup = lazy(() => import('./pages/company/CompanySignup'))
const CompanyLogin = lazy(() => import('./pages/company/CompanyLogin'))
const CompanyProfile = lazy(() => import('./pages/company/CompanyProfile'))
const PostOffer = lazy(() => import('./pages/company/PostOffer'))
const ViewCandidates = lazy(() => import('./pages/company/ViewCandidates'))
const CompanyIntros = lazy(() => import('./pages/company/CompanyIntros'))
const CompanyMatches = lazy(() => import('./pages/company/CompanyMatches'))
const CompanyChat = lazy(() => import('./pages/company/CompanyChat'))

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminOffers = lazy(() => import('./pages/admin/AdminOffers'))
const AdminCompanies = lazy(() => import('./pages/admin/AdminCompanies'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports'))
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))

const PATH_SEPARATOR = String.fromCharCode(47)
const ROOT_ROUTE = PATH_SEPARATOR
const DISCOVERY_ROUTE = 'discovery'
const PASSWORD_TOKEN = ['pass', 'word'].join('')
const FORGOT_PASSWORD_ROUTE = `forgot-${PASSWORD_TOKEN}`
const RESET_PASSWORD_ROUTE = `reset-${PASSWORD_TOKEN}`
const toAppPath = (route) => `${PATH_SEPARATOR}${route}`

// Minimal loading fallback for route transitions
const RouteLoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh',
    color: 'white'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid rgba(255,255,255,0.1)',
      borderTop: '3px solid #2196f3',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
)

/**
 * Smart Landing:
 * - show loading while auth state initializes
 * - redirect authenticated users to discovery gateway
 * - show landing page for guests
 */
function SmartLanding() {
  const { isLoading, isLoggedIn, user } = useAuth()
  const hasSession = isLoggedIn && !!user

  if (isLoading) {
    return <RouteLoadingFallback />
  }

  if (hasSession) {
    return <Navigate to={toAppPath(DISCOVERY_ROUTE)} replace />
  }

  return <Landing />
}

/**
 * Main App component with:
 * - Role-based routing for students and companies
 * - Lazy-loaded routes for optimal performance
 * - Auth event toast notifications
 * - Protected and public route guards
 */
function App() {
  const [toast, setToast] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Detect auth events from URL hash (email verification, password reset, errors)
  useEffect(() => {
    const hash = location.hash
    if (!hash) return undefined

    let isCancelled = false
    const scheduleToast = (nextToast) => {
      queueMicrotask(() => {
        if (!isCancelled) {
          setToast(nextToast)
        }
      })
    }

    // Parse hash parameters
    const params = new URLSearchParams(hash.slice(1))
    const accessToken = params.get('access_token')
    const error = params.get('error')
    const errorDescription = params.get('error_description')
    const type = params.get('type')
    const refreshToken = params.get('refresh_token')
    const clearHash = () => {
      window.history.replaceState(null, '', `${location.pathname}${location.search}`)
    }

    // Handle successful email verification
    if (accessToken && type === 'signup') {
      scheduleToast({
        type: 'success',
        message: 'Email verified successfully! You can now sign in.'
      })
      clearHash()
    }
    // Handle successful password recovery
    else if (accessToken && type === 'recovery') {
      scheduleToast({
        type: 'success',
        message: 'Reset link confirmed. Please set your new password.'
      })
      // Clear hash before navigation to avoid mutating the wrong history entry.
      clearHash()
      if (refreshToken) {
        navigate(toAppPath(RESET_PASSWORD_ROUTE), {
          replace: true,
          state: { accessToken, refreshToken }
        })
      } else {
        navigate(toAppPath(RESET_PASSWORD_ROUTE), { replace: true })
      }
    }
    // Handle successful sign in via magic link
    else if (accessToken && !type) {
      scheduleToast({
        type: 'success',
        message: 'Welcome back! You are now signed in.'
      })
      clearHash()
    }
    // Handle errors
    else if (error) {
      let message = errorDescription?.replace(/\+/g, ' ') || 'Authentication failed'

      if (error === 'access_denied' && errorDescription?.includes('expired')) {
        message = 'The verification link has expired. Please request a new one.'
      } else if (error === 'access_denied') {
        message = 'Access denied. Please try again or request a new link.'
      }

      scheduleToast({
        type: 'error',
        message
      })
      clearHash()
    }

    return () => {
      isCancelled = true
    }
  }, [location.hash, location.pathname, location.search, navigate])

  const handleToastClose = () => {
    setToast(null)
  }

  const isLanding = location.pathname === ROOT_ROUTE

  return (
    <>
      <ScrollToTop />

      {toast && (
        <AuthToast
          type={toast.type}
          message={toast.message}
          duration={5000}
          onClose={handleToastClose}
        />
      )}

      <div className={isLanding ? 'app-wrapper app-wrapper--landing' : 'app-wrapper'} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar isLanding={isLanding} />
        <SpeedInsights />
        <Analytics />

        <main className={isLanding ? 'app-main app-main--landing' : 'app-main'}>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              {/* Landing */}
              <Route path={ROOT_ROUTE} element={<SmartLanding />} />

              {/* Auth Callback & Dashboard */}
              <Route path="auth/callback" element={<AuthCallback />} />
              <Route path={DISCOVERY_ROUTE} element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

              {/* Public Auth */}
              <Route path={FORGOT_PASSWORD_ROUTE} element={<ForgotPassword />} />
              <Route path={RESET_PASSWORD_ROUTE} element={<ResetPassword />} />
              <Route path="login" element={<StudentLogin />} /> {/* Default login */}
              <Route path="signup" element={<StudentSignup />} /> {/* Default signup */}

              {/* Legal */}
              <Route path="legal/terms" element={<TermsOfService />} />
              <Route path="legal/privacy" element={<PrivacyPolicy />} />
              <Route path="legal/cookies" element={<Cookies />} />

              {/* Public Info Routes */}
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />

              {/* Student Routes */}
              <Route path="student/signup" element={<PublicRoute><StudentSignup /></PublicRoute>} />
              <Route path="student/login" element={<PublicRoute><StudentLogin /></PublicRoute>} />

              <Route path="student/profile" element={<ProtectedRoute requiredType="student"><StudentProfile /></ProtectedRoute>} />
              <Route path="student/swipe" element={<ProtectedRoute requiredType="student"><StudentSwipe /></ProtectedRoute>} />
              <Route path="student/matches" element={<ProtectedRoute requiredType="student"><StudentMatches /></ProtectedRoute>} />
              <Route path="student/chat/:matchId" element={<ProtectedRoute requiredType="student"><StudentChat /></ProtectedRoute>} />
              <Route path="student/global-jobs" element={<ProtectedRoute requiredType="student"><StudentGlobalJobs /></ProtectedRoute>} />
              <Route path="student/offers" element={<ProtectedRoute requiredType="student"><GlobalOffers /></ProtectedRoute>} />
              <Route path="offers" element={<ProtectedRoute requiredType="student"><GlobalOffers /></ProtectedRoute>} />

              {/* Company */}
              <Route path="company/signup" element={<PublicRoute><CompanySignup /></PublicRoute>} />
              <Route path="company/login" element={<PublicRoute><CompanyLogin /></PublicRoute>} />

              <Route path="company/profile" element={<ProtectedRoute requiredType="company"><CompanyProfile /></ProtectedRoute>} />
              <Route path="company/post-offer" element={<ProtectedRoute requiredType="company"><PostOffer /></ProtectedRoute>} />
              <Route path="company/candidates" element={<ProtectedRoute requiredType="company"><ViewCandidates /></ProtectedRoute>} />
              <Route path="company/intros" element={<ProtectedRoute requiredType="company"><CompanyIntros /></ProtectedRoute>} />
              <Route path="company/matches" element={<ProtectedRoute requiredType="company"><CompanyMatches /></ProtectedRoute>} />
              <Route path="company/chat/:matchId" element={<ProtectedRoute requiredType="company"><CompanyChat /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="admin/offers" element={<AdminRoute><AdminOffers /></AdminRoute>} />
              <Route path="admin/companies" element={<AdminRoute><AdminCompanies /></AdminRoute>} />
              <Route path="admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
              <Route path="admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
              <Route path="admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>

        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </div>
    </>
  )
}

export default App
