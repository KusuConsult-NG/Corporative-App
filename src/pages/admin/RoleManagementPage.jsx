import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    addDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import {
    ROLES,
    getRoleDisplayName,
    getRoleBadgeColor,
    canAssignRole,
    isSuperAdmin
} from '../../utils/permissions'
import { Users, Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react'

export default function RoleManagementPage() {
    const { user: currentUser } = useAuthStore()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [filter, setFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedUser, setSelectedUser] = useState(null)
    const [newRole, setNewRole] = useState('')
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)

    // Check if current user is super admin
    const isAuthorized = isSuperAdmin(currentUser)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const usersSnapshot = await getDocs(collection(db, 'users'))
            const usersData = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setUsers(usersData)
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRoleChange = async () => {
        if (!selectedUser || !newRole) return

        try {
            setUpdating(true)

            // Update user role
            const userRef = doc(db, 'users', selectedUser.id)
            await updateDoc(userRef, {
                role: newRole,
                roleUpdatedAt: serverTimestamp(),
                roleUpdatedBy: currentUser.userId
            })

            // Log role change in history
            await addDoc(collection(db, 'roleHistory'), {
                userId: selectedUser.userId,
                userName: selectedUser.name,
                previousRole: selectedUser.role,
                newRole: newRole,
                changedBy: currentUser.userId,
                changedByName: currentUser.name,
                changedAt: serverTimestamp()
            })

            // Update local state
            setUsers(users.map(u =>
                u.id === selectedUser.id ? { ...u, role: newRole } : u
            ))

            // Close dialog
            setShowConfirmDialog(false)
            setSelectedUser(null)
            setNewRole('')
        } catch (error) {
            console.error('Error updating role:', error)
            alert('Failed to update role. Please try again.')
        } finally {
            setUpdating(false)
        }
    }

    const initiateRoleChange = (user, role) => {
        if (!canAssignRole(currentUser, role)) {
            alert('You do not have permission to assign this role.')
            return
        }

        setSelectedUser(user)
        setNewRole(role)
        setShowConfirmDialog(true)
    }

    const filteredUsers = users.filter(user => {
        // Filter by role
        if (filter !== 'all' && user.role !== filter) {
            return false
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            return (
                user.name?.toLowerCase().includes(query) ||
                user.email?.toLowerCase().includes(query) ||
                user.memberId?.toLowerCase().includes(query)
            )
        }

        return true
    })

    if (!isAuthorized) {
        return (
            <div className="p-8">
                <div className="max-w-2xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                        <h2 className="text-xl font-bold text-red-900 dark:text-red-100">
                            Access Denied
                        </h2>
                    </div>
                    <p className="text-red-700 dark:text-red-300">
                        Only Super Administrators can access the role management page.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="text-primary" size={32} />
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            Role Management
                        </h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                        Assign and manage user roles across the platform
                    </p>
                </div>

                {/* Filters & Search */}
                <div className="mb-6 bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Role Filter */}
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Filter by Role
                            </label>
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                                <option value="all">All Roles</option>
                                <option value={ROLES.MEMBER}>Members</option>
                                <option value={ROLES.CUSTOMER_CARE}>Customer Care</option>
                                <option value={ROLES.ADMIN}>Administrators</option>
                                <option value={ROLES.SUPER_ADMIN}>Super Admins</option>
                            </select>
                        </div>

                        {/* Search */}
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Search Users
                            </label>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Name, email, or member ID..."
                                className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-6 text-sm">
                        <div>
                            <span className="text-slate-600 dark:text-slate-400">Total Users:</span>
                            <span className="ml-2 font-semibold text-slate-900 dark:text-white">{users.length}</span>
                        </div>
                        <div>
                            <span className="text-slate-600 dark:text-slate-400">Filtered:</span>
                            <span className="ml-2 font-semibold text-slate-900 dark:text-white">{filteredUsers.length}</span>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-4 text-slate-600 dark:text-slate-400">Loading users...</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 dark:bg-slate-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Member ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Current Role
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Assign Role
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="font-medium text-slate-900 dark:text-white">
                                                        {user.name}
                                                    </div>
                                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {user.memberId}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                                                    {getRoleDisplayName(user.role)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => initiateRoleChange(user, e.target.value)}
                                                    disabled={user.id === currentUser.id}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <option value={ROLES.MEMBER}>{getRoleDisplayName(ROLES.MEMBER)}</option>
                                                    <option value={ROLES.CUSTOMER_CARE}>{getRoleDisplayName(ROLES.CUSTOMER_CARE)}</option>
                                                    <option value={ROLES.ADMIN}>{getRoleDisplayName(ROLES.ADMIN)}</option>
                                                    <option value={ROLES.SUPER_ADMIN}>{getRoleDisplayName(ROLES.SUPER_ADMIN)}</option>
                                                </select>
                                                {user.id === currentUser.id && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                        Cannot change your own role
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredUsers.length === 0 && (
                            <div className="text-center py-12">
                                <Users className="mx-auto text-slate-400" size={48} />
                                <p className="mt-4 text-slate-600 dark:text-slate-400">
                                    No users found matching your filters
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="text-amber-600 dark:text-amber-400" size={24} />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                Confirm Role Change
                            </h3>
                        </div>

                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Are you sure you want to change the role for <strong>{selectedUser?.name}</strong>?
                        </p>

                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Current Role:</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(selectedUser?.role)}`}>
                                    {getRoleDisplayName(selectedUser?.role)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-400">New Role:</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(newRole)}`}>
                                    {getRoleDisplayName(newRole)}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowConfirmDialog(false)
                                    setSelectedUser(null)
                                    setNewRole('')
                                }}
                                disabled={updating}
                                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRoleChange}
                                disabled={updating}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {updating ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={18} />
                                        Confirm
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
