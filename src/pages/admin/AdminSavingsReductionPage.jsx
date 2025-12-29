import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Search, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { savingsReductionAPI } from '../../services/complaintsAPI'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

export default function AdminSavingsReductionPage() {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState(null)
    const [actionType, setActionType] = useState(null)
    const [adminNote, setAdminNote] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchRequests()
    }, [])

    const fetchRequests = async () => {
        try {
            setLoading(true)
            const data = await savingsReductionAPI.getAll()
            setRequests(data)
        } catch (error) {
            console.error('Error fetching requests:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAction = (request, action) => {
        setSelectedRequest(request)
        setActionType(action)
        setShowModal(true)
        setAdminNote('')
    }

    const handleSubmit = async () => {
        if (!selectedRequest) return

        setSubmitting(true)
        try {
            await savingsReductionAPI.updateStatus(
                selectedRequest.id,
                actionType,
                adminNote
            )
            await fetchRequests()
            setShowModal(false)
            alert(`Request ${actionType} successfully!`)
        } catch (error) {
            console.error('Error updating request:', error)
            alert('Failed to update request')
        } finally {
            setSubmitting(false)
        }
    }

    const filteredRequests = requests.filter(r => {
        const matchesFilter = filter === 'all' || r.status === filter
        const matchesSearch = r.memberName?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesFilter && matchesSearch
    })

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        }
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Savings Reduction Requests
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Review and approve savings reduction requests
                </p>
            </div>

            {/* Filters */}
            <Card className="p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                        {['all', 'pending', 'approved', 'rejected'].map((tab) => (
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
                            placeholder="Search by member name..."
                            icon={Search}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Member</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Reason</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Date</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Status</th>
                                <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredRequests.map((request) => (
                                <tr key={request.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                {request.memberName}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {request.memberId}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                        {formatCurrency(request.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                                        {request.reason}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {request.createdAt ? formatDate(request.createdAt.toDate()) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(request.status)}`}>
                                            <span className="capitalize">{request.status}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {request.status === 'pending' ? (
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    className="h-8 px-3 bg-green-500 hover:bg-green-600"
                                                    onClick={() => handleAction(request, 'approved')}
                                                >
                                                    <CheckCircle size={16} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="h-8 px-3 bg-red-500 hover:bg-red-600"
                                                    onClick={() => handleAction(request, 'rejected')}
                                                >
                                                    <XCircle size={16} />
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-500">Processed</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Action Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            {actionType === 'approved' ? 'Approve' : 'Reject'} Reduction Request
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            {selectedRequest?.memberName} - {formatCurrency(selectedRequest?.amount)}
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                                Admin Note {actionType === 'rejected' && '(Required)'}
                            </label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                rows="4"
                                placeholder="Enter note..."
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button variant="ghost" onClick={() => setShowModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                loading={submitting}
                                disabled={actionType === 'rejected' && !adminNote.trim()}
                            >
                                {actionType === 'approved' ? 'Approve' : 'Reject'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
