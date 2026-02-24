import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight, GraduationCap, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { validateEmail, getAuthErrorMessage } from '../../lib/validation'
import PasswordInput from '../../components/forms/PasswordInput'
import './StudentSignup.css'
import './StudentAuthLayout.css'

/**
 * Student Login Page
 * Secure authentication using Supabase Auth
 */
function StudentLogin() {
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

        const emailValidation = validateEmail(formData.email)
        if (!emailValidation.valid) {
            setError(emailValidation.error)
            return
        }

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
                navigate('/student/swipe', { replace: true })
            }
        } catch (err) {
            setError(getAuthErrorMessage(err))
        } finally {
            setIsLoading(false)
        }
    }

    const isSubmitDisabled = isLoading || authLoading || !formData.email || !formData.password

    return (
        <div className="student-auth-page page-shell">
            <div className="student-auth-container glass-card hover-lift">
                <div className="student-auth-header">
                    <div className="student-auth-icon-wrapper">
                        <GraduationCap size={40} className="text-white" />
                    </div>
                    <h1>Welcome Back!</h1>
                    <p>Sign in to your student account</p>
                </div>

                <div className="student-auth-form-wrapper">
                    {error && (
                        <div className="auth-error mb-4">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="student-auth-group">
                            <label>Email Address</label>
                            <div className="student-auth-input-wrapper">
                                <Mail size={20} className="student-auth-input-icon" />
                                <input
                                    type="email"
                                    name="email"
                                    className="input"
                                    placeholder="student@university.tn"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="student-auth-group">
                            <label>Password</label>
                            <div className="student-auth-input-wrapper">
                                <Lock size={20} className="student-auth-input-icon" />
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
                            <div className="student-auth-forgot">
                                <Link to="/forgot-password">Forgot password?</Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block mt-4 student-auth-submit"
                            disabled={isSubmitDisabled}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin mr-2" />
                                    Signing In...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>

                        <div className="student-auth-footer">
                            <p>Don't have an account? <Link to="/student/signup" className="text-primary font-bold">Sign up</Link></p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default StudentLogin
