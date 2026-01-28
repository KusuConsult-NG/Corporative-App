import { Link } from 'react-router-dom'
import { prefetchRoute } from '../hooks/usePrefetch'

/**
 * Link component that prefetches the route on hover
 * Provides instant navigation by loading the component before click
 */
export default function PrefetchLink({
    to,
    lazyComponent,
    routeName,
    onMouseEnter,
    children,
    ...props
}) {
    const handleMouseEnter = (e) => {
        if (lazyComponent && routeName) {
            prefetchRoute(lazyComponent, routeName)
        }
        onMouseEnter?.(e)
    }

    return (
        <Link
            to={to}
            onMouseEnter={handleMouseEnter}
            {...props}
        >
            {children}
        </Link>
    )
}
