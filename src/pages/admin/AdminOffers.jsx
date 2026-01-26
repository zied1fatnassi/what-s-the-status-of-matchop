import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import './Admin.css'

export default function AdminOffers() {
    const [offers, setOffers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [selectedOffer, setSelectedOffer] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const pageSize = 20

    useEffect(() => {
        fetchOffers()
    }, [currentPage, statusFilter, searchTerm])

    async function fetchOffers() {
        setLoading(true)
        try {
            let query = supabase
                .from('offers')
                .select('*, companies!company_id(id, company_name, logo_url)', { count: 'exact' })
                .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
                .order('created_at', { ascending: false })

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            }

            if (searchTerm) {
                query = query.ilike('title', `%${searchTerm}%`)
            }

            const { data, count, error } = await query

            if (error) throw error

            setOffers(data || [])
            setTotalCount(count || 0)
        } catch (error) {
            console.error('Error fetching offers:', error)
        } finally {
            setLoading(false)
        }
    }

    async function updateOfferStatus(offerId, status) {
        try {
            const { error } = await supabase
                .from('offers')
                .update({ status })
                .eq('id', offerId)

            if (error) throw error

            await logAdminAction(`Changed offer status to ${status}`, offerId)
            fetchOffers()
        } catch (error) {
            console.error('Error updating offer:', error)
            alert('Failed to update offer status')
        }
    }

    async function deleteOffer(offerId) {
        if (!confirm('Are you sure you want to delete this offer?')) return

        try {
            const { error } = await supabase
                .from('offers')
                .delete()
                .eq('id', offerId)

            if (error) throw error

            await logAdminAction('Deleted offer', offerId)
            fetchOffers()
        } catch (error) {
            console.error('Error deleting offer:', error)
            alert('Failed to delete offer')
        }
    }

    async function logAdminAction(action, targetId) {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('admin_audit_logs').insert({
            admin_id: user?.id,
            admin_email: user?.email,
            action,
            target_id: targetId,
            target_type: 'offer'
        })
    }

    const totalPages = Math.ceil(totalCount / pageSize)

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>💼 Offers Management</h1>
                <p>Manage all job offers</p>
            </div>

            {/* Toolbar */}
            <div className="admin-toolbar">
                <input
                    type="text"
                    className="admin-search"
                    placeholder="Search by title..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1)
                    }}
                />

                <select
                    className="admin-filter"
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value)
                        setCurrentPage(1)
                    }}
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                </select>
            </div>

            {/* Offers Table */}
            <div className="admin-section">
                {loading ? (
                    <div className="admin-loading">Loading offers...</div>
                ) : (
                    <>
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Company</th>
                                        <th>Location</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {offers.map(offer => (
                                        <tr key={offer.id}>
                                            <td>{offer.title}</td>
                                            <td>{offer.companies?.company_name || 'N/A'}</td>
                                            <td>{offer.location || 'Remote'}</td>
                                            <td>
                                                <span className={`status-badge status-${offer.status}`}>
                                                    {offer.status}
                                                </span>
                                            </td>
                                            <td>{new Date(offer.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    className="admin-btn admin-btn-primary admin-btn-sm"
                                                    onClick={() => {
                                                        setSelectedOffer(offer)
                                                        setShowModal(true)
                                                    }}
                                                >
                                                    View
                                                </button>
                                                {' '}
                                                {offer.status === 'active' ? (
                                                    <button
                                                        className="admin-btn admin-btn-warning admin-btn-sm"
                                                        onClick={() => updateOfferStatus(offer.id, 'inactive')}
                                                    >
                                                        Deactivate
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="admin-btn admin-btn-success admin-btn-sm"
                                                        onClick={() => updateOfferStatus(offer.id, 'active')}
                                                    >
                                                        Activate
                                                    </button>
                                                )}
                                                {' '}
                                                <button
                                                    className="admin-btn admin-btn-danger admin-btn-sm"
                                                    onClick={() => deleteOffer(offer.id)}
                                                >
                                                    Delete
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

            {/* Offer Detail Modal */}
            {showModal && selectedOffer && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <h2>{selectedOffer.title}</h2>
                        
                        <div className="admin-form-group">
                            <label>Company</label>
                            <input type="text" value={selectedOffer.companies?.company_name || 'N/A'} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>Description</label>
                            <textarea value={selectedOffer.description || ''} disabled rows={4} />
                        </div>

                        <div className="admin-form-group">
                            <label>Location</label>
                            <input type="text" value={selectedOffer.location || 'Remote'} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>Salary Range</label>
                            <input 
                                type="text" 
                                value={`${selectedOffer.salary_min || 'N/A'} - ${selectedOffer.salary_max || 'N/A'}`} 
                                disabled 
                            />
                        </div>

                        <div className="admin-form-group">
                            <label>Required Skills</label>
                            <input 
                                type="text" 
                                value={selectedOffer.required_skills?.join(', ') || 'None specified'} 
                                disabled 
                            />
                        </div>

                        <div className="admin-modal-actions">
                            <button
                                className="admin-btn admin-btn-primary"
                                onClick={() => setShowModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
