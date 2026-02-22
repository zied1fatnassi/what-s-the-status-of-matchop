import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { lockOverlayScroll, unlockOverlayScroll } from '../../lib/overlayLock'
import './Admin.css'

export default function AdminReports() {
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

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            }

            const { data, count, error } = await query

            if (error) throw error

            // Fetch reporter and reported user details
            const reportsWithDetails = await Promise.all(
                (data || []).map(async (report) => {
                    const [reporterResult, reportedResult] = await Promise.all([
                        supabase.from('profiles').select('email').eq('id', report.reporter_id).single(),
                        supabase.from('profiles').select('email').eq('id', report.reported_id).single()
                    ])

                    return {
                        ...report,
                        reporter_email: reporterResult.data?.email || 'Unknown',
                        reported_email: reportedResult.data?.email || 'Unknown'
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
            alert('Failed to resolve report')
        }
    }

    async function suspendReportedUser(reportId, userId) {
        try {
            // Suspend the user
            await supabase
                .from('profiles')
                .update({ suspended: true })
                .eq('id', userId)

            // Update report
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
            alert('Failed to suspend user')
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

    function getReasonLabel(reason) {
        const labels = {
            'harassment': '🚫 Harassment',
            'spam': '📧 Spam',
            'fake_profile': '🎭 Fake Profile',
            'inappropriate': '⚠️ Inappropriate Content',
            'scam': '💰 Scam',
            'other': '📝 Other'
        }
        return labels[reason] || reason
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>🚨 Reports Management</h1>
                <p>Review and manage user reports</p>
            </div>

            {/* Toolbar */}
            <div className="admin-toolbar">
                <select
                    className="admin-filter"
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value)
                        setCurrentPage(1)
                    }}
                >
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                    <option value="all">All Reports</option>
                </select>
            </div>

            {/* Reports Table */}
            <div className="admin-section">
                {loading ? (
                    <div className="admin-loading">Loading reports...</div>
                ) : reports.length === 0 ? (
                    <div className="no-activity">No reports found</div>
                ) : (
                    <>
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Reporter</th>
                                        <th>Reported User</th>
                                        <th>Reason</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map(report => (
                                        <tr key={report.id}>
                                            <td data-label="Reporter">{report.reporter_email}</td>
                                            <td data-label="Reported User">{report.reported_email}</td>
                                            <td data-label="Reason">{getReasonLabel(report.reason)}</td>
                                            <td data-label="Status">
                                                <span className={`status-badge status-${report.status}`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td data-label="Date">{new Date(report.created_at).toLocaleDateString()}</td>
                                            <td data-label="Actions" className="admin-actions-cell">
                                                <button
                                                    className="admin-btn admin-btn-primary admin-btn-sm"
                                                    onClick={() => {
                                                        setSelectedReport(report)
                                                        setShowModal(true)
                                                    }}
                                                >
                                                    Review
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
                                    onClick={() => setCurrentPage(p => p - 1)}
                                >
                                    Previous
                                </button>
                                <span>Page {currentPage} of {totalPages}</span>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Report Detail Modal */}
            {showModal && selectedReport && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <h2>Review Report</h2>
                        
                        <div className="admin-form-group">
                            <label>Reporter</label>
                            <input type="text" value={selectedReport.reporter_email} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>Reported User</label>
                            <input type="text" value={selectedReport.reported_email} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>Reason</label>
                            <input type="text" value={getReasonLabel(selectedReport.reason)} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>Description</label>
                            <textarea value={selectedReport.description || 'No details provided'} disabled rows={4} />
                        </div>

                        <div className="admin-form-group">
                            <label>Submitted</label>
                            <input type="text" value={new Date(selectedReport.created_at).toLocaleString()} disabled />
                        </div>

                        {selectedReport.status === 'pending' && (
                            <>
                                <div className="admin-form-group">
                                    <label>Resolution Note</label>
                                    <textarea 
                                        value={resolution}
                                        onChange={(e) => setResolution(e.target.value)}
                                        placeholder="Add a note about the resolution..."
                                        rows={3}
                                    />
                                </div>

                                <div className="admin-modal-actions admin-modal-actions--wrap">
                                    <button
                                        className="admin-btn admin-btn-danger"
                                        onClick={() => suspendReportedUser(selectedReport.id, selectedReport.reported_id)}
                                    >
                                        ⛔ Suspend User
                                    </button>
                                    <button
                                        className="admin-btn admin-btn-success"
                                        onClick={() => resolveReport(selectedReport.id, 'resolved', resolution)}
                                    >
                                        ✅ Resolve
                                    </button>
                                    <button
                                        className="admin-btn admin-btn-warning"
                                        onClick={() => resolveReport(selectedReport.id, 'dismissed', resolution)}
                                    >
                                        ❌ Dismiss
                                    </button>
                                </div>
                            </>
                        )}

                        {selectedReport.status !== 'pending' && (
                            <>
                                <div className="admin-form-group">
                                    <label>Resolution</label>
                                    <textarea value={selectedReport.resolution || 'No resolution note'} disabled rows={2} />
                                </div>
                                <div className="admin-modal-actions">
                                    <button
                                        className="admin-btn admin-btn-primary"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Close
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
