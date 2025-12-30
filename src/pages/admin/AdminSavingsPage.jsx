import { Wallet, TrendingUp, Download, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function AdminSavingsPage() {
    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Savings Management</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Overview of cooperative capital and transactions
                    </p>
                </div>
                <Button variant="outline">
                    <Download size={20} />
                    Export Report
                </Button>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-blue-600 text-white">
                    <p className="text-blue-100 font-medium mb-1 text-xs">Total Savings Capital</p>
                    <h2 className="text-2xl lg:text-3xl font-bold">{formatCurrency(450000000).split('.')[0]}</h2>
                    <div className="flex items-center gap-2 mt-4 text-xs text-blue-100">
                        <span className="bg-white/20 px-2 py-0.5 rounded flex items-center gap-1">
                            <TrendingUp size={14} /> +8.5%
                        </span>
                        vs last month
                    </div>
                </Card>
                <Card className="p-6">
                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Monthly Deposits</p>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(25000000).split('.')[0]}</h2>
                    <p className="text-sm text-slate-500 mt-2">Total contributions for this month</p>
                </Card>
                <Card className="p-6">
                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Withdrawals</p>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(5000000).split('.')[0]}</h2>
                    <p className="text-sm text-slate-500 mt-2">Total payouts processed this month</p>
                </Card>
            </div>

            {/* Recent Transactions Log */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
                <Card className="p-0 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4">Transaction ID</th>
                                <th className="px-6 py-4">Member</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                    <td className="px-6 py-4 font-mono text-slate-500">TRX-{202400 + i}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">John Doe</td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1 ${i % 2 === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {i % 2 === 0 ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                            {i % 2 === 0 ? 'Deposit' : 'Withdrawal'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                                        {formatCurrency(i * 15000)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">Oct 24, 2023</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold">Success</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>
        </div>
    )
}
