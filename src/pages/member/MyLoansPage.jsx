import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    CreditCard,
    TrendingDown,
    Calendar,
    CheckCircle,
    Clock,
    AlertCircle,
    FileText,
    Download,
    ChevronDown,
    ChevronUp,
    Banknote,
    Percent,
    Timer
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import GuarantorStatusBadge from '../../components/ui/GuarantorStatusBadge'
import { loansAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

export default function MyLoansPage() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [expandedLoan, setExpandedLoan] = useState(null)
    const [selectedTab, setSelectedTab] = useState('active') // active, history
    const [loans, setLoans] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Fetch user's loans from Firestore
    useEffect(() => {
        const fetchLoans = async () => {
            if (!user?.memberId) return

            try {
                setLoading(true)
                const userLoans = await loansAPI.getLoans(user.memberId)
                setLoans(userLoans)
                setError(null)
            } catch (err) {
                console.error('Error fetching loans:', err)
                setError('Failed to load your loans. Please try refreshing the page.')
            } finally {
                setLoading(false)
            }
        }

        fetchLoans()
    }, [user?.memberId])

    // Filter loans by status - Members can ONLY see activated loans
    const activeLoans = loans.filter(loan =>
        loan.status === 'active' // Only show activated loans to members
    )

    const loanHistory = loans.filter(loan =>
        loan.status === 'completed' ||
        loan.status === 'rejected' ||
        loan.status === 'closed'
    )

    // Calculate overall loan statistics
    const totalBorrowed = activeLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0)
    const totalRemaining = activeLoans.reduce((sum, loan) => sum + (loan.remainingBalance || loan.amount || 0), 0)
    const totalMonthlyPayment = activeLoans.reduce((sum, loan) => sum + (loan.monthlyPayment || 0), 0)
    const averageInterestRate = activeLoans.length > 0
        ? activeLoans.reduce((sum, loan) => sum + (loan.interestRate || loan.rate || 0), 0) / activeLoans.length
        : 0

    const toggleLoanDetails = (loanId) => {
        setExpandedLoan(expandedLoan === loanId ? null : loanId)
    }

    const getProgressPercentage = (loan) => {
        if (!loan.paymentsCompleted || !loan.totalPayments) return 0
        return (loan.paymentsCompleted / loan.totalPayments) * 100
    }

    // Show loading state
    if (loading) {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="mt-4 text-slate-600 dark:text-slate-400">Loading your loans...</p>
            </div>
        )
    }

    // Show error state
    if (error) {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto">
                <Card className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                        <AlertCircle size={48} className="text-red-500" />
                        <div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                Failed to Load Loans
                            </h4>
                            <p className="text-slate-500 dark:text-slate-400">{error}</p>
                        </div>
                        <Button onClick={() => window.location.reload()}>
                            Try Again
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Loans</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Manage and track your loan applications
                    </p>
                </div>
                <Button onClick={() => navigate('/member/loans/apply')}>
                    <FileText size={20} />
                    Apply for New Loan
                </Button>
            </div>

            {/* Loan Statistics Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Total Borrowed */}
                <Card className="group hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                        <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                            <CreditCard size={24} />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Total Borrowed
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(totalBorrowed).split('.')[0]}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {activeLoans.length} active loan{activeLoans.length !== 1 ? 's' : ''}
                    </p>
                </Card>

                {/* Outstanding Balance */}
                <Card className="group hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                        <div className="size-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                            <TrendingDown size={24} />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Outstanding
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(totalRemaining).split('.')[0]}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Remaining balance
                    </p>
                </Card>

                {/* Monthly Payment */}
                <Card className="group hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                        <div className="size-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                            <Calendar size={24} />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Monthly Payment
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(totalMonthlyPayment).split('.')[0]}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Due on 25th of each month
                    </p>
                </Card>

                {/* Average Interest */}
                <Card className="group hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                        <div className="size-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                            <Percent size={24} />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Avg. Interest
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {averageInterestRate.toFixed(1)}%
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Annual interest rate
                    </p>
                </Card>
            </section>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setSelectedTab('active')}
                    className={`px-4 py-3 font-bold transition-colors relative ${selectedTab === 'active'
                        ? 'text-primary'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Active Loans ({activeLoans.length})
                    {selectedTab === 'active' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
                <button
                    onClick={() => setSelectedTab('history')}
                    className={`px-4 py-3 font-bold transition-colors relative ${selectedTab === 'history'
                        ? 'text-primary'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Loan History ({loanHistory.length})
                    {selectedTab === 'history' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
            </div>

            {/* Active Loans Tab */}
            {selectedTab === 'active' && (
                <section className="space-y-6">
                    {activeLoans.length === 0 ? (
                        <Card className="text-center py-12">
                            <div className="flex flex-col items-center gap-4">
                                <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <CreditCard size={32} className="text-slate-400" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                        No Active Loans
                                    </h4>
                                    <p className="text-slate-500 dark:text-slate-400">
                                        You don't have any active loans at the moment
                                    </p>
                                </div>
                                <Button className="mt-4" onClick={() => navigate('/member/loans/apply')}>
                                    <FileText size={20} />
                                    Apply for a Loan
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        activeLoans.map((loan) => (
                            <Card key={loan.id} className="overflow-hidden">
                                {/* Loan Header */}
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                                    <div className="flex items-start gap-4">
                                        <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <CreditCard size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                                {loan.type}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                Disbursed on {formatDate(loan.disbursedDate)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <Button variant="secondary" size="sm">
                                            <Download size={16} />
                                            Statement
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleLoanDetails(loan.id)}
                                        >
                                            {expandedLoan === loan.id ? (
                                                <>
                                                    <ChevronUp size={16} />
                                                    Hide Details
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown size={16} />
                                                    View Details
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Loan Summary */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6">
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                            Loan Amount
                                        </p>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                                            {formatCurrency(loan.amount)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                            Outstanding
                                        </p>
                                        <p className="text-lg font-bold text-orange-500">
                                            {formatCurrency(loan.remainingBalance)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                            Monthly Payment
                                        </p>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                                            {formatCurrency(loan.monthlyPayment)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                            Interest Rate
                                        </p>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                                            {loan.interestRate}% p.a.
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="py-6 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            Loan Progress
                                        </p>
                                        <p className="text-sm font-bold text-primary">
                                            {loan.paymentsCompleted} of {loan.totalPayments} payments
                                        </p>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-primary to-blue-500 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${getProgressPercentage(loan)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center mt-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Timer size={16} className="text-slate-400" />
                                            <span className="text-slate-600 dark:text-slate-400">
                                                Next payment: {formatDate(loan.nextPaymentDate)}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                            {getProgressPercentage(loan).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedLoan === loan.id && (
                                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700 space-y-6">
                                        {/* Guarantors */}
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">
                                                Guarantors
                                            </h4>
                                            {loan.guarantors && loan.guarantors.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {loan.guarantors.map((guarantor, index) => (
                                                        <div
                                                            key={index}
                                                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                                                        >
                                                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                                {guarantor.name?.charAt(0) || 'G'}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-slate-900 dark:text-white">
                                                                    {guarantor.name || 'Unknown'}
                                                                </p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                    {guarantor.department || guarantor.fileNumber || 'N/A'}
                                                                </p>
                                                            </div>
                                                            <GuarantorStatusBadge status={guarantor.status || 'pending'} />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                                    No guarantor information available
                                                </p>
                                            )}
                                        </div>

                                        {/* Payment History */}
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">
                                                Payment History
                                            </h4>
                                            {loan.paymentHistory && loan.paymentHistory.length > 0 ? (
                                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                                                                    Date
                                                                </th>
                                                                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                                                                    Amount
                                                                </th>
                                                                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                                                                    Method
                                                                </th>
                                                                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                                                                    Status
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                            {loan.paymentHistory.map((payment, index) => (
                                                                <tr
                                                                    key={index}
                                                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                                                >
                                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                                        {formatDate(payment.date)}
                                                                    </td>
                                                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                                                        {formatCurrency(payment.amount)}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                                        {payment.method || 'N/A'}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                                            <CheckCircle size={12} />
                                                                            {payment.status || 'paid'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                                    No payment history available yet. Payments will appear here once your loan is approved and disbursed.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))
                    )}
                </section>
            )}

            {/* Loan History Tab */}
            {selectedTab === 'history' && (
                <section className="space-y-6">
                    {loanHistory.length === 0 ? (
                        <Card className="text-center py-12">
                            <div className="flex flex-col items-center gap-4">
                                <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <FileText size={32} className="text-slate-400" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                        No Loan History
                                    </h4>
                                    <p className="text-slate-500 dark:text-slate-400">
                                        You haven't completed any loans yet
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Card className="overflow-hidden p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                                Loan Type
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                                Amount
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                                Duration
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                                Interest Rate
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                                Total Paid
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                                Completion Date
                                            </th>
                                            <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {loanHistory.map((loan) => (
                                            <tr
                                                key={loan.id}
                                                className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                            <CreditCard size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                                {loan.type}
                                                            </p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                Started {formatDate(loan.disbursedDate)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                                    {formatCurrency(loan.amount)}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                    {loan.duration}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                    {loan.interestRate}%
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-green-600 dark:text-green-400">
                                                    {formatCurrency(loan.totalPaid)}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                    {formatDate(loan.completionDate)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        <CheckCircle size={12} />
                                                        Completed
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </section>
            )}
        </div>
    )
}
