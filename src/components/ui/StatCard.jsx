import { cn } from '../../utils/formatters'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function StatCard({
    title,
    value,
    icon: Icon,
    trend, // { value: number, isPositive: boolean }
    subtitle,
    variant = 'default', // default, primary, success, warning, danger
    className
}) {
    const variants = {
        default: 'from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700',
        primary: 'from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900 border-blue-200 dark:border-blue-800',
        success: 'from-green-50 to-white dark:from-green-900/20 dark:to-slate-900 border-green-200 dark:border-green-800',
        warning: 'from-orange-50 to-white dark:from-orange-900/20 dark:to-slate-900 border-orange-200 dark:border-orange-800',
        danger: 'from-red-50 to-white dark:from-red-900/20 dark:to-slate-900 border-red-200 dark:border-red-800'
    }

    const iconColors = {
        default: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
        primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        success: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        warning: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
        danger: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
    }

    return (
        <div
            className={cn(
                'relative p-6 rounded-xl border bg-gradient-to-br transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
                variants[variant],
                className
            )}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {title}
                    </p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        {value}
                    </h3>
                    {subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {subtitle}
                        </p>
                    )}
                    {trend && (
                        <div className={cn(
                            'inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-bold',
                            trend.isPositive
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        )}>
                            {trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {trend.value}%
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className={cn(
                        'p-3 rounded-lg',
                        iconColors[variant]
                    )}>
                        <Icon size={24} />
                    </div>
                )}
            </div>
        </div>
    )
}
