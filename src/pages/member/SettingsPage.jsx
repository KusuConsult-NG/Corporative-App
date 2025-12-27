import { useState } from 'react'
import { Bell, CreditCard, Moon, Sun, Lock, Globe, Mail, Smartphone } from 'lucide-react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { useThemeStore } from '../../store/themeStore'

export default function SettingsPage() {
    const { theme, toggleTheme } = useThemeStore()
    const [notifications, setNotifications] = useState({
        email: true,
        sms: false,
        loanApproval: true,
        savingsAlert: true,
        commodityUpdate: false
    })
    const [monthlyContribution, setMonthlyContribution] = useState(50000)

    const handleSaveSettings = () => {
        alert('Settings saved successfully!')
    }

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto flex flex-col gap-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Manage your account preferences and notifications
                </p>
            </div>

            {/* Appearance Settings */}
            <Card>
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Appearance</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Customize how the portal looks for you
                        </p>
                    </div>
                    <div className="size-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                        {theme === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white">Dark Mode</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Use dark theme across the portal</p>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-slate-300'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>
            </Card>

            {/* Notification Settings */}
            <Card>
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Notifications</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Choose how you want to be notified
                        </p>
                    </div>
                    <div className="size-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                        <Bell size={24} />
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Email Notifications */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Mail size={20} className="text-slate-400" />
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white">Email Notifications</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Receive updates via email</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.email ? 'bg-primary' : 'bg-slate-300'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.email ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* SMS Notifications */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Smartphone size={20} className="text-slate-400" />
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white">SMS Notifications</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Receive alerts via SMS</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setNotifications({ ...notifications, sms: !notifications.sms })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.sms ? 'bg-primary' : 'bg-slate-300'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.sms ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    <hr className="border-slate-200 dark:border-slate-700" />

                    {/* Specific Alerts */}
                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase">Alert Types</p>

                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <p className="text-slate-900 dark:text-white">Loan Approval Updates</p>
                            <button
                                onClick={() => setNotifications({ ...notifications, loanApproval: !notifications.loanApproval })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.loanApproval ? 'bg-primary' : 'bg-slate-300'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.loanApproval ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <p className="text-slate-900 dark:text-white">Savings Alerts</p>
                            <button
                                onClick={() => setNotifications({ ...notifications, savingsAlert: !notifications.savingsAlert })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.savingsAlert ? 'bg-primary' : 'bg-slate-300'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.savingsAlert ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <p className="text-slate-900 dark:text-white">Commodity Updates</p>
                            <button
                                onClick={() => setNotifications({ ...notifications, commodityUpdate: !notifications.commodityUpdate })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.commodityUpdate ? 'bg-primary' : 'bg-slate-300'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.commodityUpdate ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Savings Settings */}
            <Card>
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Savings Preferences</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Manage your monthly contributions and deductions
                        </p>
                    </div>
                    <div className="size-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                        <CreditCard size={24} />
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Monthly Contribution Amount
                        </label>
                        <Input
                            type="number"
                            value={monthlyContribution}
                            onChange={(e) => setMonthlyContribution(e.target.value)}
                            placeholder="Enter amount"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            Minimum: ₦10,000 | Maximum: ₦500,000
                        </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <div>
                            <p className="font-semibold text-blue-900 dark:text-blue-300">Automatic Deduction</p>
                            <p className="text-sm text-blue-700 dark:text-blue-400">Deduct on salary payment date</p>
                        </div>
                        <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-500">
                            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                        </button>
                    </div>
                </div>
            </Card>

            {/* Security Settings */}
            <Card>
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Security</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Manage your password and security preferences
                        </p>
                    </div>
                    <div className="size-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                        <Lock size={24} />
                    </div>
                </div>

                <div className="space-y-4">
                    <Button variant="outline" className="w-full justify-start">
                        <Lock size={20} />
                        Change Password
                    </Button>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Last password change: Jan 15, 2024
                    </p>
                </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
                <Button variant="outline">
                    Cancel
                </Button>
                <Button onClick={handleSaveSettings}>
                    Save Changes
                </Button>
            </div>
        </div>
    )
}
