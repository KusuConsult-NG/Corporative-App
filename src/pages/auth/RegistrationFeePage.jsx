import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PaystackButton } from 'react-paystack'
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { canAccessAdmin } from '../../utils/permissions'
import { auth } from '../../lib/firebase'
import Button from '../../components/ui/Button'

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY

export default function RegistrationFeePage() {
    const navigate = useNavigate()
    const { user, updateRegistrationFeePayment } = useAuthStore()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const amount = 200000 // ₦2,000 in kobo
    const currentUser = auth.currentUser

    // If already paid, redirect to dashboard
    useEffect(() => {
        if (user?.registrationFeePaid) {
            navigate(canAccessAdmin(user) ? '/admin/dashboard' : '/member/dashboard')
        }
    }, [user, navigate])

    const componentProps = {
        email: user?.email || currentUser?.email || '',
        amount: amount,
        currency: 'NGN',
        metadata: {
            name: user?.name || 'User',
            phone: user?.phone || '',
            custom_fields: [
                {
                    display_name: 'Payment Type',
                    variable_name: 'payment_type',
                    value: 'Registration Fee'
                },
                {
                    display_name: 'User ID',
                    variable_name: 'user_id',
                    value: currentUser?.uid || ''
                }
            ]
        },
        publicKey: PAYSTACK_PUBLIC_KEY,
        text: 'Pay ₦2,000',
        onSuccess: async (reference) => {
            setLoading(true)
            setError('')

            try {
                // Update user payment status
                const result = await updateRegistrationFeePayment(
                    currentUser?.uid,
                    reference.reference
                )

                if (result.success) {
                    // Navigate to dashboard after short delay
                    setTimeout(() => {
                        navigate('/member/dashboard')
                    }, 2000)
                } else {
                    setError('Payment recorded but failed to update account. Please contact support.')
                }
            } catch (err) {
                setError('Payment successful but failed to update account. Please contact support.')
            } finally {
                setLoading(false)
            }
        },
        onClose: () => {
            // Payment modal closed
            setError('Payment cancelled. Please complete payment to continue.')
        },
    }

    if (!PAYSTACK_PUBLIC_KEY || PAYSTACK_PUBLIC_KEY === 'undefined') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                    <div className="text-center">
                        <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Payment System Not Configured
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            Please contact support to complete your registration.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                        <CreditCard className="text-blue-600 dark:text-blue-400" size={32} />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Complete Your Registration
                    </h1>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Pay the one-time registration fee to activate your account
                    </p>

                    {/* Registration Fee Details */}
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 mb-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Registration Fee
                        </p>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                            ₦2,000
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                            One-time payment
                        </p>
                    </div>

                    {/* Benefits */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            What you'll get access to:
                        </p>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                            <li className="flex items-start gap-2">
                                <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={16} />
                                <span>Apply for loans with competitive interest rates</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={16} />
                                <span>Access savings and investment opportunities</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={16} />
                                <span>Order commodities at member prices</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={16} />
                                <span>Full member benefits and welfare support</span>
                            </li>
                        </ul>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                            <CheckCircle size={20} />
                            <span className="text-sm">Payment successful! Redirecting...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <PaystackButton
                                {...componentProps}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                            />

                            <Button
                                variant="outline"
                                onClick={() => {
                                    auth.signOut()
                                    navigate('/')
                                }}
                                className="w-full"
                            >
                                Cancel & Logout
                            </Button>
                        </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Secured by Paystack</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
