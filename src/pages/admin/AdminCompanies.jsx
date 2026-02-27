import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { lockOverlayScroll, unlockOverlayScroll } from '../../lib/overlayLock'
import { useBilingualText } from '../../lib/useBilingualText'
import './Admin.css'

export default function AdminCompanies() {
    const tr = useBilingualText()
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

    useEffect(() => {
        if (!showModal) return undefined
        lockOverlayScroll()
        return () => unlockOverlayScroll()
    }, [showModal])

    async function fetchCompanies() {
        setLoading(true)
        try {
            let query = supabase
                .from('companies')
                .select('*', { count: 'exact' })
                .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
                .order('created_at', { ascending: false })

            if (searchTerm) query = query.ilike('company_name', `%${searchTerm}%`)

            const { data, count, error } = await query
            if (error) throw error

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
            alert(tr('Failed to update company verification', "Echec de verification de l'entreprise"))
        }
    }

    async function deleteCompany(companyId) {
        if (!confirm(tr(
            'Are you sure you want to delete this company? This will also delete all their offers.',
            'Voulez-vous vraiment supprimer cette entreprise ? Toutes ses offres seront aussi supprimees.'
        ))) return

        try {
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
            alert(tr('Failed to delete company', "Echec de suppression de l'entreprise"))
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
                <h1>{tr('Companies Management', 'Gestion des entreprises')}</h1>
                <p>{tr('Manage all registered companies', 'Gerer toutes les entreprises inscrites')}</p>
            </div>

            <div className="admin-toolbar">
                <input
                    type="text"
                    className="admin-search"
                    placeholder={tr('Search by company name...', "Rechercher par nom d'entreprise...")}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1)
                    }}
                />
            </div>

            <div className="admin-section">
                {loading ? (
                    <div className="admin-loading">{tr('Loading companies...', 'Chargement des entreprises...')}</div>
                ) : (
                    <>
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>{tr('Company', 'Entreprise')}</th>
                                        <th>{tr('Industry', 'Secteur')}</th>
                                        <th>{tr('Location', 'Localisation')}</th>
                                        <th>{tr('Offers', 'Offres')}</th>
                                        <th>{tr('Verified', 'Verifie')}</th>
                                        <th>{tr('Joined', 'Inscription')}</th>
                                        <th>{tr('Actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {companies.map((company) => (
                                        <tr key={company.id}>
                                            <td data-label={tr('Company', 'Entreprise')} className="admin-company-cell">
                                                {company.logo_url && (
                                                    <img
                                                        src={company.logo_url}
                                                        alt=""
                                                        className="admin-company-logo"
                                                    />
                                                )}
                                                {company.company_name}
                                            </td>
                                            <td data-label={tr('Industry', 'Secteur')}>{company.industry || tr('N/A', 'N/A')}</td>
                                            <td data-label={tr('Location', 'Localisation')}>{company.location || tr('N/A', 'N/A')}</td>
                                            <td data-label={tr('Offers', 'Offres')}>{company.offerCount}</td>
                                            <td data-label={tr('Verified', 'Verifie')}>
                                                <span className={`status-badge ${company.verified ? 'status-active' : 'status-pending'}`}>
                                                    {company.verified ? tr('Verified', 'Verifie') : tr('Pending', 'En attente')}
                                                </span>
                                            </td>
                                            <td data-label={tr('Joined', 'Inscription')}>{new Date(company.created_at).toLocaleDateString()}</td>
                                            <td data-label={tr('Actions', 'Actions')} className="admin-actions-cell">
                                                <button
                                                    className="admin-btn admin-btn-primary admin-btn-sm"
                                                    onClick={() => {
                                                        setSelectedCompany(company)
                                                        setShowModal(true)
                                                    }}
                                                >
                                                    {tr('View', 'Voir')}
                                                </button>
                                                {company.verified ? (
                                                    <button
                                                        className="admin-btn admin-btn-warning admin-btn-sm"
                                                        onClick={() => updateCompanyVerification(company.id, false)}
                                                    >
                                                        {tr('Unverify', 'Retirer verification')}
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="admin-btn admin-btn-success admin-btn-sm"
                                                        onClick={() => updateCompanyVerification(company.id, true)}
                                                    >
                                                        {tr('Verify', 'Verifier')}
                                                    </button>
                                                )}
                                                <button
                                                    className="admin-btn admin-btn-danger admin-btn-sm"
                                                    onClick={() => deleteCompany(company.id)}
                                                >
                                                    {tr('Delete', 'Supprimer')}
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

            {showModal && selectedCompany && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{selectedCompany.company_name}</h2>

                        {selectedCompany.logo_url && (
                            <img
                                src={selectedCompany.logo_url}
                                alt={selectedCompany.company_name}
                                className="admin-company-logo admin-company-logo--modal"
                            />
                        )}

                        <div className="admin-form-group">
                            <label>{tr('Industry', 'Secteur')}</label>
                            <input type="text" value={selectedCompany.industry || tr('N/A', 'N/A')} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>{tr('Location', 'Localisation')}</label>
                            <input type="text" value={selectedCompany.location || tr('N/A', 'N/A')} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>{tr('Description', 'Description')}</label>
                            <textarea value={selectedCompany.description || tr('No description', 'Aucune description')} disabled rows={4} />
                        </div>

                        <div className="admin-form-group">
                            <label>{tr('Website', 'Site web')}</label>
                            <input type="text" value={selectedCompany.website || tr('N/A', 'N/A')} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>{tr('Company Size', "Taille de l'entreprise")}</label>
                            <input type="text" value={selectedCompany.company_size || tr('N/A', 'N/A')} disabled />
                        </div>

                        <div className="admin-modal-actions">
                            <button
                                className="admin-btn admin-btn-primary"
                                onClick={() => setShowModal(false)}
                            >
                                {tr('Close', 'Fermer')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
