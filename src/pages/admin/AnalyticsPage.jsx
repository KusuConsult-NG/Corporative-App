import { useState, useEffect } from 'react'
import { TrendingUp, Users, DollarSign, CreditCard, Package, BarChart3, RefreshCw, Calendar } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { formatCurrency } from '../../utils/formatters'
import {
    getLoanAnalytics,
    getSavingsAnalytics,
    getMemberAnalytics,
    getCommodityAnalytics
} from '../../services/analyticsService'
import {
    TrendLineChart,
    TrendAreaChart,
    ComparisonBarChart,
    DistributionPieChart
} from '../../components/analytics/Charts'
import { SkeletonStatCard, SkeletonChart } from '../../components/ui/SkeletonLoader'
import EmptyState from '../../components/ui/EmptyState'

const DATE_RANGES = [
    { label: 'Last 7 Days', value: 7, key: '7d' },
    { label: 'Last 30 Days', value: 30, key: '30d' },
    { label: 'Last 90 Days', value: 90, key: '90d' },
    { label: '6 Months', value: 180, key: '6m' },
    { label: '1 Year', value: 365, key: '1y' },
    { label: 'All Time', value: null, key: 'all' }
]

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [loanData, setLoanData] = useState(null)
    const [savingsData, setSavingsData] = useState(null)
    const [memberData, setMemberData] = useState(null)
    const [commodityData, setCommodityData] = useState(null)
    const [dateRange, setDateRange] = useState('6m')

    const fetchAnalytics = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true)
            else setLoading(true)

            const selectedRange = DATE_RANGES.find(r => r.key === dateRange)
            const startDate = selectedRange?.value
                ? new Date(Date.now() - selectedRange.value * 24 * 60 * 60 * 1000)
                : null

            const [loans, savings, members, commodities] = await Promise.all([
                getLoanAnalytics(startDate),
                getSavingsAnalytics(startDate),
                getMemberAnalytics(startDate),
                getCommodityAnalytics(startDate)
            ])

            setLoanData(loans)
            setSavingsData(savings)
            setMemberData(members)
            setCommodityData(commodities)
        } catch (error) {
            console.error('Error fetching analytics:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchAnalytics()
    }, [dateRange])

    // Prepare chart data
    const loanStatusData = loanData ? Object.entries(loanData.statusDistribution).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
    })) : []

    const loanTypeData = loanData ? Object.entries(loanData.typeDistribution).map(([name, value]) => ({
        name: name.replace('_', ' ').toUpperCase(),
        count: value
    })) : []

    const savingsRangeData = savingsData ? Object.entries(savingsData.savingsRanges).map(([name, value]) => ({
        name,
        value
    })) : []

    const departmentData = memberData ? Object.entries(memberData.departmentDistribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([name, value]) => ({
            name,
            count: value
        })) : []

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analytics Dashboard</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Comprehensive insights and trends
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Date Range Selector */}
                    <div className="relative">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
                        >
                            {DATE_RANGES.map(range => (
                                <option key={range.key} value={range.key}>
                                    {range.label}
                                </option>
                            ))}
                        </select>
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                    <Button
                        variant="secondary"
                        onClick={() => fetchAnalytics(true)}
                        loading={refreshing}
                    >
                        <RefreshCw size={18} />
                        Refresh
                    </Button>
                </div>
            </div>


            {/* Key Metrics Summary */}
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {loading ? (
                    <>
                        <SkeletonStatCard />
                        <SkeletonStatCard />
                        <SkeletonStatCard />
                        <SkeletonStatCard />
                    </>
                ) : (
                    <>
                        <Card className="group hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div className="size-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                                    <CreditCard size={24} />
                                </div>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                Total Loans Disbursed
                            </h3>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {formatCurrency(loanData?.totalDisbursed || 0).split('.')[0]}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {loanData?.totalLoans || 0} loans processed
                            </p>
                        </Card>

                        <Card className="group hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div className="size-12 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                Outstanding Loans
                            </h3>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {formatCurrency(loanData?.totalOutstanding || 0).split('.')[0]}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Active loan balance
                            </p>
                        </Card>

                        <Card className="group hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div className="size-12 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                                    <DollarSign size={24} />
                                </div>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                Total Savings
                            </h3>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {formatCurrency(savingsData?.totalSavings || 0).split('.')[0]}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Avg: {formatCurrency(savingsData?.avgSavings || 0).split('.')[0]} per member
                            </p>
                        </Card>

                        <Card className="group hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div className="size-12 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                                    <Users size={24} />
                                </div>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                Total Members
                            </h3>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {memberData?.totalMembers || 0}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {memberData?.verified || 0} verified
                            </p>
                        </Card>
                    </>
                )}
            </section>

            {/* Loan Analytics */}
            <section>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <BarChart3 size={24} className="text-primary" />
                    Loan Analytics
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="h-80">
                        <TrendLineChart
                            data={loanData?.monthlyTrends || []}
                            dataKey="count"
                            title="Loan Applications Trend (6 Months)"
                            color="#3b82f6"
                        />
                    </Card>

                    <Card className="h-80">
                        <DistributionPieChart
                            data={loanStatusData}
                            title="Loan Status Distribution"
                        />
                    </Card>

                    <Card className="h-80 lg:col-span-2">
                        <ComparisonBarChart
                            data={loanTypeData}
                            dataKey="count"
                            xAxisKey="name"
                            title="Loans by Type"
                            color="#8b5cf6"
                        />
                    </Card>
                </div>
            </section>

            {/* Savings Analytics */}
            <section>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <DollarSign size={24} className="text-green-500" />
                    Savings Analytics
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="h-80">
                        <TrendAreaChart
                            data={savingsData?.monthlySavingsTrend || []}
                            dataKey="amount"
                            title="Monthly Savings Trend (6 Months)"
                            color="#10b981"
                        />
                    </Card>

                    <Card className="h-80">
                        <DistributionPieChart
                            data={savingsRangeData}
                            title="Savings Distribution by Range"
                        />
                    </Card>
                </div>
            </section>

            {/* Member Analytics */}
            <section>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Users size={24} className="text-purple-500" />
                    Member Analytics
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="h-80">
                        <TrendLineChart
                            data={memberData?.monthlyGrowth || []}
                            dataKey="count"
                            title="Member Growth (6 Months)"
                            color="#8b5cf6"
                        />
                    </Card>

                    <Card className="h-80">
                        <ComparisonBarChart
                            data={departmentData}
                            dataKey="count"
                            xAxisKey="name"
                            title="Members by Department (Top 6)"
                            color="#ec4899"
                        />
                    </Card>
                </div>
            </section>

            {/* Commodity Analytics */}
            {commodityData && commodityData.totalOrders > 0 && (
                <section>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <Package size={24} className="text-orange-500" />
                        Commodity Analytics
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="h-80">
                            <TrendLineChart
                                data={commodityData?.monthlyTrends || []}
                                dataKey="count"
                                title="Commodity Orders Trend (6 Months)"
                                color="#f59e0b"
                            />
                        </Card>

                        <Card className="h-80">
                            <ComparisonBarChart
                                data={commodityData?.popularItems || []}
                                dataKey="count"
                                xAxisKey="name"
                                title="Most Popular Items"
                                color="#14b8a6"
                            />
                        </Card>
                    </div>
                </section>
            )}
        </div>
    )
}
