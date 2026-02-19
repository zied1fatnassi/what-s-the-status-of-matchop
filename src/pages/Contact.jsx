import React, { useState } from 'react'
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react'

const Contact = () => {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isSent, setIsSent] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        setError('')

        // Validate all fields are filled
        if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
            setError('Please fill in all fields.')
            return
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address.')
            return
        }

        setIsSending(true)

        // TODO: Replace with actual API call
        setTimeout(() => {
            setIsSending(false)
            setIsSent(true)
        }, 1000)
    }

    const handleReset = () => {
        setName('')
        setEmail('')
        setSubject('')
        setMessage('')
        setError('')
        setIsSent(false)
    }

    return (
        <div className="container" style={{ padding: '4rem 1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 'clamp(1.5rem, 4vw, 4rem)', alignItems: 'start' }}>

                {/* Info Side */}
                <div>
                    <h1 style={{ marginBottom: '1.5rem' }}>Get in Touch</h1>
                    <p style={{ marginBottom: '3rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                        Have questions about MatchOp? We're here to help. Reach out to our team for support, partnerships, or generalized inquiries.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'var(--glass-surface-hover)', borderRadius: '1rem', color: 'var(--primary)' }}>
                                <Mail size={24} />
                            </div>
                            <div>
                                <h3 style={{ marginBottom: '0.25rem' }}>Email Us</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>support@matchop.tn</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'var(--glass-surface-hover)', borderRadius: '1rem', color: 'var(--primary)' }}>
                                <Phone size={24} />
                            </div>
                            <div>
                                <h3 style={{ marginBottom: '0.25rem' }}>Call Us</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>+216 71 123 456</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'var(--glass-surface-hover)', borderRadius: '1rem', color: 'var(--primary)' }}>
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h3 style={{ marginBottom: '0.25rem' }}>Visit Us</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>5111 Avenue Mahdia, El Mourouj</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Side */}
                <div className="glass-card" style={{ padding: '3rem' }}>
                    {isSent ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '1rem' }} />
                            <h2 style={{ marginBottom: '0.5rem' }}>Thank You!</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                                Your message has been sent successfully. We'll get back to you as soon as possible.
                            </p>
                            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleReset}>
                                Send Another Message
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.75rem', color: '#ef4444', fontSize: '0.9rem' }}>
                                    {error}
                                </div>
                            )}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Your Name</label>
                                <input type="text" className="input" placeholder="e.g. Sarah Smith" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email Address</label>
                                <input type="email" className="input" placeholder="sarah@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Subject</label>
                                <input type="text" className="input" placeholder="What is this about?" value={subject} onChange={(e) => setSubject(e.target.value)} />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Message</label>
                                <textarea className="input" rows="5" placeholder="How can we help you?" value={message} onChange={(e) => setMessage(e.target.value)}></textarea>
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={isSending}>
                                {isSending ? 'Sending...' : 'Send Message'} {!isSending && <Send size={18} />}
                            </button>
                        </form>
                    )}
                </div>
            </div>

        </div>
    )
}

export default Contact
