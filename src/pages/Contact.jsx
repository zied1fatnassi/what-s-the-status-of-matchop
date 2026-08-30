import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react'
import './Contact.css'

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

        // Simulated API call
        setTimeout(() => {
            setIsSending(false)
            setIsSent(true)
        }, 800)
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
        <div className="contact-page container">
            <div className="contact-grid">
                {/* Info Side */}
                <div className="contact-info-panel">
                    <h1 className="contact-title">{t('contactPage.title')}</h1>
                    <p className="contact-subtitle">
                        {t('contactPage.subtitle')}
                    </p>

                    <div className="contact-info-list">
                        <div className="contact-info-item">
                            <div className="contact-icon-box">
                                <Mail size={22} />
                            </div>
                            <div className="contact-info-text">
                                <h3>{t('contactPage.info.emailLabel')}</h3>
                                <p>{t('contactPage.info.emailValue')}</p>
                            </div>
                        </div>

                        <div className="contact-info-item">
                            <div className="contact-icon-box">
                                <Phone size={22} />
                            </div>
                            <div className="contact-info-text">
                                <h3>{t('contactPage.info.phoneLabel')}</h3>
                                <p>{t('contactPage.info.phoneValue')}</p>
                            </div>
                        </div>

                        <div className="contact-info-item">
                            <div className="contact-icon-box">
                                <MapPin size={22} />
                            </div>
                            <div className="contact-info-text">
                                <h3>{t('contactPage.info.addressLabel')}</h3>
                                <p>{t('contactPage.info.addressValue')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Side */}
                <div className="contact-form-card">
                    {isSent ? (
                        <div className="contact-success-box">
                            <CheckCircle size={52} className="contact-success-icon" />
                            <h2>{t('contactPage.success.title')}</h2>
                            <p>{t('contactPage.success.message')}</p>
                            <button className="btn btn-secondary w-full" onClick={handleReset}>
                                {t('contactPage.success.sendAnother')}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="contact-form">
                            {error && (
                                <div className="auth-error">
                                    {error}
                                </div>
                            )}
                            <div className="contact-form-group">
                                <label htmlFor="contact-name">{t('contactPage.form.nameLabel')}</label>
                                <input
                                    id="contact-name"
                                    name="name"
                                    type="text"
                                    className="input"
                                    placeholder={t('contactPage.form.namePlaceholder')}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoComplete="name"
                                />
                            </div>
                            <div className="contact-form-group">
                                <label htmlFor="contact-email">{t('contactPage.form.emailLabel')}</label>
                                <input
                                    id="contact-email"
                                    name="email"
                                    type="email"
                                    className="input"
                                    placeholder={t('contactPage.form.emailPlaceholder')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                />
                            </div>
                            <div className="contact-form-group">
                                <label htmlFor="contact-subject">{t('contactPage.form.subjectLabel')}</label>
                                <input
                                    id="contact-subject"
                                    name="subject"
                                    type="text"
                                    className="input"
                                    placeholder={t('contactPage.form.subjectPlaceholder')}
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>
                            <div className="contact-form-group">
                                <label htmlFor="contact-message">{t('contactPage.form.messageLabel')}</label>
                                <textarea
                                    id="contact-message"
                                    name="message"
                                    className="input"
                                    rows="4"
                                    placeholder={t('contactPage.form.messagePlaceholder')}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>
                            <button className="btn btn-primary contact-submit-btn" type="submit" disabled={isSending}>
                                {isSending ? t('contactPage.form.sending') : (
                                    <>
                                        <span>{t('contactPage.form.sendMessage')}</span>
                                        <Send size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Contact
