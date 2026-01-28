import { Shield, Lock, History } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import TwoFactorSetup from '../../components/settings/TwoFactorSetup'
import Card from '../../components/ui/Card'

export default function AdminSecuritySettingsPage() {
    const { user, updateUser } = useAuthStore()

    const handleUpdate = () => {
        // Refresh user data after 2FA changes
        if (user?.id) {
            // This would typically re-fetch user data from Firestore
            // For now, we'll just force a re-render
            updateUser({ ...user })
        }
    }

    if (!user || !['admin', 'super_admin'].includes(user.role)) {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto">
                <Card>
                    <div className="text-center py-12">
                        <Shield size={48} className="mx-auto text-slate-400 mb-4" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            Access Denied
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            This page is only accessible to admin accounts.
                        </p>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Security Settings</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Manage your account security and authentication methods
                </p>
            </div>

            {/* Two-Factor Authentication Section */}
            <section>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Shield size={24} className="text-primary" />
                    Two-Factor Authentication
                </h2>

                <TwoFactorSetup user={user} onUpdate={handleUpdate} />
            </section>

            {/* Security Best Practices */}
            <section>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Lock size={24} className="text-slate-400" />
                    Security Best Practices
                </h2>

                <Card>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-primary font-bold text-sm">1</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                                    Use a Strong Password
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Use at least 12 characters with a mix of uppercase, lowercase, numbers, and special characters.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-primary font-bold text-sm">2</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                                    Enable Two-Factor Authentication
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Add an extra layer of security by requiring a code from your phone in addition to your password.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-primary font-bold text-sm">3</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                                    Save Your Backup Codes
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Store your 2FA backup codes in a safe place. You'll need them if you lose access to your authenticator app.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-primary font-bold text-sm">4</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                                    Monitor Account Activity
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Regularly review your account activity and report any suspicious behavior immediately.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-primary font-bold text-sm">5</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                                    Don't Share Your Credentials
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Never share your password or 2FA codes with anyone, including other staff members.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Account Information */}
            <section>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <History size={24} className="text-slate-400" />
                    Account Information
                </h2>

                <Card>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                Account Role
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                                {user.role?.replace('_', ' ')}
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                Email
                            </span>
                            <span className="text-sm text-slate-900 dark:text-white">
                                {user.email}
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                2FA Status
                            </span>
                            <span className={`text-sm font-semibold ${user.twoFactorEnabled ? 'text-green-600' : 'text-slate-400'}`}>
                                {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>

                        {user.twoFactorEnabledAt && (
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                    2FA Enabled Since
                                </span>
                                <span className="text-sm text-slate-900 dark:text-white">
                                    {new Date(user.twoFactorEnabledAt.toDate()).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>
                </Card>
            </section>
        </div>
    )
}
