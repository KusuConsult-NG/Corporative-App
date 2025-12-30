import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type, duration }])

        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id))
            }, duration)
        }
    }, [])

    const hideToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const success = useCallback((message, duration) => showToast(message, 'success', duration), [showToast])
    const error = useCallback((message, duration) => showToast(message, 'error', duration), [showToast])
    const warning = useCallback((message, duration) => showToast(message, 'warning', duration), [showToast])
    const info = useCallback((message, duration) => showToast(message, 'info', duration), [showToast])

    return (
        <ToastContext.Provider value={{ showToast, hideToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} onClose={hideToast} />
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within ToastProvider')
    }
    return context
}

function ToastContainer({ toasts, onClose }) {
    if (toasts.length === 0) return null

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
            ))}
        </div>
    )
}

function Toast({ toast, onClose }) {
    const icons = {
        success: CheckCircle,
        error: XCircle,
        warning: AlertCircle,
        info: Info
    }

    const colors = {
        success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
        error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
        warning: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200',
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
    }

    const iconColors = {
        success: 'text-green-600 dark:text-green-400',
        error: 'text-red-600 dark:text-red-400',
        warning: 'text-orange-600 dark:text-orange-400',
        info: 'text-blue-600 dark:text-blue-400'
    }

    const Icon = icons[toast.type]

    return (
        <div
            className={`
                pointer-events-auto
                flex items-start gap-3 p-4 rounded-lg border shadow-lg
                animate-slideInRight
                ${colors[toast.type]}
            `}
        >
            <Icon className={`shrink-0 ${iconColors[toast.type]}`} size={20} />
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
                onClick={onClose}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                aria-label="Close notification"
            >
                <X size={16} />
            </button>
        </div>
    )
}
