import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { lockOverlayScroll, unlockOverlayScroll } from '../../lib/overlayLock'
import { useBilingualText } from '../../lib/useBilingualText'
import './Admin.css'

export default function AdminOffers() {
    const tr = useBilingualText()
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

    useEffect(() => {
        if (!showModal) return undefined
        lockOverlayScroll()
        return () => unlockOverlayScroll()
    }, [showModal])

    async function fetchOffers() {
        setLoading(true)
        try {
            let query = supabase
                .from('offers')
                .select('*, companies!company_id(id, company_name, logo_url)', { count: 'exact' })
                .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
                .order('created_at', { ascending: false })

            if (statusFilter !== 'all') query = query.eq('status', statusFilter)
            if (searchTerm) query = query.ilike('title', `%${searchTerm}%`)

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
            alert(tr('Failed to update offer status', "Echec de mise a jour du statut de l'offre"))
        }
    }

    async function deleteOffer(offerId) {
        if (!confirm(tr('Are you sure you want to delete this offer?', 'Voulez-vous vraiment supprimer cette offre ?'))) return

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
            alert(tr('Failed to delete offer', "Echec de suppression de l'offre"))
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
    const statusLabel = (status) => {
        const map = {
            active: tr('Active', 'Actif'),
            inactive: tr('Inactive', 'Inactif'),
            pending: tr('Pending', 'En attente'),
            expired: tr('Expired', 'Expire'),
            closed: tr('Closed', 'Ferme')
        }
        return map[status] || status
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>{tr('Offers Management', 'Gestion des offres')}</h1>
                <p>{tr('Manage all job offers', 'Gerer toutes les offres')}</p>
            </div>

            <div className="admin-toolbar">
                <input
                    type="text"
                    className="admin-search"
                    placeholder={tr('Search by title...', 'Rechercher par titre...')}
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
                    <option value="all">{tr('All Status', 'Tous les statuts')}</option>
                    <option value="active">{tr('Active', 'Actif')}</option>
                    <option value="inactive">{tr('Inactive', 'Inactif')}</option>
                    <option value="pending">{tr('Pending', 'En attente')}</option>
                    <option value="expired">{tr('Expired', 'Expire')}</option>
                </select>
            </div>

            <div className="admin-section">
                {loading ? (
                    <div className="admin-loading">{tr('Loading offers...', 'Chargement des offres...')}</div>
                ) : (
                    <>
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>{tr('Title', 'Titre')}</th>
                                        <th>{tr('Company', 'Entreprise')}</th>
                                        <th>{tr('Location', 'Localisation')}</th>
                                        <th>{tr('Status', 'Statut')}</th>
                                        <th>{tr('Created', 'Cree le')}</th>
                                        <th>{tr('Actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {offers.map((offer) => (
                                        <tr key={offer.id}>
                                            <td data-label={tr('Title', 'Titre')}>{offer.title}</td>
                                            <td data-label={tr('Company', 'Entreprise')}>{offer.companies?.company_name || tr('N/A', 'N/A')}</td>
                                            <td data-label={tr('Location', 'Localisation')}>{offer.location || tr('Remote', 'A distance')}</td>
                                            <td data-label={tr('Status', 'Statut')}>
                                                <span className={`status-badge status-${offer.status}`}>
                                                    {statusLabel(offer.status)}
                                                </span>
                                            </td>
                                            <td data-label={tr('Created', 'Cree le')}>{new Date(offer.created_at).toLocaleDateString()}</td>
                                            <td data-label={tr('Actions', 'Actions')} className="admin-actions-cell">
                                                <button
                                                    className="admin-btn admin-btn-primary admin-btn-sm"
                                                    onClick={() => {
                                                        setSelectedOffer(offer)
                                                        setShowModal(true)
                                                    }}
                                                >
                                                    {tr('View', 'Voir')}
                                                </button>
                                                {offer.status === 'active' ? (
                                                    <button
                                                        className="admin-btn admin-btn-warning admin-btn-sm"
                                                        onClick={() => updateOfferStatus(offer.id, 'inactive')}
                                                    >
                                                        {tr('Deactivate', 'Desactiver')}
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="admin-btn admin-btn-success admin-btn-sm"
                                                        onClick={() => updateOfferStatus(offer.id, 'active')}
                                                    >
                                                        {tr('Activate', 'Activer')}
                                                    </button>
                                                )}
                                                <button
                                                    className="admin-btn admin-btn-danger admin-btn-sm"
                                                    onClick={() => deleteOffer(offer.id)}
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

            {showModal && selectedOffer && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{selectedOffer.title}</h2>

                        <div className="admin-form-group">
                            <label>{tr('Company', 'Entreprise')}</label>
                            <input type="text" value={selectedOffer.companies?.company_name || tr('N/A', 'N/A')} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>{tr('Description', 'Description')}</label>
                            <textarea value={selectedOffer.description || ''} disabled rows={4} />
                        </div>

                        <div className="admin-form-group">
                            <label>{tr('Location', 'Localisation')}</label>
                            <input type="text" value={selectedOffer.location || tr('Remote', 'A distance')} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>{tr('Salary Range', 'Fourchette salariale')}</label>
                            <input
                                type="text"
                                value={`${selectedOffer.salary_min || 'N/A'} - ${selectedOffer.salary_max || 'N/A'}`}
                                disabled
                            />
                        </div>

                        <div className="admin-form-group">
                            <label>{tr('Required Skills', 'Competences requises')}</label>
                            <input
                                type="text"
                                value={selectedOffer.required_skills?.join(', ') || tr('None specified', 'Aucune')}
                                disabled
                            />
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
