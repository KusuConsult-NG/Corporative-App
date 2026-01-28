import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Check approval status and redirect accordingly
export default function ProtectedRoute({ children }) {
    const { user, isAuthenticated } = useAuthStore()

    // Not logged in -> redirect to auth
    if (!isAuthenticated || !user) {
        return <Navigate to="/auth" replace />
    }

    // Check email verification
    if (!user.emailVerified) {
        return <Navigate to="/email-verification-pending" replace />
    }

    // Check approval status
    if (user.approvalStatus === 'pending') {
        return <Navigate to="/approval-pending" replace />
    }

    if (user.approvalStatus === 'rejected') {
        return <Navigate to="/registration-rejected" replace />
    }

    // Check registration fee
    if (!user.registrationFeePaid) {
        return <Navigate to="/registration-fee" replace />
    }

    // All checks passed - render children
    return children
}
