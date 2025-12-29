import { useState, useEffect } from 'react'
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
import { calculateLoanEligibility, calculateNewLoanRepayment, getUserSavingsBalance } from '../../utils/loanUtils'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import GuarantorSelector from '../../components/GuarantorSelector'

const LOAN_TYPES = [
    {
        value: 'swift_relief',
        label: 'Swift Relief Loan',
        amount: 30000, // Fixed amount
        fixedAmount: true,
        duration: 3, // Fixed 3 months
        fixedDuration: true,
        rate: 5, // 5% flat
        description: 'Quick relief loan for urgent needs. Fixed amount of ₦30,000 at 5% flat interest over 3 months.',
        eligibility: 'Must have paid membership fee (₦2,000)'
    },
    {
        value: 'advancement',
        label: 'Advancement Loan',
        multiplier: 2, // 2x savings
        rate: 10, // 10% flat
        duration: 6, // Fixed 6 months
        fixedDuration: true,
        description: 'Get twice your savings balance at 10% flat interest over 6 months.',
        eligibility: 'Must have consistent savings for at least 3 months'
    },
    {
        value: 'progress_plus',
        label: 'Progress+ Loan',
        multiplier: 3, // 3x savings
        rate: 15, // 15% per annum
        maxDuration: 12,
        description: 'Get three times your savings balance at 15% per annum over 12 months.',
        eligibility: 'Must have consistent savings for at least 6 months'
    },
]

export default function LoanApplicationPage() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [submitting, setSubmitting] = useState(false)
    const [checkingEligibility, setCheckingEligibility] = useState(false)
    const [eligibility, setEligibility] = useState(null)
    const [savingsBalance, setSavingsBalance] = useState(0)

    // Form State
    const [formData, setFormData] = useState({
        loanType: '',
        amount: '',
        duration: '',
        monthlyDeduction: '', // Custom monthly payment amount
        purpose: '',
        currentSalary: '',
        payslips: [], // File uploads for 2 payslips
        guarantors: [],
        agreedToTerms: false
    })

    // Validation Errors
    const [errors, setErrors] = useState({})

    // Fetch savings balance on mount
    useEffect(() => {
        const fetchSavings = async () => {
            if (user?.memberId) {
                const balance = await getUserSavingsBalance(user.memberId)
                setSavingsBalance(balance)
            }
        }
        fetchSavings()
    }, [user?.memberId])

    // Check eligibility when loan type changes
    useEffect(() => {
        const checkEligibility = async () => {
            if (!formData.loanType || !user) return

            setCheckingEligibility(true)
            const result = await calculateLoanEligibility(user.userId, user.memberId, formData.loanType)
            setEligibility(result)
            setCheckingEligibility(false)

            // Auto-set amount for Swift Relief (fixed)
            const selectedLoan = LOAN_TYPES.find(t => t.value === formData.loanType)
            if (selectedLoan?.fixedAmount && result.eligible) {
                setFormData(prev => ({
                    ...prev,
                    amount: selectedLoan.amount.toString(),
                    duration: selectedLoan.duration?.toString() || prev.duration
                }))
            } else if (selectedLoan?.multiplier && result.eligible) {
                // For Advancement and Progress+, show max amount but let user choose
                setFormData(prev => ({
                    ...prev,
                    amount: result.maxAmount.toString(),
                    duration: selectedLoan.duration?.toString() || prev.duration
                }))
            }
        }

        checkEligibility()
    }, [formData.loanType, user])

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

    const handlePayslipUpload = (e) => {
        const files = Array.from(e.target.files)
        if (files.length > 2) {
            setErrors({ ...errors, payslips: 'Maximum 2 payslips allowed' })
            return
        }
        setFormData({ ...formData, payslips: files })
        setErrors({ ...errors, payslips: null })
    }

    const validateForm = () => {
        const newErrors = {}
        const selectedLoan = LOAN_TYPES.find(t => t.value === formData.loanType)

        if (!formData.loanType) newErrors.loanType = 'Please select a loan type'

        // Check eligibility
        if (eligibility && !eligibility.eligible) {
            newErrors.loanType = eligibility.message
        }

        if (!formData.amount) {
            newErrors.amount = 'Please enter an amount'
        } else if (isNaN(formData.amount) || Number(formData.amount) <= 0) {
            newErrors.amount = 'Please enter a valid amount'
        } else if (eligibility && Number(formData.amount) > eligibility.maxAmount) {
            newErrors.amount = `Maximum amount is ${formatCurrency(eligibility.maxAmount)}`
        }

        // For Swift Relief, amount must be exactly 30,000
        if (selectedLoan?.value === 'swift_relief' && Number(formData.amount) !== 30000) {
            newErrors.amount = 'Swift Relief Loan amount must be exactly ₦30,000'
        }

        if (!formData.duration) {
            newErrors.duration = 'Please enter loan duration'
        } else if (selectedLoan?.fixedDuration && Number(formData.duration) !== selectedLoan.duration) {
            newErrors.duration = `Duration for this loan type must be ${selectedLoan.duration} months`
        } else if (selectedLoan?.maxDuration && Number(formData.duration) > selectedLoan.maxDuration) {
            newErrors.duration = `Maximum duration is ${selectedLoan.maxDuration} months`
        }

        if (!formData.purpose.trim()) newErrors.purpose = 'Please state the purpose of this loan'

        if (!formData.currentSalary || Number(formData.currentSalary) <= 0) {
            newErrors.currentSalary = 'Please enter your current salary'
        }

        if (formData.payslips.length < 2) {
            newErrors.payslips = 'Please upload your last 2 payslips'
        }

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
                currentSalary: Number(formData.currentSalary),
                payslipsUploaded: formData.payslips.length, // Note: actual file upload would need storage
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
                                        {/* Eligibility Status */}
                                        {checkingEligibility && (
                                            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                <span className="text-sm text-blue-700 dark:text-blue-400">Checking eligibility...</span>
                                            </div>
                                        )}
                                        {eligibility && formData.loanType && !checkingEligibility && (
                                            <div className={`mt-2 p-3 rounded-lg ${eligibility.eligible
                                                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                                }`}>
                                                <p className="text-sm font-medium">{eligibility.message}</p>
                                            </div>
                                        )}
                                        {/* Savings Balance Display */}
                                        {savingsBalance > 0 && (
                                            <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                                <p className="text-sm text-purple-700 dark:text-purple-400">
                                                    <strong>Your Savings:</strong> {formatCurrency(savingsBalance)}
                                                </p>
                                            </div>
                                        )}
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
                                        disabled={selectedLoanDetails?.fixedAmount}
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
                                        disabled={selectedLoanDetails?.fixedDuration}
                                    />
                                    <div className="md:col-span-2">
                                        <Input
                                            label="Current Monthly Salary (₦)"
                                            name="currentSalary"
                                            type="number"
                                            placeholder="Enter your gross monthly salary"
                                            value={formData.currentSalary}
                                            onChange={handleInputChange}
                                            error={errors.currentSalary}
                                            icon={Banknote}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-slate-900 dark:text-gray-200 text-sm font-semibold">
                                                Upload Last 2 Payslips <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                multiple
                                                onChange={handlePayslipUpload}
                                                className="flex w-full rounded-xl border border-[#cfdbe7] dark:border-gray-600 bg-white dark:bg-gray-800 p-3 text-sm text-slate-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 transition-all"
                                            />
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Upload your last 2 months payslips (PDF, JPG, or PNG)
                                            </p>
                                            {formData.payslips.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {Array.from(formData.payslips).map((file, idx) => (
                                                        <span key={idx} className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs">
                                                            <CheckCircle size={14} />
                                                            {file.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {errors.payslips && (
                                                <p className="text-red-500 text-xs mt-1">{errors.payslips}</p>
                                            )}
                                        </div>
                                    </div>
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
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        {selectedLoanDetails.description}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                                    <span className="text-slate-600 dark:text-slate-400">Interest Rate</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {selectedLoanDetails.rate}% {selectedLoanDetails.value === 'progress_plus' ? 'per annum' : 'flat'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                                    <span className="text-slate-600 dark:text-slate-400">
                                        {selectedLoanDetails.fixedAmount ? 'Fixed Amount' : 'Max Amount'}
                                    </span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {selectedLoanDetails.fixedAmount
                                            ? formatCurrency(selectedLoanDetails.amount)
                                            : eligibility?.maxAmount ? formatCurrency(eligibility.maxAmount) : 'Check eligibility'
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                                    <span className="text-slate-600 dark:text-slate-400">Duration</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {selectedLoanDetails.duration || selectedLoanDetails.maxDuration} month{(selectedLoanDetails.duration || selectedLoanDetails.maxDuration) > 1 ? 's' : ''}
                                        {selectedLoanDetails.fixedDuration && ' (Fixed)'}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                        <strong>Eligibility:</strong>
                                    </p>
                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                        {selectedLoanDetails.eligibility}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Repayment Preview */}
                    {formData.amount && formData.duration && formData.loanType && (
                        <Card>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                                Repayment Preview
                            </h3>
                            {(() => {
                                const repayment = calculateNewLoanRepayment(
                                    Number(formData.amount),
                                    formData.loanType,
                                    Number(formData.duration)
                                )
                                return (
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Principal</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(repayment.principal)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Interest ({repayment.interestRate}%)</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(repayment.interestAmount)}
                                            </span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400 font-bold">Total Repayment</span>
                                            <span className="font-bold text-primary">
                                                {formatCurrency(repayment.totalRepayment)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Monthly Payment</span>
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {formatCurrency(repayment.monthlyPayment)}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })()}
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
