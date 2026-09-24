import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function StudentMatchesTabs() {
    const { t } = useTranslation()

    return (
        <nav className="matches-tabs" aria-label={t('matches.tabs.navigationAria')}>
            <NavLink
                to="/student/matches"
                end
                className={({ isActive }) => `matches-tab${isActive ? ' active' : ''}`}
            >
                {t('matches.tabs.matches')}
            </NavLink>
            <NavLink
                to="/student/external-matches"
                end
                className={({ isActive }) => `matches-tab${isActive ? ' active' : ''}`}
            >
                {t('matches.tabs.externalMatches')}
            </NavLink>
        </nav>
    )
}

export default StudentMatchesTabs
