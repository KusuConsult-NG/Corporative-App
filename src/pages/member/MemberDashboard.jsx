import {
    Wallet,
    AlertCircle,
    CheckCircle,
    TrendingUp,
    Plus,
    CreditCard,
    FileText,
    ShoppingBag,
    Clock,
    ChevronLeft,
    ChevronRight,
    UserCheck
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '../../utils/formatters'
import { guarantorAPI, walletAPI, loansAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function MemberDashboard() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [guarantorRequests, setGuarantorRequests] = useState([])
    const [loadingRequests, setLoadingRequests] = useState(true)

    useEffect(() => {
        const fetchRequests = async () => {
            if (!user?.memberId) return
            try {
                const data = await guarantorAPI.getGuarantorApprovalsByMember(user.memberId)
                setGuarantorRequests(data.filter(r => r.status === 'pending'))
            } catch (error) {
                console.error('Error fetching guarantor requests:', error)
            } finally {
                setLoadingRequests(false)
            }
        }
        fetchRequests()
    }, [user?.memberId])

    // Fetch financial data
    const [financialData, setFinancialData] = useState({
        totalSavings: 0,
        savingsChange: 0,
        activeLoan: 0,
        loanDueDate: null,
        commodityLimit: 0,
    })
    const [transactions, setTransactions] = useState([])
    const [loadingFinancial, setLoadingFinancial] = useState(true)

    useEffect(() => {
        const fetchFinancialData = async () => {
            if (!user?.memberId) return
            try {
                setLoadingFinancial(true)
                // Fetch wallet/savings balance
                const wallet = await walletAPI.getWallet(user.memberId)

                // Fetch recent transactions
                const txns = await walletAPI.getTransactions(user.memberId, 4)

                // Fetch active loans
                const loans = await loansAPI.getLoans(user.memberId)
                const activeLoans = loans.filter(loan => loan.status === 'approved' && loan.totalRepaid < loan.amount)

                setFinancialData({
                    totalSavings: wallet?.balance || 0,
                    savingsChange: 0, // Could calculate from transaction history
                    activeLoan: activeLoans.length > 0 ? (activeLoans[0].amount - activeLoans[0].totalRepaid) : 0,
                    loanDueDate: activeLoans.length > 0 ? new Date(activeLoans[0].createdAt?.seconds * 1000).toLocaleDateString() : null,
                    commodityLimit: Math.min(wallet?.balance * 0.5, 200000) || 0, // 50% of savings, max 200k
                })

                // Transform transactions for display
                const transformedTxns = txns.map((txn, idx) => ({
                    id: txn.id,
                    date: txn.createdAt?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'Recent',
                    description: txn.description || 'Transaction',
                    amount: txn.amount,
                    type: txn.amount > 0 ? 'credit' : 'debit',
                    status: txn.status || 'success',
                    icon: <Wallet size={16} />,
                    color: txn.amount > 0 ? 'blue' : 'orange'
                }))
                setTransactions(transformedTxns)
            } catch (error) {
                console.error('Error fetching financial data:', error)
            } finally {
                setLoadingFinancial(false)
            }
        }
        fetchFinancialData()
    }, [user?.memberId])

    // Remove hardcoded commodities spotlight - will show dynamic data

    return (
        <div className="p-6 lg:p-10 scroll-smooth max-w-7xl mx-auto flex flex-col gap-8">
            {/* Payment Reminder Alert */}
            {!user?.registrationFeePaid && (
                <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg shadow-orange-500/5 animate-pulse-subtle">
                    <div className="flex items-center gap-4 text-center sm:text-left">
                        <div className="size-14 rounded-2xl bg-orange-200 dark:bg-orange-800 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-inner">
                            <AlertCircle size={32} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-orange-900 dark:text-orange-300 mb-1">
                                Complete Your Registration
                            </h3>
                            <p className="text-sm text-orange-700 dark:text-orange-400">
                                Please pay your one-time registration fee (₦2,000) to activate your loan and commodity requests.
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => navigate('/registration-fee')}
                        className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20 whitespace-nowrap px-8 py-3 w-full sm:w-auto"
                    >
                        Pay Now
                    </Button>
                </Card>
            )}

            {/* Stats Cards Section */}
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Total Savings (Primary Card) */}
                <Card className="group relative overflow-hidden bg-primary text-white border-blue-400/20 shadow-xl shadow-blue-500/20">
                    {/* Background Pattern/Decoration */}
                    <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-3xl transition-transform group-hover:scale-110"></div>
                    <div className="absolute -left-8 -bottom-8 size-32 rounded-full bg-blue-900/20 blur-2xl"></div>

                    <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px]">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm w-fit">
                                <Wallet size={18} />
                                <span className="text-xs font-semibold tracking-wide uppercase">Savings</span>
                            </div>
                            <button className="text-blue-100 hover:text-white transition-colors" title="Privacy Mode">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>

                        <div className="mt-4">
                            <p className="text-blue-100 text-sm font-medium mb-1">Total Savings Balance</p>
                            <h3 className="text-3xl lg:text-4xl font-black tracking-tight leading-none">
                                {formatCurrency(financialData.totalSavings).split('.')[0]}
                                <span className="text-xl lg:text-2xl font-bold opacity-70">
                                    .{formatCurrency(financialData.totalSavings).split('.')[1]}
                                </span>
                            </h3>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                            <span className="flex items-center text-xs font-bold bg-green-400/20 text-green-100 px-2 py-0.5 rounded">
                                <TrendingUp size={16} className="mr-1" /> +{financialData.savingsChange}%
                            </span>
                            <span className="text-xs text-blue-100 opacity-80">Increased from last month</span>
                        </div>
                    </div>
                </Card>

                {/* Active Loan */}
                <Card className="group hover:border-primary/50 transition-colors">
                    <div className="flex flex-col justify-between min-h-[160px]">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">
                                Active Loan
                            </p>
                            <div className="size-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                                <AlertCircle size={20} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                                {formatCurrency(financialData.activeLoan).split('.')[0]}
                                <span className="text-lg font-semibold text-slate-400">
                                    .{formatCurrency(financialData.activeLoan).split('.')[1]}
                                </span>
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                    Due: {financialData.loanDueDate}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <a
                                href="/member/loans"
                                className="text-primary hover:text-primary-dark text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all"
                            >
                                See Loan Details <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </a>
                        </div>
                    </div>
                </Card>

                {/* Commodity Limit */}
                <Card className="group hover:border-primary/50 transition-colors">
                    <div className="flex flex-col justify-between min-h-[160px]">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">
                                Commodity Limit
                            </p>
                            <div className="size-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                                <CheckCircle size={20} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                                {formatCurrency(financialData.commodityLimit).split('.')[0]}
                                <span className="text-lg font-semibold text-slate-400">
                                    .{formatCurrency(financialData.commodityLimit).split('.')[1]}
                                </span>
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Available credit for purchases
                            </p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <a
                                href="/member/commodities"
                                className="text-primary hover:text-primary-dark text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all"
                            >
                                Browse Store <ShoppingBag size={16} />
                            </a>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Quick Actions Toolbar */}
            <section>
                <div className="flex flex-wrap gap-4 items-center">
                    <Button onClick={() => navigate('/member/savings')}>
                        <Plus size={20} />
                        <span className="hidden sm:inline whitespace-nowrap">Add Funds</span>
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/member/loans')}>
                        <CreditCard size={20} className="text-slate-400 dark:text-slate-500" />
                        <span className="hidden sm:inline whitespace-nowrap">Repay Loan</span>
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/member/loans/apply')}>
                        <FileText size={20} className="text-slate-400 dark:text-slate-500" />
                        <span className="hidden sm:inline whitespace-nowrap">Apply for Loan</span>
                    </Button>
                </div>
            </section>

            {/* Content Grid: Transactions & Spotlight */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Recent Transactions Table */}
                <div className="xl:col-span-2 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                        <a href="/member/savings" className="text-sm text-primary font-semibold hover:underline">
                            View Statement
                        </a>
                    </div>

                    <Card className="overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold w-32">Date</th>
                                        <th className="px-6 py-4 font-semibold">Description</th>
                                        <th className="px-6 py-4 font-semibold">Amount</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {transactions.map((transaction) => (
                                        <tr
                                            key={transaction.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                {transaction.date}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                                <div className={`size-8 rounded-full bg-${transaction.color}-100 dark:bg-${transaction.color}-900/30 flex items-center justify-center text-${transaction.color}-600 shrink-0`}>
                                                    {transaction.icon}
                                                </div>
                                                {transaction.description}
                                            </td>
                                            <td className={`px-6 py-4 font-bold ${transaction.type === 'credit' ? 'text-green-600' : 'text-slate-900 dark:text-white'}`}>
                                                {transaction.type === 'credit' ? '+' : ''}{formatCurrency(transaction.amount)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${transaction.status === 'success'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        }`}
                                                >
                                                    <span className={`size-1.5 rounded-full ${transaction.status === 'success' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                                    {transaction.status === 'success' ? 'Success' : 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Requests & Spotlight */}
                <div className="flex flex-col gap-8">
                    {/* Pending Guarantor Requests */}
                    {guarantorRequests.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Guarantor Requests
                                    <span className="flex items-center justify-center size-5 bg-primary text-white text-[10px] rounded-full">
                                        {guarantorRequests.length}
                                    </span>
                                </h3>
                            </div>
                            <Card className="bg-primary/5 border-primary/20">
                                <div className="space-y-4">
                                    {guarantorRequests.map((request) => (
                                        <div
                                            key={request.id}
                                            className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                        <UserCheck size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                            {request.applicantName}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 uppercase font-semibold">
                                                            Loan Guarantor Request
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2 mb-4">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500">Amount:</span>
                                                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(request.loanAmount)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500">Purpose:</span>
                                                    <span className="text-slate-700 dark:text-slate-300 italic truncate ml-2 max-w-[150px]">
                                                        "{request.loanPurpose}"
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="w-full"
                                                onClick={() => navigate(`/guarantor-approval/${request.approvalToken}`)}
                                            >
                                                Review & Approve
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    )}

                </div>
            </section>

            {/* Footer */}
            <footer className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 pb-6">
                © 2023 AWSLMCSL. All rights reserved. <br />
                University of Jos Staff Cooperative.
            </footer>
        </div>
    )
}
