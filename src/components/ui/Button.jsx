import { cn } from '../../utils/formatters'

const buttonVariants = {
    primary: 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/30',
    secondary: 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white',
    outline: 'border-2 border-primary text-primary hover:bg-primary/10',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
}

const buttonSizes = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-10 px-6 text-base',
    lg: 'h-12 px-8 text-lg',
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className,
    disabled,
    loading,
    ...props
}) {
    return (
        <button
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
                buttonVariants[variant],
                buttonSizes[size],
                className
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {children}
        </button>
    )
}
