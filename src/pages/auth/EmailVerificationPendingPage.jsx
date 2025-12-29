import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, RefreshCw, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/ui/Button'

export default function EmailVerificationPendingPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { resendVerificationEmail } = useAuthStore()

    const [loading, setLoading] = useState(false)
    const [resent, setResent] = useState(false)
    const [error, setError] = useState('')

    // Get email from location state (passed from registration)
    const email = location.state?.email || ''

    const handleResend = async () => {
        if (!email) {
            setError('Email address not found. Please try registering again.')
            return
        }

        setLoading(true)
        setError('')

        const result = await resendVerificationEmail(email)

        setLoading(false)

        if (result.success) {
            setResent(true)
            setTimeout(() => setResent(false), 5000) // Reset after 5 seconds
        } else {
            setError(result.error || 'Failed to resend email')
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                        <Mail className="text-blue-600 dark:text-blue-400" size={32} />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Verify Your Email
                    </h1>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        We've sent a verification link to:
                    </p>

                    {email && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-6">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {email}
                            </p>
                        </div>
                    )}

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                            <strong>Next steps:</strong>
                        </p>
                        <ol className="text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside space-y-1">
                            <li>Check your email inbox</li>
                            <li>Click the verification link</li>
                            <li>Complete your registration fee payment</li>
                        </ol>
                    </div>

                    {resent && (
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                            <CheckCircle size={20} />
                            <span className="text-sm">Verification email sent!</span>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={handleResend}
                            loading={loading}
                            disabled={resent}
                            className="w-full"
                        >
                            <RefreshCw size={18} />
                            <span>{resent ? 'Email Sent!' : 'Resend Verification Email'}</span>
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => navigate('/')}
                            className="w-full"
                        >
                            Back to Login
                        </Button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                            Didn't receive the email? Check your spam folder or click the resend button above.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
