import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import './Admin.css'

export default function AdminUsers() {
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

    async function fetchUsers() {
        setLoading(true)
        try {
            let query = supabase
                .from('profiles')
                .select('*, students(*), companies(*)', { count: 'exact' })
                .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
                .order('created_at', { ascending: false })

            if (roleFilter !== 'all') {
                query = query.eq('role', roleFilter)
            }

            if (searchTerm) {
                query = query.ilike('email', `%${searchTerm}%`)
            }

            const { data, count, error } = await query

            if (error) throw error

            setUsers(data || [])
            setTotalCount(count || 0)
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

            // Log action
            await logAdminAction(`${suspended ? 'Suspended' : 'Activated'} user`, userId)

            fetchUsers()
        } catch (error) {
            console.error('Error updating user:', error)
            alert('Failed to update user status')
        }
    }

    async function updateUserRole(userId, role) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role })
                .eq('id', userId)

            if (error) throw error

            await logAdminAction(`Changed user role to ${role}`, userId)
            fetchUsers()
            setShowModal(false)
        } catch (error) {
            console.error('Error updating role:', error)
            alert('Failed to update user role')
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

    function getUserDisplayName(user) {
        if (user.students?.full_name) return user.students.full_name
        if (user.companies?.company_name) return user.companies.company_name
        return user.email?.split('@')[0] || 'Unknown'
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>👥 User Management</h1>
                <p>Manage all users in the system</p>
            </div>

            {/* Toolbar */}
            <div className="admin-toolbar">
                <input
                    type="text"
                    className="admin-search"
                    placeholder="Search by email..."
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
                    <option value="all">All Roles</option>
                    <option value="student">Students</option>
                    <option value="company">Companies</option>
                    <option value="admin">Admins</option>
                </select>

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
                    <option value="suspended">Suspended</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="admin-section">
                {loading ? (
                    <div className="admin-loading">Loading users...</div>
                ) : (
                    <>
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id}>
                                            <td>{getUserDisplayName(user)}</td>
                                            <td>{user.email}</td>
                                            <td>
                                                <span className={`status-badge status-${user.role === 'admin' ? 'active' : 'pending'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${user.suspended ? 'status-suspended' : 'status-active'}`}>
                                                    {user.suspended ? 'Suspended' : 'Active'}
                                                </span>
                                            </td>
                                            <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    className="admin-btn admin-btn-primary admin-btn-sm"
                                                    onClick={() => {
                                                        setSelectedUser(user)
                                                        setShowModal(true)
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                {' '}
                                                {user.suspended ? (
                                                    <button
                                                        className="admin-btn admin-btn-success admin-btn-sm"
                                                        onClick={() => updateUserStatus(user.id, false)}
                                                    >
                                                        Activate
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="admin-btn admin-btn-warning admin-btn-sm"
                                                        onClick={() => updateUserStatus(user.id, true)}
                                                    >
                                                        Suspend
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
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

            {/* Edit User Modal */}
            {showModal && selectedUser && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <h2>Edit User</h2>
                        
                        <div className="admin-form-group">
                            <label>Email</label>
                            <input type="text" value={selectedUser.email} disabled />
                        </div>

                        <div className="admin-form-group">
                            <label>Role</label>
                            <select
                                value={selectedUser.role}
                                onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                            >
                                <option value="student">Student</option>
                                <option value="company">Company</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div className="admin-modal-actions">
                            <button
                                className="admin-btn admin-btn-danger"
                                onClick={() => setShowModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="admin-btn admin-btn-success"
                                onClick={() => updateUserRole(selectedUser.id, selectedUser.role)}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
