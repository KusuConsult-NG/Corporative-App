import { useState, useEffect } from 'react'
import { Calendar, DollarSign, CheckCircle, XCircle, Clock, TrendingDown } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { formatCurrency } from '../../utils/formatters'
import Card from '../../components/ui/Card'

export default function LoanDeductionHistoryPage() {
    const { user } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [deductions, setDeductions] = useState([])
    const [stats, setStats] = useState({
        totalDeducted: 0,
        totalPending: 0,
        completedPayments: 0,
        pendingPayments: 0
    })

    useEffect(() => {
        fetchDeductionHistory()
    }, [user])

    const fetchDeductionHistory = async () => {
        if (!user?.userId) return

        setLoading(true)
        try {
            // Get all loans for this user
            const loansQuery = query(
                collection(db, 'loans'),
                where('userId', '==', user.userId),
                orderBy('createdAt', 'desc')
            )
            const loansSnapshot = await getDocs(loansQuery)

            // Get deductions for each loan
            const allDeductions = []
            let totalDeducted = 0
            let totalPending = 0
            let completedCount = 0
            let pendingCount = 0

            for (const loanDoc of loansSnapshot.docs) {
                const loanData = loanDoc.data()

                // Get deductions subcollection for this loan
                const deductionsQuery = query(
                    collection(db, 'loans', loanDoc.id, 'deductions'),
                    orderBy('dueDate', 'desc')
                )
                const deductionsSnapshot = await getDocs(deductionsQuery)

                deductionsSnapshot.docs.forEach(doc => {
                    const deduction = {
                        id: doc.id,
                        loanId: loanDoc.id,
                        loanType: loanData.loanType,
                        ...doc.data()
                    }
                    allDeductions.push(deduction)

                    if (deduction.status === 'completed') {
                        totalDeducted += deduction.amount
                        completedCount++
                    } else if (deduction.status === 'pending') {
                        totalPending += deduction.amount
                        pendingCount++
                    }
                })
            }

            // Sort all deductions by due date
            allDeductions.sort((a, b) => {
                const aDate = a.dueDate?.toDate() || new Date()
                const bDate = b.dueDate?.toDate() || new Date()
                return bDate - aDate
            })

            setDeductions(allDeductions)
            setStats({
                totalDeducted,
                totalPending,
                completedPayments: completedCount,
                pendingPayments: pendingCount
            })
        } catch (error) {
            console.error('Error fetching deduction history:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A'
        const date = timestamp.toDate()
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date)
    }

    const getStatusBadge = (status) => {
        const config = {
            completed: {
                icon: CheckCircle,
                bg: 'bg-green-100 dark:bg-green-900/30',
                text: 'text-green-700 dark:text-green-400',
                label: 'Paid'
            },
            pending: {
                icon: Clock,
                bg: 'bg-yellow-100 dark:bg-yellow-900/30',
                text: 'text-yellow-700 dark:text-yellow-400',
                label: 'Pending'
            },
            failed: {
                icon: XCircle,
                bg: 'bg-red-100 dark:bg-red-900/30',
                text: 'text-red-700 dark:text-red-400',
                label: 'Failed'
            },
            overdue: {
                icon: XCircle,
                bg: 'bg-red-100 dark:bg-red-900/30',
                text: 'text-red-700 dark:text-red-400',
                label: 'Overdue'
            }
        }

        const item = config[status] || config.pending
        const Icon = item.icon

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${item.bg} ${item.text}`}>
                <Icon size={14} />
                {item.label}
            </span>
        )
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Loan Deduction History
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Track all your loan deductions and payment schedule
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-green-700 dark:text-green-400 mb-1">Total Paid</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                                {formatCurrency(stats.totalDeducted)}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                                {stats.completedPayments} payment{stats.completedPayments !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <div className="p-3 bg-green-200 dark:bg-green-800 rounded-lg">
                            <CheckCircle className="text-green-700 dark:text-green-300" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-1">Pending Deductions</p>
                            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
                                {formatCurrency(stats.totalPending)}
                            </p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                                {stats.pendingPayments} upcoming
                            </p>
                        </div>
                        <div className="p-3 bg-yellow-200 dark:bg-yellow-800 rounded-lg">
                            <Clock className="text-yellow-700 dark:text-yellow-300" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Total Deductions</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                                {stats.completedPayments + stats.pendingPayments}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                                All time
                            </p>
                        </div>
                        <div className="p-3 bg-blue-200 dark:bg-blue-800 rounded-lg">
                            <TrendingDown className="text-blue-700 dark:text-blue-300" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-purple-700 dark:text-purple-400 mb-1">Completion Rate</p>
                            <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                                {stats.completedPayments + stats.pendingPayments > 0
                                    ? Math.round((stats.completedPayments / (stats.completedPayments + stats.pendingPayments)) * 100)
                                    : 0}%
                            </p>
                            <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                                Payment progress
                            </p>
                        </div>
                        <div className="p-3 bg-purple-200 dark:bg-purple-800 rounded-lg">
                            <DollarSign className="text-purple-700 dark:text-purple-300" size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Deduction History Table */}
            <Card>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Deduction History
                </h2>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="mt-4 text-slate-600 dark:text-slate-400">Loading deduction history...</p>
                    </div>
                ) : deductions.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            No Deduction History
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400">
                            You don't have any loan deductions yet
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Date
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Loan Type
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Amount
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Status
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Reference
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {deductions.map((deduction) => (
                                    <tr
                                        key={deduction.id}
                                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <td className="py-3 px-4 text-sm text-slate-900 dark:text-white">
                                            {formatDate(deduction.dueDate)}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 capitalize">
                                            {deduction.loanType || 'N/A'}
                                        </td>
                                        <td className="py-3 px-4 text-sm font-semibold text-slate-900 dark:text-white">
                                            {formatCurrency(deduction.amount)}
                                        </td>
                                        <td className="py-3 px-4">
                                            {getStatusBadge(deduction.status)}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 font-mono">
                                            {deduction.reference || 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}
