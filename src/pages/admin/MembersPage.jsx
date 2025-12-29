import { useState, useEffect } from 'react'
import { Search, UserCheck, UserX, User, Filter, Edit2, Eye, AlertCircle } from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

export default function MembersPage() {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [verificationFilter, setVerificationFilter] = useState('all')
    const [showModal, setShowModal] = useState(false)
    const [selectedMember, setSelectedMember] = useState(null)
    const [newStatus, setNewStatus] = useState('')
    const [statusNote, setStatusNote] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchMembers()
    }, [])

    const fetchMembers = async () => {
        try {
            setLoading(true)
            const usersSnapshot = await getDocs(collection(db, 'users'))
            const usersData = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setMembers(usersData)
        } catch (error) {
            console.error('Error fetching members:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = (member, status) => {
        setSelectedMember(member)
        setNewStatus(status)
        setShowModal(true)
        setStatusNote('')
    }

    const handleSubmitStatusChange = async () => {
        if (!selectedMember) return

        setSubmitting(true)
        try {
            const userRef = doc(db, 'users', selectedMember.id)
            await updateDoc(userRef, {
                accountStatus: newStatus,
                statusNote: statusNote,
                statusUpdatedAt: new Date()
            })

            await fetchMembers()
            setShowModal(false)
            alert(`Member status updated to ${newStatus}`)
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Failed to update member status')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeactivate = async (member) => {
        if (!confirm(`Are you sure you want to deactivate ${member.name}'s account?`)) return

        try {
            const userRef = doc(db, 'users', member.id)
            await updateDoc(userRef, {
                accountStatus: 'deactivated',
                deactivatedAt: new Date()
            })
            await fetchMembers()
            alert('Account deactivated successfully')
        } catch (error) {
            console.error('Error deactivating account:', error)
            alert('Failed to deactivate account')
        }
    }

    const filteredMembers = members.filter(member => {
        // Search filter
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
            member.name?.toLowerCase().includes(searchLower) ||
            member.staffId?.toLowerCase().includes(searchLower) ||
            member.memberId?.toLowerCase().includes(searchLower) ||
            member.phone?.toLowerCase().includes(searchLower) ||
            member.email?.toLowerCase().includes(searchLower)

        // Status filter
        const memberStatus = member.accountStatus || 'active'
        const matchesStatus = statusFilter === 'all' || memberStatus === statusFilter

        // Verification filter
        const matchesVerification =
            verificationFilter === 'all' ||
            (verificationFilter === 'verified' && member.emailVerified) ||
            (verificationFilter === 'unverified' && !member.emailVerified)

        return matchesSearch && matchesStatus && matchesVerification
    })

    const getStatusBadge = (status) => {
        const actualStatus = status || 'active'
        const config = {
            active: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Active' },
            deceased: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', label: 'Deceased' },
            exited: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Exited' },
            deactivated: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Deactivated' }
        }
        const { color, label } = config[actualStatus] || config.active
        return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${color}`}>{label}</span>
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Manage cooperative members and their accounts
                </p>
            </div>

            {/* Filters */}
            <Card className="p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            placeholder="Search by name, staff ID, member ID, phone..."
                            icon={Search}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="deceased">Deceased</option>
                            <option value="exited">Exited</option>
                            <option value="deactivated">Deactivated</option>
                        </select>
                    </div>
                    <div>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={verificationFilter}
                            onChange={(e) => setVerificationFilter(e.target.value)}
                        >
                            <option value="all">All Members</option>
                            <option value="verified">Verified</option>
                            <option value="unverified">Unverified</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Members</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{members.length}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Active</p>
                    <p className="text-2xl font-bold text-green-600">{members.filter(m => (m.accountStatus || 'active') === 'active').length}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Verified</p>
                    <p className="text-2xl font-bold text-blue-600">{members.filter(m => m.emailVerified).length}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Deactivated</p>
                    <p className="text-2xl font-bold text-red-600">{members.filter(m => m.accountStatus === 'deactivated').length}</p>
                </Card>
            </div>

            {/* Members Table */}
            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Member</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Contact</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Department</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Joined</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Status</th>
                                <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        Loading members...
                                    </td>
                                </tr>
                            ) : filteredMembers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        No members found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredMembers.map((member) => (
                                    <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                    {member.name}
                                                    {member.emailVerified && (
                                                        <UserCheck size={14} className="text-green-600" title="Verified" />
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    Staff: {member.staffId} | ID: {member.memberId}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs">
                                                <p className="text-slate-900 dark:text-white">{member.email}</p>
                                                <p className="text-slate-500 dark:text-slate-400">{member.phone || 'No phone'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {member.department}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">
                                            {member.createdAt ? formatDate(member.createdAt.toDate()) : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(member.accountStatus)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                <div className="relative group">
                                                    <Button size="sm" variant="ghost">
                                                        <Edit2 size={16} />
                                                        Status
                                                    </Button>
                                                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                                        <button
                                                            onClick={() => handleStatusChange(member, 'active')}
                                                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-green-600"
                                                        >
                                                            Set Active
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(member, 'deceased')}
                                                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-600"
                                                        >
                                                            Mark Deceased
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(member, 'exited')}
                                                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-orange-600"
                                                        >
                                                            Mark Exited
                                                        </button>
                                                    </div>
                                                </div>
                                                {(member.accountStatus !== 'deactivated') && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-600 hover:text-red-700"
                                                        onClick={() => handleDeactivate(member)}
                                                    >
                                                        <UserX size={16} />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Status Update Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            Update Member Status
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            {selectedMember?.name} - Status: <span className="capitalize font-semibold">{newStatus}</span>
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                                Note (Optional)
                            </label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                rows="3"
                                placeholder="Enter note about status change..."
                                value={statusNote}
                                onChange={(e) => setStatusNote(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button variant="ghost" onClick={() => setShowModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmitStatusChange} loading={submitting}>
                                Update Status
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
