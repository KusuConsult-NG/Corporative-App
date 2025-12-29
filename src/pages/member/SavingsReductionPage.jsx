import { useState } from 'react'
import { ArrowDown, Send, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { savingsReductionAPI } from '../../services/complaintsAPI'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

export default function SavingsReductionPage() {
    const { user } = useAuthStore()
    const [formData, setFormData] = useState({
        amount: '',
        reason: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()

        const amount = Number(formData.amount)

        if (!amount || amount <= 0) {
            setError('Please enter a valid amount')
            return
        }

        if (!formData.reason.trim()) {
            setError('Please provide a reason for the reduction')
            return
        }

        setSubmitting(true)
        setError('')

        try {
            await savingsReductionAPI.create({
                userId: user.userId,
                memberId: user.memberId,
                memberName: user.name,
                amount: amount,
                reason: formData.reason,
                currentBalance: user.walletBalance || 0
            })

            setSuccess(true)
            setFormData({ amount: '', reason: '' })

            setTimeout(() => setSuccess(false), 5000)
        } catch (err) {
            console.error('Error submitting reduction request:', err)
            setError('Failed to submit request. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="p-6 lg:p-10 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Request Savings Reduction
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Submit a request to reduce your savings balance. Admin approval is required.
                </p>
            </div>

            {success && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
                    <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                    <div>
                        <p className="font-semibold text-green-900 dark:text-green-400">Request Submitted</p>
                        <p className="text-sm text-green-700 dark:text-green-500">
                            Your reduction request has been submitted for admin approval.
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                    <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                    <p className="text-sm text-red-700 dark:text-red-500">{error}</p>
                </div>
            )}

            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-900 dark:text-blue-400">
                            <strong>Note:</strong> Savings reduction requests require admin approval.
                            You will be notified once your request is processed.
                        </p>
                    </div>

                    <Input
                        label="Amount to Reduce (₦)"
                        type="number"
                        placeholder="Enter amount"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        icon={ArrowDown}
                        required
                    />

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Reason for Reduction <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            rows="4"
                            placeholder="Provide a detailed reason for this reduction..."
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            required
                        />
                    </div>

                    <Button type="submit" loading={submitting} className="w-full sm:w-auto">
                        <Send size={18} />
                        Submit Request
                    </Button>
                </form>
            </Card>
        </div>
    )
}
