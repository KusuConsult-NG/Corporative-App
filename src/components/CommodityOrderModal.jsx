import { useState } from 'react'
import { X, CreditCard, Calendar, Info } from 'lucide-react'
import Button from './ui/Button'
import { formatCurrency } from '../utils/formatters'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'

export default function CommodityOrderModal({ isOpen, onClose, product }) {
    const { user } = useAuthStore()
    const [paymentType, setPaymentType] = useState('') // 'one-off' or 'installment'
    const [customMonthlyAmount, setCustomMonthlyAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    if (!isOpen || !product) return null

    const INSTALLMENT_DURATION = 12 // months
    const standardMonthlyPayment = product.price / INSTALLMENT_DURATION

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (!paymentType) {
                throw new Error('Please select a payment type')
            }

            // Validate custom monthly amount if installment selected
            if (paymentType === 'installment' && customMonthlyAmount) {
                const customAmount = Number(customMonthlyAmount)
                if (customAmount < standardMonthlyPayment) {
                    throw new Error(`Minimum monthly payment is ${formatCurrency(standardMonthlyPayment)}`)
                }
            }

            // Create commodity order request
            await addDoc(collection(db, 'commodityOrders'), {
                userId: user.userId,
                userName: user.name,
                userEmail: user.email,
                memberId: user.memberId,

                // Product details
                productId: product.id,
                productName: product.name,
                productCategory: product.category,
                productPrice: product.price,

                // Payment details
                paymentType,
                totalAmount: product.price,
                monthlyPayment: paymentType === 'installment'
                    ? (customMonthlyAmount ? Number(customMonthlyAmount) : standardMonthlyPayment)
                    : product.price,
                duration: paymentType === 'installment' ? INSTALLMENT_DURATION : 1,
                customMonthlyAmount: customMonthlyAmount ? Number(customMonthlyAmount) : null,

                // Status tracking
                status: 'pending_approval', // pending_approval, approved, rejected, processing, delivered, cancelled
                approvedBy: null,
                approvedAt: null,
                rejectionReason: null,

                // Deduction tracking
                deductionsStartDate: paymentType === 'installment'
                    ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) // Last day of current month
                    : null,
                deductionsPaid: 0,
                deductionsRemaining: paymentType === 'installment' ? INSTALLMENT_DURATION : 1,

                // Timestamps
                orderedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            })

            alert('Order submitted successfully! An admin will review your request.')
            onClose()
        } catch (err) {
            setError(err.message || 'Failed to submit order')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Order {product.name}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Product Summary */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {product.name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {product.category}
                                </p>
                            </div>
                            <p className="text-xl font-bold text-primary">
                                {formatCurrency(product.price)}
                            </p>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {product.description}
                        </p>
                    </div>

                    {/* Payment Options */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            Select Payment Option
                        </label>

                        <div className="space-y-3">
                            {/* One-off Payment */}
                            <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${paymentType === 'one-off'
                                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                                }`}>
                                <input
                                    type="radio"
                                    name="paymentType"
                                    value="one-off"
                                    checked={paymentType === 'one-off'}
                                    onChange={(e) => setPaymentType(e.target.value)}
                                    className="hidden"
                                />
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentType === 'one-off'
                                                ? 'border-primary'
                                                : 'border-gray-300 dark:border-gray-600'
                                            }`}>
                                            {paymentType === 'one-off' && (
                                                <div className="w-3 h-3 rounded-full bg-primary" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CreditCard size={18} className="text-primary" />
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                One-Off Payment
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Pay the full amount immediately
                                        </p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                                            {formatCurrency(product.price)}
                                        </p>
                                    </div>
                                </div>
                            </label>

                            {/* 12-Month Installment */}
                            <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${paymentType === 'installment'
                                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                                }`}>
                                <input
                                    type="radio"
                                    name="paymentType"
                                    value="installment"
                                    checked={paymentType === 'installment'}
                                    onChange={(e) => setPaymentType(e.target.value)}
                                    className="hidden"
                                />
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentType === 'installment'
                                                ? 'border-primary'
                                                : 'border-gray-300 dark:border-gray-600'
                                            }`}>
                                            {paymentType === 'installment' && (
                                                <div className="w-3 h-3 rounded-full bg-primary" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar size={18} className="text-primary" />
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                12-Month Installment
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            Spread payment over 12 months
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Standard monthly payment:
                                        </p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(standardMonthlyPayment)}/month
                                        </p>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Custom Monthly Amount (only for installment) */}
                    {paymentType === 'installment' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Custom Monthly Amount (Optional)
                            </label>
                            <input
                                type="number"
                                placeholder={`Minimum: ${formatCurrency(standardMonthlyPayment)}`}
                                value={customMonthlyAmount}
                                onChange={(e) => setCustomMonthlyAmount(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                <Info size={12} />
                                Pay more monthly to clear the debt faster. Deductions start from the last day of the order month.
                            </p>
                        </div>
                    )}

                    {/* Important Notice */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            <strong>Note:</strong> Your order will be reviewed by an administrator before processing. You will be notified once approved.
                            {paymentType === 'installment' && ' Monthly deductions will begin from the last day of the current month.'}
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" loading={loading} disabled={!paymentType} className="flex-1">
                            Submit Order
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
