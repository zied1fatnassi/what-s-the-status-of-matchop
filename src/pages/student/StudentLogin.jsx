import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight, GraduationCap, Loader2, AlertCircle, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { validateEmail, getAuthErrorMessage } from '../../lib/validation'
import './StudentSignup.css' // Reusing the same styles for consistency

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
        <div className="login-page">
            <div className="login-container glass-card hover-lift" style={{ maxWidth: '900px' }}>
                <div className="login-header">
                    <div className="icon-wrapper">
                        <GraduationCap size={40} className="text-white" />
                    </div>
                    <h1>Welcome Back!</h1>
                    <p>Sign in to your student account</p>
                </div>

                <div className="login-form-wrapper">
                    {error && (
                        <div className="auth-error mb-4">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label>Email Address</label>
                            <div className="input-wrapper">
                                <Mail size={20} className="input-icon" />
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

                        <div className="form-group">
                            <label>Password</label>
                            <div className="input-wrapper">
                                <Lock size={20} className="input-icon" />
                                <input
                                    type="password"
                                    name="password"
                                    className="input"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                            <div className="forgot-password-link" style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                                <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block mt-4"
                            disabled={isSubmitDisabled}
                            style={{ width: '100%', justifyContent: 'center' }}
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

                        <div className="form-footer">
                            <p>Don't have an account? <Link to="/student/signup" className="text-primary font-bold">Sign up</Link></p>
                        </div>
                    </form>
                </div>
            </div>

            <style>{`
                .login-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                }
                .login-container {
                    display: grid;
                    grid-template-columns: 1fr 1.5fr;
                    width: 100%;
                    overflow: hidden;
                    min-height: 500px;
                }
                .login-header {
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
                    padding: 3rem;
                    color: white;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                }
                .icon-wrapper {
                    background: rgba(255,255,255,0.2);
                    padding: 1.5rem;
                    border-radius: 50%;
                    margin-bottom: 1.5rem;
                    backdrop-filter: blur(10px);
                }
                .login-header h1 { color: white; margin-bottom: 0.5rem; font-size: 2rem; }
                .login-header p { color: rgba(255,255,255,0.8); }
                
                .login-form-wrapper { padding: 3rem; }
                .form-group { margin-bottom: 1.25rem; }
                .form-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: var(--text-primary);
                }
                .input-wrapper { position: relative; }
                .input-icon {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    pointer-events: none;
                }
                .input-wrapper input { padding-left: 3rem; }
                
                .form-footer { margin-top: 2rem; text-align: center; color: var(--text-secondary); }

                @media (max-width: 768px) {
                    .login-container { grid-template-columns: 1fr; }
                    .login-header { padding: 2rem; }
                    .login-form-wrapper { padding: 2rem; }
                }
            `}</style>
        </div>
    )
}

export default StudentLogin
