import { FileQuestion, Inbox, Search, AlertCircle } from 'lucide-react'
import Button from './Button'

export default function EmptyState({
    icon: Icon = Inbox,
    title = 'No data found',
    description = 'There is nothing to display yet.',
    action,
    actionLabel,
    variant = 'default'
}) {
    const iconColors = {
        default: 'text-slate-400 dark:text-slate-500',
        search: 'text-blue-400 dark:text-blue-500',
        error: 'text-red-400 dark:text-red-500',
        success: 'text-green-400 dark:text-green-500',
    }

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className={`p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4 ${iconColors[variant]}`}>
                <Icon size={48} />
            </div>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {title}
            </h3>

            <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
                {description}
            </p>

            {action && actionLabel && (
                <Button onClick={action}>
                    {actionLabel}
                </Button>
            )}
        </div>
    )
}

// Pre-configured variants
export function EmptySearchState({ searchTerm, onClear }) {
    return (
        <EmptyState
            icon={Search}
            variant="search"
            title="No results found"
            description={`No results match "${searchTerm}". Try different keywords or clear your search.`}
            action={onClear}
            actionLabel="Clear Search"
        />
    )
}

export function EmptyListState({ title, description, onCreate, createLabel }) {
    return (
        <EmptyState
            icon={Inbox}
            title={title || 'No items yet'}
            description={description || 'Get started by creating your first item.'}
            action={onCreate}
            actionLabel={createLabel || 'Create New'}
        />
    )
}

export function ErrorState({ error, onRetry }) {
    return (
        <EmptyState
            icon={AlertCircle}
            variant="error"
            title="Something went wrong"
            description={error || 'An error occurred while loading data. Please try again.'}
            action={onRetry}
            actionLabel="Try Again"
        />
    )
}

export function NoDataState({ message }) {
    return (
        <EmptyState
            icon={FileQuestion}
            title="No data available"
            description={message || 'There is no data to display at this time.'}
        />
    )
}
