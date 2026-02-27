import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react'

const Contact = () => {
    const { t } = useTranslation()
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
            setError(t('contactPage.errors.requiredFields'))
            return
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            setError(t('contactPage.errors.invalidEmail'))
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
                    <h1 style={{ marginBottom: '1.5rem' }}>{t('contactPage.title')}</h1>
                    <p style={{ marginBottom: '3rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                        {t('contactPage.subtitle')}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'var(--glass-surface-hover)', borderRadius: '1rem', color: 'var(--primary)' }}>
                                <Mail size={24} />
                            </div>
                            <div>
                                <h3 style={{ marginBottom: '0.25rem' }}>{t('contactPage.info.emailLabel')}</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>{t('contactPage.info.emailValue')}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'var(--glass-surface-hover)', borderRadius: '1rem', color: 'var(--primary)' }}>
                                <Phone size={24} />
                            </div>
                            <div>
                                <h3 style={{ marginBottom: '0.25rem' }}>{t('contactPage.info.phoneLabel')}</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>{t('contactPage.info.phoneValue')}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'var(--glass-surface-hover)', borderRadius: '1rem', color: 'var(--primary)' }}>
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h3 style={{ marginBottom: '0.25rem' }}>{t('contactPage.info.addressLabel')}</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>{t('contactPage.info.addressValue')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Side */}
                <div className="glass-card" style={{ padding: '3rem' }}>
                    {isSent ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '1rem' }} />
                            <h2 style={{ marginBottom: '0.5rem' }}>{t('contactPage.success.title')}</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                                {t('contactPage.success.message')}
                            </p>
                            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleReset}>
                                {t('contactPage.success.sendAnother')}
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
                                <label htmlFor="contact-name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>{t('contactPage.form.nameLabel')}</label>
                                <input id="contact-name" name="name" type="text" className="input" placeholder={t('contactPage.form.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label htmlFor="contact-email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>{t('contactPage.form.emailLabel')}</label>
                                <input id="contact-email" name="email" type="email" className="input" placeholder={t('contactPage.form.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label htmlFor="contact-subject" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>{t('contactPage.form.subjectLabel')}</label>
                                <input id="contact-subject" name="subject" type="text" className="input" placeholder={t('contactPage.form.subjectPlaceholder')} value={subject} onChange={(e) => setSubject(e.target.value)} autoComplete="off" />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label htmlFor="contact-message" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>{t('contactPage.form.messageLabel')}</label>
                                <textarea id="contact-message" name="message" className="input" rows="5" placeholder={t('contactPage.form.messagePlaceholder')} value={message} onChange={(e) => setMessage(e.target.value)} autoComplete="off"></textarea>
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={isSending}>
                                {isSending ? t('contactPage.form.sending') : t('contactPage.form.sendMessage')} {!isSending && <Send size={18} />}
                            </button>
                        </form>
                    )}
                </div>
            </div>

        </div>
    )
}

export default Contact
