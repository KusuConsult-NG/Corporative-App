export default function GuarantorStatusBadge({ status, approved, required }) {
    // If provided approved/required counts
    if (typeof approved === 'number' && typeof required === 'number') {
        const allApproved = approved >= required
        const statusText = `${approved}/${required}`

        return (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${allApproved
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                }`}>
                <span>{statusText}</span>
                <span>{allApproved ? '✓' : '⏳'}</span>
            </div>
        )
    }

    // Individual guarantor status
    const config = {
        pending: {
            color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
            label: 'Pending'
        },
        approved: {
            color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
            label: 'Approved'
        },
        rejected: {
            color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
            label: 'Rejected'
        }
    }

    const { color, label } = config[status] || config.pending

    return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${color}`}>
            {label}
        </span>
    )
}
