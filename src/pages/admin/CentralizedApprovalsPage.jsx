import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    CheckCircle,
    XCircle,
    Clock,
    Filter,
    CreditCard,
    UserCheck,
    Edit,
    TrendingDown,
    Package,
    Eye
} from 'lucide-react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import EmptyState from '../../components/ui/EmptyState'
import { formatCurrency, formatDate } from '../../utils/formatters'

const APPROVAL_TYPES = [
    {
        id: 'all',
        label: 'All Approvals',
        icon: Filter,
        color: 'slate'
    },
    {
        id: 'loans',
        label: 'Loans',
        icon: CreditCard,
        collection: 'loans',
        statusField: 'status',
        pendingValue: 'pending',
        color: 'blue',
        route: '/admin/loans/requests'
    },
    {
        id: 'registrations',
        label: 'Registrations',
        icon: UserCheck,
        collection: 'users',
        statusField: 'status',
        pendingValue: 'pending',
        color: 'green',
        route: '/admin/registration-approvals'
    },
    {
        id: 'profile_changes',
        label: 'Profile Changes',
        icon: Edit,
        collection: 'profile_change_requests',
        statusField: 'status',
        pendingValue: 'pending',
        color: 'orange',
        route: '/admin/profile-change-requests'
    },
    {
        id: 'savings',
        label: 'Savings Reduction',
        icon: TrendingDown,
        collection: 'savings_reduction_requests',
        statusField: 'status',
        pendingValue: 'pending',
        color: 'purple',
        route: '/admin/savings-reduction-requests'
    },
    {
        id: 'commodities',
        label: 'Commodity Orders',
        icon: Package,
        collection: 'commodity_orders',
        statusField: 'status',
        pendingValue: 'pending',
        color: 'teal',
        route: '/admin/commodity-orders'
    }
]

export default function CentralizedApprovalsPage() {
    const navigate = useNavigate()
    const [approvals, setApprovals] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [counts, setCounts] = useState({})

    useEffect(() => {
        fetchAllApprovals()
    }, [filter])

    const fetchAllApprovals = async () => {
        setLoading(true)
        try {
            const allApprovals = []
            const newCounts = {}

            const typesToFetch = filter === 'all'
                ? APPROVAL_TYPES.filter(t => t.collection)
                : APPROVAL_TYPES.filter(t => t.id === filter)

            for (const type of typesToFetch) {
                if (!type.collection) continue

                const q = query(
                    collection(db, type.collection),
                    where(type.statusField, '==', type.pendingValue)
                )

                const snapshot = await getDocs(q)
                newCounts[type.id] = snapshot.size

                snapshot.docs.forEach(doc => {
                    const data = doc.data()
                    allApprovals.push({
                        id: doc.id,
                        type: type.id,
                        typeLabel: type.label,
                        icon: type.icon,
                        color: type.color,
                        route: type.route,
                        ...data,
                        // Normalize fields for display
                        displayName: data.memberName || data.fullName || data.name || data.displayName || '-',
                        displayAmount: data.amount || data.loanAmount || data.reductionAmount || data.totalPrice || null,
                        displayDate: data.createdAt || data.requestedAt || data.submittedAt
                    })
                })
            }

            // Sort by date (newest first)
            allApprovals.sort((a, b) => {
                const aTime = a.displayDate?.seconds || 0
                const bTime = b.displayDate?.seconds || 0
                return bTime - aTime
            })

            setApprovals(allApprovals)
            setCounts(newCounts)
        } catch (error) {
            console.error('Error fetching approvals:', error)
        } finally {
            setLoading(false)
        }
    }

    const getTypeColor = (color) => {
        const colors = {
            blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
            slate: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
        }
        return colors[color] || colors.slate
    }

    const handleViewDetails = (approval) => {
        if (approval.type === 'loans') {
            navigate(`/admin/loans/requests`)
        } else if (approval.type === 'registrations') {
            navigate(`/admin/registration-approvals`)
        } else if (approval.type === 'profile_changes') {
            navigate(`/admin/profile-change-requests`)
        } else if (approval.type === 'savings') {
            navigate(`/admin/savings-reduction-requests`)
        } else if (approval.type === 'commodities') {
            navigate(`/admin/commodity-orders`)
        }
    }

    const totalPending = Object.values(counts).reduce((sum, count) => sum + count, 0)

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        Centralized Approvals
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-primary text-white">
                            {totalPending}
                        </span>
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        All pending approvals in one unified dashboard
                    </p>
                </div>
            </div>

            {/* Filter Tabs */}
            <Card className="p-4">
                <div className="flex gap-2 overflow-x-auto">
                    {APPROVAL_TYPES.map(type => {
                        const Icon = type.icon
                        const count = counts[type.id] || 0
                        const isActive = filter === type.id

                        return (
                            <button
                                key={type.id}
                                onClick={() => setFilter(type.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <Icon size={16} />
                                {type.label}
                                {(type.id === 'all' ? totalPending : count) > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                        }`}>
                                        {type.id === 'all' ? totalPending : count}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </Card>

            {/* Approvals Table */}
            {loading ? (
                <SkeletonLoader count={5} />
            ) : approvals.length === 0 ? (
                <EmptyState
                    icon={CheckCircle}
                    title="No Pending Approvals"
                    description={
                        filter === 'all'
                            ? "Great job! All approval requests have been processed."
                            : `No pending ${filter.replace('_', ' ')} approvals at this time.`
                    }
                />
            ) : (
                <Card className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Type</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Member/Requester</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Date</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {approvals.map((approval) => {
                                    const Icon = approval.icon

                                    return (
                                        <tr
                                            key={`${approval.type}-${approval.id}`}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${getTypeColor(approval.color)}`}>
                                                    <Icon size={14} />
                                                    {approval.typeLabel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-900 dark:text-white">
                                                    {approval.displayName}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {approval.memberId || approval.userId || approval.id}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                                {approval.displayAmount
                                                    ? formatCurrency(approval.displayAmount)
                                                    : '-'
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                {approval.displayDate
                                                    ? formatDate(approval.displayDate.toDate())
                                                    : '-'
                                                }
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                    <Clock size={12} />
                                                    Pending
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleViewDetails(approval)}
                                                >
                                                    <Eye size={16} />
                                                    Review
                                                </Button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    )
}
