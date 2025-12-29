import { useState, useEffect } from 'react'
import { Bell, MessageSquare, CreditCard, Package, Trash2, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    subscribeToNotifications,
    getTimeAgo
} from '../../utils/notificationUtils'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

const NOTIFICATION_ICONS = {
    broadcast: MessageSquare,
    loan_status: CreditCard,
    payment_due: Bell,
    order_update: Package,
    system: Bell
}

export default function NotificationsPage() {
    const { user } = useAuthStore()
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // 'all', 'unread', 'broadcast'

    useEffect(() => {
        if (!user?.userId) return

        setLoading(true)

        // Subscribe to real-time updates
        const unsubscribe = subscribeToNotifications(user.userId, (notifs) => {
            setNotifications(notifs)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [user])

    const handleMarkAsRead = async (notificationId) => {
        await markAsRead(notificationId)
    }

    const handleMarkAllAsRead = async () => {
        const count = await markAllAsRead(user.userId)
        if (count > 0) {
            alert(`Marked ${count} notification${count > 1 ? 's' : ''} as read`)
        }
    }

    const handleDelete = async (notificationId) => {
        if (window.confirm('Delete this notification?')) {
            await deleteNotification(notificationId)
        }
    }

    const filteredNotifications = notifications.filter(notif => {
        if (filter === 'unread') return !notif.read
        if (filter === 'broadcast') return notif.type === 'broadcast'
        return true
    })

    const unreadCount = notifications.filter(n => !n.read).length

    return (
        <div className="p-6 lg:p-10 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Notifications</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" onClick={handleMarkAllAsRead}>
                        <CheckCircle size={16} />
                        Mark all as read
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
                {['all', 'unread', 'broadcast'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all border ${filter === f
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/25'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/50'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            {loading ? (
                <div className="py-16 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Loading notifications...</p>
                </div>
            ) : filteredNotifications.length > 0 ? (
                <div className="space-y-3">
                    {filteredNotifications.map((notification) => {
                        const Icon = NOTIFICATION_ICONS[notification.type] || Bell
                        return (
                            <Card
                                key={notification.id}
                                className={`p-4 cursor-pointer transition-all hover:shadow-md ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-primary' : ''
                                    }`}
                                onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                            >
                                <div className="flex gap-4">
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${!notification.read ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}>
                                        <Icon size={20} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h3 className="font-semibold text-slate-900 dark:text-white">
                                                {notification.title}
                                            </h3>
                                            {!notification.read && (
                                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2"></div>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-500 dark:text-slate-500">
                                                {getTimeAgo(notification.createdAt)}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDelete(notification.id)
                                                }}
                                                className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <div className="py-16 text-center">
                    <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Bell size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No notifications
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                        {filter === 'all' ? "You're all caught up!" : `No ${filter} notifications`}
                    </p>
                </div>
            )}
        </div>
    )
}
