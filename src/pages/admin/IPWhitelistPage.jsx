import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, Globe, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../context/ToastContext'

export default function IPWhitelistPage() {
    const [whitelist, setWhitelist] = useState([])
    const [loading, setLoading] = useState(true)
    const [enforcementEnabled, setEnforcementEnabled] = useState(false)
    const [myIP, setMyIP] = useState(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [isTogglingEnforcement, setIsTogglingEnforcement] = useState(false)

    const { user } = useAuthStore()
    const toast = useToast()
    const isSuperAdmin = user?.role === 'super_admin'

    // Load whitelist rules
    useEffect(() => {
        const q = query(
            collection(db, 'ip_whitelist'),
            where('active', '==', true)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rules = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setWhitelist(rules)
            setLoading(false)
        })

        return unsubscribe
    }, [])

    // Load enforcement status
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'system_config'),
            (snapshot) => {
                const config = snapshot.docs.find(doc => doc.id === 'ip_whitelist')
                if (config) {
                    setEnforcementEnabled(config.data().enforceWhitelist || false)
                }
            }
        )

        return unsubscribe
    }, [])

    // Get current user's IP
    useEffect(() => {
        const getIP = async () => {
            try {
                const getMyIPFn = httpsCallable(functions, 'getMyIP')
                const result = await getMyIPFn()
                setMyIP(result.data.ip)
            } catch (error) {
                console.error('Error getting IP:', error)
            }
        }
        getIP()
    }, [])

    const handleToggleEnforcement = async () => {
        if (!isSuperAdmin) {
            toast.error('Only super admins can toggle enforcement')
            return
        }

        setIsTogglingEnforcement(true)
        try {
            const toggleFn = httpsCallable(functions, 'toggleIPWhitelistEnforcement')
            await toggleFn({ enforce: !enforcementEnabled })

            toast.success(
                enforcementEnabled
                    ? 'IP whitelist enforcement disabled (log-only mode)'
                    : 'IP whitelist enforcement enabled'
            )
        } catch (error) {
            toast.error(error.message || 'Failed to toggle enforcement')
        } finally {
            setIsTogglingEnforcement(false)
        }
    }

    const handleRemoveIP = async (id, label) => {
        if (!isSuperAdmin) {
            toast.error('Only super admins can remove IPs')
            return
        }

        if (!confirm(`Remove "${label}" from whitelist?`)) {
            return
        }

        try {
            const removeFn = httpsCallable(functions, 'removeIPFromWhitelist')
            await removeFn({ id })
            toast.success(`Removed ${label} from whitelist`)
        } catch (error) {
            toast.error(error.message || 'Failed to remove IP')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="text-blue-600" size={28} />
                        IP Whitelist Management
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Control admin access by IP address
                    </p>
                </div>
                {isSuperAdmin && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus size={20} />
                        Add IP
                    </button>
                )}
            </div>

            {/* Current IP & Enforcement Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Your IP */}
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-2">
                        <Globe className="text-blue-600" size={20} />
                        <h3 className="font-semibold text-slate-900 dark:text-white">Your IP Address</h3>
                    </div>
                    <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                        {myIP || 'Loading...'}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                        This is your current IP address
                    </p>
                </div>

                {/* Enforcement Status */}
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <Lock className={enforcementEnabled ? 'text-green-600' : 'text-yellow-600'} size={20} />
                            <h3 className="font-semibold text-slate-900 dark:text-white">Enforcement</h3>
                        </div>
                        {isSuperAdmin && (
                            <button
                                onClick={handleToggleEnforcement}
                                disabled={isTogglingEnforcement}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${enforcementEnabled
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    }`}
                            >
                                {isTogglingEnforcement ? 'Updating...' : enforcementEnabled ? 'Disable' : 'Enable'}
                            </button>
                        )}
                    </div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {enforcementEnabled ? 'Enforced' : 'Log Only'}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                        {enforcementEnabled
                            ? 'Admins must be on whitelisted IPs'
                            : 'Violations are logged but not blocked'
                        }
                    </p>
                </div>
            </div>

            {/* Warning Banner */}
            {!enforcementEnabled && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex gap-3">
                        <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
                        <div>
                            <h4 className="font-semibold text-yellow-900 dark:text-yellow-200">Log-Only Mode</h4>
                            <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                                IP whitelist is NOT enforced. Violations are logged but admins can still access from any IP.
                                Enable enforcement when you're confident in your whitelist configuration.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Whitelist Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Whitelisted IPs ({whitelist.length})
                    </h2>
                </div>

                {whitelist.length === 0 ? (
                    <div className="p-12 text-center">
                        <Shield className="mx-auto text-slate-300 dark:text-slate-600" size={48} />
                        <p className="mt-4 text-slate-600 dark:text-slate-400">
                            No IP addresses whitelisted yet
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                            When no rules exist, all IPs are allowed (development mode)
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Label
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        IP/Range
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Roles
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Added
                                    </th>
                                    {isSuperAdmin && (
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {whitelist.map((rule) => (
                                    <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="text-green-600" size={16} />
                                                <span className="font-medium text-slate-900 dark:text-white">
                                                    {rule.label}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-slate-600 dark:text-slate-400">
                                            {rule.ip}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${rule.type === 'single'
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                }`}>
                                                {rule.type === 'single' ? 'Single IP' : 'CIDR Range'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                            {rule.allowedRoles?.join(', ') || 'All'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                            {rule.addedAt?.toDate().toLocaleDateString() || 'N/A'}
                                        </td>
                                        {isSuperAdmin && (
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => handleRemoveIP(rule.id, rule.label)}
                                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add IP Modal */}
            {showAddModal && (
                <AddIPModal
                    onClose={() => setShowAddModal(false)}
                    myIP={myIP}
                />
            )}
        </div>
    )
}

// Add IP Modal Component
function AddIPModal({ onClose, myIP }) {
    const [formData, setFormData] = useState({
        ip: '',
        type: 'single',
        label: '',
        allowedRoles: ['admin', 'super_admin']
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const toast = useToast()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const addIPFn = httpsCallable(functions, 'addIPToWhitelist')
            await addIPFn(formData)

            toast.success(`Added ${formData.label} to whitelist`)
            onClose()
        } catch (error) {
            toast.error(error.message || 'Failed to add IP')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUseMyIP = () => {
        if (myIP) {
            setFormData(prev => ({ ...prev, ip: myIP }))
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                    Add IP to Whitelist
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Label */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Label
                        </label>
                        <input
                            type="text"
                            value={formData.label}
                            onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                            placeholder="Office Network"
                            required
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Type
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                        >
                            <option value="single">Single IP</option>
                            <option value="range">CIDR Range</option>
                        </select>
                    </div>

                    {/* IP Address */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            IP Address {formData.type === 'range' && '(CIDR)'}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={formData.ip}
                                onChange={(e) => setFormData(prev => ({ ...prev, ip: e.target.value }))}
                                placeholder={formData.type === 'single' ? '192.168.1.1' : '192.168.1.0/24'}
                                required
                                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-mono dark:bg-slate-700 dark:text-white"
                            />
                            {myIP && formData.type === 'single' && (
                                <button
                                    type="button"
                                    onClick={handleUseMyIP}
                                    className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-sm"
                                >
                                    Use My IP
                                </button>
                            )}
                        </div>
                        {formData.type === 'range' && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Use CIDR notation (e.g., 192.168.1.0/24 for range)
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Adding...' : 'Add IP'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
