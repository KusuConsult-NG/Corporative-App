export const NotificationBadge = ({ count, className = '' }) => {
    if (!count || count === 0) return null

    const displayCount = count > 99 ? '99+' : count

    return (
        <span className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ${className}`}>
            {displayCount}
        </span>
    )
}

export default NotificationBadge
