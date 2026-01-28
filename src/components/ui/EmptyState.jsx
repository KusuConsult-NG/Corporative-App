import { cn } from '../../utils/formatters'

export default function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className
}) {
    return (
        <div className={cn('py-16 px-6 text-center', className)}>
            {Icon && (
                <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                    <Icon className="text-slate-400 dark:text-slate-500" size={48} />
                </div>
            )}
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {title}
            </h3>
            {description && (
                <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
                    {description}
                </p>
            )}
            {action && action}
        </div>
    )
}
