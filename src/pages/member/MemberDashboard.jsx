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
import { guarantorAPI } from '../../services/api'
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

    // Mock data
    const financialData = {
        totalSavings: 1250000,
        savingsChange: 20,
        activeLoan: 500000,
        loanDueDate: 'Oct 25, 2023',
        commodityLimit: 200000,
    }

    const transactions = [
        {
            id: 1,
            date: 'Sep 20',
            description: 'Monthly Contribution',
            amount: 20000,
            type: 'credit',
            status: 'success',
            icon: <Wallet size={16} />,
            color: 'blue'
        },
        {
            id: 2,
            date: 'Sep 15',
            description: 'Loan Repayment',
            amount: -15000,
            type: 'debit',
            status: 'success',
            icon: <CreditCard size={16} />,
            color: 'orange'
        },
        {
            id: 3,
            date: 'Sep 10',
            description: 'Commodity - Rice Bag',
            amount: -45000,
            type: 'debit',
            status: 'pending',
            icon: <ShoppingBag size={16} />,
            color: 'purple'
        },
        {
            id: 4,
            date: 'Sep 01',
            description: 'Monthly Contribution',
            amount: 20000,
            type: 'credit',
            status: 'success',
            icon: <Wallet size={16} />,
            color: 'blue'
        },
    ]

    const commodities = [
        {
            id: 1,
            name: 'Premium Rice 50kg',
            category: 'Foodstuff',
            price: 45000,
            image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop'
        },
        {
            id: 2,
            name: 'Smart TV 43"',
            category: 'Electronics',
            price: 180000,
            image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=300&fit=crop'
        },
    ]

    return (
        <div className="p-6 lg:p-10 scroll-smooth max-w-7xl mx-auto flex flex-col gap-8">
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

                    {/* Commodities Spotlight */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Commodity Spotlight</h3>
                            <div className="flex gap-2">
                                <button className="size-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                                    <ChevronLeft size={16} />
                                </button>
                                <button className="size-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        <Card className="h-full flex flex-col">
                            <div className="flex-1 space-y-4">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Available on credit based on your limit.
                                </p>

                                {commodities.map((item) => (
                                    <div
                                        key={item.id}
                                        className="group flex gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                                    >
                                        <div
                                            className="size-20 rounded-lg bg-slate-100 dark:bg-slate-800 bg-cover bg-center shrink-0"
                                            style={{ backgroundImage: `url(${item.image})` }}
                                        ></div>
                                        <div className="flex flex-col justify-center flex-1">
                                            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                                {item.name}
                                            </h4>
                                            <p className="text-slate-500 text-xs mb-2">{item.category}</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(item.price)}</p>
                                        </div>
                                        <div className="flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button variant="outline" className="mt-4" onClick={() => navigate('/member/commodities')}>
                                <span className="hidden sm:inline">View All Commodities</span>
                                <span className="inline sm:hidden">View All</span>
                            </Button>
                        </Card>
                    </div>
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
