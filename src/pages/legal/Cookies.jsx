import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import './Legal.css'

function Cookies() {
    const { t } = useTranslation()

    return (
        <div className="legal-page">
            <div className="legal-container">
                <Link to="/" className="legal-back-link">
                    <ArrowLeft size={18} />
                    {t('cookiesPage.backToHome')}
                </Link>

                <header className="legal-header">
                    <h1>{t('cookiesPage.title')}</h1>
                    <p className="last-updated">{t('cookiesPage.lastUpdated')}</p>
                </header>

                <div className="legal-content">
                    <h2>{t('cookiesPage.sections.whatAre.title')}</h2>
                    <p>{t('cookiesPage.sections.whatAre.body')}</p>

                    <h2>{t('cookiesPage.sections.howUse.title')}</h2>
                    <p>{t('cookiesPage.sections.howUse.body')}</p>
                    <ul>
                        <li>
                            <strong>{t('cookiesPage.sections.howUse.items.authenticateLabel')}</strong>{' '}
                            {t('cookiesPage.sections.howUse.items.authenticateBody')}
                        </li>
                        <li>
                            <strong>{t('cookiesPage.sections.howUse.items.rememberLabel')}</strong>{' '}
                            {t('cookiesPage.sections.howUse.items.rememberBody')}
                        </li>
                        <li>
                            <strong>{t('cookiesPage.sections.howUse.items.performanceLabel')}</strong>{' '}
                            {t('cookiesPage.sections.howUse.items.performanceBody')}
                        </li>
                        <li>
                            <strong>{t('cookiesPage.sections.howUse.items.analyzeLabel')}</strong>{' '}
                            {t('cookiesPage.sections.howUse.items.analyzeBody')}
                        </li>
                        <li>
                            <strong>{t('cookiesPage.sections.howUse.items.securityLabel')}</strong>{' '}
                            {t('cookiesPage.sections.howUse.items.securityBody')}
                        </li>
                    </ul>

                    <h2>{t('cookiesPage.sections.types.title')}</h2>

                    <h3>{t('cookiesPage.sections.types.essentialTitle')}</h3>
                    <p>{t('cookiesPage.sections.types.essentialBody')}</p>

                    <h3>{t('cookiesPage.sections.types.functionalTitle')}</h3>
                    <p>{t('cookiesPage.sections.types.functionalBody')}</p>

                    <h3>{t('cookiesPage.sections.types.analyticsTitle')}</h3>
                    <p>{t('cookiesPage.sections.types.analyticsBody')}</p>

                    <h2>{t('cookiesPage.sections.duration.title')}</h2>
                    <p>{t('cookiesPage.sections.duration.body')}</p>
                    <ul>
                        <li>
                            <strong>{t('cookiesPage.sections.duration.items.sessionLabel')}</strong>{' '}
                            {t('cookiesPage.sections.duration.items.sessionBody')}
                        </li>
                        <li>
                            <strong>{t('cookiesPage.sections.duration.items.persistentLabel')}</strong>{' '}
                            {t('cookiesPage.sections.duration.items.persistentBody')}
                        </li>
                    </ul>

                    <h2>{t('cookiesPage.sections.thirdParty.title')}</h2>
                    <p>{t('cookiesPage.sections.thirdParty.body')}</p>

                    <h2>{t('cookiesPage.sections.managing.title')}</h2>
                    <p>{t('cookiesPage.sections.managing.body')}</p>
                    <ul>
                        <li>{t('cookiesPage.sections.managing.items.viewDelete')}</li>
                        <li>{t('cookiesPage.sections.managing.items.block')}</li>
                        <li>{t('cookiesPage.sections.managing.items.notify')}</li>
                        <li>{t('cookiesPage.sections.managing.items.autoClear')}</li>
                    </ul>
                    <p>{t('cookiesPage.sections.managing.items.note')}</p>

                    <h2>{t('cookiesPage.sections.changes.title')}</h2>
                    <p>{t('cookiesPage.sections.changes.body')}</p>

                    <div className="legal-contact">
                        <h2>{t('cookiesPage.sections.contact.title')}</h2>
                        <p>
                            {t('cookiesPage.sections.contact.prefix')}{' '}
                            <a href="mailto:legal@matchop.com">legal@matchop.com</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Cookies
