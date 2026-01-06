import { useState } from 'react'
import { Copy, CheckCircle, Building2, CreditCard, AlertCircle } from 'lucide-react'
import Card from './ui/Card'
import Button from './ui/Button'

export default function VirtualAccountCard({ accountData, loading = false }) {
    const [copied, setCopied] = useState(false)

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) {
        return (
            <Card className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
            </Card>
        )
    }

    if (!accountData) {
        return (
            <Card className="p-6 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-orange-900 dark:text-orange-300 mb-1">
                            Virtual Account Not Available
                        </h3>
                        <p className="text-sm text-orange-700 dark:text-orange-400">
                            Your virtual account is being set up. Please check back in a few moments or contact support if the issue persists.
                        </p>
                    </div>
                </div>
            </Card>
        )
    }

    return (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-blue-500/5 border-primary/20">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Your Deposit Account</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Deposit only • No withdrawals</p>
                    </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
                    Active
                </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4">
                {/* Bank Name */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                        Bank Name
                    </label>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {accountData.bankName}
                    </p>
                </div>

                {/* Account Number */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                        Account Number
                    </label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide font-mono">
                                {accountData.accountNumber}
                            </p>
                        </div>
                        <Button
                            variant={copied ? "success" : "outline"}
                            size="sm"
                            onClick={() => copyToClipboard(accountData.accountNumber)}
                            className="px-4 h-12"
                        >
                            {copied ? (
                                <>
                                    <CheckCircle size={16} />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy size={16} />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Account Name */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                        Account Name
                    </label>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {accountData.accountName}
                    </p>
                </div>
            </div>

            {/* Deposit Instructions */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-3">
                    <CreditCard size={20} className="text-primary shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1 text-sm">
                            How to Deposit
                        </h4>
                        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                            <li>• Transfer any amount to the account number above</li>
                            <li>• Use any bank app or USSD code</li>
                            <li>• Your wallet will be credited automatically within minutes</li>
                            <li>• You'll receive a notification when the deposit is successful</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Important Notice */}
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
                    <strong>Note:</strong> This account is for deposits only. Withdrawals can only be processed by admin for approved requests.
                </p>
            </div>
        </Card>
    )
}
