import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const TIMEOUT_DURATION = 30 * 60 * 1000  // 30 minutes of inactivity
const WARNING_DURATION = 5 * 60 * 1000   // 5 minutes before timeout

/**
 * Hook to track user activity and auto-logout on inactivity
 * Shows warning 5 minutes before timeout
 */
export function useSessionTimeout() {
    const [showWarning, setShowWarning] = useState(false)
    const [remainingTime, setRemainingTime] = useState(WARNING_DURATION)
    const { logout, isAuthenticated } = useAuthStore()

    const resetTimer = useCallback(() => {
        setShowWarning(false)
        setRemainingTime(WARNING_DURATION)
    }, [])

    useEffect(() => {
        if (!isAuthenticated) return

        let timeoutId
        let warningId
        let countdownInterval

        const startTimers = () => {
            clearTimeout(timeoutId)
            clearTimeout(warningId)
            clearInterval(countdownInterval)
            setShowWarning(false)

            // Set warning timer (25 minutes from now)
            warningId = setTimeout(() => {
                setShowWarning(true)
                setRemainingTime(WARNING_DURATION)

                // Start countdown
                countdownInterval = setInterval(() => {
                    setRemainingTime(prev => {
                        if (prev <= 1000) {
                            clearInterval(countdownInterval)
                            return 0
                        }
                        return prev - 1000
                    })
                }, 1000)
            }, TIMEOUT_DURATION - WARNING_DURATION)

            // Set logout timer (30 minutes from now)
            timeoutId = setTimeout(() => {
                logout()
                setShowWarning(false)
            }, TIMEOUT_DURATION)
        }

        // Track user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

        events.forEach(event => {
            document.addEventListener(event, startTimers, { passive: true })
        })

        // Start initial timers
        startTimers()

        // Cleanup
        return () => {
            clearTimeout(timeoutId)
            clearTimeout(warningId)
            clearInterval(countdownInterval)
            events.forEach(event => {
                document.removeEventListener(event, startTimers)
            })
        }
    }, [isAuthenticated, logout])

    const extendSession = useCallback(() => {
        resetTimer()
    }, [resetTimer])

    // Format remaining time as MM:SS
    const formatTime = (ms) => {
        const minutes = Math.floor(ms / 60000)
        const seconds = Math.floor((ms % 60000) / 1000)
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    return {
        showWarning,
        remainingTime: formatTime(remainingTime),
        extendSession
    }
}
