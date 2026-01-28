import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore'
import { db, functions } from '../../lib/firebase'
import { useAuthStore } from '../../store/authStore'
import { UserCheck, UserX, Clock, AlertCircle, RefreshCw, Shield, CheckCircle2 } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { formatDate } from '../../utils/formatters'
import { httpsCallable } from 'firebase/functions'
import { useToast } from '../../context/ToastContext'
import EmptyState from '../../components/ui/EmptyState'
import SkeletonLoader from '../../components/ui/SkeletonLoader'

export default function RegistrationApprovalsPage() {
    const [pendingUsers, setPendingUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedUser, setSelectedUser] = useState(null)
    const [rejectionReason, setRejectionReason] = useState('')
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [processing, setProcessing] = useState(false)
    const { user } = useAuthStore()
    const toast = useToast()

    useEffect(() => {
        fetchPendingRegistrations()
    }, [])

    const fetchPendingRegistrations = async () => {
        try {
            setLoading(true)
            const q = query(
                collection(db, 'users'),
                where('approvalStatus', '==', 'pending'),
                orderBy('createdAt', 'desc')
            )

            const snapshot = await getDocs(q)

            // Fetch KYC status for each user
            const usersWithKYC = await Promise.all(
                snapshot.docs.map(async (userDoc) => {
                    const userData = { id: userDoc.id, ...userDoc.data() }

                    // Check if user has virtual account (indicates KYC completed)
                    try {
                        const walletDoc = await getDoc(doc(db, 'wallets', userDoc.id))
                        if (walletDoc.exists()) {
                            const walletData = walletDoc.data()
                            userData.kycStatus = {
                                hasVirtualAccount: !!walletData.virtualAccountNumber,
                                accountNumber: walletData.virtualAccountNumber,
                                bankName: walletData.virtualBankName,
                                tier: walletData.accountTier || 1,
                                bvnVerified: walletData.bvnVerified || false
                            }
                        }
                    } catch (err) {
                        console.warn('Could not fetch wallet for user:', userDoc.id)
                    }

                    return userData
                })
            )

            setPendingUsers(usersWithKYC)
        } catch (error) {
            console.error('Error fetching pending registrations:', error)
            toast.error('Failed to load pending registrations')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (userId, userName) => {
        try {
            setProcessing(true)
            const approveFn = httpsCallable(functions, 'approveMemberRegistration')
            const result = await approveFn({ userId })

            toast.success(`${userName} approved! Member ID: ${result.data.memberId}`)
            await fetchPendingRegistrations()
        } catch (error) {
            console.error('Error approving registration:', error)
            toast.error(error.message || 'Failed to approve registration')
        } finally {
            setProcessing(false)
        }
    }

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast.error('Please provide a reason for rejection')
            return
        }

        try {
            setProcessing(true)
            const rejectFn = httpsCallable(functions, 'rejectMemberRegistration')
            await rejectFn({
                userId: selectedUser.id,
                reason: rejectionReason
            })

            toast.success('Registration rejected')
            setShowRejectModal(false)
            setRejectionReason('')
            setSelectedUser(null)
            await fetchPendingRegistrations()
        } catch (error) {
            console.error('Error rejecting registration:', error)
            toast.error(error.message || 'Failed to reject registration')
        } finally {
            setProcessing(false)
        }
    }

    if (loading) {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Registration Approvals
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Review and approve new member registrations
                    </p>
                </div>
                <Button onClick={fetchPendingRegistrations} variant="outline" disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <Clock className="text-orange-600 dark:text-orange-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending Approval</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {pendingUsers.length}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Pending Registrations */}
            {pendingUsers.length === 0 ? (
                <EmptyState
                    icon={AlertCircle}
                    title="No Pending Registrations"
                    description="All registrations have been processed. New registrations will appear here for approval."
                />
            ) : (
                <Card className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        Name
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        Email
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        Phone
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        Registered
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        Email Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        KYC Status
                                    </th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {pendingUsers.map((pendingUser) => (
                                    <tr key={pendingUser.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                {pendingUser.name}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {pendingUser.email}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {pendingUser.phoneNumber || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {formatDate(pendingUser.createdAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${pendingUser.emailVerified
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                }`}>
                                                {pendingUser.emailVerified ? 'Verified' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {pendingUser.kycStatus?.hasVirtualAccount ? (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <CheckCircle2 className="text-green-500" size={14} />
                                                        <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                                                            Tier {pendingUser.kycStatus.tier}
                                                        </span>
                                                    </div>
                                                    {pendingUser.kycStatus.bvnVerified && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Shield className="text-blue-500" size={12} />
                                                            <span className="text-xs text-blue-600 dark:text-blue-400">
                                                                BVN Verified
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    Not Started
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApprove(pendingUser.id, pendingUser.name)}
                                                    disabled={processing}
                                                >
                                                    <UserCheck size={16} />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={() => {
                                                        setSelectedUser(pendingUser)
                                                        setShowRejectModal(true)
                                                    }}
                                                    disabled={processing}
                                                >
                                                    <UserX size={16} />
                                                    Reject
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            Reject Registration
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Provide a reason for rejecting <span className="font-semibold">{selectedUser?.name}</span>'s registration:
                        </p>
                        <textarea
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg mb-4 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                            rows={4}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g., Invalid information provided, not eligible for membership..."
                        />
                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowRejectModal(false)
                                    setRejectionReason('')
                                    setSelectedUser(null)
                                }}
                                disabled={processing}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleReject}
                                loading={processing}
                            >
                                Confirm Rejection
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
