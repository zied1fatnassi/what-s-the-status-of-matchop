import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './Admin.css'

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalStudents: 0,
        totalCompanies: 0,
        totalOffers: 0,
        activeOffers: 0,
        totalMatches: 0,
        totalApplications: 0,
        pendingReports: 0
    })
    const [recentActivity, setRecentActivity] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    async function fetchDashboardData() {
        try {
            // Fetch counts in parallel
            const [
                { count: totalUsers },
                { count: totalStudents },
                { count: totalCompanies },
                { count: totalOffers },
                { count: activeOffers },
                { count: totalMatches },
                { count: pendingReports }
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('students').select('*', { count: 'exact', head: true }),
                supabase.from('companies').select('*', { count: 'exact', head: true }),
                supabase.from('offers').select('*', { count: 'exact', head: true }),
                supabase.from('offers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
                supabase.from('matches').select('*', { count: 'exact', head: true }),
                supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
            ])

            setStats({
                totalUsers: totalUsers || 0,
                totalStudents: totalStudents || 0,
                totalCompanies: totalCompanies || 0,
                totalOffers: totalOffers || 0,
                activeOffers: activeOffers || 0,
                totalMatches: totalMatches || 0,
                totalApplications: 0, // Add if you have applications table
                pendingReports: pendingReports || 0
            })

            // Fetch recent activity (audit logs if available)
            const { data: logs } = await supabase
                .from('admin_audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10)

            setRecentActivity(logs || [])
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="admin-container">
                <div className="admin-loading">Loading dashboard...</div>
            </div>
        )
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>🎛️ Admin Dashboard</h1>
                <p>Welcome to the MATCHOP administration panel</p>
            </div>

            {/* Stats Grid */}
            <div className="admin-stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>{stats.totalUsers}</h3>
                        <p>Total Users</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🎓</div>
                    <div className="stat-content">
                        <h3>{stats.totalStudents}</h3>
                        <p>Students</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🏢</div>
                    <div className="stat-content">
                        <h3>{stats.totalCompanies}</h3>
                        <p>Companies</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">💼</div>
                    <div className="stat-content">
                        <h3>{stats.totalOffers}</h3>
                        <p>Total Offers</p>
                    </div>
                </div>

                <div className="stat-card highlight">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>{stats.activeOffers}</h3>
                        <p>Active Offers</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🤝</div>
                    <div className="stat-content">
                        <h3>{stats.totalMatches}</h3>
                        <p>Matches</p>
                    </div>
                </div>

                <div className="stat-card warning">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <h3>{stats.pendingReports}</h3>
                        <p>Pending Reports</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="admin-section">
                <h2>Quick Actions</h2>
                <div className="admin-quick-actions">
                    <Link to="/admin/users" className="quick-action-btn">
                        👥 Manage Users
                    </Link>
                    <Link to="/admin/offers" className="quick-action-btn">
                        💼 Manage Offers
                    </Link>
                    <Link to="/admin/companies" className="quick-action-btn">
                        🏢 Manage Companies
                    </Link>
                    <Link to="/admin/reports" className="quick-action-btn warning">
                        🚨 View Reports
                    </Link>
                    <Link to="/admin/analytics" className="quick-action-btn">
                        📊 Analytics
                    </Link>
                    <Link to="/admin/settings" className="quick-action-btn">
                        ⚙️ Settings
                    </Link>
                    <Link to="/admin/payments" className="quick-action-btn">
                        💳 Review Payments
                    </Link>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="admin-section">
                <h2>Recent Activity</h2>
                {recentActivity.length > 0 ? (
                    <div className="activity-list">
                        {recentActivity.map((log, index) => (
                            <div key={index} className="activity-item">
                                <span className="activity-action">{log.action}</span>
                                <span className="activity-user">{log.admin_email}</span>
                                <span className="activity-time">
                                    {new Date(log.created_at).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-activity">No recent activity logged</p>
                )}
            </div>
        </div>
    )
}
