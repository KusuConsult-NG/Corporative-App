import { useState } from 'react'
import { X, Shield, Key } from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../lib/firebase'
import Button from './ui/Button'
import Input from './ui/Input'

const functions = getFunctions(app)

export default function TwoFactorVerificationModal({ onVerified, onCancel }) {
    const [verificationCode, setVerificationCode] = useState('')
    const [useBackupCode, setUseBackupCode] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleVerify = async () => {
        if (!verificationCode) {
            setError('Please enter a verification code')
            return
        }

        if (!useBackupCode && verificationCode.length !== 6) {
            setError('Please enter a valid 6-digit code')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const verify2FA = httpsCallable(functions, 'verify2FA')
            const result = await verify2FA({
                token: verificationCode,
                isBackupCode: useBackupCode
            })

            if (result.data.success) {
                onVerified()
            }
        } catch (err) {
            console.error('Error verifying 2FA:', err)
            setError(
                useBackupCode
                    ? 'Invalid backup code. Please try again.'
                    : 'Invalid verification code. Please try again.'
            )
        } finally {
            setLoading(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleVerify()
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                {/* Close button */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Shield size={32} className="text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Two-Factor Authentication
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">
                        {useBackupCode
                            ? 'Enter one of your backup codes'
                            : 'Enter the 6-digit code from your authenticator app'}
                    </p>
                </div>

                {/* Input */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            {useBackupCode ? 'Backup Code' : 'Verification Code'}
                        </label>
                        <Input
                            type="text"
                            placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
                            value={verificationCode}
                            onChange={(e) => {
                                const value = useBackupCode
                                    ? e.target.value.toUpperCase()
                                    : e.target.value.replace(/\D/g, '').slice(0, 6)
                                setVerificationCode(value)
                            }}
                            onKeyPress={handleKeyPress}
                            maxLength={useBackupCode ? 9 : 6}
                            className="text-center text-2xl font-mono tracking-widest"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Toggle backup code */}
                    <button
                        onClick={() => {
                            setUseBackupCode(!useBackupCode)
                            setVerificationCode('')
                            setError(null)
                        }}
                        className="text-sm text-primary hover:text-primary-dark transition-colors flex items-center gap-2"
                    >
                        <Key size={16} />
                        {useBackupCode ? 'Use authenticator code' : 'Use backup code'}
                    </button>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="ghost"
                            onClick={onCancel}
                            className="flex-1"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleVerify}
                            loading={loading}
                            disabled={!verificationCode}
                            className="flex-1"
                        >
                            Verify
                        </Button>
                    </div>
                </div>

                {/* Help text */}
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        Lost your device? Contact the super admin for assistance.
                    </p>
                </div>
            </div>
        </div>
    )
}
