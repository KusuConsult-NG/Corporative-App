import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { useAuthStore } from './store/authStore'
import { ToastProvider } from './context/ToastContext'

// Check for existing session on app load
const AppWithAuth = () => {
    const checkSession = useAuthStore((state) => state.checkSession)

    useEffect(() => {
        checkSession()
    }, [])

    return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ToastProvider>
            <AppWithAuth />
        </ToastProvider>
    </React.StrictMode>,
)
