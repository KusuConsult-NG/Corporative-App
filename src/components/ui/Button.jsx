import { cn } from '../../utils/formatters'
import { Loader2 } from 'lucide-react'

const buttonVariants = {
    primary: 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/30 disabled:shadow-none',
    secondary: 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white',
    outline: 'border-2 border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 disabled:shadow-none',
    success: 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 disabled:shadow-none',
}

const buttonSizes = {
    xs: 'h-8 px-3 text-xs',
    sm: 'h-9 px-4 text-sm',
    md: 'h-10 px-4 sm:px-6 text-sm sm:text-base',
    lg: 'h-11 sm:h-12 px-6 sm:px-8 text-base sm:text-lg',
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className,
    disabled,
    loading,
    icon,
    iconRight,
    fullWidth = false,
    ...props
}) {
    return (
        <button
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200',
                'active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
                buttonVariants[variant],
                buttonSizes[size],
                fullWidth && 'w-full',
                className
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <Loader2 className="animate-spin" size={16} />
                    <span className="hidden sm:inline">Loading...</span>
                    <span className="inline sm:hidden">...</span>
                </>
            ) : (
                <>
                    {icon && <span className="flex-shrink-0">{icon}</span>}
                    <span className="truncate">{children}</span>
                    {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
                </>
            )}
        </button>
    )
}
