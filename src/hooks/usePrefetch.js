import { useEffect } from 'react'

// Prefetch routes on hover or programmatically
const prefetchedRoutes = new Set()

/**
 * Prefetch a lazy-loaded component
 * @param {Function} lazyComponent - React.lazy() component
 * @param {string} routeName - Route name for tracking
 */
export function prefetchRoute(lazyComponent, routeName) {
    if (prefetchedRoutes.has(routeName)) {
        return // Already prefetched
    }

    try {
        // Trigger the lazy load
        lazyComponent._payload._result
            ? Promise.resolve()
            : lazyComponent._init(lazyComponent._payload)

        prefetchedRoutes.add(routeName)
        console.log(`✅ Prefetched route: ${routeName}`)
    } catch (error) {
        console.warn(`Failed to prefetch ${routeName}:`, error)
    }
}

/**
 * Hook to prefetch routes on component mount
 * @param {Object} routes - Map of route names to lazy components
 */
export function usePrefetchRoutes(routes) {
    useEffect(() => {
        // Small delay to avoid blocking initial render
        const timer = setTimeout(() => {
            Object.entries(routes).forEach(([name, component]) => {
                prefetchRoute(component, name)
            })
        }, 500)

        return () => clearTimeout(timer)
    }, [routes])
}

/**
 * Hook to prefetch routes when user is idle
 * @param {Object} routes - Map of route names to lazy components
 * @param {number} delay - Delay in ms before prefetching (default: 1000ms)
 */
export function usePrefetchOnIdle(routes, delay = 1000) {
    useEffect(() => {
        // Use requestIdleCallback if available, otherwise setTimeout
        const prefetchWhenIdle = () => {
            Object.entries(routes).forEach(([name, component]) => {
                prefetchRoute(component, name)
            })
        }

        if ('requestIdleCallback' in window) {
            const id = requestIdleCallback(() => {
                setTimeout(prefetchWhenIdle, delay)
            })
            return () => cancelIdleCallback(id)
        } else {
            const timer = setTimeout(prefetchWhenIdle, delay)
            return () => clearTimeout(timer)
        }
    }, [routes, delay])
}

/**
 * Prefetch multiple routes based on user role
 * @param {string} role - User role (admin/member)
 */
export function prefetchRoleBasedRoutes(role, lazyComponents) {
    const routesToPrefetch = role === 'admin'
        ? lazyComponents.admin
        : lazyComponents.member

    Object.entries(routesToPrefetch).forEach(([name, component]) => {
        prefetchRoute(component, name)
    })
}

/**
 * Clear prefetch cache (useful for testing)
 */
export function clearPrefetchCache() {
    prefetchedRoutes.clear()
    console.log('🗑️ Prefetch cache cleared')
}
