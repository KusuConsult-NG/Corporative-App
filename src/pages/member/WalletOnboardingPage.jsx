import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Wallet, CheckCircle, Info, Upload, Shield } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

const TIER_OPTIONS = [
    {
        tier: 1,
        name: 'Tier 1 - Basic',
        maxBalance: 300000,
        singleDeposit: 50000,
        singleTransfer: 3000,
        dailyLimit: 30000,
        requirements: [
            'Bank Verification Number (BVN)',
            'National Identity Number (NIN)',
            'Date of Birth (must match BVN)'
        ],
        color: 'blue'
    },
    {
        tier: 2,
        name: 'Tier 2 - Standard',
        maxBalance: 500000,
        singleTransaction: 10000,
        dailyLimit: 100000,
        requirements: [
            'Bank Verification Number (BVN)',
            'National Identity Number (NIN)',
            'NIN Slip Upload (front page only)',
            'Date of Birth (must match BVN)'
        ],
        color: 'purple',
        recommended: true
    },
    {
        tier: 3,
        name: 'Tier 3 - Premium',
        maxBalance: 'Unlimited',
        singleTransaction: 100000,
        dailyLimit: 1000000,
        requirements: [
            'Full KYC verification',
            'Physical branch visit or advanced liveness check',
            'Address verification',
            'Please contact support to upgrade'
        ],
        color: 'amber',
        disabled: true
    }
]

export default function WalletOnboardingPage() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [currentStep, setCurrentStep] = useState(0)
    const [selectedTier, setSelectedTier] = useState(null)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    const [formData, setFormData] = useState({
        bvn: '',
        nin: '',
        dateOfBirth: '',
        ninSlipFile: null
    })

    const [verificationResult, setVerificationResult] = useState(null)
    const [virtualAccountDetails, setVirtualAccountDetails] = useState(null)

    const steps = [
        { id: 0, title: 'Welcome' },
        { id: 1, title: 'Select Tier' },
        { id: 2, title: 'Verify Identity' },
        { id: 3, title: 'Upload Documents' },
        { id: 4, title: 'Create Account' },
        { id: 5, title: 'Success' }
    ]

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }))
        }
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            // Validate file
            if (file.size > 5 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, ninSlipFile: 'File size must be less than 5MB' }))
                return
            }
            if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
                setErrors(prev => ({ ...prev, ninSlipFile: 'File must be JPG, PNG, or PDF' }))
                return
            }
            setFormData(prev => ({ ...prev, ninSlipFile: file }))
            setErrors(prev => ({ ...prev, ninSlipFile: null }))
        }
    }

    const validateBVNNIN = () => {
        const newErrors = {}

        if (!formData.bvn || formData.bvn.length !== 11) {
            newErrors.bvn = 'BVN must be 11 digits'
        }
        if (!formData.nin || formData.nin.length !== 11) {
            newErrors.nin = 'NIN must be 11 digits'
        }
        if (!formData.dateOfBirth) {
            newErrors.dateOfBirth = 'Date of birth is required'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleVerifyBVN = async () => {
        if (!validateBVNNIN()) return

        setLoading(true)
        try {
            // Call Cloud Function to verify BVN
            const { getFunctions, httpsCallable } = await import('firebase/functions')
            const { app } = await import('../../lib/firebase')

            const functions = getFunctions(app)
            const verifyBVNFunction = httpsCallable(functions, 'verifyBVN')

            const result = await verifyBVNFunction({
                bvn: formData.bvn,
                firstName: user.firstName,
                lastName: user.lastName,
                dateOfBirth: formData.dateOfBirth,
                phoneNumber: user.phone || null
            })

            if (!result.data.verified) {
                throw new Error(result.data.message || 'BVN verification failed. Please check your details match your BVN records.')
            }

            setVerificationResult({
                success: true,
                verified: result.data.verified,
                matches: result.data.matches
            })

            // If Tier 2 and needs NIN slip, go to upload step
            if (selectedTier === 2) {
                setCurrentStep(3)
            } else {
                // Tier 1 can proceed to account creation
                setCurrentStep(4)
            }
        } catch (error) {
            console.error('BVN verification error:', error)
            setErrors({ general: error.message || 'Failed to verify BVN. Please try again.' })
        } finally {
            setLoading(false)
        }
    }

    const handleUploadNINSlip = async () => {
        if (!formData.ninSlipFile) {
            setErrors({ ninSlipFile: 'Please upload your NIN slip' })
            return
        }

        setLoading(true)
        try {
            // Convert file to base64
            const reader = new FileReader()
            const fileDataPromise = new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(formData.ninSlipFile)
            })
            const fileData = await fileDataPromise

            // Call Cloud Function to upload NIN slip
            const { getFunctions, httpsCallable } = await import('firebase/functions')
            const { app } = await import('../../lib/firebase')

            const functions = getFunctions(app)
            const uploadNINSlipFunction = httpsCallable(functions, 'uploadNINSlip')

            const result = await uploadNINSlipFunction({
                fileData,
                fileName: formData.ninSlipFile.name,
                fileType: formData.ninSlipFile.type
            })

            if (!result.data.success) {
                throw new Error(result.data.message || 'Failed to upload NIN slip')
            }

            setCurrentStep(4)
        } catch (error) {
            console.error('NIN upload error:', error)
            setErrors({ general: error.message || 'Failed to upload NIN slip. Please try again.' })
        } finally {
            setLoading(false)
        }
    }

    const handleCreateVirtualAccount = async () => {
        setLoading(true)
        try {
            // Call Cloud Function to create virtual account
            const { getFunctions, httpsCallable } = await import('firebase/functions')
            const { app } = await import('../../lib/firebase')

            const functions = getFunctions(app)
            const createVirtualAccountFunction = httpsCallable(functions, 'createVirtualAccount')

            const result = await createVirtualAccountFunction({
                memberId: user.memberId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone
            })

            if (!result.data.success) {
                throw new Error(result.data.message || 'Failed to create virtual account')
            }

            setVirtualAccountDetails({
                bankName: result.data.data.bankName,
                accountNumber: result.data.data.accountNumber,
                accountName: result.data.data.accountName,
                tier: selectedTier
            })

            setCurrentStep(5)
        } catch (error) {
            console.error('Account creation error:', error)
            setErrors({ general: error.message || 'Failed to create virtual account. Please try again.' })
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount) => {
        if (amount === 'Unlimited') return amount
        return `₦${amount.toLocaleString()}`
    }

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="space-y-6">
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center justify-center size-20 rounded-full bg-primary/10">
                                <Wallet className="text-primary" size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Activate Your Virtual Account
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                                Get a dedicated Nigerian bank account for seamless savings and instant deposits.
                            </p>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                                <CheckCircle size={18} />
                                Benefits
                            </h3>
                            <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5">✓</span>
                                    <span>Instant deposits - funds appear immediately in your wallet</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5">✓</span>
                                    <span>No transfer charges - save more with zero fees</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-0.5">✓</span>
                                    <span>CBN-compliant - secure and regulated by Central Bank of Nigeria</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                                <Info size={18} />
                                Requirements
                            </h3>
                            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                                <li className="flex items-start gap-2">
                                    <span>•</span>
                                    <span>Bank Verification Number (BVN)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span>•</span>
                                    <span>National Identity Number (NIN)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span>•</span>
                                    <span>Date of Birth (must match your BVN records)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span>•</span>
                                    <span>NIN Slip (for higher transaction limits)</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                            <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                                <Shield size={18} />
                                Privacy & Security
                            </h3>
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                Your BVN and NIN are encrypted and stored securely. We only use this information
                                for identity verification as required by Nigerian banking regulations.
                            </p>
                        </div>

                        <Button
                            onClick={() => setCurrentStep(1)}
                            className="w-full"
                            size="lg"
                        >
                            Get Started
                            <ArrowRight size={20} className="ml-2" />
                        </Button>
                    </div>
                )

            case 1:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                Choose Your Account Tier
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                Select the tier that matches your transaction needs
                            </p>
                        </div>

                        <div className="grid gap-4">
                            {TIER_OPTIONS.map((option) => (
                                <Card
                                    key={option.tier}
                                    className={`relative cursor-pointer transition-all ${option.disabled
                                        ? 'opacity-60 cursor-not-allowed'
                                        : selectedTier === option.tier
                                            ? 'ring-2 ring-primary shadow-lg'
                                            : 'hover:shadow-md'
                                        } ${option.recommended ? 'border-primary' : ''}`}
                                    onClick={() => !option.disabled && setSelectedTier(option.tier)}
                                >
                                    {option.recommended && (
                                        <div className="absolute -top-3 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                                            Recommended
                                        </div>
                                    )}
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                                    {option.name}
                                                </h3>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                                    Maximum Balance: <span className="font-semibold text-primary">
                                                        {formatCurrency(option.maxBalance)}
                                                    </span>
                                                </p>
                                            </div>
                                            {selectedTier === option.tier && (
                                                <CheckCircle className="text-primary" size={24} />
                                            )}
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600 dark:text-slate-400">Daily Limit:</span>
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                    {formatCurrency(option.dailyLimit)}
                                                </span>
                                            </div>
                                            {option.singleTransaction && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-600 dark:text-slate-400">Per Transaction:</span>
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {formatCurrency(option.singleTransaction)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                                Requirements:
                                            </p>
                                            <ul className="space-y-1">
                                                {option.requirements.map((req, idx) => (
                                                    <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                                        <span className="text-primary mt-0.5">•</span>
                                                        <span>{req}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStep(0)}
                                className="flex-1"
                            >
                                <ArrowLeft size={20} className="mr-2" />
                                Back
                            </Button>
                            <Button
                                onClick={() => setCurrentStep(2)}
                                disabled={!selectedTier}
                                className="flex-1"
                            >
                                Continue
                                <ArrowRight size={20} className="ml-2" />
                            </Button>
                        </div>
                    </div>
                )

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                Verify Your Identity
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                Enter your BVN and NIN for verification
                            </p>
                        </div>

                        {errors.general && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-200">
                                {errors.general}
                            </div>
                        )}

                        <div className="space-y-4">
                            <Input
                                label="Bank Verification Number (BVN)"
                                type="text"
                                name="bvn"
                                placeholder="Enter your 11-digit BVN"
                                value={formData.bvn}
                                onChange={handleInputChange}
                                error={errors.bvn}
                                maxLength={11}
                                required
                                helperText="Your BVN starts with '2' and is 11 digits long"
                            />

                            <Input
                                label="National Identity Number (NIN)"
                                type="text"
                                name="nin"
                                placeholder="Enter your 11-digit NIN"
                                value={formData.nin}
                                onChange={handleInputChange}
                                error={errors.nin}
                                maxLength={11}
                                required
                                helperText="Your NIN is an 11-digit number"
                            />

                            <Input
                                label="Date of Birth"
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleInputChange}
                                error={errors.dateOfBirth}
                                required
                                helperText="Must match your BVN records exactly"
                            />
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                            <div className="flex gap-2">
                                <Info className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={16} />
                                <div className="text-sm text-amber-900 dark:text-amber-100">
                                    <p className="font-semibold mb-1">Verification Process</p>
                                    <p>
                                        We'll verify that your name, date of birth, and phone number match
                                        your BVN records. This is required by Nigerian banking regulations.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStep(1)}
                                className="flex-1"
                                disabled={loading}
                            >
                                <ArrowLeft size={20} className="mr-2" />
                                Back
                            </Button>
                            <Button
                                onClick={handleVerifyBVN}
                                className="flex-1"
                                disabled={loading}
                            >
                                {loading ? 'Verifying...' : 'Verify Identity'}
                                {!loading && <ArrowRight size={20} className="ml-2" />}
                            </Button>
                        </div>
                    </div>
                )

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                Upload NIN Slip
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                Please upload the front page only
                            </p>
                        </div>

                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
                            <Upload className="mx-auto text-slate-400 mb-4" size={48} />
                            <input
                                type="file"
                                id="ninSlip"
                                accept="image/jpeg,image/png,application/pdf"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <label
                                htmlFor="ninSlip"
                                className="cursor-pointer inline-block"
                            >
                                <Button type="button" variant="outline">
                                    Browse Files
                                </Button>
                            </label>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
                                {formData.ninSlipFile ? formData.ninSlipFile.name : 'Accepted: JPG, PNG, PDF'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                Maximum file size: 5MB
                            </p>
                            {errors.ninSlipFile && (
                                <p className="text-red-500 text-sm mt-2">{errors.ninSlipFile}</p>
                            )}
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                Tips for best results:
                            </p>
                            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                                <li>• Take a clear, well-lit photo</li>
                                <li>• Ensure all four corners are visible</li>
                                <li>• Avoid glare or shadows</li>
                                <li>• Make sure text is readable</li>
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStep(2)}
                                className="flex-1"
                                disabled={loading}
                            >
                                <ArrowLeft size={20} className="mr-2" />
                                Back
                            </Button>
                            <Button
                                onClick={handleUploadNINSlip}
                                className="flex-1"
                                disabled={loading || !formData.ninSlipFile}
                            >
                                {loading ? 'Uploading...' : 'Upload & Continue'}
                                {!loading && <ArrowRight size={20} className="ml-2" />}
                            </Button>
                        </div>
                    </div>
                )

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                Create Virtual Account
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                Ready to create your dedicated bank account
                            </p>
                        </div>

                        {verificationResult && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                                        Identity Verified Successfully
                                    </h3>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                                        <CheckCircle size={14} />
                                        <span>Name Match</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                                        <CheckCircle size={14} />
                                        <span>Date of Birth Match</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                                        <CheckCircle size={14} />
                                        <span>Phone Match</span>
                                    </div>
                                    {selectedTier >= 2 && (
                                        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                                            <CheckCircle size={14} />
                                            <span>NIN Slip Uploaded</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5">
                            <div className="p-6 space-y-3">
                                <h3 className="font-bold text-slate-900 dark:text-white">
                                    Account Summary
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">Tier:</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            Tier {selectedTier}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">Maximum Balance:</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            {formatCurrency(TIER_OPTIONS.find(t => t.tier === selectedTier)?.maxBalance)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">Daily Limit:</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            {formatCurrency(TIER_OPTIONS.find(t => t.tier === selectedTier)?.dailyLimit)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Button
                            onClick={handleCreateVirtualAccount}
                            className="w-full"
                            size="lg"
                            disabled={loading}
                        >
                            {loading ? 'Creating Account...' : 'Create Virtual Account'}
                        </Button>
                    </div>
                )

            case 5:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center size-20 rounded-full bg-green-500/10 mb-4">
                                <CheckCircle className="text-green-600" size={48} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                Virtual Account Created!
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                Your dedicated bank account is ready to use
                            </p>
                        </div>

                        <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
                            <div className="p-6 space-y-4">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                    Your Account Details
                                </h3>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Bank Name</p>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                                            {virtualAccountDetails?.bankName}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Account Number</p>
                                        <p className="text-2xl font-bold text-primary">
                                            {virtualAccountDetails?.accountNumber}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Account Name</p>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                                            {virtualAccountDetails?.accountName}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Account Tier:</span>
                                        <span className="font-semibold text-primary">
                                            Tier {virtualAccountDetails?.tier}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex gap-2">
                                <Info className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={16} />
                                <div className="text-sm text-blue-900 dark:text-blue-100">
                                    <p className="font-semibold mb-1">How to Use</p>
                                    <p>
                                        Transfer money to this account number from any Nigerian bank.
                                        Funds will appear instantly in your cooperative wallet.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={() => navigate('/member/savings')}
                            className="w-full"
                            size="lg"
                        >
                            Go to Wallet
                        </Button>
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/member/savings')}
                        className="mb-4"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back to Savings
                    </Button>

                    {/* Progress Steps */}
                    {currentStep < 5 && (
                        <div className="flex items-center justify-between mb-8">
                            {steps.slice(0, 5).map((step, idx) => (
                                <div key={step.id} className="flex items-center">
                                    <div className={`flex flex-col items-center ${idx > 0 ? 'ml-2' : ''}`}>
                                        <div
                                            className={`size-10 rounded-full flex items-center justify-center font-bold transition-all ${currentStep >= step.id
                                                ? 'bg-primary text-white'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                                }`}
                                        >
                                            {currentStep > step.id ? (
                                                <CheckCircle size={20} />
                                            ) : (
                                                <span>{step.id + 1}</span>
                                            )}
                                        </div>
                                        <span className="text-xs mt-1 text-slate-600 dark:text-slate-400 hidden sm:block">
                                            {step.title}
                                        </span>
                                    </div>
                                    {idx < 4 && (
                                        <div
                                            className={`h-1 w-8 sm:w-16 mx-1 transition-all ${currentStep > step.id
                                                ? 'bg-primary'
                                                : 'bg-slate-200 dark:bg-slate-700'
                                                }`}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <Card>
                    <div className="p-8">
                        {renderStepContent()}
                    </div>
                </Card>
            </div>
        </div>
    )
}
