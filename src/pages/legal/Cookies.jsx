import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import './Legal.css'

function Cookies() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <Link to="/" className="legal-back-link">
                    <ArrowLeft size={18} />
                    Back to Home
                </Link>

                <header className="legal-header">
                    <h1>Cookie Policy</h1>
                    <p className="last-updated">Last updated: February 15, 2026</p>
                </header>

                <div className="legal-content">
                    <h2>1. What Are Cookies</h2>
                    <p>
                        Cookies are small text files that are placed on your computer or mobile device
                        when you visit a website. They are widely used to make websites work more
                        efficiently and to provide information to the site owners. Cookies allow a
                        website to recognize your device and remember information about your visit,
                        such as your preferences and settings.
                    </p>

                    <h2>2. How We Use Cookies</h2>
                    <p>
                        MatchOp uses cookies and similar tracking technologies to enhance your
                        experience on our platform. Specifically, we use cookies to:
                    </p>
                    <ul>
                        <li><strong>Authenticate users:</strong> Keep you signed in securely as you navigate between pages</li>
                        <li><strong>Remember preferences:</strong> Store your language, theme, and display settings</li>
                        <li><strong>Improve performance:</strong> Understand how you interact with our platform so we can optimize speed and reliability</li>
                        <li><strong>Analyze usage:</strong> Gather anonymized data about traffic patterns and feature adoption</li>
                        <li><strong>Ensure security:</strong> Detect and prevent fraudulent activity via CSRF tokens and session validation</li>
                    </ul>

                    <h2>3. Types of Cookies We Use</h2>

                    <h3>3.1 Essential Cookies</h3>
                    <p>
                        These cookies are strictly necessary for the operation of our platform. They
                        enable core functionality such as authentication, session management, and
                        security features. Without these cookies, the platform cannot function properly.
                        Essential cookies cannot be disabled.
                    </p>

                    <h3>3.2 Functional Cookies</h3>
                    <p>
                        Functional cookies allow us to remember choices you make on the platform, such as
                        your preferred language, theme (light or dark mode), and other display preferences.
                        These cookies enhance your experience but are not strictly necessary for the
                        platform to operate.
                    </p>

                    <h3>3.3 Analytics Cookies</h3>
                    <p>
                        We may use analytics cookies to collect anonymized information about how visitors
                        use our platform. This helps us understand which pages are most popular, how
                        users navigate between pages, and where we can improve. All data collected by
                        analytics cookies is aggregated and anonymous.
                    </p>

                    <h2>4. Cookie Duration</h2>
                    <p>
                        Cookies used on MatchOp fall into two categories based on their lifespan:
                    </p>
                    <ul>
                        <li><strong>Session cookies:</strong> Temporary cookies that are deleted when you close your web browser. These are primarily used for authentication and security.</li>
                        <li><strong>Persistent cookies:</strong> Cookies that remain on your device for a set period of time or until you manually delete them. These are used to remember your preferences across visits.</li>
                    </ul>

                    <h2>5. Third-Party Cookies</h2>
                    <p>
                        Our platform may use third-party services — such as Supabase for authentication
                        and database management — that set their own cookies. These third-party cookies
                        are governed by the respective privacy policies of those services. We do not
                        control or have access to third-party cookies.
                    </p>

                    <h2>6. Managing Your Cookie Preferences</h2>
                    <p>
                        You have full control over the cookies stored on your device. Most web browsers
                        allow you to manage cookies through their settings. You can:
                    </p>
                    <ul>
                        <li>View and delete cookies that are already stored on your device</li>
                        <li>Block all cookies or only third-party cookies</li>
                        <li>Configure your browser to notify you when a cookie is being set</li>
                        <li>Set your browser to automatically clear cookies when you close it</li>
                    </ul>
                    <p>
                        Please note that disabling essential cookies may prevent you from using certain
                        features of the platform, including signing in and accessing your account.
                    </p>

                    <h2>7. Changes to This Policy</h2>
                    <p>
                        We may update this Cookie Policy from time to time to reflect changes in
                        technology, legislation, or our data practices. When we make significant
                        changes, we will notify you by updating the "Last updated" date at the top
                        of this page.
                    </p>

                    <div className="legal-contact">
                        <h2>Contact Us</h2>
                        <p>
                            If you have any questions about our use of cookies or this policy, please
                            contact us at:{' '}
                            <a href="mailto:legal@matchop.com">legal@matchop.com</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Cookies
