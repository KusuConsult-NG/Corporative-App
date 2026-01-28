import { useState } from 'react'
import { X, Lock, Eye, EyeOff } from 'lucide-react'
import Button from './Button'
import Input from './Input'
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { auth } from '../../lib/firebase'

export default function ChangePasswordModal({ isOpen, onClose }) {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        setError('')
    }

    const validatePassword = (password) => {
        if (password.length < 8) {
            return 'Password must be at least 8 characters long'
        }
        if (!/(?=.*[a-z])/.test(password)) {
            return 'Password must contain at least one lowercase letter'
        }
        if (!/(?=.*[A-Z])/.test(password)) {
            return 'Password must contain at least one uppercase letter'
        }
        if (!/(?=.*\d)/.test(password)) {
            return 'Password must contain at least one number'
        }
        return null
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess(false)

        // Validation
        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            setError('All fields are required')
            return
        }

        const passwordError = validatePassword(formData.newPassword)
        if (passwordError) {
            setError(passwordError)
            return
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError('New passwords do not match')
            return
        }

        if (formData.currentPassword === formData.newPassword) {
            setError('New password must be different from current password')
            return
        }

        setLoading(true)

        try {
            const user = auth.currentUser

            if (!user || !user.email) {
                throw new Error('No user is currently signed in')
            }

            // Reauthenticate first (required by Firebase for sensitive operations)
            const credential = EmailAuthProvider.credential(
                user.email,
                formData.currentPassword
            )

            await reauthenticateWithCredential(user, credential)

            // Update password
            await updatePassword(user, formData.newPassword)

            setSuccess(true)
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            })

            // Close modal after 2 seconds
            setTimeout(() => {
                onClose()
                setSuccess(false)
            }, 2000)

        } catch (error) {
            console.error('Password change error:', error)

            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setError('Current password is incorrect')
            } else if (error.code === 'auth/weak-password') {
                setError('Password is too weak. Please use a stronger password.')
            } else if (error.code === 'auth/requires-recent-login') {
                setError('For security, please log out and log back in before changing your password')
            } else {
                setError(error.message || 'Failed to change password. Please try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                            <Lock size={20} className="text-orange-600 dark:text-orange-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            Change Password
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {success && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-800 dark:text-green-200">
                            ✅ Password changed successfully!
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-200">
                            {error}
                        </div>
                    )}

                    {/* Current Password */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Current Password
                        </label>
                        <div className="relative">
                            <Input
                                type={showPasswords.current ? 'text' : 'password'}
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                placeholder="Enter current password"
                                disabled={loading}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            New Password
                        </label>
                        <div className="relative">
                            <Input
                                type={showPasswords.new ? 'text' : 'password'}
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                placeholder="Enter new password"
                                disabled={loading}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Must be at least 8 characters with uppercase, lowercase, and number
                        </p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <Input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Re-enter new password"
                                disabled={loading}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? 'Changing...' : 'Change Password'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
