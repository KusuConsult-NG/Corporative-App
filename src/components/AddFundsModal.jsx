import { useState } from 'react'
import { X, CreditCard, Building2, Hash, Copy, CheckCircle2 } from 'lucide-react'
import { usePaystackPayment } from 'react-paystack'
import Button from './ui/Button'
import Input from './ui/Input'
import { formatCurrency } from '../utils/formatters'
import { walletAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../context/ToastContext'
import { BANK_DETAILS } from '../utils/constants'

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY

export default function AddFundsModal({ isOpen, onClose, onSuccess }) {
    const { user } = useAuthStore()
    const toast = useToast()
    const [amount, setAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('card') // card, bank_transfer, ussd
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    // Paystack configuration
    const config = {
        reference: `wallet_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        email: user?.email || '',
        amount: Number(amount) * 100, // Paystack expects amount in kobo
        publicKey: PAYSTACK_PUBLIC_KEY,
        metadata: {
            custom_fields: [
                {
                    display_name: 'Member ID',
                    variable_name: 'member_id',
                    value: user?.memberId || ''
                },
                {
                    display_name: 'Full Name',
                    variable_name: 'full_name',
                    value: `${user?.firstName} ${user?.lastName}` || user?.name || ''
                }
            ]
        }
    }

    // Paystack payment hooks
    const initializePayment = usePaystackPayment(config)

    // Handle payment success
    const onPaymentSuccess = async (reference) => {
        try {
            setLoading(true)

            // Record transaction in Firestore
            await walletAPI.recordTransaction({
                memberId: user.memberId,
                amount: Number(amount),
                paymentMethod: 'card',
                paystackReference: reference.reference,
                description: `Wallet top-up via Card - ${formatCurrency(Number(amount))}`
            })

            // Show success message
            toast.success(`Successfully added ${formatCurrency(Number(amount))} to your wallet!`)

            // Call onSuccess callback
            if (onSuccess) onSuccess()

            // Reset and close
            setAmount('')
            onClose()
        } catch (error) {
            console.error('Error recording transaction:', error)
            toast.error('Payment successful but failed to update wallet. Please contact support.')
        } finally {
            setLoading(false)
        }
    }

    // Handle payment closure
    const onPaymentClose = () => {
        console.log('Payment dialog closed')
        setLoading(false)
    }

    // Handle card payment
    const handleCardPayment = () => {
        if (!amount || Number(amount) <= 0) {
            toast.error('Please enter a valid amount')
            return
        }

        if (Number(amount) < 100) {
            toast.error('Minimum amount is ₦100')
            return
        }

        setLoading(true)
        initializePayment(onPaymentSuccess, onPaymentClose)
    }

    // Handle bank transfer
    const handleBankTransfer = async () => {
        if (!amount || Number(amount) <= 0) {
            toast.error('Please enter a valid amount')
            return
        }

        toast.info('Please verify your transfer details below before proceeding.')
    }

    // Handle USSD payment
    const handleUSSDPayment = () => {
        if (!amount || Number(amount) <= 0) {
            toast.error('Please enter a valid amount')
            return
        }

        toast.info('Please dial the code shown below.')
    }

    // Copy account number
    const copyAccountNumber = () => {
        navigator.clipboard.writeText(BANK_DETAILS.accountNumber)
        setCopied(true)
        toast.success('Account number copied!')
        setTimeout(() => setCopied(false), 2000)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add Funds</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Amount Input */}
                    <div>
                        <Input
                            label="Amount"
                            type="number"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="100"
                        />
                        {amount && Number(amount) >= 100 && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                You will add {formatCurrency(Number(amount))} to your wallet
                            </p>
                        )}
                    </div>

                    {/* Payment Method Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">
                            Payment Method
                        </label>
                        <div className="space-y-2">
                            {/* Card Payment */}
                            <button
                                onClick={() => setPaymentMethod('card')}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'card'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                                    }`}
                            >
                                <div className={`size-10 rounded-lg flex items-center justify-center ${paymentMethod === 'card' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}>
                                    <CreditCard size={20} />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-semibold text-slate-900 dark:text-white">Pay with Card</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Visa, Mastercard, Verve</p>
                                </div>
                            </button>

                            {/* Bank Transfer */}
                            <button
                                onClick={() => setPaymentMethod('bank_transfer')}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'bank_transfer'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                                    }`}
                            >
                                <div className={`size-10 rounded-lg flex items-center justify-center ${paymentMethod === 'bank_transfer' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}>
                                    <Building2 size={20} />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-semibold text-slate-900 dark:text-white">Bank Transfer</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Transfer to dedicated account</p>
                                </div>
                            </button>

                            {/* USSD */}
                            <button
                                onClick={() => setPaymentMethod('ussd')}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'ussd'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                                    }`}
                            >
                                <div className={`size-10 rounded-lg flex items-center justify-center ${paymentMethod === 'ussd' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}>
                                    <Hash size={20} />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-semibold text-slate-900 dark:text-white">USSD Payment</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Dial code on your phone</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Bank Transfer Details */}
                    {paymentMethod === 'bank_transfer' && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Transfer to:</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-blue-700 dark:text-blue-400">Bank Name:</span>
                                    <span className="font-semibold text-blue-900 dark:text-blue-200">{BANK_DETAILS.bankName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-blue-700 dark:text-blue-400">Account Name:</span>
                                    <span className="font-semibold text-blue-900 dark:text-blue-200">{BANK_DETAILS.accountName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-blue-700 dark:text-blue-400">Account Number:</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-blue-900 dark:text-blue-200">{BANK_DETAILS.accountNumber}</span>
                                        <button
                                            onClick={copyAccountNumber}
                                            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                                        >
                                            {copied ? (
                                                <CheckCircle2 size={16} className="text-green-600" />
                                            ) : (
                                                <Copy size={16} className="text-blue-600" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                                    <p className="text-xs text-blue-700 dark:text-blue-400">
                                        <strong>Reference:</strong> Use your Member ID ({user?.memberId})
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* USSD Instructions */}
                    {paymentMethod === 'ussd' && (
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                            <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">USSD Code:</h3>
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-purple-200 dark:border-purple-700">
                                <code className="text-lg font-mono font-bold text-purple-900 dark:text-purple-200">
                                    *737*50*{amount || '0'}*159#
                                </code>
                            </div>
                            <p className="text-xs text-purple-700 dark:text-purple-400 mt-3">
                                Dial this code on your phone and follow the prompts
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            if (paymentMethod === 'card') handleCardPayment()
                            else if (paymentMethod === 'bank_transfer') handleBankTransfer()
                            else handleUSSDPayment()
                        }}
                        className="flex-1"
                        disabled={loading || !amount || Number(amount) < 100}
                    >
                        {loading ? 'Processing...' : paymentMethod === 'card' ? 'Pay Now' : 'Continue'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
