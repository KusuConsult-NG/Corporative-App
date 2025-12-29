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
    MoreHorizontal,
    Package,
    MessageSquare,
    Shield,
    Eye,
    Lock,
    TrendingDown
} from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuthStore } from '../../store/authStore'
import { hasPermission, PERMISSIONS, isSuperAdmin, isFullAdmin, getRoleDisplayName, getRoleBadgeColor } from '../../utils/permissions'

export default function AdminDashboard() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [stats, setStats] = useState({
        totalMembers: 0,
        activeMembers: 0,
        totalSavings: 0,
        activeLoans: 0,
        pendingRequests: 0,
        pendingComplaints: 0,
        pendingOrders: 0,
        pendingProfileChanges: 0,
        monthlyGrowth: 0
    })
    const [loading, setLoading] = useState(true)
    const [recentActivities, setRecentActivities] = useState([])

    // Check what user can see
    const canViewMembers = hasPermission(user, PERMISSIONS.VIEW_MEMBERS)
    const canViewLoans = hasPermission(user, PERMISSIONS.VIEW_LOANS)
    const canApproveLoans = hasPermission(user, PERMISSIONS.APPROVE_LOANS)
    const canViewSavings = hasPermission(user, PERMISSIONS.VIEW_SAVINGS)
    const canViewOrders = hasPermission(user, PERMISSIONS.VIEW_COMMODITY_ORDERS)
    const canManageRoles = isSuperAdmin(user)
    const isAdmin = isFullAdmin(user)

    // Fetch real-time dashboard stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true)
                const newStats = { ...stats }

                // Get total members (if permitted)
                if (canViewMembers) {
                    const usersSnapshot = await getDocs(collection(db, 'users'))
                    newStats.totalMembers = usersSnapshot.size
                    newStats.activeMembers = usersSnapshot.docs.filter(
                        doc => doc.data().emailVerified === true
                    ).length
                }

                // Get total savings (if permitted)
                if (canViewSavings) {
                    const walletsSnapshot = await getDocs(collection(db, 'wallets'))
                    newStats.totalSavings = walletsSnapshot.docs.reduce(
                        (sum, doc) => sum + (doc.data().balance || 0),
                        0
                    )
                }

                // Get active loans (if permitted)
                if (canViewLoans) {
                    const loansQuery = query(
                        collection(db, 'loans'),
                        where('status', '==', 'active')
                    )
                    const loansSnapshot = await getDocs(loansQuery)
                    newStats.activeLoans = loansSnapshot.docs.reduce(
                        (sum, doc) => sum + (doc.data().amount || 0),
                        0
                    )

                    // Get pending loan requests
                    const pendingQuery = query(
                        collection(db, 'loans'),
                        where('status', '==', 'pending')
                    )
                    const pendingSnapshot = await getDocs(pendingQuery)
                    newStats.pendingRequests = pendingSnapshot.size
                }

                // Get pending commodity orders (if permitted)
                if (canViewOrders) {
                    const ordersQuery = query(
                        collection(db, 'commodity_orders'),
                        where('status', '==', 'pending')
                    )
                    const ordersSnapshot = await getDocs(ordersQuery)
                    newStats.pendingOrders = ordersSnapshot.size
                }

                // Get pending complaints
                const complaintsQuery = query(
                    collection(db, 'complaints'),
                    where('status', '==', 'open')
                )
                const complaintsSnapshot = await getDocs(complaintsQuery)
                newStats.pendingComplaints = complaintsSnapshot.size

                // Get pending profile changes (if full admin)
                if (isAdmin) {
                    const profileQuery = query(
                        collection(db, 'profile_change_requests'),
                        where('status', '==', 'pending')
                    )
                    const profileSnapshot = await getDocs(profileQuery)
                    newStats.pendingProfileChanges = profileSnapshot.size
                }

                newStats.monthlyGrowth = 8.5 // This would need historical data

                setStats(newStats)

                // Fetch recent activities
                await fetchRecentActivities()
            } catch (error) {
                console.error('Error fetching dashboard stats:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

    const fetchRecentActivities = async () => {
        try {
            const activities = []

            // Fetch recent loans (if permitted)
            if (canViewLoans) {
                const loansSnapshot = await getDocs(
                    query(collection(db, 'loans'))
                )
                const loans = loansSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data(), type: 'loan' }))
                    .sort((a, b) => {
                        const aTime = a.createdAt?.seconds || 0
                        const bTime = b.createdAt?.seconds || 0
                        return bTime - aTime
                    })
                    .slice(0, 3)

                activities.push(...loans)
            }

            // Fetch recent orders (if permitted)
            if (canViewOrders) {
                const ordersSnapshot = await getDocs(
                    query(collection(db, 'commodity_orders'))
                )
                const orders = ordersSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data(), type: 'order' }))
                    .sort((a, b) => {
                        const aTime = a.createdAt?.seconds || 0
                        const bTime = b.createdAt?.seconds || 0
                        return bTime - aTime
                    })
                    .slice(0, 2)

                activities.push(...orders)
            }

            // Sort all activities by time
            const sortedActivities = activities.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0
                const bTime = b.createdAt?.seconds || 0
                return bTime - aTime
            }).slice(0, 5)

            setRecentActivities(sortedActivities)
        } catch (error) {
            console.error('Error fetching recent activities:', error)
        }
    }

    const getActivityDisplay = (activity) => {
        if (activity.type === 'loan') {
            return {
                user: activity.applicantName || 'Unknown',
                detail: `Applied for ${activity.loanType?.replace('_', ' ')} loan`,
                amount: activity.amount,
                icon: FileText,
                color: 'orange'
            }
        } else if (activity.type === 'order') {
            return {
                user: activity.memberName || 'Unknown',
                detail: `Ordered commodity`,
                amount: activity.totalAmount,
                icon: Package,
                color: 'blue'
            }
        }
        return {
            user: 'Unknown',
            detail: 'Activity',
            amount: null,
            icon: AlertCircle,
            color: 'gray'
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

        if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
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
                        Admin Dashboard
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(user?.role)}`}>
                            {getRoleDisplayName(user?.role)}
                        </span>
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {isSuperAdmin(user)
                            ? 'Full system access with role management'
                            : isAdmin
                                ? 'Overview of cooperative performance and activities'
                                : 'View-only access to cooperative data'}
                    </p>
                </div>
                <div className="flex gap-3">
                    {canApproveLoans && stats.pendingRequests > 0 && (
                        <Button onClick={() => navigate('/admin/loans/requests')}>
                            <FileText size={20} />
                            Review Requests ({stats.pendingRequests})
                        </Button>
                    )}
                    {canManageRoles && (
                        <Button variant="outline" onClick={() => navigate('/admin/roles')}>
                            <Shield size={20} />
                            Manage Roles
                        </Button>
                    )}
                </div>
            </div>

            {/* Permission Notice for Limited Admins */}
            {!isAdmin && (
                <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                        <Eye className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                Limited Access Account
                            </h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                You have view-only access to the system. Contact a Super Admin to request additional permissions.
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Stats Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Total Members */}
                {canViewMembers ? (
                    <Card className="p-5 flex items-center gap-4 group hover:border-blue-500/50 transition-colors cursor-pointer" onClick={() => navigate('/admin/members')}>
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
                ) : (
                    <Card className="p-5 flex items-center gap-4 opacity-50">
                        <div className="size-14 rounded-2xl bg-slate-50 dark:bg-slate-900/20 flex items-center justify-center text-slate-400">
                            <Lock size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Members</p>
                            <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500 mt-1">
                                No Access
                            </h3>
                        </div>
                    </Card>
                )}

                {/* Total Savings */}
                {canViewSavings ? (
                    <Card className="p-5 flex items-center gap-4 group hover:border-green-500/50 transition-colors cursor-pointer" onClick={() => navigate('/admin/savings')}>
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
                ) : (
                    <Card className="p-5 flex items-center gap-4 opacity-50">
                        <div className="size-14 rounded-2xl bg-slate-50 dark:bg-slate-900/20 flex items-center justify-center text-slate-400">
                            <Lock size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Savings</p>
                            <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500 mt-1">
                                No Access
                            </h3>
                        </div>
                    </Card>
                )}

                {/* Active Loans */}
                {canViewLoans ? (
                    <Card className="p-5 flex items-center gap-4 group hover:border-orange-500/50 transition-colors cursor-pointer" onClick={() => navigate('/admin/loans/requests')}>
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
                ) : (
                    <Card className="p-5 flex items-center gap-4 opacity-50">
                        <div className="size-14 rounded-2xl bg-slate-50 dark:bg-slate-900/20 flex items-center justify-center text-slate-400">
                            <Lock size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Active Loans</p>
                            <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500 mt-1">
                                No Access
                            </h3>
                        </div>
                    </Card>
                )}

                {/* Pending Requests */}
                {canApproveLoans ? (
                    <Card className="p-5 flex items-center gap-4 group hover:border-purple-500/50 transition-colors cursor-pointer" onClick={() => navigate('/admin/loans/requests')}>
                        <div className="size-14 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                            <AlertCircle size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pending Requests</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                {stats.pendingRequests}
                            </h3>
                            <p className="text-xs text-orange-500 flex items-center gap-1 mt-1">
                                <AlertCircle size={12} />
                                Needs attention
                            </p>
                        </div>
                    </Card>
                ) : (
                    <Card className="p-5 flex items-center gap-4 opacity-50">
                        <div className="size-14 rounded-2xl bg-slate-50 dark:bg-slate-900/20 flex items-center justify-center text-slate-400">
                            <Lock size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pending Requests</p>
                            <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500 mt-1">
                                No Access
                            </h3>
                        </div>
                    </Card>
                )}
            </section>

            {/* Quick Actions for Full Admins */}
            {isAdmin && (
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/commodity-orders')}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Pending Orders</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pendingOrders}</p>
                            </div>
                            <Package className="text-blue-500" size={32} />
                        </div>
                    </Card>

                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/complaints')}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Open Complaints</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pendingComplaints}</p>
                            </div>
                            <MessageSquare className="text-orange-500" size={32} />
                        </div>
                    </Card>

                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/profile-changes')}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Profile Changes</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pendingProfileChanges}</p>
                            </div>
                            <Users className="text-purple-500" size={32} />
                        </div>
                    </Card>

                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/broadcast')}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Broadcast</p>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Send Message</p>
                            </div>
                            <MessageSquare className="text-green-500" size={32} />
                        </div>
                    </Card>
                </section>
            )}

            {/* Recent Activity Table */}
            {recentActivities.length > 0 && (
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
                                        const display = getActivityDisplay(activity)
                                        const Icon = display.icon
                                        return (
                                            <tr key={activity.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold">
                                                            {display.user.charAt(0)}
                                                        </div>
                                                        <span className="font-semibold text-slate-900 dark:text-white">
                                                            {display.user}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1.5 rounded bg-${display.color}-100 dark:bg-${display.color}-900/30 text-${display.color}-600`}>
                                                            <Icon size={14} />
                                                        </div>
                                                        {display.detail}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                    {display.amount ? formatCurrency(display.amount) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                    {getTimeAgo(activity.createdAt)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize 
                                                        ${activity.status === 'completed' || activity.status === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
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
            )}

            {/* No recent activities message */}
            {recentActivities.length === 0 && (
                <Card className="p-12 text-center">
                    <AlertCircle className="mx-auto text-slate-400 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No Recent Activity
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                        There are no recent activities to display based on your permissions.
                    </p>
                </Card>
            )}
        </div>
    )
}
