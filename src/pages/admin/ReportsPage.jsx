import { useState, useEffect } from 'react'
import { FileText, Download, Calendar, TrendingUp, Users, DollarSign, FileSpreadsheet } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { exportToPDF, exportToExcel } from '../../utils/exportUtils'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import EmptyState from '../../components/ui/EmptyState'

export default function AdminReportsPage() {
    const [reportType, setReportType] = useState('financial')
    const [dateRange, setDateRange] = useState('monthly')
    const [loading, setLoading] = useState(false)
    const [reportData, setReportData] = useState(null)

    const generateReport = async () => {
        setLoading(true)
        try {
            // Calculate date range
            const endDate = new Date()
            const startDate = new Date()

            switch (dateRange) {
                case 'daily':
                    startDate.setDate(startDate.getDate() - 1)
                    break
                case 'weekly':
                    startDate.setDate(startDate.getDate() - 7)
                    break
                case 'monthly':
                    startDate.setMonth(startDate.getMonth() - 1)
                    break
                case 'quarterly':
                    startDate.setMonth(startDate.getMonth() - 3)
                    break
                case 'annual':
                    startDate.setFullYear(startDate.getFullYear() - 1)
                    break
            }

            if (reportType === 'financial') {
                // Fetch savings data
                const walletsSnapshot = await getDocs(collection(db, 'wallets'))
                const totalSavings = walletsSnapshot.docs.reduce(
                    (sum, doc) => sum + (doc.data().balance || 0),
                    0
                )

                // Fetch active loans
                const loansQuery = query(
                    collection(db, 'loans'),
                    where('status', '==', 'active')
                )
                const loansSnapshot = await getDocs(loansQuery)
                const totalLoans = loansSnapshot.docs.reduce(
                    (sum, doc) => sum + (doc.data().amount || 0),
                    0
                )

                setReportData({
                    type: 'Financial Summary',
                    period: dateRange,
                    metrics: {
                        'Total Savings': totalSavings,
                        'Active Loans': totalLoans,
                        'Net Position': totalSavings - totalLoans
                    }
                })
            } else if (reportType === 'loans') {
                const loansSnapshot = await getDocs(collection(db, 'loans'))
                const allLoans = loansSnapshot.docs.map(doc => doc.data())

                const byStatus = {
                    pending: allLoans.filter(l => l.status === 'pending').length,
                    approved: allLoans.filter(l => l.status === 'approved').length,
                    active: allLoans.filter(l => l.status === 'active').length,
                    completed: allLoans.filter(l => l.status === 'completed').length
                }

                setReportData({
                    type: 'Loan Report',
                    period: dateRange,
                    metrics: {
                        'Total Applications': allLoans.length,
                        'Pending': byStatus.pending,
                        'Approved': byStatus.approved,
                        'Active': byStatus.active,
                        'Completed': byStatus.completed
                    }
                })
            } else if (reportType === 'members') {
                const usersSnapshot = await getDocs(collection(db, 'users'))
                const allUsers = usersSnapshot.docs.map(doc => doc.data())

                setReportData({
                    type: 'Member Report',
                    period: dateRange,
                    metrics: {
                        'Total Members': allUsers.length,
                        'Verified Members': allUsers.filter(u => u.emailVerified).length,
                        'Paid Registration Fee': allUsers.filter(u => u.registrationFeePaid).length
                    }
                })
            }
        } catch (error) {
            console.error('Error generating report:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reports</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Generate and view comprehensive reports
                </p>
            </div>

            {/* Report Configuration */}
            <Card className="mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Generate Report
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Report Type
                        </label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                        >
                            <option value="financial">Financial Summary</option>
                            <option value="loans">Loan Report</option>
                            <option value="members">Member Report</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Date Range
                        </label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="annual">Annual</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <Button
                            onClick={generateReport}
                            loading={loading}
                            className="w-full"
                        >
                            <FileText size={18} />
                            Generate Report
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Report Results */}
            {reportData && (
                <Card>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {reportData.type}
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                                {reportData.period} Period
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => exportToPDF(reportData, `${reportData.type.replace(/\s+/g, '_')}_${reportData.period}.pdf`)}
                            >
                                <Download size={16} />
                                PDF
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    const excelData = Object.entries(reportData.metrics).map(([key, value]) => ({
                                        Metric: key,
                                        Value: value
                                    }))
                                    exportToExcel(excelData, `${reportData.type.replace(/\s+/g, '_')}_${reportData.period}.xlsx`)
                                }}
                            >
                                <FileSpreadsheet size={16} />
                                Excel
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(reportData.metrics).map(([key, value]) => (
                            <div key={key} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                    {key}
                                </p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {typeof value === 'number' && key.includes('Total') || key.includes('Position') || key.includes('Loans') || key.includes('Savings')
                                        ? formatCurrency(value)
                                        : value}
                                </p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}
