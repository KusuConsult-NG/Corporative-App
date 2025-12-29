import { X, Calendar, CheckCircle, Clock, AlertTriangle, DollarSign, Download } from 'lucide-react'
import Button from './ui/Button'
import { formatCurrency, formatDate } from '../utils/formatters'
import { getPaymentStatistics, exportScheduleToCSV } from '../utils/installmentUtils'

export default function InstallmentScheduleModal({ isOpen, onClose, order, schedule }) {
    if (!isOpen || !order || !schedule) return null

    const stats = getPaymentStatistics(schedule)

    const getStatusBadge = (status) => {
        const config = {
            pending: {
                bg: 'bg-yellow-100 dark:bg-yellow-900/30',
                text: 'text-yellow-700 dark:text-yellow-400',
                icon: Clock,
                label: 'Pending'
            },
            paid: {
                bg: 'bg-green-100 dark:bg-green-900/30',
                text: 'text-green-700 dark:text-green-400',
                icon: CheckCircle,
                label: 'Paid'
            },
            overdue: {
                bg: 'bg-red-100 dark:bg-red-900/30',
                text: 'text-red-700 dark:text-red-400',
                icon: AlertTriangle,
                label: 'Overdue'
            }
        }

        const item = config[status] || config.pending
        const Icon = item.icon

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${item.bg} ${item.text}`}>
                <Icon size={12} />
                {item.label}
            </span>
        )
    }

    const handleExport = () => {
        exportScheduleToCSV(schedule, order.productName)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Payment Schedule
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {order.productName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Summary */}
                <div className="p-6 bg-gradient-to-br from-primary/5 to-blue-50/50 dark:from-primary/5 dark:to-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Amount</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {formatCurrency(stats.totalAmount)}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Paid</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(stats.paidAmount)}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remaining</p>
                            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                {formatCurrency(stats.remainingAmount)}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Progress</p>
                            <p className="text-lg font-bold text-primary">
                                {stats.progressPercentage}%
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-blue-600 transition-all duration-500"
                            style={{ width: `${stats.progressPercentage}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
                        {stats.paidInstallments} of {stats.totalInstallments} installments paid
                    </p>
                </div>

                {/* Schedule Table */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">#</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Due Date</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">Amount</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Paid Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {schedule.map((payment) => (
                                    <tr
                                        key={payment.installmentNumber}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                                    >
                                        <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">
                                            {payment.installmentNumber}
                                        </td>
                                        <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-gray-400" />
                                                {formatDate(payment.dueDate)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td className="px-4 py-4">
                                            {getStatusBadge(payment.status)}
                                        </td>
                                        <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                                            {payment.paidDate ? (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle size={14} className="text-green-600" />
                                                    {formatDate(payment.paidDate)}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                {stats.paidInstallments} Paid
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                {stats.pendingInstallments} Pending
                            </span>
                        </div>
                        {stats.overdueInstallments > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                    {stats.overdueInstallments} Overdue
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={handleExport}>
                            <Download size={16} />
                            Export CSV
                        </Button>
                        <Button onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
