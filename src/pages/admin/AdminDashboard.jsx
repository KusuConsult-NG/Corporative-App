import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Users,
    Wallet,
    CreditCard,
    AlertCircle,
    TrendingUp,
    FileText,
    CheckCircle,
    Clock,
    MoreHorizontal
} from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export default function AdminDashboard() {
    const navigate = useNavigate()
    const [stats, setStats] = useState({
        totalMembers: 0,
        activeMembers: 0,
        totalSavings: 0,
        activeLoans: 0,
        pendingRequests: 0,
        monthlyGrowth: 0
    })
    const [loading, setLoading] = useState(true)

    // Fetch real-time dashboard stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true)

                // Get total members
                const usersSnapshot = await getDocs(collection(db, 'users'))
                const totalMembers = usersSnapshot.size

                // Get active members (with verified email)
                const activeMembers = usersSnapshot.docs.filter(
                    doc => doc.data().emailVerified === true
                ).length

                // Get total savings (sum all wallet balances)
                const walletsSnapshot = await getDocs(collection(db, 'wallets'))
                const totalSavings = walletsSnapshot.docs.reduce(
                    (sum, doc) => sum + (doc.data().balance || 0),
                    0
                )

                // Get active loans (sum all active loan amounts)
                const loansQuery = query(
                    collection(db, 'loans'),
                    where('status', '==', 'active')
                )
                const loansSnapshot = await getDocs(loansQuery)
                const activeLoans = loansSnapshot.docs.reduce(
                    (sum, doc) => sum + (doc.data().amount || 0),
                    0
                )

                // Get pending loan requests
                const pendingQuery = query(
                    collection(db, 'loans'),
                    where('status', '==', 'pending')
                )
                const pendingSnapshot = await getDocs(pendingQuery)
                const pendingRequests = pendingSnapshot.size

                setStats({
                    totalMembers,
                    activeMembers,
                    totalSavings,
                    activeLoans,
                    pendingRequests,
                    monthlyGrowth: 8.5 // This would need historical data to calculate
                })
            } catch (error) {
                console.error('Error fetching dashboard stats:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

    // Mock Recent Activity
    const recentActivities = [
        {
            id: 1,
            type: 'loan_request',
            user: 'Dr. Sarah Johnson',
            detail: 'Requested Personal Loan',
            amount: 500000,
            time: '2 hours ago',
            status: 'pending',
            icon: FileText,
            color: 'orange'
        },
        {
            id: 2,
            type: 'new_member',
            user: 'Mr. James Okafor',
            detail: 'Joined the cooperative',
            amount: null,
            time: '5 hours ago',
            status: 'completed',
            icon: Users,
            color: 'blue'
        },
        {
            id: 3,
            type: 'savings_deposit',
            user: 'Prof. Michael Okon',
            detail: 'Monthly Contribution',
            amount: 50000,
            time: '1 day ago',
            status: 'completed',
            icon: Wallet,
            color: 'green'
        },
        {
            id: 4,
            type: 'loan_repayment',
            user: 'Mrs. Grace Adebayo',
            detail: 'Loan Repayment',
            amount: 25000,
            time: '1 day ago',
            status: 'completed',
            icon: CreditCard,
            color: 'purple'
        },
        {
            id: 5,
            type: 'loan_request',
            user: 'Mr. David Lee',
            detail: 'Requested Emergency Loan',
            amount: 200000,
            time: '2 days ago',
            status: 'rejected',
            icon: AlertCircle,
            color: 'red'
        }
    ]

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Overview of cooperative performance and activities
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={() => navigate('/admin/loans/requests')}>
                        <FileText size={20} />
                        Review Requests ({stats.pendingRequests})
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Total Members */}
                <Card className="p-5 flex items-center gap-4 group hover:border-blue-500/50 transition-colors">
                    <div className="size-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                        <Users size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Members</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {stats.totalMembers.toLocaleString()}
                        </h3>
                        <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                            <TrendingUp size={12} />
                            +{stats.monthlyGrowth}% this month
                        </p>
                    </div>
                </Card>

                {/* Total Savings */}
                <Card className="p-5 flex items-center gap-4 group hover:border-green-500/50 transition-colors">
                    <div className="size-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                        <Wallet size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Savings</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {formatCurrency(stats.totalSavings).split('.')[0]}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Aggregate deposits
                        </p>
                    </div>
                </Card>

                {/* Active Loans */}
                <Card className="p-5 flex items-center gap-4 group hover:border-orange-500/50 transition-colors">
                    <div className="size-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                        <CreditCard size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Active Loans</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {formatCurrency(stats.activeLoans).split('.')[0]}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Currently disbursed
                        </p>
                    </div>
                </Card>

                {/* Pending Requests */}
                <Card className="p-5 flex items-center gap-4 group hover:border-purple-500/50 transition-colors">
                    <div className="size-14 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                        <AlertCircle size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pending Requests</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {stats.pendingRequests}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Needs attention
                        </p>
                    </div>
                </Card>
            </section>

            {/* Recent Activity Table */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Activity</h2>
                    <Button variant="ghost" size="sm">View All</Button>
                </div>

                <Card className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">User</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Activity</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Time</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Status</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {recentActivities.map((activity) => {
                                    const Icon = activity.icon
                                    return (
                                        <tr key={activity.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold">
                                                        {activity.user.charAt(0)}
                                                    </div>
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {activity.user}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded bg-${activity.color}-100 dark:bg-${activity.color}-900/30 text-${activity.color}-600`}>
                                                        <Icon size={14} />
                                                    </div>
                                                    {activity.detail}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                {activity.amount ? formatCurrency(activity.amount) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                {activity.time}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize 
                                                    ${activity.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        activity.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    {activity.status === 'completed' && <CheckCircle size={12} />}
                                                    {activity.status === 'pending' && <Clock size={12} />}
                                                    {activity.status === 'rejected' && <AlertCircle size={12} />}
                                                    {activity.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                                    <MoreHorizontal size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </section>
        </div>
    )
}
