export default function LoadingSkeleton({ variant = 'default' }) {
    if (variant === 'dashboard') {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6 animate-pulse">
                {/* Header skeleton */}
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>

                {/* Stats grid skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-3"></div>
                            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        </div>
                    ))}
                </div>

                {/* Content skeleton */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700/50 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (variant === 'table') {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6 animate-pulse">
                <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-6"></div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700/50 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (variant === 'form') {
        return (
            <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6 animate-pulse">
                <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-6"></div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="space-y-2">
                            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                            <div className="h-10 w-full bg-slate-100 dark:bg-slate-700/50 rounded"></div>
                        </div>
                    ))}
                    <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded mt-6"></div>
                </div>
            </div>
        )
    }

    // Default variant - simple centered spinner
    return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
            <div className="text-center space-y-4">
                <div className="relative inline-block">
                    <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 border-t-primary rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Loading...</p>
            </div>
        </div>
    )
}
