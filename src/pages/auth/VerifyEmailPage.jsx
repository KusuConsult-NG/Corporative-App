import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/ui/Button'

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { verifyEmail } = useAuthStore()

    const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
    const [message, setMessage] = useState('')
    const [verifiedEmail, setVerifiedEmail] = useState('')

    useEffect(() => {
        const token = searchParams.get('token')

        if (!token) {
            setStatus('error')
            setMessage('Invalid verification link')
            return
        }

        const verify = async () => {
            const result = await verifyEmail(token)

            if (result.success) {
                setStatus('success')
                setVerifiedEmail(result.email)
                setMessage('Your email has been verified successfully!')

                // Redirect to login page after 3 seconds with success state
                setTimeout(() => {
                    navigate('/auth', {
                        state: {
                            verified: true,
                            message: 'Email verified successfully! You can now login to complete your registration.'
                        }
                    })
                }, 3000)
            } else {
                setStatus('error')
                setMessage(result.error || 'Verification failed')
            }
        }

        verify()
    }, [searchParams, verifyEmail, navigate])

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                {status === 'verifying' && (
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                            <Loader className="text-blue-600 dark:text-blue-400 animate-spin" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Verifying Email
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Please wait while we verify your email address...
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                            <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Email Verified!
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {message}
                        </p>
                        {verifiedEmail && (
                            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                                {verifiedEmail}
                            </p>
                        )}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                Redirecting to payment page in 3 seconds...
                            </p>
                        </div>
                        <Button onClick={() => navigate('/registration-fee')} className="w-full">
                            Continue to Payment
                        </Button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                            <XCircle className="text-red-600 dark:text-red-400" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Verification Failed
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {message}
                        </p>
                        <div className="flex flex-col gap-3">
                            <Button onClick={() => navigate('/email-verification-pending')} className="w-full">
                                Resend Verification Email
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigate('/')}
                                className="w-full"
                            >
                                Back to Login
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
