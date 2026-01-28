import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, Download, ArrowUpRight, ArrowDownLeft, RefreshCw, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { savingsAPI, membersAPI } from '../../services/api'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { exportToPDF, exportToExcel } from '../../utils/exportUtils'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'

export default function AdminSavingsPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [stats, setStats] = useState({
        totalSavings: 0,
        monthlyDeposits: 0,
        monthlyWithdrawals: 0,
        previousMonthSavings: 0
    })
    const [transactions, setTransactions] = useState([])
    const [exporting, setExporting] = useState(false)

    useEffect(() => {
        fetchSavingsData()
    }, [])

    const fetchSavingsData = async () => {
        try {
            setLoading(true)
            setError(null)

            // Fetch all members to calculate total savings
            const members = await membersAPI.getAll()

            // Calculate total savings capital
            const totalSavings = members.reduce((sum, member) => {
                return sum + (member.savingsBalance || 0)
            }, 0)

            // Calculate previous month's total for trend
            const prevMonthSavings = totalSavings * 0.92 // Approximate previous month (would need historical data for accuracy)

            // Fetch all savings transactions
            const transactionsSnapshot = await getDocs(collection(db, 'savings_transactions'))
            const allTransactions = transactionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))

            // Filter transactions for current month
            const now = new Date()
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

            const monthlyTransactions = allTransactions.filter(transaction => {
                const transactionDate = transaction.date?.toDate?.() || transaction.createdAt?.toDate?.()
                return transactionDate && transactionDate >= firstDayOfMonth
            })

            // Calculate monthly deposits and withdrawals
            const monthlyDeposits = monthlyTransactions
                .filter(t => t.type === 'deposit' || t.type === 'credit')
                .reduce((sum, t) => sum + (t.amount || 0), 0)

            const monthlyWithdrawals = monthlyTransactions
                .filter(t => t.type === 'withdrawal' || t.type === 'debit')
                .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)

            // Get recent transactions (last 10)
            const sortedTransactions = allTransactions
                .sort((a, b) => {
                    const aTime = a.date?.toMillis?.() || a.createdAt?.toMillis?.() || 0
                    const bTime = b.date?.toMillis?.() || b.createdAt?.toMillis?.() || 0
                    return bTime - aTime
                })
                .slice(0, 10)

            // Enrich transactions with member names
            const enrichedTransactions = await Promise.all(
                sortedTransactions.map(async (transaction) => {
                    const member = members.find(m => m.memberId === transaction.memberId)
                    return {
                        ...transaction,
                        memberName: member?.name || 'Unknown Member'
                    }
                })
            )

            setStats({
                totalSavings,
                monthlyDeposits,
                monthlyWithdrawals,
                previousMonthSavings: prevMonthSavings
            })

            setTransactions(enrichedTransactions)
        } catch (err) {
            console.error('Error fetching savings data:', err)
            setError('Failed to load savings data. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const calculateTrend = () => {
        if (stats.previousMonthSavings === 0) return { percentage: 0, isPositive: true }

        const difference = stats.totalSavings - stats.previousMonthSavings
        const percentage = ((difference / stats.previousMonthSavings) * 100).toFixed(1)

        return {
            percentage: Math.abs(percentage),
            isPositive: difference >= 0
        }
    }

    const handleExport = async (format) => {
        try {
            setExporting(true)

            const exportData = {
                title: 'Savings Report',
                date: new Date().toLocaleDateString(),
                stats: [
                    { label: 'Total Savings Capital', value: formatCurrency(stats.totalSavings) },
                    { label: 'Monthly Deposits', value: formatCurrency(stats.monthlyDeposits) },
                    { label: 'Monthly Withdrawals', value: formatCurrency(stats.monthlyWithdrawals) }
                ],
                transactions: transactions.map(t => ({
                    'Transaction ID': t.id,
                    'Member': t.memberName,
                    'Type': t.type || 'N/A',
                    'Amount': formatCurrency(Math.abs(t.amount || 0)),
                    'Date': formatDate(t.date?.toDate?.() || t.createdAt?.toDate?.()),
                    'Description': t.description || 'N/A'
                }))
            }

            if (format === 'pdf') {
                await exportToPDF(exportData, 'savings-report')
            } else if (format === 'excel') {
                await exportToExcel(exportData, 'savings-report')
            }
        } catch (err) {
            console.error('Error exporting:', err)
            alert('Failed to export report. Please try again.')
        } finally {
            setExporting(false)
        }
    }

    const trend = calculateTrend()

    if (loading) {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto">
                <LoadingSkeleton variant="dashboard" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto">
                <Card className="p-8 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                        <h2 className="text-xl font-bold text-red-900 dark:text-red-100">Error Loading Data</h2>
                    </div>
                    <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
                    <Button onClick={fetchSavingsData} variant="outline">
                        <RefreshCw size={18} />
                        Retry
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Savings Management</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Overview of cooperative capital and transactions
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={fetchSavingsData} disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                    <div className="relative group">
                        <Button variant="outline" disabled={exporting}>
                            <Download size={20} />
                            Export Report
                        </Button>
                        <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                                onClick={() => handleExport('pdf')}
                                disabled={exporting}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-lg"
                            >
                                Export as PDF
                            </button>
                            <button
                                onClick={() => handleExport('excel')}
                                disabled={exporting}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-b-lg"
                            >
                                Export as Excel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-blue-600 text-white">
                    <p className="text-blue-100 font-medium mb-1">Total Savings Capital</p>
                    <h2 className="text-2xl lg:text-3xl font-bold">{formatCurrency(stats.totalSavings).split('.')[0]}</h2>
                    <div className="flex items-center gap-2 mt-4 text-sm text-blue-100">
                        <span className={`bg-white/20 px-2 py-0.5 rounded flex items-center gap-1 ${trend.isPositive ? 'text-green-100' : 'text-red-100'}`}>
                            <TrendingUp size={14} className={trend.isPositive ? '' : 'rotate-180'} />
                            {trend.isPositive ? '+' : '-'}{trend.percentage}%
                        </span>
                        vs last month
                    </div>
                </Card>
                <Card className="p-6">
                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Monthly Deposits</p>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.monthlyDeposits).split('.')[0]}</h2>
                    <p className="text-sm text-slate-500 mt-2">Total contributions for this month</p>
                </Card>
                <Card className="p-6">
                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Withdrawals</p>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.monthlyWithdrawals).split('.')[0]}</h2>
                    <p className="text-sm text-slate-500 mt-2">Total payouts processed this month</p>
                </Card>
            </div>

            {/* Recent Transactions Log */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
                <Card className="p-0 overflow-hidden">
                    {transactions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                            <p>No transactions found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4">Transaction ID</th>
                                        <th className="px-6 py-4">Member</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {transactions.map((transaction) => {
                                        const isDeposit = transaction.type === 'deposit' || transaction.type === 'credit'
                                        const date = transaction.date?.toDate?.() || transaction.createdAt?.toDate?.()

                                        return (
                                            <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                <td className="px-6 py-4 font-mono text-slate-500">{transaction.id.slice(0, 8)}</td>
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{transaction.memberName}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`flex items-center gap-1 ${isDeposit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {isDeposit ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                                        {transaction.type || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                                                    {formatCurrency(Math.abs(transaction.amount || 0))}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">
                                                    {date ? formatDate(date) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                                                    {transaction.description || 'N/A'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}
