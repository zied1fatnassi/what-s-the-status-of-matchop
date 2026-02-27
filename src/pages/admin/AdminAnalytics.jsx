import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useBilingualText } from '../../lib/useBilingualText'
import './Admin.css'

export default function AdminAnalytics() {
    const tr = useBilingualText()
    const [analytics, setAnalytics] = useState({
        userGrowth: [],
        offerStats: [],
        matchStats: [],
        topCompanies: [],
        topSkills: [],
        locationStats: []
    })
    const [loading, setLoading] = useState(true)
    const [timeRange, setTimeRange] = useState('30')

    useEffect(() => {
        fetchAnalytics()
    }, [timeRange])

    async function fetchAnalytics() {
        setLoading(true)
        try {
            const daysAgo = new Date()
            daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange, 10))

            const [
                { data: users },
                { data: offers },
                { data: matches },
                { data: companies },
                { count: newUsers },
                { count: newOffers },
                { count: newMatches }
            ] = await Promise.all([
                supabase.from('profiles').select('created_at'),
                supabase.from('offers').select('created_at, status, location, required_skills'),
                supabase.from('matches').select('created_at'),
                supabase.from('companies').select('id, company_name').limit(10),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', daysAgo.toISOString()),
                supabase.from('offers').select('*', { count: 'exact', head: true }).gte('created_at', daysAgo.toISOString()),
                supabase.from('matches').select('*', { count: 'exact', head: true }).gte('created_at', daysAgo.toISOString())
            ])

            const companiesWithOffers = await Promise.all(
                (companies || []).map(async (company) => {
                    const { count } = await supabase
                        .from('offers')
                        .select('*', { count: 'exact', head: true })
                        .eq('company_id', company.id)
                    return { ...company, offerCount: count || 0 }
                })
            )

            const skillCounts = {}
            ;(offers || []).forEach((offer) => {
                (offer.required_skills || []).forEach((skill) => {
                    skillCounts[skill] = (skillCounts[skill] || 0) + 1
                })
            })
            const topSkills = Object.entries(skillCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([skill, count]) => ({ skill, count }))

            const locationCounts = {}
            ;(offers || []).forEach((offer) => {
                const loc = offer.location || 'Remote'
                locationCounts[loc] = (locationCounts[loc] || 0) + 1
            })
            const locationStats = Object.entries(locationCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([location, count]) => ({ location, count }))

            const { data: profileTypes } = await supabase
                .from('user_profiles')
                .select('profile_type')

            const roleCounts = { student: 0, company: 0, admin: 0 }
            ;(profileTypes || []).forEach((up) => {
                if (roleCounts[up.profile_type] !== undefined) roleCounts[up.profile_type]++
            })

            setAnalytics({
                newUsers: newUsers || 0,
                newOffers: newOffers || 0,
                newMatches: newMatches || 0,
                totalUsers: users?.length || 0,
                totalOffers: offers?.length || 0,
                totalMatches: matches?.length || 0,
                roleCounts,
                topCompanies: companiesWithOffers.sort((a, b) => b.offerCount - a.offerCount).slice(0, 5),
                topSkills,
                locationStats,
                activeOffers: offers?.filter((o) => o.status === 'active').length || 0
            })
        } catch (error) {
            console.error('Error fetching analytics:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="admin-container">
                <div className="admin-loading">{tr('Loading analytics...', 'Chargement des analyses...')}</div>
            </div>
        )
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>{tr('Analytics Dashboard', "Tableau de bord d'analyse")}</h1>
                <p>{tr('Platform performance and insights', 'Performance et informations de la plateforme')}</p>
            </div>

            <div className="admin-toolbar">
                <select
                    className="admin-filter"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                >
                    <option value="7">{tr('Last 7 days', '7 derniers jours')}</option>
                    <option value="30">{tr('Last 30 days', '30 derniers jours')}</option>
                    <option value="90">{tr('Last 90 days', '90 derniers jours')}</option>
                    <option value="365">{tr('Last year', 'Derniere annee')}</option>
                </select>
            </div>

            <div className="admin-stats-grid">
                <div className="stat-card highlight">
                    <div className="stat-content">
                        <h3>+{analytics.newUsers}</h3>
                        <p>{tr(`New Users (${timeRange}d)`, `Nouveaux utilisateurs (${timeRange}j)`)}</p>
                    </div>
                </div>

                <div className="stat-card highlight">
                    <div className="stat-content">
                        <h3>+{analytics.newOffers}</h3>
                        <p>{tr(`New Offers (${timeRange}d)`, `Nouvelles offres (${timeRange}j)`)}</p>
                    </div>
                </div>

                <div className="stat-card highlight">
                    <div className="stat-content">
                        <h3>+{analytics.newMatches}</h3>
                        <p>{tr(`New Matches (${timeRange}d)`, `Nouveaux matchs (${timeRange}j)`)}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <h3>{analytics.activeOffers}</h3>
                        <p>{tr('Active Offers', 'Offres actives')}</p>
                    </div>
                </div>
            </div>

            <div className="admin-section">
                <h2>{tr('User Distribution', 'Repartition des utilisateurs')}</h2>
                <div className="analytics-bars">
                    <div className="analytics-bar-item">
                        <span className="bar-label">{tr('Students', 'Etudiants')}</span>
                        <div className="bar-container">
                            <div
                                className="bar-fill student"
                                style={{
                                    width: `${(analytics.roleCounts.student / analytics.totalUsers * 100) || 0}%`
                                }}
                            />
                        </div>
                        <span className="bar-value">{analytics.roleCounts.student}</span>
                    </div>
                    <div className="analytics-bar-item">
                        <span className="bar-label">{tr('Companies', 'Entreprises')}</span>
                        <div className="bar-container">
                            <div
                                className="bar-fill company"
                                style={{
                                    width: `${(analytics.roleCounts.company / analytics.totalUsers * 100) || 0}%`
                                }}
                            />
                        </div>
                        <span className="bar-value">{analytics.roleCounts.company}</span>
                    </div>
                    <div className="analytics-bar-item">
                        <span className="bar-label">{tr('Admins', 'Admins')}</span>
                        <div className="bar-container">
                            <div
                                className="bar-fill admin"
                                style={{
                                    width: `${(analytics.roleCounts.admin / analytics.totalUsers * 100) || 0}%`
                                }}
                            />
                        </div>
                        <span className="bar-value">{analytics.roleCounts.admin}</span>
                    </div>
                </div>
            </div>

            <div className="admin-analytics-grid">
                <div className="admin-section">
                    <h2>{tr('Top Companies by Offers', 'Top entreprises par offres')}</h2>
                    {analytics.topCompanies.length > 0 ? (
                        <div className="analytics-list">
                            {analytics.topCompanies.map((company, index) => (
                                <div key={company.id} className="analytics-list-item">
                                    <span className="rank">#{index + 1}</span>
                                    <span className="name">{company.company_name}</span>
                                    <span className="value">{company.offerCount} {tr('offers', 'offres')}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-activity">{tr('No data available', 'Aucune donnee disponible')}</p>
                    )}
                </div>

                <div className="admin-section">
                    <h2>{tr('Most Requested Skills', 'Competences les plus demandees')}</h2>
                    {analytics.topSkills.length > 0 ? (
                        <div className="analytics-list">
                            {analytics.topSkills.map((item, index) => (
                                <div key={item.skill} className="analytics-list-item">
                                    <span className="rank">#{index + 1}</span>
                                    <span className="name">{item.skill}</span>
                                    <span className="value">{item.count} {tr('offers', 'offres')}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-activity">{tr('No data available', 'Aucune donnee disponible')}</p>
                    )}
                </div>

                <div className="admin-section">
                    <h2>{tr('Top Locations', 'Top localisations')}</h2>
                    {analytics.locationStats.length > 0 ? (
                        <div className="analytics-list">
                            {analytics.locationStats.map((item, index) => (
                                <div key={item.location} className="analytics-list-item">
                                    <span className="rank">#{index + 1}</span>
                                    <span className="name">{item.location}</span>
                                    <span className="value">{item.count} {tr('offers', 'offres')}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-activity">{tr('No data available', 'Aucune donnee disponible')}</p>
                    )}
                </div>
            </div>
        </div>
    )
}
