import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import './Admin.css'

export default function AdminAnalytics() {
    const [analytics, setAnalytics] = useState({
        userGrowth: [],
        offerStats: [],
        matchStats: [],
        topCompanies: [],
        topSkills: [],
        locationStats: []
    })
    const [loading, setLoading] = useState(true)
    const [timeRange, setTimeRange] = useState('30') // days

    useEffect(() => {
        fetchAnalytics()
    }, [timeRange])

    async function fetchAnalytics() {
        setLoading(true)
        try {
            const daysAgo = new Date()
            daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange))

            // Fetch various analytics in parallel
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

            // Calculate top companies by offer count
            const companiesWithOffers = await Promise.all(
                (companies || []).map(async (company) => {
                    const { count } = await supabase
                        .from('offers')
                        .select('*', { count: 'exact', head: true })
                        .eq('company_id', company.id)
                    return { ...company, offerCount: count || 0 }
                })
            )

            // Calculate skill distribution
            const skillCounts = {}
                ; (offers || []).forEach(offer => {
                    (offer.required_skills || []).forEach(skill => {
                        skillCounts[skill] = (skillCounts[skill] || 0) + 1
                    })
                })
            const topSkills = Object.entries(skillCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([skill, count]) => ({ skill, count }))

            // Calculate location distribution
            const locationCounts = {}
                ; (offers || []).forEach(offer => {
                    const loc = offer.location || 'Remote'
                    locationCounts[loc] = (locationCounts[loc] || 0) + 1
                })
            const locationStats = Object.entries(locationCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([location, count]) => ({ location, count }))

            // Calculate role distribution from user_profiles
            const { data: profileTypes } = await supabase
                .from('user_profiles')
                .select('profile_type')

            const roleCounts = { student: 0, company: 0, admin: 0 }
                ; (profileTypes || []).forEach(up => {
                    if (roleCounts[up.profile_type] !== undefined) {
                        roleCounts[up.profile_type]++
                    }
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
                activeOffers: offers?.filter(o => o.status === 'active').length || 0
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
                <div className="admin-loading">Loading analytics...</div>
            </div>
        )
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>📊 Analytics Dashboard</h1>
                <p>Platform performance and insights</p>
            </div>

            {/* Time Range Selector */}
            <div className="admin-toolbar">
                <select
                    className="admin-filter"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last year</option>
                </select>
            </div>

            {/* Growth Stats */}
            <div className="admin-stats-grid">
                <div className="stat-card highlight">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>+{analytics.newUsers}</h3>
                        <p>New Users ({timeRange}d)</p>
                    </div>
                </div>

                <div className="stat-card highlight">
                    <div className="stat-icon">💼</div>
                    <div className="stat-content">
                        <h3>+{analytics.newOffers}</h3>
                        <p>New Offers ({timeRange}d)</p>
                    </div>
                </div>

                <div className="stat-card highlight">
                    <div className="stat-icon">🤝</div>
                    <div className="stat-content">
                        <h3>+{analytics.newMatches}</h3>
                        <p>New Matches ({timeRange}d)</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div className="stat-content">
                        <h3>{analytics.activeOffers}</h3>
                        <p>Active Offers</p>
                    </div>
                </div>
            </div>

            {/* User Distribution */}
            <div className="admin-section">
                <h2>User Distribution</h2>
                <div className="analytics-bars">
                    <div className="analytics-bar-item">
                        <span className="bar-label">Students</span>
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
                        <span className="bar-label">Companies</span>
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
                        <span className="bar-label">Admins</span>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                {/* Top Companies */}
                <div className="admin-section">
                    <h2>🏢 Top Companies by Offers</h2>
                    {analytics.topCompanies.length > 0 ? (
                        <div className="analytics-list">
                            {analytics.topCompanies.map((company, index) => (
                                <div key={company.id} className="analytics-list-item">
                                    <span className="rank">#{index + 1}</span>
                                    <span className="name">{company.company_name}</span>
                                    <span className="value">{company.offerCount} offers</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-activity">No data available</p>
                    )}
                </div>

                {/* Top Skills */}
                <div className="admin-section">
                    <h2>🛠️ Most Requested Skills</h2>
                    {analytics.topSkills.length > 0 ? (
                        <div className="analytics-list">
                            {analytics.topSkills.map((item, index) => (
                                <div key={item.skill} className="analytics-list-item">
                                    <span className="rank">#{index + 1}</span>
                                    <span className="name">{item.skill}</span>
                                    <span className="value">{item.count} offers</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-activity">No data available</p>
                    )}
                </div>

                {/* Location Distribution */}
                <div className="admin-section">
                    <h2>📍 Top Locations</h2>
                    {analytics.locationStats.length > 0 ? (
                        <div className="analytics-list">
                            {analytics.locationStats.map((item, index) => (
                                <div key={item.location} className="analytics-list-item">
                                    <span className="rank">#{index + 1}</span>
                                    <span className="name">{item.location}</span>
                                    <span className="value">{item.count} offers</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-activity">No data available</p>
                    )}
                </div>
            </div>

            <style>{`
                .analytics-bars {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .analytics-bar-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .bar-label {
                    min-width: 100px;
                    color: rgba(255, 255, 255, 0.8);
                }
                .bar-container {
                    flex: 1;
                    height: 24px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    overflow: hidden;
                }
                .bar-fill {
                    height: 100%;
                    border-radius: 12px;
                    transition: width 0.5s ease;
                }
                .bar-fill.student { background: linear-gradient(90deg, #2196f3, #64b5f6); }
                .bar-fill.company { background: linear-gradient(90deg, #4caf50, #81c784); }
                .bar-fill.admin { background: linear-gradient(90deg, #ff9800, #ffb74d); }
                .bar-value {
                    min-width: 50px;
                    text-align: right;
                    color: white;
                    font-weight: 600;
                }
                .analytics-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .analytics-list-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.75rem 1rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                }
                .analytics-list-item .rank {
                    color: #2196f3;
                    font-weight: 600;
                    min-width: 30px;
                }
                .analytics-list-item .name {
                    flex: 1;
                    color: white;
                }
                .analytics-list-item .value {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.9rem;
                }
            `}</style>
        </div>
    )
}
