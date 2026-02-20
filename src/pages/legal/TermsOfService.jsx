import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import './Legal.css'

/**
 * Terms of Service Page
 * Displays the application's terms and conditions
 */
function TermsOfService() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <Link to="/" className="legal-back-link">
                    <ArrowLeft size={18} />
                    Back to Home
                </Link>

                <header className="legal-header">
                    <h1>Terms of Service</h1>
                    <p className="last-updated">Last updated: December 20, 2024</p>
                </header>

                <div className="legal-content">
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing and using MatchOp ("the Platform"), you agree to be bound by these
                        Terms of Service. If you do not agree to these terms, please do not use our services.
                    </p>

                    <h2>2. Description of Service</h2>
                    <p>
                        MatchOp is a job matching platform that connects students and recent graduates
                        with companies seeking talent. Our service includes:
                    </p>
                    <ul>
                        <li>Profile creation and management</li>
                        <li>Job opportunity discovery through swiping</li>
                        <li>Matching between students and companies</li>
                        <li>Direct messaging between matched parties</li>
                    </ul>

                    <h2>3. User Accounts</h2>
                    <h3>3.1 Registration</h3>
                    <p>
                        To use our Platform, you must create an account with accurate and complete
                        information. You are responsible for maintaining the confidentiality of your
                        account credentials.
                    </p>

                    <h3>3.2 Account Types</h3>
                    <p>
                        MatchOp offers two types of accounts:
                    </p>
                    <ul>
                        <li><strong>Student Accounts:</strong> For individuals seeking job opportunities</li>
                        <li><strong>Company Accounts:</strong> For organizations looking to hire talent</li>
                    </ul>

                    <h2>4. User Conduct</h2>
                    <p>Users agree not to:</p>
                    <ul>
                        <li>Provide false or misleading information</li>
                        <li>Harass, abuse, or harm other users</li>
                        <li>Use the Platform for any unlawful purpose</li>
                        <li>Attempt to gain unauthorized access to our systems</li>
                        <li>Spam or send unsolicited messages</li>
                    </ul>

                    <h2>5. Content</h2>
                    <p>
                        You retain ownership of content you submit to MatchOp. By posting content,
                        you grant us a non-exclusive license to use, display, and distribute that
                        content on our Platform.
                    </p>

                    <h2>6. Privacy</h2>
                    <p>
                        Your privacy is important to us. Please review our{' '}
                        <Link to="/legal/privacy">Privacy Policy</Link> to understand how we collect,
                        use, and protect your information.
                    </p>

                    <h2>7. Termination</h2>
                    <p>
                        We reserve the right to suspend or terminate accounts that violate these
                        Terms of Service or for any other reason at our discretion.
                    </p>

                    <h2>8. Disclaimers</h2>
                    <p>
                        MatchOp is provided "as is" without warranties of any kind. We do not guarantee
                        that you will find employment or suitable candidates through our Platform.
                    </p>

                    <h2>9. Limitation of Liability</h2>
                    <p>
                        To the maximum extent permitted by law, MatchOp shall not be liable for any
                        indirect, incidental, or consequential damages arising from your use of the Platform.
                    </p>

                    <h2>10. Changes to Terms</h2>
                    <p>
                        We may update these Terms of Service from time to time. We will notify users
                        of significant changes via email or through the Platform.
                    </p>

                    <div className="legal-contact">
                        <h2>Contact Us</h2>
                        <p>
                            If you have questions about these Terms of Service, please contact us at:{' '}
                            <a href="mailto:legal@matchop.com">legal@matchop.com</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TermsOfService
