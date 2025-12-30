import { NavLink } from 'react-router-dom'
import { X, Building2, LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { hasPermission, PERMISSIONS, isSuperAdmin } from '../../utils/permissions'
import {
    LayoutDashboard,
    PiggyBank,
    CreditCard,
    ShoppingCart,
    User,
    Users,
    CheckSquare,
    Package,
    MessageSquare,
    FileText,
    Shield,
    AlertCircle,
    Calendar
} from 'lucide-react'

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
    { name: 'Members', path: '/admin/members', icon: Users, permission: PERMISSIONS.VIEW_MEMBERS },
    { name: 'Approvals', path: '/admin/approvals', icon: CheckSquare, permission: PERMISSIONS.VIEW_APPROVALS },
    { name: 'Commodity Orders', path: '/admin/commodity-orders', icon: Package, permission: PERMISSIONS.VIEW_COMMODITY_ORDERS },
    { name: 'Commodity Deductions', path: '/admin/commodity-deductions', icon: Calendar, permission: PERMISSIONS.MANAGE_COMMODITIES },
    { name: 'Broadcast', path: '/admin/broadcast', icon: MessageSquare, permission: PERMISSIONS.SEND_BROADCAST },
    { name: 'Savings', path: '/admin/savings', icon: PiggyBank, permission: PERMISSIONS.VIEW_SAVINGS },
    { name: 'Loans', path: '/admin/loans/requests', icon: CreditCard, permission: PERMISSIONS.VIEW_LOANS },
    { name: 'Commodities', path: '/admin/commodities', icon: ShoppingCart, permission: PERMISSIONS.MANAGE_COMMODITIES },
    { name: 'Reports', path: '/admin/reports', icon: FileText, permission: PERMISSIONS.VIEW_REPORTS },
    { name: 'Role Management', path: '/admin/roles', icon: Shield, requireSuperAdmin: true },
]

export default function MobileSidebar({ role = 'member', isOpen, onClose }) {
    const { user, logout } = useAuthStore()

    // Filter admin nav items based on permissions
    const getFilteredNavItems = () => {
        if (role !== 'admin') {
            return memberNavItems
        }

        return adminNavItems.filter(item => {
            if (item.requireSuperAdmin) {
                return isSuperAdmin(user)
            }
            if (item.permission) {
                return hasPermission(user, item.permission)
            }
            return true
        })
    }

    const navItems = getFilteredNavItems()

    if (!isOpen) return null

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={onClose}
            />

            {/* Sidebar */}
            <aside className="fixed top-0 left-0 bottom-0 w-72 bg-surface-light dark:bg-surface-dark border-r border-slate-200 dark:border-slate-800 z-50 lg:hidden flex flex-col animate-slideInRight">
                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-blue-500/20">
                            <Building2 size={24} />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">AWSLMCSL</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-normal">Cooperative Portal</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        aria-label="Close menu"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
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
                            onClick={onClose}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-primary text-white shadow-md shadow-blue-500/20 fill-1'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`
                            }
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.name}</span>
                        </NavLink>
                    ))}
                </div>

                {/* Bottom Section */}
                <div className="border-t border-slate-200 dark:border-slate-800 p-4">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
