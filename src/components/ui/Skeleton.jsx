export default function Skeleton({ className = '', variant = 'default', ...props }) {
    const variants = {
        default: 'h-4 w-full',
        circle: 'rounded-full',
        button: 'h-10 w-24',
        card: 'h-48 w-full',
        text: 'h-4 w-3/4',
        avatar: 'h-12 w-12 rounded-full',
        input: 'h-10 w-full',
    }

    return (
        <div
            className={`
                animate-pulse bg-slate-200 dark:bg-slate-700 rounded
                ${variants[variant]}
                ${className}
            `}
            {...props}
        />
    )
}

export function SkeletonCard() {
    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4 mb-4">
                <Skeleton variant="avatar" />
                <div className="flex-1 space-y-2">
                    <Skeleton variant="text" className="w-1/2" />
                    <Skeleton variant="text" className="w-1/3" />
                </div>
            </div>
            <Skeleton variant="default" className="mb-2" />
            <Skeleton variant="default" className="w-3/4" />
        </div>
    )
}

export function SkeletonTable({ rows = 5 }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                    <Skeleton variant="avatar" />
                    <div className="flex-1 space-y-2">
                        <Skeleton variant="default" />
                        <Skeleton variant="text" className="w-2/3" />
                    </div>
                    <Skeleton variant="button" />
                </div>
            ))}
        </div>
    )
}

export function SkeletonDashboard() {
    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
            {/* Header Skeleton */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-4">
                            <Skeleton variant="circle" className="h-14 w-14" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <SkeletonTable rows={5} />
            </div>
        </div>
    )
}
