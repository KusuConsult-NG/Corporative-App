import { cn } from '../../utils/formatters'

export default function Card({
    children,
    className,
    header,
    footer,
    noPadding = false,
    variant = 'default', // default, elevated, outlined, gradient
    hover = false,
    ...props
}) {
    // Check if a background class is provided in className
    const hasBgClass = className && /bg-\w+/.test(className)

    const variants = {
        default: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm',
        elevated: 'bg-white dark:bg-slate-800 border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50',
        outlined: 'bg-transparent border-2 border-slate-300 dark:border-slate-600 shadow-none',
        gradient: 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200/50 dark:border-slate-700/50 shadow-md'
    }

    const hoverEffect = hover ? 'transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer' : ''

    return (
        <div
            className={cn(
                'rounded-xl overflow-hidden',
                hasBgClass ? '' : variants[variant],
                hoverEffect,
                className
            )}
            {...props}
        >
            {header && (
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                    {header}
                </div>
            )}
            <div className={cn(!noPadding && "p-6")}>{children}</div>
            {footer && (
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                    {footer}
                </div>
            )}
        </div>
    )
}
