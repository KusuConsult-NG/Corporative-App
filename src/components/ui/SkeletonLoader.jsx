import React from 'react'

/**
 * Reusable skeleton loader component for consistent loading states
 * 
 * @param {Object} props
 * @param {number} props.count - Number of skeleton rows to display (default: 4)
 * @param {string} props.height - Height of each skeleton row (default: 'h-20')
 * @param {string} props.className - Additional CSS classes
 */
export default function SkeletonLoader({
    count = 4,
    height = 'h-20',
    className = ''
}) {
    return (
        <div className={`animate-pulse space-y-3 ${className}`}>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className={`${height} bg-slate-200 dark:bg-slate-700 rounded-xl`}
                />
            ))}
        </div>
    )
}

/**
 * Skeleton loader for stat cards
 */
export function SkeletonStatCard() {
    return (
        <div className="animate-pulse">
            <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        </div>
    )
}

/**
 * Skeleton loader for table rows
 */
export function SkeletonTable({ rows = 5, columns = 5 }) {
    return (
        <div className="animate-pulse space-y-2">
            {/* Table header */}
            <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg" />

            {/* Table rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div
                            key={colIndex}
                            className="flex-1 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg"
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}

/**
 * Skeleton loader for charts
 */
export function SkeletonChart({ height = 'h-64' }) {
    return (
        <div className={`animate-pulse ${height} bg-slate-200 dark:bg-slate-700 rounded-2xl`} />
    )
}
