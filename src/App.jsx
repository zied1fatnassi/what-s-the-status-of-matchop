import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import Navbar from './components/Navbar'
import ScrollToTop from './components/ScrollToTop'
import LoadingScreen from './components/LoadingScreen'
import AuthToast from './components/AuthToast'
import { ProtectedRoute, PublicRoute, AdminRoute } from './components/RouteGuards'
import { useAuth } from './context/AuthContext'
import DiagnosticHelper from './components/DiagnosticHelper'

// Lazy load all page components for code splitting
import Cookies from './pages/legal/Cookies'
import About from './pages/About'
import Contact from './pages/Contact'
import Blog from './pages/Blog'
import Footer from './components/Footer'

const Landing = lazy(() => import('./pages/Landing'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

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
 * Smart Landing component that redirects logged-in users
 */
function SmartLanding() {
  const { isLoggedIn, isLoading, isStudent, isCompany } = useAuth()

  // While auth is loading, show the landing page (it will redirect after loading)
  if (isLoading) {
    return <RouteLoadingFallback />
  }

  // Redirect logged-in users to their dashboard
  if (isLoggedIn) {
    if (isStudent) {
      return <Navigate to="/student/swipe" replace />
    }
    if (isCompany) {
      return <Navigate to="/company/intros" replace />
    }
  }

  // Not logged in - show landing
  return <Landing />
}

/**
 * Main App component with:
 * - Initial loading animation
 * - Role-based routing for students and companies
 * - Lazy-loaded routes for optimal performance
 * - Auth event toast notifications
 * - Protected and public route guards
 */
function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Detect auth events from URL hash (email verification, password reset, errors)
  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return

    // Parse hash parameters
    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const error = params.get('error')
    const errorDescription = params.get('error_description')
    const type = params.get('type')
    const refreshToken = params.get('refresh_token')

    // Handle successful email verification
    if (accessToken && type === 'signup') {
      setToast({
        type: 'success',
        message: '✅ Email verified successfully! You can now sign in.'
      })
      window.history.replaceState(null, '', window.location.pathname)
    }
    // Handle successful password recovery
    else if (accessToken && type === 'recovery') {
      setToast({
        type: 'success',
        message: '✅ Reset link confirmed. Please set your new password.'
      })
      // Keep the Supabase session from the link and move user to the reset form
      if (refreshToken) {
        // Store tokens in location.state to avoid re-parsing hash on navigation
        navigate('/reset-password', {
          replace: true,
          state: { accessToken, refreshToken }
        })
      } else {
        navigate('/reset-password', { replace: true })
      }
      window.history.replaceState(null, '', window.location.pathname)
    }
    // Handle successful sign in via magic link
    else if (accessToken && !type) {
      setToast({
        type: 'success',
        message: '✅ Welcome back! You are now signed in.'
      })
      window.history.replaceState(null, '', window.location.pathname)
    }
    // Handle errors
    else if (error) {
      let message = errorDescription?.replace(/\+/g, ' ') || 'Authentication failed'

      if (error === 'access_denied' && errorDescription?.includes('expired')) {
        message = 'The verification link has expired. Please request a new one.'
      } else if (error === 'access_denied') {
        message = 'Access denied. Please try again or request a new link.'
      }

      setToast({
        type: 'error',
        message: `❌ ${message}`
      })
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [location])

  const handleToastClose = () => {
    setToast(null)
  }

  const isLanding = location.pathname === '/'

  return (
    <>
      <ScrollToTop />
      {isLoading && (
        <LoadingScreen
          minDuration={1000}
          onComplete={() => setIsLoading(false)}
        />
      )}

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
        <DiagnosticHelper />

        <main className={isLanding ? 'app-main app-main--landing' : 'app-main'}>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              {/* Landing */}
              <Route path="/" element={<SmartLanding />} />

              {/* Public Auth */}
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/login" element={<StudentLogin />} /> {/* Default login */}
              <Route path="/signup" element={<StudentSignup />} /> {/* Default signup */}

              {/* Legal */}
              <Route path="/legal/terms" element={<TermsOfService />} />
              <Route path="/legal/privacy" element={<PrivacyPolicy />} />
              {/* Note: Cookies and Terms files were created as .jsx in pages/legal/ but mapped imports might differ. 
                  Using the dynamic imports defined at top of file for consistency if available, 
                  or the direct Components created in previous steps.
                  Let's use the lazy loaded ones if they exist, or direct imports if I created them.
                  Wait, I created Terms.jsx, Privacy.jsx, Cookies.jsx in src/pages/legal/
                  But the lazy imports in this file usually point to TermsOfService etc.
                  I should stick to the structure I just created.
              */}

              {/* Legal Routes */}
              <Route path="/legal/cookies" element={<Cookies />} />

              {/* Public Info Routes */}
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/blog" element={<Blog />} />

              {/* Student Routes */}
              <Route path="/student/signup" element={<PublicRoute><StudentSignup /></PublicRoute>} />
              <Route path="/student/login" element={<PublicRoute><StudentLogin /></PublicRoute>} />

              <Route path="/student/profile" element={<ProtectedRoute requiredType="student"><StudentProfile /></ProtectedRoute>} />
              <Route path="/student/swipe" element={<ProtectedRoute requiredType="student"><StudentSwipe /></ProtectedRoute>} />
              <Route path="/student/matches" element={<ProtectedRoute requiredType="student"><StudentMatches /></ProtectedRoute>} />
              <Route path="/student/chat/:matchId" element={<ProtectedRoute requiredType="student"><StudentChat /></ProtectedRoute>} />
              <Route path="/student/global-jobs" element={<ProtectedRoute requiredType="student"><StudentGlobalJobs /></ProtectedRoute>} />
              <Route path="/student/offers" element={<ProtectedRoute requiredType="student"><GlobalOffers /></ProtectedRoute>} />
              <Route path="/offers" element={<GlobalOffers />} />

              {/* Company */}
              <Route path="/company/signup" element={<PublicRoute><CompanySignup /></PublicRoute>} />
              <Route path="/company/login" element={<PublicRoute><CompanyLogin /></PublicRoute>} />

              <Route path="/company/profile" element={<ProtectedRoute requiredType="company"><CompanyProfile /></ProtectedRoute>} />
              <Route path="/company/post-offer" element={<ProtectedRoute requiredType="company"><PostOffer /></ProtectedRoute>} />
              <Route path="/company/candidates" element={<ProtectedRoute requiredType="company"><ViewCandidates /></ProtectedRoute>} />
              <Route path="/company/intros" element={<ProtectedRoute requiredType="company"><CompanyIntros /></ProtectedRoute>} />
              <Route path="/company/matches" element={<ProtectedRoute requiredType="company"><CompanyMatches /></ProtectedRoute>} />
              <Route path="/company/chat/:matchId" element={<ProtectedRoute requiredType="company"><CompanyChat /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/admin/offers" element={<AdminRoute><AdminOffers /></AdminRoute>} />
              <Route path="/admin/companies" element={<AdminRoute><AdminCompanies /></AdminRoute>} />
              <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
              <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
      </div>
    </>
  )
}

export default App
