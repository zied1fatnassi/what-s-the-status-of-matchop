import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import './Legal.css'

/**
 * Privacy Policy Page
 * Displays the application's privacy policy and data handling practices
 */
function PrivacyPolicy() {
    const { t } = useTranslation()

    return (
        <div className="legal-page">
            <div className="legal-container">
                <Link to="/" className="legal-back-link">
                    <ArrowLeft size={18} />
                    {t('privacyPage.backToHome')}
                </Link>

                <header className="legal-header">
                    <h1>{t('privacyPage.title')}</h1>
                    <p className="last-updated">{t('privacyPage.lastUpdated')}</p>
                </header>

                <div className="legal-content">
                    <h2>{t('privacyPage.sections.introduction.title')}</h2>
                    <p>
                        {t('privacyPage.sections.introduction.body')}
                    </p>

                    <h2>{t('privacyPage.sections.collection.title')}</h2>
                    <h3>{t('privacyPage.sections.collection.personalTitle')}</h3>
                    <p>{t('privacyPage.sections.collection.personalBody')}</p>
                    <ul>
                        <li>{t('privacyPage.sections.collection.personalItems.nameEmail')}</li>
                        <li>{t('privacyPage.sections.collection.personalItems.education')}</li>
                        <li>{t('privacyPage.sections.collection.personalItems.companyInfo')}</li>
                        <li>{t('privacyPage.sections.collection.personalItems.profileDetails')}</li>
                        <li>{t('privacyPage.sections.collection.personalItems.messages')}</li>
                    </ul>

                    <h3>{t('privacyPage.sections.collection.usageTitle')}</h3>
                    <p>{t('privacyPage.sections.collection.usageBody')}</p>
                    <ul>
                        <li>{t('privacyPage.sections.collection.usageItems.deviceBrowser')}</li>
                        <li>{t('privacyPage.sections.collection.usageItems.ipLocation')}</li>
                        <li>{t('privacyPage.sections.collection.usageItems.pagesFeatures')}</li>
                        <li>{t('privacyPage.sections.collection.usageItems.swipeHistory')}</li>
                    </ul>

                    <h2>{t('privacyPage.sections.usage.title')}</h2>
                    <p>{t('privacyPage.sections.usage.body')}</p>
                    <ul>
                        <li>{t('privacyPage.sections.usage.items.provideImprove')}</li>
                        <li>{t('privacyPage.sections.usage.items.accountManagement')}</li>
                        <li>{t('privacyPage.sections.usage.items.facilitateConnections')}</li>
                        <li>{t('privacyPage.sections.usage.items.notifications')}</li>
                        <li>{t('privacyPage.sections.usage.items.analytics')}</li>
                        <li>{t('privacyPage.sections.usage.items.security')}</li>
                    </ul>

                    <h2>{t('privacyPage.sections.sharing.title')}</h2>
                    <p>{t('privacyPage.sections.sharing.body')}</p>
                    <ul>
                        <li>
                            <strong>{t('privacyPage.sections.sharing.items.otherUsersLabel')}</strong>{' '}
                            {t('privacyPage.sections.sharing.items.otherUsersBody')}
                        </li>
                        <li>
                            <strong>{t('privacyPage.sections.sharing.items.providersLabel')}</strong>{' '}
                            {t('privacyPage.sections.sharing.items.providersBody')}
                        </li>
                        <li>
                            <strong>{t('privacyPage.sections.sharing.items.legalLabel')}</strong>{' '}
                            {t('privacyPage.sections.sharing.items.legalBody')}
                        </li>
                    </ul>
                    <p>
                        {t('privacyPage.sections.sharing.noSell')}
                    </p>

                    <h2>{t('privacyPage.sections.security.title')}</h2>
                    <p>
                        {t('privacyPage.sections.security.body')}
                    </p>

                    <h2>{t('privacyPage.sections.rights.title')}</h2>
                    <p>{t('privacyPage.sections.rights.body')}</p>
                    <ul>
                        <li>{t('privacyPage.sections.rights.items.access')}</li>
                        <li>{t('privacyPage.sections.rights.items.correct')}</li>
                        <li>{t('privacyPage.sections.rights.items.delete')}</li>
                        <li>{t('privacyPage.sections.rights.items.optOut')}</li>
                        <li>{t('privacyPage.sections.rights.items.portability')}</li>
                    </ul>

                    <h2>{t('privacyPage.sections.cookies.title')}</h2>
                    <p>
                        {t('privacyPage.sections.cookies.body')}
                    </p>

                    <h2>{t('privacyPage.sections.children.title')}</h2>
                    <p>
                        {t('privacyPage.sections.children.body')}
                    </p>

                    <h2>{t('privacyPage.sections.international.title')}</h2>
                    <p>
                        {t('privacyPage.sections.international.body')}
                    </p>

                    <h2>{t('privacyPage.sections.changes.title')}</h2>
                    <p>
                        {t('privacyPage.sections.changes.body')}
                    </p>

                    <div className="legal-contact">
                        <h2>{t('privacyPage.sections.contact.title')}</h2>
                        <p>
                            {t('privacyPage.sections.contact.prefix')}{' '}
                            <a href="mailto:contact@matchop.tech">contact@matchop.tech</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PrivacyPolicy
