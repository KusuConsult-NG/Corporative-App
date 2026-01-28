import { useState, useEffect } from 'react'
import { AlertTriangle, Shield, Unlock, Clock, Activity, XCircle, CheckCircle } from 'lucide-react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../lib/firebase'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import EmptyState from '../../components/ui/EmptyState'
import { formatDate } from '../../utils/formatters'
import { useToast } from '../../context/ToastContext'

export default function SecurityMonitoringPage() {
    const [violations, setViolations] = useState([])
    const [loading, setLoading] = useState(true)
    const [unblocking, setUnblocking] = useState(null)
    const toast = useToast()

    useEffect(() => {
        fetchViolations()
    }, [])

    const fetchViolations = async () => {
        setLoading(true)
        try {
            // Fetch recent rate limit violations
            const violationsQuery = query(
                collection(db, 'rate_limit_violations'),
                orderBy('timestamp', 'desc'),
                limit(50)
            )

            const violationsSnapshot = await getDocs(violationsQuery)
            const violationsData = violationsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))

            setViolations(violationsData)
        } catch (error) {
            console.error('Error fetching violations:', error)
            toast.error('Failed to load security violations')
        } finally {
            setLoading(false)
        }
    }

    const handleUnblockIP = async (ip) => {
        setUnblocking(ip)
        try {
            const clearRateLimit = httpsCallable(functions, 'clearRateLimit')
            await clearRateLimit({ ip })

            toast.success(`IP ${ip} has been unblocked`)
            await fetchViolations()
        } catch (error) {
            console.error('Error unblocking IP:', error)
            toast.error('Failed to unblock IP')
        } finally {
            setUnblocking(null)
        }
    }

    const getViolationTypeColor = (type) => {
        const colors = {
            'bvn_validation': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            'login': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            'api': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        }
        return colors[type] || 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
    }

    const getViolationTypeLabel = (type) => {
        const labels = {
            'bvn_validation': 'BVN Validation',
            'login': 'Login Attempt',
            'api': 'API Request'
        }
        return labels[type] || type
    }

    // Group violations by IP
    const violationsByIP = violations.reduce((acc, violation) => {
        const ip = violation.ip || 'Unknown'
        if (!acc[ip]) {
            acc[ip] = {
                ip,
                count: 0,
                types: new Set(),
                lastViolation: violation.timestamp,
                isBlocked: violation.blocked || false
            }
        }
        acc[ip].count++
        acc[ip].types.add(violation.type || 'unknown')
        if (violation.timestamp?.seconds > acc[ip].lastViolation?.seconds) {
            acc[ip].lastViolation = violation.timestamp
            acc[ip].isBlocked = violation.blocked || false
        }
        return acc
    }, {})

    const groupedViolations = Object.values(violationsByIP).sort((a, b) => {
        const aTime = a.lastViolation?.seconds || 0
        const bTime = b.lastViolation?.seconds || 0
        return bTime - aTime
    })

    const totalBlocked = groupedViolations.filter(v => v.isBlocked).length
    const totalViolations = violations.length

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <Shield className="text-primary" size={32} />
                    Security Monitoring
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Monitor rate limit violations and manage IP blocks
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                Total Violations
                            </p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {totalViolations}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                            <XCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                Blocked IPs
                            </p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {totalBlocked}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                Unique IPs
                            </p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {groupedViolations.length}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Violations Table */}
            {loading ? (
                <SkeletonLoader count={5} />
            ) : groupedViolations.length === 0 ? (
                <EmptyState
                    icon={CheckCircle}
                    title="No Security Violations"
                    description="Great! No rate limit violations detected. The system is operating securely."
                />
            ) : (
                <Card className="overflow-hidden p-0">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            Violation History
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Recent rate limit violations grouped by IP address
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                        IP Address
                                    </th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                        Violation Count
                                    </th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                        Violation Types
                                    </th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                        Last Violation
                                    </th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-400">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {groupedViolations.map((violation) => (
                                    <tr
                                        key={violation.ip}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                                    >
                                        <td className="px-6 py-4 font-mono text-slate-900 dark:text-white">
                                            {violation.ip}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                {violation.count} violation{violation.count !== 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {Array.from(violation.types).map(type => (
                                                    <span
                                                        key={type}
                                                        className={`px-2 py-0.5 rounded text-xs font-medium ${getViolationTypeColor(type)}`}
                                                    >
                                                        {getViolationTypeLabel(type)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={14} />
                                                {violation.lastViolation
                                                    ? formatDate(violation.lastViolation.toDate())
                                                    : 'Unknown'
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {violation.isBlocked ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                    <XCircle size={12} />
                                                    Blocked
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    <CheckCircle size={12} />
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {violation.isBlocked && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleUnblockIP(violation.ip)}
                                                    loading={unblocking === violation.ip}
                                                    disabled={unblocking !== null}
                                                >
                                                    <Unlock size={16} />
                                                    Unblock
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Help Card */}
            <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <div className="flex gap-4">
                    <Shield className="text-blue-600 dark:text-blue-400 shrink-0" size={24} />
                    <div>
                        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
                            About Rate Limiting
                        </h3>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            The system automatically blocks IPs that exceed rate limits. Common triggers include:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
                            <li>• <strong>BVN Validation</strong>: More than 5 attempts per minute</li>
                            <li>• <strong>Login Attempts</strong>: More than 5 failed logins</li>
                            <li>• <strong>API Requests</strong>: Exceeding endpoint-specific limits</li>
                        </ul>
                        <p className="mt-3 text-sm text-blue-800 dark:text-blue-200">
                            Blocked IPs are automatically unblocked after 24 hours, or you can manually unblock them using the button above.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    )
}
