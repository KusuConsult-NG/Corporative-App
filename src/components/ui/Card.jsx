import { cn } from '../../utils/formatters'

export default function Card({
    children,
    className,
    header,
    footer,
    noPadding = false,
    hoverable = false,
    variant = 'default',
    ...props
}) {
    // Check if a background class is provided in className
    const hasBgClass = className && /bg-\w+/.test(className)

    const variants = {
        default: '',
        elevated: 'shadow-md hover:shadow-lg transition-shadow',
        bordered: 'border-2',
        ghost: 'border-0 shadow-none bg-transparent dark:bg-transparent',
    }

    return (
        <div
            className={cn(
                hasBgClass ? '' : 'bg-white dark:bg-slate-800',
                'rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all duration-200',
                hoverable && 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer',
                variants[variant],
                className
            )}
            {...props}
        >
            {header && (
                <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    {header}
                </div>
            )}
            <div className={cn(!noPadding && "p-4 sm:p-6")}>{children}</div>
            {footer && (
                <div className="px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                    {footer}
                </div>
            )}
        </div>
    )
}
