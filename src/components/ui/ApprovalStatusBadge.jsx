export default function ApprovalStatusBadge({ status }) {
    const statusConfig = {
        pending: {
            bg: 'bg-yellow-100 dark:bg-yellow-900/30',
            text: 'text-yellow-700 dark:text-yellow-400',
            label: 'Pending Review'
        },
        approved: {
            bg: 'bg-green-100 dark:bg-green-900/30',
            text: 'text-green-700 dark:text-green-400',
            label: 'Approved'
        },
        rejected: {
            bg: 'bg-red-100 dark:bg-red-900/30',
            text: 'text-red-700 dark:text-red-400',
            label: 'Rejected'
        }
    }

    const config = statusConfig[status] || statusConfig.pending

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
        </span>
    )
}
