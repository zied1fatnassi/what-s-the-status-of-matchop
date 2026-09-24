import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { lockOverlayScroll, unlockOverlayScroll } from '../../lib/overlayLock'
import { useBilingualText } from '../../lib/useBilingualText'
import './Admin.css'

export default function AdminUsers() {
    const tr = useBilingualText()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [selectedUser, setSelectedUser] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const pageSize = 20

    useEffect(() => {
        fetchUsers()
    }, [currentPage, roleFilter, statusFilter, searchTerm])

    useEffect(() => {
        if (!showModal) return undefined
        lockOverlayScroll()
        return () => unlockOverlayScroll()
    }, [showModal])

    async function fetchUsers() {
        setLoading(true)
        try {
            let query = supabase
                .from('profiles')
                .select('*, students(*), companies(*), user_profiles!user_profiles_user_id_fkey(*)', { count: 'exact' })
                .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
                .order('created_at', { ascending: false })

            if (searchTerm) {
                query = query.ilike('email', `%${searchTerm}%`)
            }

            const { data, count, error } = await query
            if (error) throw error

            let filtered = data || []
            if (roleFilter !== 'all') {
                filtered = filtered.filter((u) => {
                    const ups = u.user_profiles || []
                    return ups.some((up) => up.profile_type === roleFilter)
                })
            }

            if (statusFilter !== 'all') {
                const wantSuspended = statusFilter === 'suspended'
                filtered = filtered.filter((u) => Boolean(u.suspended) === wantSuspended)
            }

            setUsers(filtered)
            setTotalCount(roleFilter === 'all' && statusFilter === 'all' ? (count || 0) : filtered.length)
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    async function updateUserStatus(userId, suspended) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ suspended })
                .eq('id', userId)

            if (error) throw error

            await logAdminAction(`${suspended ? 'Suspended' : 'Activated'} user`, userId)
            fetchUsers()
        } catch (error) {
            console.error('Error updating user:', error)
            alert(tr('Failed to update user status', "Echec de mise a jour du statut utilisateur"))
        }
    }

    async function updateUserRole(userId, newProfileType) {
        try {
            const { data: ups, error: fetchErr } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('user_id', userId)
                .eq('is_default', true)
                .single()

            if (fetchErr) throw fetchErr

            const { error } = await supabase
                .from('user_profiles')
                .update({ profile_type: newProfileType })
                .eq('id', ups.id)

            if (error) throw error

            await logAdminAction(`Changed user role to ${newProfileType}`, userId)
            fetchUsers()
            setShowModal(false)
        } catch (error) {
            console.error('Error updating role:', error)
            alert(tr('Failed to update user role', 'Echec de mise a jour du role utilisateur'))
        }
    }

    async function logAdminAction(action, targetId) {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('admin_audit_logs').insert({
            admin_id: user?.id,
            admin_email: user?.email,
            action,
            target_id: targetId,
            target_type: 'user'
        })
    }

    const totalPages = Math.ceil(totalCount / pageSize)
    const roleLabel = (role) => {
        const map = {
            student: tr('Student', 'Etudiant'),
            company: tr('Company', 'Entreprise'),
            admin: tr('Admin', 'Admin'),
            unknown: tr('Unknown', 'Inconnu')
        }
        return map[role] || role
    }

    function getUserDisplayName(user) {
        if (user.students?.display_name) return user.students.display_name
        if (user.companies?.company_name) return user.companies.company_name
        return user.email?.split('@')[0] || tr('Unknown', 'Inconnu')
    }

    function getUserRole(user) {
        const ups = user.user_profiles || []
        const defaultUp = ups.find((up) => up.is_default) || ups[0]
        return defaultUp?.profile_type || 'unknown'
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>{tr('User Management', 'Gestion des utilisateurs')}</h1>
                <p>{tr('Manage all users in the system', 'Gerer tous les utilisateurs du systeme')}</p>
            </div>

            <div className="admin-toolbar">
                <input
                    type="text"
                    className="admin-search"
                    placeholder={tr('Search by email...', 'Rechercher par email...')}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1)
                    }}
                />

                <select
                    className="admin-filter"
                    value={roleFilter}
                    onChange={(e) => {
                        setRoleFilter(e.target.value)
                        setCurrentPage(1)
                    }}
                >
                    <option value="all">{tr('All Roles', 'Tous les roles')}</option>
                    <option value="student">{tr('Students', 'Etudiants')}</option>
                    <option value="company">{tr('Companies', 'Entreprises')}</option>
                    <option value="admin">{tr('Admins', 'Admins')}</option>
                </select>

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
                    <option value="suspended">{tr('Suspended', 'Suspendu')}</option>
                </select>
            </div>

            <div className="admin-section">
                {loading ? (
                    <div className="admin-loading">{tr('Loading users...', 'Chargement des utilisateurs...')}</div>
                ) : (
                    <>
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>{tr('User', 'Utilisateur')}</th>
                                        <th>{tr('Email', 'Email')}</th>
                                        <th>{tr('Role', 'Role')}</th>
                                        <th>{tr('Status', 'Statut')}</th>
                                        <th>{tr('Joined', 'Inscription')}</th>
                                        <th>{tr('Actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td data-label={tr('User', 'Utilisateur')}>{getUserDisplayName(user)}</td>
                                            <td data-label={tr('Email', 'Email')}>{user.email}</td>
                                            <td data-label={tr('Role', 'Role')}>
                                                <span className={`status-badge status-${getUserRole(user) === 'admin' ? 'active' : 'pending'}`}>
                                                    {roleLabel(getUserRole(user))}
                                                </span>
                                            </td>
                                            <td data-label={tr('Status', 'Statut')}>
                                                <span className={`status-badge ${user.suspended ? 'status-suspended' : 'status-active'}`}>
                                                    {user.suspended ? tr('Suspended', 'Suspendu') : tr('Active', 'Actif')}
                                                </span>
                                            </td>
                                            <td data-label={tr('Joined', 'Inscription')}>{new Date(user.created_at).toLocaleDateString()}</td>
                                            <td data-label={tr('Actions', 'Actions')} className="admin-actions-cell">
                                                <button
                                                    className="admin-btn admin-btn-primary admin-btn-sm"
                                                    onClick={() => {
                                                        setSelectedUser(user)
                                                        setShowModal(true)
                                                    }}
                                                >
                                                    {tr('Edit', 'Modifier')}
                                                </button>
                                                {user.suspended ? (
                                                    <button
                                                        className="admin-btn admin-btn-success admin-btn-sm"
                                                        onClick={() => updateUserStatus(user.id, false)}
                                                    >
                                                        {tr('Activate', 'Activer')}
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="admin-btn admin-btn-warning admin-btn-sm"
                                                        onClick={() => updateUserStatus(user.id, true)}
                                                    >
                                                        {tr('Suspend', 'Suspendre')}
                                                    </button>
                                                )}
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

            {showModal && selectedUser && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{tr('Edit User', "Modifier l'utilisateur")}</h2>

                        <div className="admin-form-group">
                            <label>{tr('Email', 'Email')}</label>
                            <input type="text" value={selectedUser.email} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>{tr('Role', 'Role')}</label>
                            <select
                                value={selectedUser._editRole || getUserRole(selectedUser)}
                                onChange={(e) => setSelectedUser({ ...selectedUser, _editRole: e.target.value })}
                            >
                                <option value="student">{tr('Student', 'Etudiant')}</option>
                                <option value="company">{tr('Company', 'Entreprise')}</option>
                                <option value="admin">{tr('Admin', 'Admin')}</option>
                            </select>
                        </div>

                        <div className="admin-modal-actions">
                            <button
                                className="admin-btn admin-btn-danger"
                                onClick={() => setShowModal(false)}
                            >
                                {tr('Cancel', 'Annuler')}
                            </button>
                            <button
                                className="admin-btn admin-btn-success"
                                onClick={() => updateUserRole(selectedUser.id, selectedUser._editRole || getUserRole(selectedUser))}
                            >
                                {tr('Save Changes', 'Enregistrer les modifications')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
