import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/formatters'

const Select = forwardRef(({
    label,
    error,
    icon: Icon,
    options = [],
    className,
    placeholder = 'Select an option',
    ...props
}, ref) => {
    return (
        <div className="flex flex-col gap-2 w-full">
            {label && (
                <label
                    htmlFor={props.id || props.name}
                    className="text-slate-900 dark:text-gray-200 text-sm font-semibold"
                >
                    {label}
                </label>
            )}
            <div className="relative w-full">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4c739a] dark:text-slate-400 pointer-events-none">
                        <Icon size={20} />
                    </div>
                )}
                <select
                    ref={ref}
                    id={props.id || props.name}
                    className={cn(
                        'flex w-full rounded-xl border bg-white dark:bg-gray-800 h-12 px-4 text-base text-slate-900 dark:text-white transition-all appearance-none',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        Icon ? 'pl-11' : '',
                        error
                            ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/30'
                            : 'border-[#cfdbe7] dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/20',
                        className
                    )}
                    {...props}
                >
                    <option value="" disabled selected={!props.value}>
                        {placeholder}
                    </option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4c739a] dark:text-slate-400 pointer-events-none">
                    <ChevronDown size={20} />
                </div>
            </div>
            {error && (
                <p className="text-red-500 text-xs mt-1">{error}</p>
            )}
        </div>
    )
})

Select.displayName = 'Select'

export default Select
