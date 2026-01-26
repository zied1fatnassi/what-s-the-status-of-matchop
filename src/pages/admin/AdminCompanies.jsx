import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import './Admin.css'

export default function AdminCompanies() {
    const [companies, setCompanies] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [selectedCompany, setSelectedCompany] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const pageSize = 20

    useEffect(() => {
        fetchCompanies()
    }, [currentPage, searchTerm])

    async function fetchCompanies() {
        setLoading(true)
        try {
            let query = supabase
                .from('companies')
                .select('*', { count: 'exact' })
                .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
                .order('created_at', { ascending: false })

            if (searchTerm) {
                query = query.ilike('company_name', `%${searchTerm}%`)
            }

            const { data, count, error } = await query

            if (error) throw error

            // Fetch offer counts for each company
            const companiesWithCounts = await Promise.all(
                (data || []).map(async (company) => {
                    const { count: offerCount } = await supabase
                        .from('offers')
                        .select('*', { count: 'exact', head: true })
                        .eq('company_id', company.id)
                    
                    return { ...company, offerCount: offerCount || 0 }
                })
            )

            setCompanies(companiesWithCounts)
            setTotalCount(count || 0)
        } catch (error) {
            console.error('Error fetching companies:', error)
        } finally {
            setLoading(false)
        }
    }

    async function updateCompanyVerification(companyId, verified) {
        try {
            const { error } = await supabase
                .from('companies')
                .update({ verified })
                .eq('id', companyId)

            if (error) throw error

            await logAdminAction(`${verified ? 'Verified' : 'Unverified'} company`, companyId)
            fetchCompanies()
        } catch (error) {
            console.error('Error updating company:', error)
            alert('Failed to update company verification')
        }
    }

    async function deleteCompany(companyId) {
        if (!confirm('Are you sure you want to delete this company? This will also delete all their offers.')) return

        try {
            // Delete offers first
            await supabase
                .from('offers')
                .delete()
                .eq('company_id', companyId)

            const { error } = await supabase
                .from('companies')
                .delete()
                .eq('id', companyId)

            if (error) throw error

            await logAdminAction('Deleted company', companyId)
            fetchCompanies()
        } catch (error) {
            console.error('Error deleting company:', error)
            alert('Failed to delete company')
        }
    }

    async function logAdminAction(action, targetId) {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('admin_audit_logs').insert({
            admin_id: user?.id,
            admin_email: user?.email,
            action,
            target_id: targetId,
            target_type: 'company'
        })
    }

    const totalPages = Math.ceil(totalCount / pageSize)

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>🏢 Companies Management</h1>
                <p>Manage all registered companies</p>
            </div>

            {/* Toolbar */}
            <div className="admin-toolbar">
                <input
                    type="text"
                    className="admin-search"
                    placeholder="Search by company name..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1)
                    }}
                />
            </div>

            {/* Companies Table */}
            <div className="admin-section">
                {loading ? (
                    <div className="admin-loading">Loading companies...</div>
                ) : (
                    <>
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Company</th>
                                        <th>Industry</th>
                                        <th>Location</th>
                                        <th>Offers</th>
                                        <th>Verified</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {companies.map(company => (
                                        <tr key={company.id}>
                                            <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {company.logo_url && (
                                                    <img 
                                                        src={company.logo_url} 
                                                        alt="" 
                                                        style={{ 
                                                            width: 32, 
                                                            height: 32, 
                                                            borderRadius: '8px',
                                                            objectFit: 'cover'
                                                        }} 
                                                    />
                                                )}
                                                {company.company_name}
                                            </td>
                                            <td>{company.industry || 'N/A'}</td>
                                            <td>{company.location || 'N/A'}</td>
                                            <td>{company.offerCount}</td>
                                            <td>
                                                <span className={`status-badge ${company.verified ? 'status-active' : 'status-pending'}`}>
                                                    {company.verified ? 'Verified' : 'Pending'}
                                                </span>
                                            </td>
                                            <td>{new Date(company.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    className="admin-btn admin-btn-primary admin-btn-sm"
                                                    onClick={() => {
                                                        setSelectedCompany(company)
                                                        setShowModal(true)
                                                    }}
                                                >
                                                    View
                                                </button>
                                                {' '}
                                                {company.verified ? (
                                                    <button
                                                        className="admin-btn admin-btn-warning admin-btn-sm"
                                                        onClick={() => updateCompanyVerification(company.id, false)}
                                                    >
                                                        Unverify
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="admin-btn admin-btn-success admin-btn-sm"
                                                        onClick={() => updateCompanyVerification(company.id, true)}
                                                    >
                                                        Verify
                                                    </button>
                                                )}
                                                {' '}
                                                <button
                                                    className="admin-btn admin-btn-danger admin-btn-sm"
                                                    onClick={() => deleteCompany(company.id)}
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

            {/* Company Detail Modal */}
            {showModal && selectedCompany && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <h2>{selectedCompany.company_name}</h2>
                        
                        {selectedCompany.logo_url && (
                            <img 
                                src={selectedCompany.logo_url} 
                                alt={selectedCompany.company_name}
                                style={{ 
                                    width: 100, 
                                    height: 100, 
                                    borderRadius: '16px',
                                    objectFit: 'cover',
                                    marginBottom: '1rem'
                                }} 
                            />
                        )}

                        <div className="admin-form-group">
                            <label>Industry</label>
                            <input type="text" value={selectedCompany.industry || 'N/A'} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>Location</label>
                            <input type="text" value={selectedCompany.location || 'N/A'} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>Description</label>
                            <textarea value={selectedCompany.description || 'No description'} disabled rows={4} />
                        </div>

                        <div className="admin-form-group">
                            <label>Website</label>
                            <input type="text" value={selectedCompany.website || 'N/A'} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>Company Size</label>
                            <input type="text" value={selectedCompany.company_size || 'N/A'} disabled />
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
