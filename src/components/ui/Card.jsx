import { cn } from '../../utils/formatters'

export default function Card({ children, className, header, footer, noPadding = false, ...props }) {
    // Check if a background class is provided in className
    const hasBgClass = className && /bg-\w+/.test(className)

    return (
        <div
            className={cn(
                hasBgClass ? '' : 'bg-white dark:bg-slate-800',
                'rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden',
                className
            )}
            {...props}
        >
            {header && (
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
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
