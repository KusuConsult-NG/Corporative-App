import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, CreditCard, User, Calendar } from 'lucide-react'
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { emailService } from '../../services/emailService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import ApprovalStatusBadge from '../../components/ui/ApprovalStatusBadge'

export default function AdminApprovalsPage() {
    const [approvalRequests, setApprovalRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('pending') // 'all', 'pending', 'approved', 'rejected'
    const [processingId, setProcessingId] = useState(null)

    useEffect(() => {
        fetchApprovalRequests()
    }, [filter])

    const fetchApprovalRequests = async () => {
        setLoading(true)
        try {
            let q
            if (filter === 'all') {
                q = query(collection(db, 'approvalRequests'))
            } else {
                q = query(
                    collection(db, 'approvalRequests'),
                    where('status', '==', filter)
                )
            }

            const snapshot = await getDocs(q)
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))

            // Sort by date (newest first)
            requests.sort((a, b) => {
                const aTime = a.requestedAt?.toMillis() || 0
                const bTime = b.requestedAt?.toMillis() || 0
                return bTime - aTime
            })

            setApprovalRequests(requests)
        } catch (error) {
            console.error('Error fetching approval requests:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleApproval = async (requestId, status, note = '') => {
        setProcessingId(requestId)
        try {
            const request = approvalRequests.find(r => r.id === requestId)
            if (!request) return

            // Update approval request status
            await updateDoc(doc(db, 'approvalRequests', requestId), {
                status,
                reviewedAt: serverTimestamp(),
                reviewNote: note
            })

            // Send email notification to user
            await emailService.sendApprovalStatusUpdate(
                request.userEmail,
                request.userName,
                request.type,
                status,
                note
            )

            // Refresh the list
            await fetchApprovalRequests()
        } catch (error) {
            console.error('Error processing approval:', error)
            alert('Failed to process approval. Please try again.')
        } finally {
            setProcessingId(null)
        }
    }

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A'
        const date = timestamp.toDate()
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date)
    }

    const getStatusCount = (status) => {
        return approvalRequests.filter(r => r.status === status).length
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Approval Requests
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Review and manage member bank detail approval requests
                </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filter === 'pending'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <Clock size={16} className="inline mr-1" />
                    Pending ({getStatusCount('pending')})
                </button>
                <button
                    onClick={() => setFilter('approved')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filter === 'approved'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <CheckCircle size={16} className="inline mr-1" />
                    Approved ({getStatusCount('approved')})
                </button>
                <button
                    onClick={() => setFilter('rejected')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filter === 'rejected'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <XCircle size={16} className="inline mr-1" />
                    Rejected ({getStatusCount('rejected')})
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filter === 'all'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    All ({approvalRequests.length})
                </button>
            </div>

            {/* Approval Requests List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Loading requests...</p>
                </div>
            ) : approvalRequests.length === 0 ? (
                <Card className="text-center py-12">
                    <CreditCard size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No {filter !== 'all' ? filter : ''} requests
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                        {filter === 'pending'
                            ? 'All approval requests have been processed'
                            : `No ${filter} approval requests found`
                        }
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {approvalRequests.map((request) => (
                        <Card key={request.id} className="hover:shadow-lg transition-shadow">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                {/* Request Info */}
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                                <CreditCard className="text-blue-600 dark:text-blue-400" size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <User size={16} />
                                                    {request.userName}
                                                </h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    {request.userEmail}
                                                </p>
                                            </div>
                                        </div>
                                        <ApprovalStatusBadge status={request.status} />
                                    </div>

                                    {/* Bank Details */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mb-3">
                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Bank Account Details
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                            <div>
                                                <p className="text-slate-500 dark:text-slate-400">Bank Name</p>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {request.requestData?.bankName}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 dark:text-slate-400">Account Number</p>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {request.requestData?.accountNumber}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 dark:text-slate-400">Account Name</p>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {request.requestData?.accountName}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metadata */}
                                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            <span>Requested: {formatDate(request.requestedAt)}</span>
                                        </div>
                                        {request.reviewedAt && (
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                <span>Reviewed: {formatDate(request.reviewedAt)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Review Note */}
                                    {request.reviewNote && (
                                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                            <p className="text-xs font-semibold text-blue-900 dark:text-blue-400 mb-1">
                                                Review Note:
                                            </p>
                                            <p className="text-sm text-blue-800 dark:text-blue-300">
                                                {request.reviewNote}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                {request.status === 'pending' && (
                                    <div className="flex lg:flex-col gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                const note = prompt('Add approval note (optional):')
                                                if (note !== null) {
                                                    handleApproval(request.id, 'approved', note)
                                                }
                                            }}
                                            disabled={processingId === request.id}
                                            loading={processingId === request.id}
                                            className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700"
                                        >
                                            <CheckCircle size={16} />
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const note = prompt('Reason for rejection (required):')
                                                if (note && note.trim()) {
                                                    handleApproval(request.id, 'rejected', note)
                                                } else if (note !== null) {
                                                    alert('Please provide a reason for rejection')
                                                }
                                            }}
                                            disabled={processingId === request.id}
                                            className="flex-1 lg:flex-none border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                                        >
                                            <XCircle size={16} />
                                            Reject
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
