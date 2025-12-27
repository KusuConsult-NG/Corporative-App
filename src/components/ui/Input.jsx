import { forwardRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../utils/formatters'

const Input = forwardRef(({
    label,
    error,
    icon: Icon,
    type = 'text',
    showPasswordToggle,
    onTogglePassword,
    className,
    ...props
}, ref) => {
    return (
        <div className="flex flex-col gap-2 w-full">
            {label && (
                <label className="text-slate-900 dark:text-gray-200 text-sm font-semibold">
                    {label}
                </label>
            )}
            <div className="relative w-full">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4c739a] dark:text-slate-400">
                        <Icon size={20} />
                    </div>
                )}
                <input
                    ref={ref}
                    type={type}
                    className={cn(
                        'flex w-full rounded-xl border bg-white dark:bg-gray-800 h-12 px-4 text-base text-slate-900 dark:text-white placeholder:text-[#93adc8] dark:placeholder:text-slate-500 transition-all',
                        Icon ? 'pl-11' : '',
                        showPasswordToggle ? 'pr-11' : '',
                        error
                            ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/30'
                            : 'border-[#cfdbe7] dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/20',
                        className
                    )}
                    {...props}
                />
                {showPasswordToggle && onTogglePassword && (
                    <button
                        type="button"
                        onClick={onTogglePassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4c739a] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        aria-label="Toggle password visibility"
                    >
                        {type === 'password' ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                )}
            </div>
            {error && (
                <p className="text-red-500 text-xs mt-1">{error}</p>
            )}
        </div>
    )
})

Input.displayName = 'Input'

export default Input
