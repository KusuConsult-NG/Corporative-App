import { useState } from 'react'
import {
    Search,
    Filter,
    MoreVertical,
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    ChevronDown,
    Eye
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import GuarantorStatusBadge from '../../components/ui/GuarantorStatusBadge'

const MOCK_REQUESTS = [
    {
        id: 1,
        applicant: {
            name: 'Dr. Sarah Johnson',
            department: 'Computer Science',
            image: null
        },
        type: 'Personal Loan',
        amount: 500000,
        duration: 12,
        date: '2023-12-20',
        guarantors: 2,
        guarantorsApproved: 1,
        status: 'pending_guarantors',
        reason: 'Home renovation'
    },
    {
        id: 2,
        applicant: {
            name: 'Prof. Michael Okon',
            department: 'Physics',
            image: null
        },
        type: 'Car Loan',
        amount: 2500000,
        duration: 24,
        date: '2023-12-18',
        guarantors: 2,
        guarantorsApproved: 2,
        status: 'pending',
        reason: 'Purchase of a new vehicle'
    },
    {
        id: 3,
        applicant: {
            name: 'Mrs. Grace Adebayo',
            department: 'Bursary',
            image: null
        },
        type: 'Emergency Loan',
        amount: 200000,
        duration: 6,
        date: '2023-12-22',
        guarantors: 1,
        guarantorsApproved: 0,
        status: 'pending_guarantors',
        reason: 'Medical expenses'
    },
    {
        id: 4,
        applicant: {
            name: 'Mr. David Okafor',
            department: 'security',
            image: null
        },
        type: 'Personal Loan',
        amount: 150000,
        duration: 8,
        date: '2023-12-15',
        guarantors: 2,
        status: 'rejected',
        reason: 'Exceeded loan limit'
    }
]

export default function LoanRequestsPage() {
    const [requests, setRequests] = useState(MOCK_REQUESTS)
    const [filter, setFilter] = useState('all') // all, pending, approved, rejected
    const [searchQuery, setSearchQuery] = useState('')

    const handleAction = (id, action) => {
        setRequests(requests.map(req => {
            if (req.id === id) {
                return { ...req, status: action === 'approve' ? 'approved' : 'rejected' }
            }
            return req
        }))
    }

    const filteredRequests = requests.filter(req => {
        const matchesFilter = filter === 'all' || req.status === filter
        const matchesSearch = req.applicant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.type.toLowerCase().includes(searchQuery.toLowerCase())
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

            {/* Filters and Search */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
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
                                                    {request.applicant.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">
                                                        {request.applicant.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {request.applicant.department}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {request.type}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {request.duration} months • {request.guarantors} guarantors
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                            {formatCurrency(request.amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <GuarantorStatusBadge
                                                approved={request.guarantorsApproved || 0}
                                                required={request.guarantors}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {formatDate(request.date)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(request.status)}`}>
                                                {getStatusIcon(request.status)}
                                                <span className="capitalize">{request.status}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                {request.status === 'pending' ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            className="h-8 px-3 bg-green-500 hover:bg-green-600 text-white border-none shadow-none"
                                                            onClick={() => handleAction(request.id, 'approve')}
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-8 px-3 bg-red-500 hover:bg-red-600 text-white border-none shadow-none"
                                                            onClick={() => handleAction(request.id, 'reject')}
                                                            title="Reject"
                                                        >
                                                            <XCircle size={16} />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button variant="ghost" size="sm" className="h-8 px-3">
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
        </div>
    )
}
