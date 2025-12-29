import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard,
    PiggyBank,
    CreditCard,
    ShoppingCart,
    User,
    Settings,
    LogOut,
    Building2,
    Users,
    FileText,
    HelpCircle,
    CheckSquare,
    Package,
    MessageSquare,
    AlertCircle
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const memberNavItems = [
    { name: 'Dashboard', path: '/member/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', path: '/member/profile', icon: User },
    { name: 'Savings', path: '/member/savings', icon: PiggyBank },
    { name: 'Loans', path: '/member/loans', icon: CreditCard },
    { name: 'Commodities', path: '/member/commodities', icon: ShoppingCart },
    { name: 'Messages', path: '/member/messages', icon: MessageSquare },
    { name: 'Submit Report', path: '/member/submit-report', icon: AlertCircle },
]

const adminNavItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Members', path: '/admin/members', icon: Users },
    { name: 'Approvals', path: '/admin/approvals', icon: CheckSquare },
    { name: 'Commodity Orders', path: '/admin/commodity-orders', icon: Package },
    { name: 'Broadcast', path: '/admin/broadcast', icon: MessageSquare },
    { name: 'Savings', path: '/admin/savings', icon: PiggyBank },
    { name: 'Loans', path: '/admin/loans/requests', icon: CreditCard },
    { name: 'Commodities', path: '/admin/commodities', icon: ShoppingCart },
    { name: 'Reports', path: '/admin/reports', icon: FileText },
]

export default function Sidebar({ role = 'member' }) {
    const { user, logout } = useAuthStore()
    const navItems = role === 'admin' ? adminNavItems : memberNavItems

    return (
        <aside className="hidden lg:flex w-72 flex-col bg-surface-light dark:bg-surface-dark border-r border-slate-200 dark:border-slate-800 h-full shrink-0 transition-colors">
            {/* Logo Area */}
            <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-blue-500/20">
                    <Building2 size={24} />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">AWSLMCSL</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-normal">Cooperative Portal</p>
                </div>
            </div>

            {/* Navigation Links */}
            <div className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
                <p className="px-4 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Main Menu
                </p>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-primary text-white shadow-md shadow-blue-500/20 fill-1'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={20} className={isActive ? 'fill-white/20' : ''} />
                                <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                    {item.name}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}

                {role === 'member' && (
                    <>
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <p className="px-4 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                Help & Settings
                            </p>
                            <NavLink
                                to="/member/settings"
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                        ? 'bg-primary text-white shadow-md shadow-blue-500/20'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`
                                }
                            >
                                <Settings size={20} />
                                <span className="text-sm font-medium">Settings</span>
                            </NavLink>
                            <NavLink
                                to="/member/support"
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                        ? 'bg-primary text-white shadow-md shadow-blue-500/20'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`
                                }
                            >
                                <HelpCircle size={20} />
                                <span className="text-sm font-medium">Support</span>
                            </NavLink>
                        </div>
                    </>
                )}
            </div>

            {/* User/Logout */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                {/* User Info */}
                {user && (
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-300">
                            {user.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {user.name || 'User'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {user.memberId || 'Member ID'}
                            </p>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => logout()}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 w-full"
                >
                    <LogOut size={20} />
                    <span className="text-sm font-semibold">Logout</span>
                </button>
            </div>
        </aside>
    )
}
