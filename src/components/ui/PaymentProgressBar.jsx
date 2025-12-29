import { CheckCircle, Clock, AlertTriangle } from 'lucide-react'

export default function PaymentProgressBar({ totalInstallments, paidInstallments, overdueInstallments = 0, variant = 'compact' }) {
    const percentage = totalInstallments > 0 ? Math.round((paidInstallments / totalInstallments) * 100) : 0
    const isComplete = percentage === 100
    const hasOverdue = overdueInstallments > 0

    // Determine color based on status
    const getColor = () => {
        if (isComplete) return 'green'
        if (hasOverdue) return 'red'
        return 'blue'
    }

    const color = getColor()

    const colorClasses = {
        green: {
            bg: 'bg-green-500',
            text: 'text-green-600 dark:text-green-400',
            bgLight: 'bg-green-50 dark:bg-green-900/20'
        },
        blue: {
            bg: 'bg-primary',
            text: 'text-primary',
            bgLight: 'bg-blue-50 dark:bg-blue-900/20'
        },
        red: {
            bg: 'bg-red-500',
            text: 'text-red-600 dark:text-red-400',
            bgLight: 'bg-red-50 dark:bg-red-900/20'
        }
    }

    const Icon = isComplete ? CheckCircle : hasOverdue ? AlertTriangle : Clock

    if (variant === 'compact') {
        return (
            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                            className={`h-full ${colorClasses[color].bg} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>
                <span className={`text-xs font-semibold ${colorClasses[color].text} min-w-[60px] text-right`}>
                    {paidInstallments}/{totalInstallments}
                </span>
            </div>
        )
    }

    // Detailed variant
    return (
        <div className={`p-4 ${colorClasses[color].bgLight} rounded-lg`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Icon size={16} className={colorClasses[color].text} />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Payment Progress
                    </span>
                </div>
                <span className={`text-lg font-bold ${colorClasses[color].text}`}>
                    {percentage}%
                </span>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden mb-2">
                <div
                    className={`h-full ${colorClasses[color].bg} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{paidInstallments} of {totalInstallments} payments completed</span>
                {hasOverdue && (
                    <span className="text-red-600 dark:text-red-400 font-semibold">
                        {overdueInstallments} overdue
                    </span>
                )}
            </div>
        </div>
    )
}
