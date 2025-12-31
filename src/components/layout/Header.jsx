import { Bell, Menu, Moon, Sun, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { subscribeToUnreadCount } from '../../utils/notificationUtils'
import NotificationBadge from '../NotificationBadge'

export default function Header({ onMenuClick }) {
    const { user } = useAuthStore()
    const { theme, toggleTheme } = useThemeStore()
    const navigate = useNavigate()
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        if (!user?.userId) return

        const unsubscribe = subscribeToUnreadCount(user.userId, setUnreadCount)
        return () => unsubscribe()
    }, [user])

    return (
        <header className="h-20 flex items-center justify-between px-6 lg:px-10 border-b border-slate-200 dark:border-slate-800 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-4 flex-1">
                {/* Mobile Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    aria-label="Toggle menu"
                >
                    <Menu className="text-slate-500" size={24} />
                </button>

                {/* Welcome Text */}
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Welcome back, {user?.firstName || user?.name?.split(' ')[0] || 'Member'}
                    </h2>
                    <p className="hidden md:block text-slate-500 dark:text-slate-400 text-sm">
                        Here is your financial overview and recent activities.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Notifications */}
                <button
                    onClick={() => navigate('/member/notifications')}
                    className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Notifications"
                >
                    <Bell size={20} />
                    <NotificationBadge count={unreadCount} />
                </button>

                {/* User Profile */}
                <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {user?.firstName && user?.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user?.name || 'Member'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Member ID: {user?.memberId || 'N/A'}
                        </p>
                    </div>
                    {user?.passport ? (
                        <img
                            src={user.passport}
                            alt="Profile"
                            className="size-10 rounded-full object-cover border-2 border-white dark:border-slate-600 shadow-sm"
                        />
                    ) : (
                        <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border-2 border-white dark:border-slate-600 shadow-sm font-bold text-slate-700 dark:text-slate-300">
                            {user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'M'}
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
