import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import './Legal.css'

/**
 * Terms of Service Page
 * Displays the application's terms and conditions
 */
function TermsOfService() {
    const { t } = useTranslation()

    return (
        <div className="legal-page">
            <div className="legal-container">
                <Link to="/" className="legal-back-link">
                    <ArrowLeft size={18} />
                    {t('termsPage.backToHome')}
                </Link>

                <header className="legal-header">
                    <h1>{t('termsPage.title')}</h1>
                    <p className="last-updated">{t('termsPage.lastUpdated')}</p>
                </header>

                <div className="legal-content">
                    <h2>{t('termsPage.sections.acceptance.title')}</h2>
                    <p>
                        {t('termsPage.sections.acceptance.body')}
                    </p>

                    <h2>{t('termsPage.sections.service.title')}</h2>
                    <p>
                        {t('termsPage.sections.service.body')}
                    </p>
                    <ul>
                        <li>{t('termsPage.sections.service.items.profile')}</li>
                        <li>{t('termsPage.sections.service.items.discovery')}</li>
                        <li>{t('termsPage.sections.service.items.matching')}</li>
                        <li>{t('termsPage.sections.service.items.messaging')}</li>
                    </ul>

                    <h2>{t('termsPage.sections.accounts.title')}</h2>
                    <h3>{t('termsPage.sections.accounts.registrationTitle')}</h3>
                    <p>
                        {t('termsPage.sections.accounts.registrationBody')}
                    </p>

                    <h3>{t('termsPage.sections.accounts.typesTitle')}</h3>
                    <p>
                        {t('termsPage.sections.accounts.typesBody')}
                    </p>
                    <ul>
                        <li>
                            <strong>{t('termsPage.sections.accounts.items.studentLabel')}</strong>{' '}
                            {t('termsPage.sections.accounts.items.studentBody')}
                        </li>
                        <li>
                            <strong>{t('termsPage.sections.accounts.items.companyLabel')}</strong>{' '}
                            {t('termsPage.sections.accounts.items.companyBody')}
                        </li>
                    </ul>

                    <h2>{t('termsPage.sections.conduct.title')}</h2>
                    <p>{t('termsPage.sections.conduct.body')}</p>
                    <ul>
                        <li>{t('termsPage.sections.conduct.items.falseInfo')}</li>
                        <li>{t('termsPage.sections.conduct.items.harassment')}</li>
                        <li>{t('termsPage.sections.conduct.items.unlawful')}</li>
                        <li>{t('termsPage.sections.conduct.items.unauthorizedAccess')}</li>
                        <li>{t('termsPage.sections.conduct.items.spam')}</li>
                    </ul>

                    <h2>{t('termsPage.sections.content.title')}</h2>
                    <p>
                        {t('termsPage.sections.content.body')}
                    </p>

                    <h2>{t('termsPage.sections.privacy.title')}</h2>
                    <p>
                        {t('termsPage.sections.privacy.prefix')}{' '}
                        <Link to="/legal/privacy">{t('termsPage.sections.privacy.link')}</Link>{' '}
                        {t('termsPage.sections.privacy.suffix')}
                    </p>

                    <h2>{t('termsPage.sections.termination.title')}</h2>
                    <p>
                        {t('termsPage.sections.termination.body')}
                    </p>

                    <h2>{t('termsPage.sections.disclaimers.title')}</h2>
                    <p>
                        {t('termsPage.sections.disclaimers.body')}
                    </p>

                    <h2>{t('termsPage.sections.liability.title')}</h2>
                    <p>
                        {t('termsPage.sections.liability.body')}
                    </p>

                    <h2>{t('termsPage.sections.changes.title')}</h2>
                    <p>
                        {t('termsPage.sections.changes.body')}
                    </p>

                    <div className="legal-contact">
                        <h2>{t('termsPage.sections.contact.title')}</h2>
                        <p>
                            {t('termsPage.sections.contact.prefix')}{' '}
                            <a href="mailto:legal@matchop.com">legal@matchop.com</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TermsOfService
