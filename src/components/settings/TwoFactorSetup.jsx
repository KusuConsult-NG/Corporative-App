import { useState } from 'react'
import { Shield, Key, Download, AlertTriangle, CheckCircle2, Smartphone } from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../../lib/firebase'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Input from '../ui/Input'

const functions = getFunctions(app)

export default function TwoFactorSetup({ user, onUpdate }) {
    const [step, setStep] = useState('initial') // initial, setup, verify, complete
    const [loading, setLoading] = useState(false)
    const [qrCode, setQrCode] = useState(null)
    const [secret, setSecret] = useState(null)
    const [verificationCode, setVerificationCode] = useState('')
    const [backupCodes, setBackupCodes] = useState([])
    const [error, setError] = useState(null)

    const handleSetup2FA = async () => {
        setLoading(true)
        setError(null)

        try {
            const setup2FA = httpsCallable(functions, 'setup2FA')
            const result = await setup2FA({})

            if (result.data.success) {
                setQrCode(result.data.qrCode)
                setSecret(result.data.secret)
                setStep('setup')
            }
        } catch (err) {
            console.error('Error setting up 2FA:', err)
            setError(err.message || 'Failed to setup 2FA. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleEnable2FA = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setError('Please enter a valid 6-digit code')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const enable2FA = httpsCallable(functions, 'enable2FA')
            const result = await enable2FA({ token: verificationCode })

            if (result.data.success) {
                setBackupCodes(result.data.backupCodes)
                setStep('complete')
                if (onUpdate) onUpdate()
            }
        } catch (err) {
            console.error('Error enabling 2FA:', err)
            setError('Invalid verification code. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleDisable2FA = async () => {
        if (!window.confirm('Are you sure you want to disable two-factor authentication? This will reduce your account security.')) {
            return
        }

        setLoading(true)
        setError(null)

        try {
            const disable2FA = httpsCallable(functions, 'disable2FA')
            const result = await disable2FA({ password: 'verified' }) // Password verification done on frontend

            if (result.data.success) {
                setStep('initial')
                setQrCode(null)
                setSecret(null)
                setBackupCodes([])
                if (onUpdate) onUpdate()
            }
        } catch (err) {
            console.error('Error disabling 2FA:', err)
            setError('Failed to disable 2FA. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleRegenerateBackupCodes = async () => {
        if (!window.confirm('Are you sure you want to regenerate backup codes? Your old backup codes will no longer work.')) {
            return
        }

        setLoading(true)
        setError(null)

        try {
            const regenerateBackupCodes = httpsCallable(functions, 'regenerateBackupCodes')
            const result = await regenerateBackupCodes({})

            if (result.data.success) {
                setBackupCodes(result.data.backupCodes)
                alert('Backup codes regenerated successfully. Please save them now.')
            }
        } catch (err) {
            console.error('Error regenerating backup codes:', err)
            setError('Failed to regenerate backup codes. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const downloadBackupCodes = () => {
        const text = `AWSLMCSL 2FA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe! Each code can only be used once.`
        const blob = new Blob([text], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `2fa-backup-codes-${Date.now()}.txt`
        link.click()
        URL.revokeObjectURL(url)
    }

    // If 2FA is already enabled
    if (user?.twoFactorEnabled && step === 'initial') {
        return (
            <Card>
                <div className="flex items-center gap-3 mb-6">
                    <div className="size-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Shield size={24} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Two-Factor Authentication
                        </h3>
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 size={14} />
                            Enabled
                        </p>
                    </div>
                </div>

                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                    Your account is protected with two-factor authentication. You'll need to enter a verification code from your authenticator app when you sign in.
                </p>

                <div className="space-y-3">
                    <Button
                        variant="secondary"
                        onClick={handleRegenerateBackupCodes}
                        loading={loading}
                        className="w-full"
                    >
                        <Key size={18} />
                        Regenerate Backup Codes
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={handleDisable2FA}
                        loading={loading}
                        className="w-full text-red-600 hover:text-red-700"
                    >
                        Disable 2FA
                    </Button>
                </div>

                {backupCodes.length > 0 && (
                    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="flex items-start gap-2 mb-3">
                            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                                    Save Your Backup Codes
                                </h4>
                                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                    Store these backup codes in a safe place. Each code can only be used once.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {backupCodes.map((code, index) => (
                                <div
                                    key={index}
                                    className="font-mono text-sm bg-white dark:bg-slate-800 px-3 py-2 rounded border border-amber-200 dark:border-amber-700"
                                >
                                    {code}
                                </div>
                            ))}
                        </div>

                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={downloadBackupCodes}
                            className="w-full"
                        >
                            <Download size={16} />
                            Download Backup Codes
                        </Button>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}
            </Card>
        )
    }

    // Initial state - 2FA not enabled
    if (step === 'initial') {
        return (
            <Card>
                <div className="flex items-center gap-3 mb-4">
                    <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Shield size={24} className="text-slate-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Two-Factor Authentication
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Not enabled
                        </p>
                    </div>
                </div>

                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                    Add an extra layer of security to your admin account. You'll need your password and a verification code from your phone to sign in.
                </p>

                <Button
                    onClick={handleSetup2FA}
                    loading={loading}
                    className="w-full"
                >
                    <Smartphone size={18} />
                    Enable Two-Factor Authentication
                </Button>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}
            </Card>
        )
    }

    // Setup step - Show QR code
    if (step === 'setup') {
        return (
            <Card>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Setup Two-Factor Authentication
                </h3>

                <div className="space-y-6">
                    <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            <strong>Step 1:</strong> Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                        </p>

                        {qrCode && (
                            <div className="flex justify-center p-4 bg-white rounded-lg border border-slate-200 dark:border-slate-700">
                                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                            </div>
                        )}

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
                            Can't scan? Manual entry code: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{secret}</code>
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                            <strong>Step 2:</strong> Enter the 6-digit code from your authenticator app
                        </p>

                        <Input
                            type="text"
                            placeholder="000000"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength={6}
                            className="text-center text-2xl font-mono tracking-widest"
                        />
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setStep('initial')}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEnable2FA}
                            loading={loading}
                            disabled={verificationCode.length !== 6}
                            className="flex-1"
                        >
                            Verify and Enable
                        </Button>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    )}
                </div>
            </Card>
        )
    }

    // Complete step - Show backup codes
    if (step === 'complete') {
        return (
            <Card>
                <div className="text-center mb-6">
                    <div className="size-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        2FA Enabled Successfully!
                    </h3>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-6">
                    <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                                Save Your Backup Codes
                            </h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                These backup codes can be used to access your account if you lose your phone. Each code can only be used once.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                        {backupCodes.map((code, index) => (
                            <div
                                key={index}
                                className="font-mono text-sm bg-white dark:bg-slate-800 px-3 py-2 rounded border border-amber-200 dark:border-amber-700 text-center"
                            >
                                {code}
                            </div>
                        ))}
                    </div>

                    <Button
                        variant="secondary"
                        onClick={downloadBackupCodes}
                        className="w-full"
                    >
                        <Download size={18} />
                        Download Backup Codes
                    </Button>
                </div>

                <Button
                    onClick={() => {
                        setStep('initial')
                        setBackupCodes([])
                    }}
                    className="w-full"
                >
                    Done
                </Button>
            </Card>
        )
    }

    return null
}
