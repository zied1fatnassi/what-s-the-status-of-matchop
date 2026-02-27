import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { lockOverlayScroll, unlockOverlayScroll } from '../../lib/overlayLock'
import { useBilingualText } from '../../lib/useBilingualText'
import './Admin.css'

export default function AdminReports() {
    const tr = useBilingualText()
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('pending')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [selectedReport, setSelectedReport] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [resolution, setResolution] = useState('')
    const pageSize = 20

    useEffect(() => {
        fetchReports()
    }, [currentPage, statusFilter])

    useEffect(() => {
        if (!showModal) return undefined
        lockOverlayScroll()
        return () => unlockOverlayScroll()
    }, [showModal])

    async function fetchReports() {
        setLoading(true)
        try {
            let query = supabase
                .from('reports')
                .select('*', { count: 'exact' })
                .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
                .order('created_at', { ascending: false })

            if (statusFilter !== 'all') query = query.eq('status', statusFilter)

            const { data, count, error } = await query
            if (error) throw error

            const reportsWithDetails = await Promise.all(
                (data || []).map(async (report) => {
                    const [reporterResult, reportedResult] = await Promise.all([
                        supabase.from('profiles').select('email').eq('id', report.reporter_id).single(),
                        supabase.from('profiles').select('email').eq('id', report.reported_id).single()
                    ])

                    return {
                        ...report,
                        reporter_email: reporterResult.data?.email || tr('Unknown', 'Inconnu'),
                        reported_email: reportedResult.data?.email || tr('Unknown', 'Inconnu')
                    }
                })
            )

            setReports(reportsWithDetails)
            setTotalCount(count || 0)
        } catch (error) {
            console.error('Error fetching reports:', error)
        } finally {
            setLoading(false)
        }
    }

    async function resolveReport(reportId, status, resolutionNote) {
        try {
            const { error } = await supabase
                .from('reports')
                .update({
                    status,
                    resolution: resolutionNote,
                    resolved_at: new Date().toISOString()
                })
                .eq('id', reportId)

            if (error) throw error

            await logAdminAction(`Resolved report as ${status}`, reportId)
            fetchReports()
            setShowModal(false)
            setResolution('')
        } catch (error) {
            console.error('Error resolving report:', error)
            alert(tr('Failed to resolve report', 'Echec de resolution du signalement'))
        }
    }

    async function suspendReportedUser(reportId, userId) {
        try {
            await supabase
                .from('profiles')
                .update({ suspended: true })
                .eq('id', userId)

            await supabase
                .from('reports')
                .update({
                    status: 'resolved',
                    resolution: 'User suspended',
                    resolved_at: new Date().toISOString()
                })
                .eq('id', reportId)

            await logAdminAction('Suspended user based on report', userId)
            fetchReports()
            setShowModal(false)
        } catch (error) {
            console.error('Error suspending user:', error)
            alert(tr('Failed to suspend user', "Echec de suspension de l'utilisateur"))
        }
    }

    async function logAdminAction(action, targetId) {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('admin_audit_logs').insert({
            admin_id: user?.id,
            admin_email: user?.email,
            action,
            target_id: targetId,
            target_type: 'report'
        })
    }

    const totalPages = Math.ceil(totalCount / pageSize)
    const statusLabel = (status) => {
        const map = {
            pending: tr('Pending', 'En attente'),
            resolved: tr('Resolved', 'Resolu'),
            dismissed: tr('Dismissed', 'Rejete')
        }
        return map[status] || status
    }

    function getReasonLabel(reason) {
        const labels = {
            harassment: tr('Harassment', 'Harcelement'),
            spam: tr('Spam', 'Spam'),
            fake_profile: tr('Fake Profile', 'Faux profil'),
            inappropriate: tr('Inappropriate Content', 'Contenu inapproprie'),
            scam: tr('Scam', 'Arnaque'),
            other: tr('Other', 'Autre')
        }
        return labels[reason] || reason
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>{tr('Reports Management', 'Gestion des signalements')}</h1>
                <p>{tr('Review and manage user reports', 'Examiner et gerer les signalements utilisateurs')}</p>
            </div>

            <div className="admin-toolbar">
                <select
                    className="admin-filter"
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value)
                        setCurrentPage(1)
                    }}
                >
                    <option value="pending">{tr('Pending', 'En attente')}</option>
                    <option value="resolved">{tr('Resolved', 'Resolus')}</option>
                    <option value="dismissed">{tr('Dismissed', 'Rejetes')}</option>
                    <option value="all">{tr('All Reports', 'Tous les signalements')}</option>
                </select>
            </div>

            <div className="admin-section">
                {loading ? (
                    <div className="admin-loading">{tr('Loading reports...', 'Chargement des signalements...')}</div>
                ) : reports.length === 0 ? (
                    <div className="no-activity">{tr('No reports found', 'Aucun signalement trouve')}</div>
                ) : (
                    <>
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>{tr('Reporter', 'Signaleur')}</th>
                                        <th>{tr('Reported User', 'Utilisateur signale')}</th>
                                        <th>{tr('Reason', 'Motif')}</th>
                                        <th>{tr('Status', 'Statut')}</th>
                                        <th>{tr('Date', 'Date')}</th>
                                        <th>{tr('Actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map((report) => (
                                        <tr key={report.id}>
                                            <td data-label={tr('Reporter', 'Signaleur')}>{report.reporter_email}</td>
                                            <td data-label={tr('Reported User', 'Utilisateur signale')}>{report.reported_email}</td>
                                            <td data-label={tr('Reason', 'Motif')}>{getReasonLabel(report.reason)}</td>
                                            <td data-label={tr('Status', 'Statut')}>
                                                <span className={`status-badge status-${report.status}`}>
                                                    {statusLabel(report.status)}
                                                </span>
                                            </td>
                                            <td data-label={tr('Date', 'Date')}>{new Date(report.created_at).toLocaleDateString()}</td>
                                            <td data-label={tr('Actions', 'Actions')} className="admin-actions-cell">
                                                <button
                                                    className="admin-btn admin-btn-primary admin-btn-sm"
                                                    onClick={() => {
                                                        setSelectedReport(report)
                                                        setShowModal(true)
                                                    }}
                                                >
                                                    {tr('Review', 'Examiner')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="admin-pagination">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                >
                                    {tr('Previous', 'Precedent')}
                                </button>
                                <span>{tr(`Page ${currentPage} of ${totalPages}`, `Page ${currentPage} sur ${totalPages}`)}</span>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                >
                                    {tr('Next', 'Suivant')}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showModal && selectedReport && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{tr('Review Report', 'Examiner le signalement')}</h2>

                        <div className="admin-form-group">
                            <label>{tr('Reporter', 'Signaleur')}</label>
                            <input type="text" value={selectedReport.reporter_email} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>{tr('Reported User', 'Utilisateur signale')}</label>
                            <input type="text" value={selectedReport.reported_email} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>{tr('Reason', 'Motif')}</label>
                            <input type="text" value={getReasonLabel(selectedReport.reason)} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>{tr('Description', 'Description')}</label>
                            <textarea value={selectedReport.description || tr('No details provided', 'Aucun detail fourni')} disabled rows={4} />
                        </div>

                        <div className="admin-form-group">
                            <label>{tr('Submitted', 'Soumis le')}</label>
                            <input type="text" value={new Date(selectedReport.created_at).toLocaleString()} disabled />
                        </div>

                        {selectedReport.status === 'pending' && (
                            <>
                                <div className="admin-form-group">
                                    <label>{tr('Resolution Note', 'Note de resolution')}</label>
                                    <textarea
                                        value={resolution}
                                        onChange={(e) => setResolution(e.target.value)}
                                        placeholder={tr('Add a note about the resolution...', 'Ajoutez une note de resolution...')}
                                        rows={3}
                                    />
                                </div>

                                <div className="admin-modal-actions admin-modal-actions--wrap">
                                    <button
                                        className="admin-btn admin-btn-danger"
                                        onClick={() => suspendReportedUser(selectedReport.id, selectedReport.reported_id)}
                                    >
                                        {tr('Suspend User', "Suspendre l'utilisateur")}
                                    </button>
                                    <button
                                        className="admin-btn admin-btn-success"
                                        onClick={() => resolveReport(selectedReport.id, 'resolved', resolution)}
                                    >
                                        {tr('Resolve', 'Resoudre')}
                                    </button>
                                    <button
                                        className="admin-btn admin-btn-warning"
                                        onClick={() => resolveReport(selectedReport.id, 'dismissed', resolution)}
                                    >
                                        {tr('Dismiss', 'Rejeter')}
                                    </button>
                                </div>
                            </>
                        )}

                        {selectedReport.status !== 'pending' && (
                            <>
                                <div className="admin-form-group">
                                    <label>{tr('Resolution', 'Resolution')}</label>
                                    <textarea value={selectedReport.resolution || tr('No resolution note', 'Aucune note de resolution')} disabled rows={2} />
                                </div>
                                <div className="admin-modal-actions">
                                    <button
                                        className="admin-btn admin-btn-primary"
                                        onClick={() => setShowModal(false)}
                                    >
                                        {tr('Close', 'Fermer')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
