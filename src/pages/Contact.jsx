import React from 'react'
import { Mail, Phone, MapPin, Send } from 'lucide-react'

const Contact = () => {
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
                    <form>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Your Name</label>
                            <input type="text" className="input" placeholder="e.g. Sarah Smith" />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email Address</label>
                            <input type="email" className="input" placeholder="sarah@example.com" />
                        </div>
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Message</label>
                            <textarea className="input" rows="5" placeholder="How can we help you?"></textarea>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }}>
                            Send Message <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>

        </div>
    )
}

export default Contact
