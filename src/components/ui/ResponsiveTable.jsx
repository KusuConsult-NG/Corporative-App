import { cn } from '../../utils/formatters'

export default function ResponsiveTable({ children, className, ...props }) {
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 sm:rounded-lg">
                    <table
                        className={cn("min-w-full divide-y divide-slate-200 dark:divide-slate-700", className)}
                        {...props}
                    >
                        {children}
                    </table>
                </div>
            </div>
        </div>
    )
}

// Table components for better organization
export function TableHeader({ children, className }) {
    return (
        <thead className={cn("bg-slate-50 dark:bg-slate-800/50", className)}>
            {children}
        </thead>
    )
}

export function TableBody({ children, className }) {
    return (
        <tbody className={cn("divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800", className)}>
            {children}
        </tbody>
    )
}

export function TableRow({ children, className, hoverable = true, ...props }) {
    return (
        <tr
            className={cn(
                hoverable && "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                className
            )}
            {...props}
        >
            {children}
        </tr>
    )
}

export function TableHead({ children, className, ...props }) {
    return (
        <th
            className={cn(
                "px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider",
                className
            )}
            {...props}
        >
            {children}
        </th>
    )
}

export function TableCell({ children, className, ...props }) {
    return (
        <td
            className={cn(
                "px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap",
                className
            )}
            {...props}
        >
            {children}
        </td>
    )
}
