import { useState, useEffect } from 'react'
import { Shield, Search, Filter, Download, AlertTriangle, Info, AlertCircle, XCircle } from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import { getAuditLogs, AUDIT_ACTIONS, AUDIT_SEVERITY } from '../../services/auditService'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

export default function AuditLogsPage() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [actionFilter, setActionFilter] = useState('all')
    const [severityFilter, setSeverityFilter] = useState('all')
    const [selectedLog, setSelectedLog] = useState(null)

    useEffect(() => {
        fetchLogs()
    }, [actionFilter, severityFilter])

    const fetchLogs = async () => {
        try {
            setLoading(true)
            const filters = {
                limit: 200
            }

            if (actionFilter !== 'all') {
                filters.action = actionFilter
            }

            if (severityFilter !== 'all') {
                filters.severity = severityFilter
            }

            const auditLogs = await getAuditLogs(filters)
            setLogs(auditLogs)
        } catch (error) {
            console.error('Error fetching audit logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredLogs = logs.filter(log => {
        const searchLower = searchQuery.toLowerCase()
        return (
            log.userId?.toLowerCase().includes(searchLower) ||
            log.action?.toLowerCase().includes(searchLower) ||
            log.resource?.toLowerCase().includes(searchLower) ||
            log.ipAddress?.toLowerCase().includes(searchLower) ||
            JSON.stringify(log.details || {}).toLowerCase().includes(searchLower)
        )
    })

    const getSeverityBadge = (severity) => {
        const config = {
            info: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Info },
            warning: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: AlertTriangle },
            error: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle },
            critical: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle }
        }
        const { color, icon: Icon } = config[severity] || config.info
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${color}`}>
                <Icon size={12} />
                {severity?.toUpperCase()}
            </span>
        )
    }

    const getActionColor = (action) => {
        if (action?.includes('failed') || action?.includes('rejected') || action?.includes('unauthorized')) {
            return 'text-red-600 dark:text-red-400'
        }
        if (action?.includes('approved') || action?.includes('enabled') || action?.includes('verified')) {
            return 'text-green-600 dark:text-green-400'
        }
        if (action?.includes('pending') || action?.includes('requested')) {
            return 'text-yellow-600 dark:text-yellow-400'
        }
        return 'text-slate-600 dark:text-slate-400'
    }

    const exportLogs = () => {
        const csv = [
            ['Timestamp', 'User ID', 'Action', 'Resource', 'Resource ID', 'Severity', 'IP Address', 'Details'].join(','),
            ...filteredLogs.map(log =>
                [
                    log.createdAt ? new Date(log.createdAt).toLocaleString() : '',
                    log.userId || '',
                    log.action || '',
                    log.resource || '',
                    log.resourceId || '',
                    log.severity || '',
                    log.ipAddress || '',
                    JSON.stringify(log.details || {}).replace(/,/g, ';')
                ].join(',')
            )
        ].join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `audit-logs-${Date.now()}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    // Get unique actions for filter dropdown
    const uniqueActions = [...new Set(logs.map(log => log.action))].sort()

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Shield size={32} className="text-primary" />
                        Audit Logs
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        System-wide activity and security monitoring
                    </p>
                </div>
                <Button
                    variant="secondary"
                    onClick={exportLogs}
                    disabled={filteredLogs.length === 0}
                >
                    <Download size={18} />
                    Export CSV
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            placeholder="Search by user, action, resource, IP..."
                            icon={Search}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={severityFilter}
                            onChange={(e) => setSeverityFilter(e.target.value)}
                        >
                            <option value="all">All Severities</option>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="error">Error</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                    <div>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                        >
                            <option value="all">All Actions</option>
                            <optgroup label="Authentication">
                                <option value="user_login">User Login</option>
                                <option value="user_logout">User Logout</option>
                                <option value="2fa_enabled">2FA Enabled</option>
                                <option value="2fa_verified">2FA Verified</option>
                                <option value="2fa_failed">2FA Failed</option>
                            </optgroup>
                            <optgroup label="Loans">
                                <option value="loan_applied">Loan Applied</option>
                                <option value="loan_approved">Loan Approved</option>
                                <option value="loan_rejected">Loan Rejected</option>
                                <option value="loan_activated">Loan Activated</option>
                            </optgroup>
                            <optgroup label="Savings">
                                <option value="savings_deposit">Savings Deposit</option>
                                <option value="savings_withdrawal">Savings Withdrawal</option>
                            </optgroup>
                            <optgroup label="Security">
                                <option value="failed_login_attempt">Failed Login</option>
                                <option value="unauthorized_access_attempt">Unauthorized Access</option>
                                <option value="suspicious_activity">Suspicious Activity</option>
                            </optgroup>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Logs</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{logs.length}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Critical</p>
                    <p className="text-2xl font-bold text-red-600">
                        {logs.filter(l => l.severity === 'critical').length}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Warnings</p>
                    <p className="text-2xl font-bold text-yellow-600">
                        {logs.filter(l => l.severity === 'warning').length}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Filtered Results</p>
                    <p className="text-2xl font-bold text-blue-600">{filteredLogs.length}</p>
                </Card>
            </div>

            {/* Logs Table */}
            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Timestamp</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">User</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Action</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Resource</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Severity</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">IP Address</th>
                                <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-400">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                        Loading audit logs...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                        No audit logs found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                                        onClick={() => setSelectedLog(log)}
                                    >
                                        <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                                            {log.createdAt ? formatDate(log.createdAt) : 'N/A'}
                                            <br />
                                            <span className="text-[10px] text-slate-400">
                                                {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ''}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                                {log.userId?.substring(0, 12)}...
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className={`text-xs font-semibold ${getActionColor(log.action)}`}>
                                                {log.action?.replace(/_/g, ' ').toUpperCase()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                {log.resource || '-'}
                                            </p>
                                            {log.resourceId && (
                                                <p className="text-[10px] text-slate-400 font-mono">
                                                    {log.resourceId.substring(0, 12)}...
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getSeverityBadge(log.severity)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                                {log.ipAddress || 'unknown'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button size="sm" variant="ghost">
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Log Details Modal */}
            {selectedLog && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedLog(null)}
                >
                    <Card
                        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                Audit Log Details
                            </h3>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        Timestamp
                                    </p>
                                    <p className="text-sm text-slate-900 dark:text-white">
                                        {selectedLog.createdAt ? new Date(selectedLog.createdAt).toLocaleString() : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        Severity
                                    </p>
                                    {getSeverityBadge(selectedLog.severity)}
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                    User ID
                                </p>
                                <p className="text-sm text-slate-900 dark:text-white font-mono">
                                    {selectedLog.userId || 'N/A'}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                    Action
                                </p>
                                <p className={`text-sm font-semibold ${getActionColor(selectedLog.action)}`}>
                                    {selectedLog.action?.replace(/_/g, ' ').toUpperCase()}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        Resource
                                    </p>
                                    <p className="text-sm text-slate-900 dark:text-white">
                                        {selectedLog.resource || '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        Resource ID
                                    </p>
                                    <p className="text-sm text-slate-900 dark:text-white font-mono">
                                        {selectedLog.resourceId || '-'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        IP Address
                                    </p>
                                    <p className="text-sm text-slate-900 dark:text-white font-mono">
                                        {selectedLog.ipAddress || 'unknown'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        User Agent
                                    </p>
                                    <p className="text-sm text-slate-900 dark:text-white break-all">
                                        {selectedLog.userAgent || 'unknown'}
                                    </p>
                                </div>
                            </div>

                            {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                                        Additional Details
                                    </p>
                                    <pre className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs overflow-x-auto">
                                        {JSON.stringify(selectedLog.details, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <Button onClick={() => setSelectedLog(null)}>
                                Close
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
