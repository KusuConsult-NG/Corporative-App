import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    Banknote,
    Calendar,
    Users,
    FileText,
    CheckCircle,
    Info,
    Plus,
    X
} from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import { loansAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import GuarantorSelector from '../../components/GuarantorSelector'

const LOAN_TYPES = [
    { value: 'personal', label: 'Personal Loan', maxAmount: 1000000, maxDuration: 12, rate: 3 },
    { value: 'business', label: 'Business Loan', maxAmount: 5000000, maxDuration: 12, rate: 3 },
    { value: 'emergency', label: 'Emergency Loan', maxAmount: 200000, maxDuration: 12, rate: 3 },
    { value: 'education', label: 'Education Loan', maxAmount: 1500000, maxDuration: 12, rate: 3 },
]

export default function LoanApplicationPage() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [submitting, setSubmitting] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        loanType: '',
        amount: '',
        duration: '',
        monthlyDeduction: '', // Custom monthly payment amount
        purpose: '',
        guarantors: [],
        agreedToTerms: false
    })

    // Validation Errors
    const [errors, setErrors] = useState({})

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        })
        // Clear error when user types
        if (errors[name]) {
            setErrors({ ...errors, [name]: null })
        }
    }

    const handleGuarantorSelect = (guarantor) => {
        if (formData.guarantors.some(g => g.fileNumber === guarantor.fileNumber)) {
            setErrors({ ...errors, guarantor: 'This guarantor has already been added' })
            return
        }

        setFormData({
            ...formData,
            guarantors: [
                ...formData.guarantors,
                {
                    ...guarantor,
                    id: Date.now()
                }
            ]
        })
        setErrors({ ...errors, guarantor: null })
    }

    const removeGuarantor = (id) => {
        setFormData({
            ...formData,
            guarantors: formData.guarantors.filter(g => g.id !== id)
        })
    }

    const validateForm = () => {
        const newErrors = {}
        const selectedLoan = LOAN_TYPES.find(t => t.value === formData.loanType)

        if (!formData.loanType) newErrors.loanType = 'Please select a loan type'

        if (!formData.amount) {
            newErrors.amount = 'Please enter an amount'
        } else if (isNaN(formData.amount) || Number(formData.amount) <= 0) {
            newErrors.amount = 'Please enter a valid amount'
        } else if (selectedLoan && Number(formData.amount) > selectedLoan.maxAmount) {
            newErrors.amount = `Maximum amount is ${formatCurrency(selectedLoan.maxAmount)}`
        }

        if (!formData.duration) {
            newErrors.duration = 'Please enter loan duration'
        } else if (selectedLoan && Number(formData.duration) > selectedLoan.maxDuration) {
            newErrors.duration = `Maximum duration is ${selectedLoan.maxDuration} months`
        }

        if (!formData.purpose.trim()) newErrors.purpose = 'Please state the purpose of this loan'

        // Guarantor is mandatory - minimum 1 required
        if (formData.guarantors.length < 1) {
            newErrors.guarantors = 'At least 1 guarantor is required'
        }

        if (!formData.agreedToTerms) newErrors.agreedToTerms = 'You must agree to the terms and conditions'

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        console.log('🚀 Starting loan application submission...')

        if (!validateForm()) {
            console.log('❌ Form validation failed')
            return
        }

        setSubmitting(true)

        try {
            const applicantName = user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.name || 'Member'

            console.log('📝 Submitting loan data:', {
                memberId: user.memberId,
                applicantName: applicantName,
                loanType: formData.loanType,
                amount: Number(formData.amount),
                duration: Number(formData.duration),
                purpose: formData.purpose,
                guarantorsCount: formData.guarantors.length
            })

            const result = await loansAPI.applyForLoan({
                memberId: user.memberId,
                applicantName: applicantName,
                loanType: formData.loanType,
                amount: Number(formData.amount),
                duration: Number(formData.duration),
                purpose: formData.purpose,
                guarantors: formData.guarantors,
                guarantorsRequired: formData.guarantors.length
            })

            console.log('✅ Loan application submitted successfully:', result)

            alert('Loan application submitted successfully! Your guarantors will receive email notifications.')
            navigate('/member/loans')
        } catch (error) {
            console.error('❌ Error submitting loan:', error)
            alert(`Failed to submit loan application: ${error.message}. Please try again.`)
        } finally {
            setSubmitting(false)
        }
    }

    const selectedLoanDetails = LOAN_TYPES.find(t => t.value === formData.loanType)

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    className="mb-4 pl-0 hover:bg-transparent hover:text-primary"
                    onClick={() => navigate('/member/loans')}
                >
                    <ArrowLeft size={20} />
                    Back to My Loans
                </Button>
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        New Loan Application
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Fill out the form below to apply for a new loan.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Application Form */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Loan Details Section */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <FileText className="text-primary" size={20} />
                                    Loan Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <Select
                                            label="Loan Type"
                                            name="loanType"
                                            options={LOAN_TYPES}
                                            value={formData.loanType}
                                            onChange={handleInputChange}
                                            error={errors.loanType}
                                            placeholder="Select loan type..."
                                        />
                                    </div>
                                    <Input
                                        label="Amount (₦)"
                                        name="amount"
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        error={errors.amount}
                                        icon={Banknote}
                                    />
                                    <Input
                                        label="Duration (Months)"
                                        name="duration"
                                        type="number"
                                        min="1"
                                        max="12"
                                        placeholder="e.g. 12"
                                        value={formData.duration}
                                        onChange={handleInputChange}
                                        error={errors.duration}
                                        icon={Calendar}
                                    />
                                    <div className="md:col-span-2">
                                        <Input
                                            label="Preferred Monthly Deduction (₦) - Optional"
                                            name="monthlyDeduction"
                                            type="number"
                                            placeholder="Leave empty for standard spread"
                                            value={formData.monthlyDeduction}
                                            onChange={handleInputChange}
                                            error={errors.monthlyDeduction}
                                            icon={Banknote}
                                        />
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                            <Info size={12} />
                                            Specify a custom monthly amount to pay off faster. Deductions start from the last day of the application month.
                                        </p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-slate-900 dark:text-gray-200 text-sm font-semibold">
                                                Purpose of Loan
                                            </label>
                                            <textarea
                                                name="purpose"
                                                rows="3"
                                                className={`flex w-full rounded-xl border bg-white dark:bg-gray-800 p-4 text-base text-slate-900 dark:text-white placeholder:text-[#93adc8] dark:placeholder:text-slate-500 transition-all ${errors.purpose
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/30'
                                                    : 'border-[#cfdbe7] dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/20'
                                                    }`}
                                                placeholder="Briefly explain why you need this loan..."
                                                value={formData.purpose}
                                                onChange={handleInputChange}
                                            />
                                            {errors.purpose && (
                                                <p className="text-red-500 text-xs">{errors.purpose}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-200 dark:border-slate-700" />

                            {/* Guarantors Section */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Users className="text-primary" size={20} />
                                    Guarantors
                                </h3>
                                <div className="space-y-4">
                                    <GuarantorSelector
                                        onSelect={handleGuarantorSelect}
                                        excludeId={user?.memberId}
                                        error={errors.guarantor}
                                    />

                                    {formData.guarantors.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {formData.guarantors.map((guarantor) => (
                                                <div
                                                    key={guarantor.id}
                                                    className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            {guarantor.name}
                                                        </span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                                            ID: {guarantor.fileNumber}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeGuarantor(guarantor.id)}
                                                        className="text-slate-400 hover:text-red-500 transition-colors ml-2"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {errors.guarantors && (
                                        <p className="text-red-500 text-xs">{errors.guarantors}</p>
                                    )}
                                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        <Info size={14} />
                                        Minimum of 2 guarantors required for most loans.
                                    </p>
                                </div>
                            </div>

                            <hr className="border-slate-200 dark:border-slate-700" />

                            {/* Terms Section */}
                            <div>
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center size-5 mt-0.5">
                                        <input
                                            type="checkbox"
                                            name="agreedToTerms"
                                            checked={formData.agreedToTerms}
                                            onChange={handleInputChange}
                                            className="peer appearance-none size-5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 checked:bg-primary checked:border-primary transition-all"
                                        />
                                        <CheckCircle size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-gray-300 transition-colors">
                                            I agree to the terms and conditions, including the interest rates and repayment schedule. I understand that my guarantors will be notified upon submission.
                                        </p>
                                        {errors.agreedToTerms && (
                                            <p className="text-red-500 text-xs mt-1">{errors.agreedToTerms}</p>
                                        )}
                                    </div>
                                </label>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={() => navigate('/member/loans')}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    loading={submitting}
                                    className="flex-1"
                                >
                                    Submit Application
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>

                {/* Info Sidebar */}
                <div className="space-y-6">
                    {/* Selected Loan Info */}
                    {selectedLoanDetails && (
                        <Card className="bg-primary/5 border-primary/20 dark:bg-primary/10">
                            <div className="flex items-start gap-3 mb-4">
                                <Info className="text-primary shrink-0" size={24} />
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">
                                        {selectedLoanDetails.label}
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Selected Loan Type
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">Interest Rate</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{selectedLoanDetails.rate}% p.a.</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">Max Amount</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(selectedLoanDetails.maxAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">Max Duration</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{selectedLoanDetails.maxDuration} months</span>
                                </div>
                            </div>
                        </Card>
                    )}

                    <Card>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                            Application Process
                        </h3>
                        <ul className="space-y-4">
                            {[
                                { title: 'Submit Application', desc: 'Fill out the form and submit' },
                                { title: 'Guarantor Review', desc: 'Guarantors accept the request' },
                                { title: 'Admin Review', desc: 'Admin reviews the application' },
                                { title: 'Disbursement', desc: 'Funds sent to your account' }
                            ].map((step, index) => (
                                <li key={index} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="size-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                            {index + 1}
                                        </div>
                                        {index !== 3 && <div className="w-px h-full bg-slate-200 dark:bg-slate-700 my-1" />}
                                    </div>
                                    <div className="pb-4">
                                        <p className="font-semibold text-sm text-slate-900 dark:text-white">
                                            {step.title}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {step.desc}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    )
}
