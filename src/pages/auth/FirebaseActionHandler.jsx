import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader, Key } from 'lucide-react'
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth'
import { auth, db } from '../../lib/firebase'
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { createAuditLog, AUDIT_ACTIONS, AUDIT_SEVERITY } from '../../services/auditService'

/**
 * Firebase Action Handler
 * Handles Firebase auth action URLs like:
 * - /__/auth/action?mode=verifyEmail&oobCode=...
 * - /__/auth/action?mode=resetPassword&oobCode=...
 */
export default function FirebaseActionHandler() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const mode = searchParams.get('mode')
    const oobCode = searchParams.get('oobCode')
    const continueUrl = searchParams.get('continueUrl')

    const [status, setStatus] = useState('processing') // 'processing' | 'success' | 'error'
    const [message, setMessage] = useState('')
    const [email, setEmail] = useState('')

    // Password reset specific state
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [resettingPassword, setResettingPassword] = useState(false)

    useEffect(() => {
        if (!mode || !oobCode) {
            setStatus('error')
            setMessage('Invalid action link. Please request a new one.')
            return
        }

        if (mode === 'verifyEmail') {
            handleEmailVerification()
        } else if (mode === 'resetPassword') {
            handlePasswordResetVerification()
        } else {
            setStatus('error')
            setMessage('Unknown action mode')
        }
    }, [mode, oobCode])

    const handleEmailVerification = async () => {
        try {
            setStatus('processing')
            setMessage('Verifying your email address...')

            // Apply the verification code
            await applyActionCode(auth, oobCode)

            // Get the current user from the action code
            // The user should be signed out at this point, so we need to find them by email
            const currentUser = auth.currentUser

            if (currentUser) {
                // Update Firestore document
                const userQuery = query(
                    collection(db, 'users'),
                    where('userId', '==', currentUser.uid)
                )
                const querySnapshot = await getDocs(userQuery)

                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0]
                    await updateDoc(doc(db, 'users', userDoc.id), {
                        emailVerified: true,
                        emailVerificationToken: null,
                        emailVerificationExpiry: null
                    })

                    // Log successful verification
                    await createAuditLog({
                        userId: currentUser.uid,
                        action: AUDIT_ACTIONS.EMAIL_VERIFIED,
                        resource: 'auth',
                        resourceId: currentUser.uid,
                        details: { email: currentUser.email },
                        severity: AUDIT_SEVERITY.INFO
                    }).catch(err => console.warn('Audit log failed:', err.message))
                }
            }

            setStatus('success')
            setMessage('Email verified successfully!')

            // Redirect after 3 seconds
            setTimeout(() => {
                if (continueUrl) {
                    window.location.href = continueUrl
                } else {
                    navigate('/registration-fee')
                }
            }, 3000)

        } catch (error) {
            console.error('Email verification error:', error)
            setStatus('error')

            if (error.code === 'auth/invalid-action-code') {
                setMessage('This verification link has expired or has already been used. Please request a new one.')
            } else if (error.code === 'auth/expired-action-code') {
                setMessage('This verification link has expired. Please request a new one.')
            } else {
                setMessage(error.message || 'Verification failed. Please try again.')
            }
        }
    }

    const handlePasswordResetVerification = async () => {
        try {
            setStatus('processing')
            setMessage('Verifying password reset link...')

            // Verify the password reset code and get the email
            const userEmail = await verifyPasswordResetCode(auth, oobCode)
            setEmail(userEmail)

            setStatus('reset-form')
            setMessage('Please enter your new password')

        } catch (error) {
            console.error('Password reset verification error:', error)
            setStatus('error')

            if (error.code === 'auth/invalid-action-code') {
                setMessage('This password reset link has expired or has already been used. Please request a new one.')
            } else if (error.code === 'auth/expired-action-code') {
                setMessage('This password reset link has expired. Please request a new one.')
            } else {
                setMessage(error.message || 'Invalid password reset link.')
            }
        }
    }

    const handlePasswordReset = async (e) => {
        e.preventDefault()

        if (newPassword !== confirmPassword) {
            setMessage('Passwords do not match')
            return
        }

        if (newPassword.length < 6) {
            setMessage('Password must be at least 6 characters')
            return
        }

        try {
            setResettingPassword(true)
            setMessage('Resetting your password...')

            await confirmPasswordReset(auth, oobCode, newPassword)

            setStatus('success')
            setMessage('Password reset successfully! You can now log in with your new password.')

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/auth')
            }, 3000)

        } catch (error) {
            console.error('Password reset error:', error)
            setStatus('error')
            setMessage(error.message || 'Failed to reset password. Please try again.')
        } finally {
            setResettingPassword(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                {status === 'processing' && (
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                            <Loader className="text-blue-600 dark:text-blue-400 animate-spin" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {mode === 'verifyEmail' ? 'Verifying Email' : 'Verifying Link'}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {message}
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                            <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Success!
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {message}
                        </p>
                        {email && (
                            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                                {email}
                            </p>
                        )}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                Redirecting in 3 seconds...
                            </p>
                        </div>
                        <Button
                            onClick={() => mode === 'verifyEmail' ? navigate('/registration-fee') : navigate('/auth')}
                            className="w-full"
                        >
                            Continue
                        </Button>
                    </div>
                )}

                {status === 'reset-form' && (
                    <div>
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                                <Key className="text-blue-600 dark:text-blue-400" size={32} />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Reset Password
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                {message}
                            </p>
                            {email && (
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                                    {email}
                                </p>
                            )}
                        </div>

                        <form onSubmit={handlePasswordReset} className="space-y-4">
                            <Input
                                type="password"
                                label="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                required
                                minLength={6}
                            />
                            <Input
                                type="password"
                                label="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                                minLength={6}
                            />
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={resettingPassword}
                            >
                                {resettingPassword ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </form>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                            <XCircle className="text-red-600 dark:text-red-400" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {mode === 'verifyEmail' ? 'Verification Failed' : 'Reset Failed'}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {message}
                        </p>
                        <div className="flex flex-col gap-3">
                            <Button onClick={() => navigate('/email-verification-pending')} className="w-full">
                                Request New Link
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigate('/auth')}
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
