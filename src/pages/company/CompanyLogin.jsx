import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Building2, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { validateEmail, getAuthErrorMessage } from '../../lib/validation'
import PasswordInput from '../../components/forms/PasswordInput'
import '../student/StudentSignup.css'

/**
 * Company Login Page
 * Secure authentication using Supabase Auth
 */
function CompanyLogin() {
    const navigate = useNavigate()
    const { signIn, isLoading: authLoading } = useAuth()
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    })
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        // Validate email
        const emailValidation = validateEmail(formData.email)
        if (!emailValidation.valid) {
            setError(emailValidation.error)
            return
        }

        // Check password is provided
        if (!formData.password) {
            setError('Please enter your password')
            return
        }

        setIsLoading(true)

        try {
            const { data, error: signInError } = await signIn(formData.email, formData.password)

            if (signInError) {
                setError(getAuthErrorMessage(signInError))
                return
            }

            if (data?.user) {
                // Check if user is a company
                const userType = data.user.user_metadata?.type
                if (userType === 'student') {
                    setError('This account is registered as a student. Please use the student login.')
                    return
                }
                navigate('/company/candidates')
            }
        } catch (err) {
            setError(getAuthErrorMessage(err))
        } finally {
            setIsLoading(false)
        }
    }

    const isSubmitDisabled = isLoading || authLoading || !formData.email || !formData.password

    return (
        <div className="auth-page">
            <div className="auth-container login-container">
                <div className="auth-visual" style={{ background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)' }}>
                    <div className="visual-content">
                        <div className="visual-icon animate-float">
                            <Building2 size={64} />
                        </div>
                        <h2>Welcome Back!</h2>
                        <p>Sign in to continue finding top talent</p>
                    </div>
                </div>

                <div className="auth-form-container">
                    <div className="auth-header">
                        <h1>Company Sign In</h1>
                        <p>Don't have an account? <Link to="/company/signup">Sign up</Link></p>
                    </div>

                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-step">
                            <div className="input-group">
                                <label className="input-label">Work Email</label>
                                <div className="input-with-icon">
                                    <Mail size={20} className="input-icon" />
                                    <input
                                        type="email"
                                        name="email"
                                        className="input"
                                        placeholder="hr@vermeg.tn"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Password</label>
                                <div className="input-with-icon">
                                    <Lock size={20} className="input-icon" />
                                    <PasswordInput
                                        name="password"
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        required
                                        autoComplete="current-password"
                                        hasLeadingIcon
                                    />
                                </div>
                            </div>

                            <div className="forgot-password">
                                <Link to="/forgot-password">Forgot password?</Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={isSubmitDisabled}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="spinner" />
                                    Signing In...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default CompanyLogin
