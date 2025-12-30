import { useState, useEffect } from 'react'
import {
    Search,
    Filter,
    MoreVertical,
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    ChevronDown,
    Eye,
    PlayCircle,
    StopCircle,
    AlertCircle
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import GuarantorStatusBadge from '../../components/ui/GuarantorStatusBadge'
import { loansAPI } from '../../services/api'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { emailService } from '../../services/emailService'
import { createSystemNotification } from '../../utils/notificationUtils'
import { useAuthStore } from '../../store/authStore'
import { hasPermission, PERMISSIONS } from '../../utils/permissions'

export default function LoanRequestsPage() {
    const { user } = useAuthStore()
    const canApproveLoans = hasPermission(user, PERMISSIONS.APPROVE_LOANS)
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, pending, approved, rejected, active
    const [searchQuery, setSearchQuery] = useState('')
    const [showActionModal, setShowActionModal] = useState(false)
    const [selectedLoan, setSelectedLoan] = useState(null)
    const [actionType, setActionType] = useState(null) // 'approve', 'decline', 'activate', 'deactivate'
    const [actionReason, setActionReason] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Fetch all loan requests
    useEffect(() => {
        const fetchLoans = async () => {
            try {
                setLoading(true)
                const allLoans = await loansAPI.getAllLoans()
                setRequests(allLoans)
            } catch (error) {
                console.error('Error fetching loans:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchLoans()
    }, [])

    const handleActionClick = (loan, action) => {
        setSelectedLoan(loan)
        setActionType(action)
        setShowActionModal(true)
        setActionReason('')
    }

    const handleActionSubmit = async () => {
        if (!selectedLoan) return

        setSubmitting(true)
        try {
            const loanRef = doc(db, 'loans', selectedLoan.id)

            if (actionType === 'approve') {
                await updateDoc(loanRef, {
                    status: 'approved',
                    approvedAt: new Date(),
                    approvalReason: actionReason || 'Approved'
                })
            } else if (actionType === 'decline') {
                await updateDoc(loanRef, {
                    status: 'rejected',
                    rejectedAt: new Date(),
                    rejectionReason: actionReason || 'Declined'
                })
            } else if (actionType === 'activate') {
                await updateDoc(loanRef, {
                    status: 'active',
                    activatedAt: new Date(),
                    activationNote: actionReason
                })
            } else if (actionType === 'deactivate') {
                await updateDoc(loanRef, {
                    status: 'closed',
                    closedAt: new Date(),
                    closureReason: actionReason
                })
            }

            // Send notifications and emails for approve/decline (optional, don't fail if this fails)
            try {
                if (actionType === 'approve') {
                    await createSystemNotification({
                        userId: selectedLoan.userId,
                        type: 'loan_status',
                        title: 'Loan Approved!',
                        message: `Your loan of ${formatCurrency(selectedLoan.amount)} has been approved`,
                        actionUrl: '/member/loans',
                        actionLabel: 'View Loan'
                    })
                    await emailService.sendLoanApprovalEmail(selectedLoan.email || selectedLoan.userEmail, selectedLoan)
                } else if (actionType === 'decline') {
                    await createSystemNotification({
                        userId: selectedLoan.userId,
                        type: 'loan_status',
                        title: 'Loan Application Update',
                        message: 'Your loan application requires review. Please check details.',
                        actionUrl: '/member/loans'
                    })
                    await emailService.sendLoanRejectionEmail(selectedLoan.email || selectedLoan.userEmail, selectedLoan, actionReason)
                }
            } catch (notifyError) {
                console.warn('Notifications or emails failed:', notifyError)
            }

            // Refresh loans
            const allLoans = await loansAPI.getAllLoans()
            setRequests(allLoans)
            setShowActionModal(false)
            alert(`Loan ${actionType}d successfully!`)
        } catch (error) {
            console.error('Error updating loan:', error)
            alert('Failed to update loan. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const filteredRequests = requests.filter(req => {
        const matchesFilter = filter === 'all' || req.status === filter
        const matchesSearch = req.applicantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.loanType?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesFilter && matchesSearch
    })

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved': return <CheckCircle size={14} />
            case 'rejected': return <XCircle size={14} />
            default: return <Clock size={14} />
        }
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Loan Requests</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Manage and review incoming loan applications
                    </p>
                </div>
                <Button>
                    <FileText size={20} />
                    Export Report
                </Button>
            </div>

            {/* Read-Only Warning for Limited Admins */}
            {!canApproveLoans && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="text-blue-600 dark:text-blue-400" size={20} />
                        <div>
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                Read-Only Access
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                You can view loan requests but cannot approve or reject them.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters and Search */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        {['all', 'pending', 'approved', 'active', 'rejected'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize whitespace-nowrap ${filter === tab
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="w-full md:w-72">
                        <Input
                            placeholder="Search requests..."
                            icon={Search}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10"
                        />
                    </div>
                </div>
            </Card>

            {/* Requests Table */}
            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Applicant</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Loan Details</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Guarantors</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Applied On</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Status</th>
                                <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredRequests.length > 0 ? (
                                filteredRequests.map((request) => (
                                    <tr
                                        key={request.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {request.applicantName?.charAt(0) || 'M'}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">
                                                        {request.applicantName || 'Unknown'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {request.memberId || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-900 dark:text-white capitalize">
                                                {request.loanType?.replace('_', ' ') || 'N/A'}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {request.duration} months • {request.guarantorsRequired || 0} guarantors
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                            {formatCurrency(request.amount || 0)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <GuarantorStatusBadge
                                                approved={request.guarantorsApproved || 0}
                                                required={request.guarantorsRequired || 0}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {request.createdAt ? formatDate(request.createdAt.toDate()) : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(request.status)}`}>
                                                {getStatusIcon(request.status)}
                                                <span className="capitalize">{request.status?.replace('_', ' ')}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                {canApproveLoans ? (
                                                    <>
                                                        {request.status === 'pending' ? (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    className="h-8 px-3 bg-green-500 hover:bg-green-600 text-white border-none shadow-none"
                                                                    onClick={() => handleActionClick(request, 'approve')}
                                                                    title="Approve Loan"
                                                                >
                                                                    <CheckCircle size={16} />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="h-8 px-3 bg-red-500 hover:bg-red-600 text-white border-none shadow-none"
                                                                    onClick={() => handleActionClick(request, 'decline')}
                                                                    title="Decline Loan"
                                                                >
                                                                    <XCircle size={16} />
                                                                </Button>
                                                            </>
                                                        ) : request.status === 'approved' ? (
                                                            <Button
                                                                size="sm"
                                                                className="h-8 px-3 bg-blue-500 hover:bg-blue-600 text-white border-none shadow-none"
                                                                onClick={() => handleActionClick(request, 'activate')}
                                                                title="Activate Loan"
                                                            >
                                                                <PlayCircle size={16} />
                                                                Activate
                                                            </Button>
                                                        ) : request.status === 'active' ? (
                                                            <Button
                                                                size="sm"
                                                                className="h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white border-none shadow-none"
                                                                onClick={() => handleActionClick(request, 'deactivate')}
                                                                title="Deactivate Loan"
                                                            >
                                                                <StopCircle size={16} />
                                                                Deactivate
                                                            </Button>
                                                        ) : (
                                                            <Button variant="ghost" size="sm" className="h-8 px-3">
                                                                <Eye size={16} />
                                                            </Button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <Button variant="ghost" size="sm" className="h-8 px-3" disabled title="Read-only access">
                                                        <Eye size={16} />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                        No loan requests found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Action Modal */}
            {showActionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            {actionType === 'approve' && 'Approve Loan'}
                            {actionType === 'decline' && 'Decline Loan'}
                            {actionType === 'activate' && 'Activate Loan'}
                            {actionType === 'deactivate' && 'Deactivate Loan'}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            {selectedLoan?.applicantName} - {formatCurrency(selectedLoan?.amount)}
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                                {actionType === 'decline' ? 'Reason for Decline (Required)' : 'Reason/Note (Optional)'}
                            </label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                rows="4"
                                placeholder={`Enter ${actionType} reason...`}
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="ghost"
                                onClick={() => setShowActionModal(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleActionSubmit}
                                loading={submitting}
                                disabled={actionType === 'decline' && !actionReason.trim()}
                            >
                                {actionType === 'approve' && 'Approve'}
                                {actionType === 'decline' && 'Decline'}
                                {actionType === 'activate' && 'Activate'}
                                {actionType === 'deactivate' && 'Deactivate'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
