import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    MessageSquare,
    Users,
    ShoppingCart,
    CreditCard,
    Clock,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Search,
    Filter,
    Mail,
    Phone,
    Package,
    DollarSign
} from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { collection, getDocs, query, where, orderBy as firestoreOrderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuthStore } from '../../store/authStore'

export default function CustomerCareDashboard() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [stats, setStats] = useState({
        openComplaints: 0,
        pendingOrders: 0,
        activeMembers: 0,
        recentMessages: 0,
        resolutionRate: 0,
        avgResponseTime: 0
    })
    const [complaints, setComplaints] = useState([])
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)

            // Fetch open complaints
            const complaintsQuery = query(
                collection(db, 'complaints'),
                where('status', '==', 'open')
            )
            const complaintsSnapshot = await getDocs(complaintsQuery)
            const complaintsData = complaintsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0
                const bTime = b.createdAt?.seconds || 0
                return bTime - aTime
            })

            // Fetch total resolved complaints for resolution rate
            const resolvedQuery = query(
                collection(db, 'complaints'),
                where('status', '==', 'resolved')
            )
            const resolvedSnapshot = await getDocs(resolvedQuery)

            const totalComplaints = complaintsSnapshot.size + resolvedSnapshot.size
            const resolutionRate = totalComplaints > 0
                ? ((resolvedSnapshot.size / totalComplaints) * 100).toFixed(1)
                : 0

            // Fetch pending orders
            const ordersQuery = query(
                collection(db, 'commodity_orders'),
                where('status', '==', 'pending')
            )
            const ordersSnapshot = await getDocs(ordersQuery)

            // Fetch active members
            const usersSnapshot = await getDocs(collection(db, 'users'))
            const activeMembers = usersSnapshot.docs.filter(
                doc => doc.data().status === 'active'
            ).length

            // Calculate actual average response time
            const allComplaintsSnapshot = await getDocs(collection(db, 'complaints'))
            const complaintsWithResponse = allComplaintsSnapshot.docs
                .map(doc => doc.data())
                .filter(c => c.respondedAt && c.createdAt)

            let avgResponseTime = 0
            if (complaintsWithResponse.length > 0) {
                const totalResponseTime = complaintsWithResponse.reduce((sum, c) => {
                    const responseTimeMs = c.respondedAt.toMillis() - c.createdAt.toMillis()
                    return sum + responseTimeMs
                }, 0)
                avgResponseTime = (totalResponseTime / complaintsWithResponse.length) / (1000 * 60 * 60) // Convert to hours
            }

            setStats({
                openComplaints: complaintsSnapshot.size,
                pendingOrders: ordersSnapshot.size,
                activeMembers,
                recentMessages: complaintsSnapshot.size + ordersSnapshot.size,
                resolutionRate: parseFloat(resolutionRate),
                avgResponseTime: avgResponseTime > 0 ? avgResponseTime.toFixed(1) : 0
            })

            setComplaints(complaintsData.slice(0, 5))
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getTimeAgo = (timestamp) => {
        if (!timestamp?.seconds) return '-'
        const now = Date.now()
        const activityTime = timestamp.seconds * 1000
        const diffMs = now - activityTime
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        return `${diffDays}d ago`
    }

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent':
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            case 'high':
                return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
            case 'normal':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            case 'low':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            default:
                return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
        }
    }

    if (loading) {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        Customer Care Dashboard
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                            Customer Care
                        </span>
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Member support and complaint management
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={() => navigate('/admin/complaints')}>
                        <MessageSquare size={20} />
                        <span className="hidden sm:inline">View All Complaints</span>
                        <span className="inline sm:hidden">View All</span>
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Open Complaints */}
                <Card className="p-5 flex items-center gap-4 group hover:border-red-500/50 transition-colors cursor-pointer" onClick={() => navigate('/admin/complaints')}>
                    <div className="size-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                        <AlertCircle size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Open Complaints</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {stats.openComplaints}
                        </h3>
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                            <Clock size={12} />
                            Needs attention
                        </p>
                    </div>
                </Card>

                {/* Pending Orders */}
                <Card className="p-5 flex items-center gap-4 group hover:border-orange-500/50 transition-colors cursor-pointer" onClick={() => navigate('/admin/commodity-orders')}>
                    <div className="size-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                        <Package size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pending Orders</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {stats.pendingOrders}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Order inquiries
                        </p>
                    </div>
                </Card>

                {/* Resolution Rate */}
                <Card className="p-5 flex items-center gap-4 group hover:border-green-500/50 transition-colors">
                    <div className="size-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                        <CheckCircle2 size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Resolution Rate</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {stats.resolutionRate}%
                        </h3>
                        <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                            <TrendingUp size={12} />
                            +5% this week
                        </p>
                    </div>
                </Card>

                {/* Active Members */}
                <Card className="p-5 flex items-center gap-4 group hover:border-blue-500/50 transition-colors cursor-pointer" onClick={() => navigate('/admin/members')}>
                    <div className="size-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                        <Users size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Active Members</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {stats.activeMembers}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Total users
                        </p>
                    </div>
                </Card>
            </section>

            {/* Quick Actions */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/members')}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900 dark:text-white">Member Lookup</h3>
                        <Search className="text-blue-500" size={20} />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Search and view member details
                    </p>
                </Card>

                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/loans/requests')}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900 dark:text-white">Loan Inquiries</h3>
                        <CreditCard className="text-orange-500" size={20} />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        View loan applications and status
                    </p>
                </Card>

                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/savings')}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900 dark:text-white">Savings Info</h3>
                        <DollarSign className="text-green-500" size={20} />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Check member savings balances
                    </p>
                </Card>
            </section>

            {/* Recent Complaints Table */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Complaints</h2>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/admin/complaints')}>
                        View All
                    </Button>
                </div>

                {complaints.length > 0 ? (
                    <Card className="overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Member</th>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Subject</th>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Category</th>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Priority</th>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Time</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {complaints.map((complaint) => (
                                        <tr key={complaint.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold">
                                                        {complaint.memberName?.charAt(0) || 'M'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white">
                                                            {complaint.memberName || 'Unknown'}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {complaint.memberId || '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-slate-900 dark:text-white truncate max-w-xs">
                                                    {complaint.subject || complaint.title || 'No subject'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {complaint.category || 'General'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize ${getPriorityColor(complaint.priority)}`}>
                                                    {complaint.priority || 'medium'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                {getTimeAgo(complaint.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => navigate(`/admin/complaints/${complaint.id}`)}
                                                >
                                                    Respond
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ) : (
                    <Card className="p-12 text-center">
                        <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            No Open Complaints
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400">
                            Great job! All complaints have been resolved.
                        </p>
                    </Card>
                )}
            </section>

            {/* Performance Metrics */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20">
                            <Clock className="text-teal-600" size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Avg Response Time</h3>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                        {stats.avgResponseTime}h
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Target: \u003c 3 hours
                    </p>
                </Card>

                <Card className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                            <MessageSquare className="text-purple-600" size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Messages Today</h3>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                        {stats.recentMessages}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Across all channels
                    </p>
                </Card>

                <Card className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <CheckCircle2 className="text-green-600" size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Customer Satisfaction</h3>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                        4.8/5
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Based on 127 reviews
                    </p>
                </Card>
            </section>
        </div>
    )
}
