import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const ToastContext = createContext(null)

export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now().toString()
        setToasts((prev) => [...prev, { id, message, type }])

        if (duration) {
            setTimeout(() => {
                removeToast(id)
            }, duration)
        }
    }, [])

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, [])

    const success = (message, duration) => addToast(message, 'success', duration)
    const error = (message, duration) => addToast(message, 'error', duration)
    const info = (message, duration) => addToast(message, 'info', duration)
    const warning = (message, duration) => addToast(message, 'warning', duration)

    return (
        <ToastContext.Provider value={{ success, error, info, warning, removeToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm min-w-[300px] max-w-md animate-toast-slide-in transition-all duration-300
                            ${toast.type === 'success' ? 'bg-green-50/90 dark:bg-green-900/90 border-green-200 dark:border-green-800 text-green-800 dark:text-green-100' : ''}
                            ${toast.type === 'error' ? 'bg-red-50/90 dark:bg-red-900/90 border-red-200 dark:border-red-800 text-red-800 dark:text-red-100' : ''}
                            ${toast.type === 'warning' ? 'bg-orange-50/90 dark:bg-orange-900/90 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-100' : ''}
                            ${toast.type === 'info' ? 'bg-blue-50/90 dark:bg-blue-900/90 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-100' : ''}
                        `}
                    >
                        <div className="shrink-0">
                            {toast.type === 'success' && <CheckCircle size={20} />}
                            {toast.type === 'error' && <AlertCircle size={20} />}
                            {toast.type === 'warning' && <AlertTriangle size={20} />}
                            {toast.type === 'info' && <Info size={20} />}
                        </div>
                        <p className="text-sm font-medium flex-1">{toast.message}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
