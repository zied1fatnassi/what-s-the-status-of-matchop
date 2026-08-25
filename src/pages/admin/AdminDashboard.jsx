import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useBilingualText } from '../../lib/useBilingualText'
import './Admin.css'

export default function AdminDashboard() {
    const tr = useBilingualText()
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
                supabase.from('reported_users').select('*', { count: 'exact', head: true }).eq('status', 'pending')
            ])

            setStats({
                totalUsers: totalUsers || 0,
                totalStudents: totalStudents || 0,
                totalCompanies: totalCompanies || 0,
                totalOffers: totalOffers || 0,
                activeOffers: activeOffers || 0,
                totalMatches: totalMatches || 0,
                totalApplications: 0,
                pendingReports: pendingReports || 0
            })

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
                <div className="admin-loading">{tr('Loading dashboard...', 'Chargement du tableau de bord...')}</div>
            </div>
        )
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>{tr('Admin Dashboard', 'Tableau de bord admin')}</h1>
                <p>{tr('Welcome to the MATCHOP administration panel', "Bienvenue sur le panneau d'administration MATCHOP")}</p>
            </div>

            <div className="admin-stats-grid">
                <div className="stat-card">
                    <div className="stat-content">
                        <h3>{stats.totalUsers}</h3>
                        <p>{tr('Total Users', 'Utilisateurs totaux')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <h3>{stats.totalStudents}</h3>
                        <p>{tr('Students', 'Etudiants')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <h3>{stats.totalCompanies}</h3>
                        <p>{tr('Companies', 'Entreprises')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <h3>{stats.totalOffers}</h3>
                        <p>{tr('Total Offers', 'Offres totales')}</p>
                    </div>
                </div>

                <div className="stat-card highlight">
                    <div className="stat-content">
                        <h3>{stats.activeOffers}</h3>
                        <p>{tr('Active Offers', 'Offres actives')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <h3>{stats.totalMatches}</h3>
                        <p>{tr('Matches', 'Matchs')}</p>
                    </div>
                </div>

                <div className="stat-card warning">
                    <div className="stat-content">
                        <h3>{stats.pendingReports}</h3>
                        <p>{tr('Pending Reports', 'Signalements en attente')}</p>
                    </div>
                </div>
            </div>

            <div className="admin-section">
                <h2>{tr('Quick Actions', 'Actions rapides')}</h2>
                <div className="admin-quick-actions">
                    <Link to="/admin/users" className="quick-action-btn">
                        {tr('Manage Users', 'Gerer les utilisateurs')}
                    </Link>
                    <Link to="/admin/offers" className="quick-action-btn">
                        {tr('Manage Offers', 'Gerer les offres')}
                    </Link>
                    <Link to="/admin/companies" className="quick-action-btn">
                        {tr('Manage Companies', 'Gerer les entreprises')}
                    </Link>
                    <Link to="/admin/reports" className="quick-action-btn warning">
                        {tr('View Reports', 'Voir les signalements')}
                    </Link>
                    <Link to="/admin/analytics" className="quick-action-btn">
                        {tr('Analytics', 'Analyses')}
                    </Link>
                    <Link to="/admin/settings" className="quick-action-btn">
                        {tr('Settings', 'Parametres')}
                    </Link>
                    <Link to="/admin/payments" className="quick-action-btn">
                        {tr('Review Payments', 'Verifier les paiements')}
                    </Link>
                </div>
            </div>

            <div className="admin-section">
                <h2>{tr('Recent Activity', 'Activite recente')}</h2>
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
                    <p className="no-activity">{tr('No recent activity logged', 'Aucune activite recente')}</p>
                )}
            </div>
        </div>
    )
}
