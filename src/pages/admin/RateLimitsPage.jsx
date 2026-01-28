import { useState, useEffect } from 'react'
import { Shield, Unlock, RefreshCcw, Clock, AlertTriangle } from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { formatDate } from '../../utils/formatters'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function RateLimitsPage() {
    const [limits, setLimits] = useState([])
    const [loading, setLoading] = useState(true)
    const [clearing, setClearing] = useState(null)

    const functions = getFunctions()

    useEffect(() => {
        fetchRateLimits()
    }, [])

    const fetchRateLimits = async () => {
        try {
            setLoading(true)
            const getAllRateLimits = httpsCallable(functions, 'getAllRateLimits')
            const result = await getAllRateLimits()

            if (result.data.success) {
                setLimits(result.data.limits || [])
            }
        } catch (error) {
            console.error('Error fetching rate limits:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleClearRateLimit = async (endpoint, identifier) => {
        if (!confirm(`Clear rate limit for ${identifier} on ${endpoint}?`)) {
            return
        }

        try {
            setClearing(`${endpoint}_${identifier}`)
            const clearRateLimit = httpsCallable(functions, 'clearRateLimit')
            const result = await clearRateLimit({ endpoint, identifier })

            if (result.data.success) {
                // Remove from list
                setLimits(limits.filter(l =>
                    !(l.endpoint === endpoint && l.identifier === identifier)
                ))
            }
        } catch (error) {
            console.error('Error clearing rate limit:', error)
            alert('Failed to clear rate limit: ' + error.message)
        } finally {
            setClearing(null)
        }
    }

    const getTimeRemaining = (lockedUntil) => {
        if (!lockedUntil) return 'Not locked'

        const now = Date.now()
        const remaining = lockedUntil - now

        if (remaining <= 0) return 'Expired'

        const minutes = Math.floor(remaining / 60000)
        const seconds = Math.floor((remaining % 60000) / 1000)

        if (minutes > 0) {
            return `${minutes}m ${seconds}s`
        }
        return `${seconds}s`
    }

    const getEndpointBadge = (endpoint) => {
        const colors = {
            login: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            twoFactorVerify: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            passwordReset: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            loanApplication: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            savingsWithdrawal: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            dataExport: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
        }
        const color = colors[endpoint] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'

        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${color}`}>
                {endpoint?.replace(/([A-Z])/g, ' $1').trim()}
            </span>
        )
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Shield size={32} className="text-primary" />
                        Rate Limit Management
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Monitor and manage rate-limited IPs and users
                    </p>
                </div>
                <Button
                    variant="secondary"
                    onClick={fetchRateLimits}
                    disabled={loading}
                >
                    <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Active Lockouts</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {limits.length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Clock className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Login Attempts</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {limits.filter(l => l.endpoint === 'login').length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Shield className="text-purple-600 dark:text-purple-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">2FA Attempts</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {limits.filter(l => l.endpoint === 'twoFactorVerify').length}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Rate Limits Table */}
            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                    Identifier
                                </th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                    Endpoint
                                </th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                    Attempts
                                </th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                    Last Attempt
                                </th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                    Time Remaining
                                </th>
                                <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-400">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        <RefreshCcw className="animate-spin inline-block mb-2" size={24} />
                                        <p>Loading rate limits...</p>
                                    </td>
                                </tr>
                            ) : limits.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        <Shield className="inline-block mb-2 opacity-50" size={48} />
                                        <p className="font-semibold">No active rate limits</p>
                                        <p className="text-xs mt-1">All systems operating normally</p>
                                    </td>
                                </tr>
                            ) : (
                                limits.map((limit) => (
                                    <tr
                                        key={limit.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                                    >
                                        <td className="px-6 py-4">
                                            <p className="font-mono text-xs text-slate-900 dark:text-white font-semibold">
                                                {limit.identifier}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getEndpointBadge(limit.endpoint)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-red-600 dark:text-red-400">
                                                {limit.attempts}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                                            {limit.lastAttempt
                                                ? new Date(limit.lastAttempt).toLocaleString()
                                                : 'N/A'
                                            }
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                                <Clock size={14} />
                                                {getTimeRemaining(limit.lockedUntil)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleClearRateLimit(limit.endpoint, limit.identifier)}
                                                disabled={clearing === limit.id}
                                            >
                                                <Unlock size={16} />
                                                {clearing === limit.id ? 'Clearing...' : 'Clear'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Info Card */}
            <Card className="p-6 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                <div className="flex gap-4">
                    <Shield className="text-blue-600 dark:text-blue-400 shrink-0" size={24} />
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                            Rate Limiting Information
                        </h3>
                        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                            <li>• <strong>Login:</strong> 5 attempts per 15 minutes (30 min lockout)</li>
                            <li>• <strong>2FA Verification:</strong> 5 attempts per 15 minutes (30 min lockout)</li>
                            <li>• <strong>Password Reset:</strong> 3 attempts per hour (1 hour lockout)</li>
                            <li>• <strong>Loan Application:</strong> 3 attempts per hour (2 hour lockout)</li>
                            <li>• <strong>Data Export:</strong> 10 attempts per hour (1 hour lockout)</li>
                        </ul>
                        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                            Clearing a rate limit will immediately restore access for the affected identifier.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    )
}
