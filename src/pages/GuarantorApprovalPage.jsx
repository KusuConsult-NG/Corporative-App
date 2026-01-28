import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, AlertTriangle, Loader, DollarSign, FileText, User } from 'lucide-react'
import { guarantorAPI } from '../services/api'
import { formatCurrency } from '../utils/formatters'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function GuarantorApprovalPage() {
    const { token } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [approval, setApproval] = useState(null)
    const [error, setError] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')
    const [showRejectionForm, setShowRejectionForm] = useState(false)

    useEffect(() => {
        loadApprovalData()
    }, [token])

    const loadApprovalData = async () => {
        try {
            setLoading(true)
            const data = await guarantorAPI.getGuarantorApprovalByToken(token)

            if (!data) {
                setError('Invalid or expired approval link')
                return
            }

            // Check if already responded
            if (data.status !== 'pending') {
                setError(`You have already ${data.status} this request`)
                return
            }

            // Check if expired
            if (new Date(data.expiresAt) < new Date()) {
                setError('This approval link has expired')
                return
            }

            setApproval(data)
        } catch (err) {
            setError('Failed to load approval data')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async () => {
        if (!agreedToTerms) {
            alert('Please agree to the terms and conditions')
            return
        }

        setSubmitting(true)
        try {
            await guarantorAPI.updateGuarantorStatus(token, 'approved')
            alert('You have successfully approved the guarantor request!')
            navigate('/')
        } catch (err) {
            console.error(err)
            alert('Failed to approve request. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            alert('Please provide a reason for rejecting this request')
            return
        }

        setSubmitting(true)
        try {
            await guarantorAPI.updateGuarantorStatus(token, 'rejected', rejectionReason)
            alert('You have declined the guarantor request')
            navigate('/')
        } catch (err) {
            console.error(err)
            alert('Failed to reject request. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="text-center">
                    <Loader className="animate-spin mx-auto mb-4 text-primary" size={48} />
                    <p className="text-slate-600 dark:text-slate-400">Loading approval request...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
                <Card className="max-w-md text-center">
                    <AlertTriangle className="mx-auto mb-4 text-red-500" size={64} />
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Unable to Process Request
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
                    <Button onClick={() => navigate('/')} variant="secondary">
                        Return to Home
                    </Button>
                </Card>
            </div>
        )
    }

    if (showRejectionForm) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4 py-8">
                <Card className="max-w-2xl w-full">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                        Decline Guarantor Request
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 dark:text-gray-200 mb-2">
                                Reason for Declining
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows="4"
                                placeholder="Please provide a brief explanation..."
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div className="flex gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => setShowRejectionForm(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleReject}
                                loading={submitting}
                                className="flex-1"
                            >
                                Confirm Decline
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4 py-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        Guarantor Request
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Please review the loan details and decide whether to approve
                    </p>
                </div>

                {/* Loan Details */}
                <Card className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                        Loan Application Details
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <User className="text-primary shrink-0 mt-1" size={20} />
                            <div className="flex-1">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Applicant</p>
                                <p className="font-bold text-slate-900 dark:text-white">{approval.applicantName}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <DollarSign className="text-primary shrink-0 mt-1" size={20} />
                            <div className="flex-1">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Loan Amount</p>
                                <p className="font-bold text-slate-900 dark:text-white text-xl">
                                    {formatCurrency(approval.loanAmount)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <FileText className="text-primary shrink-0 mt-1" size={20} />
                            <div className="flex-1">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Purpose</p>
                                <p className="font-medium text-slate-900 dark:text-white">{approval.loanPurpose}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Responsibilities */}
                <Card className="mb-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="text-amber-600" size={20} />
                        Guarantor Responsibilities
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                        <li className="flex gap-2">
                            <span>•</span>
                            <span>You agree to take financial responsibility if the borrower defaults on the loan</span>
                        </li>
                        <li className="flex gap-2">
                            <span>•</span>
                            <span>You may be contacted for payment if the borrower fails to repay</span>
                        </li>
                        <li className="flex gap-2">
                            <span>•</span>
                            <span>This is a legally binding commitment</span>
                        </li>
                        <li className="flex gap-2">
                            <span>•</span>
                            <span>Ensure you trust the borrower's ability to repay before approving</span>
                        </li>
                    </ul>
                </Card>

                {/* Agreement */}
                <Card className="mb-6">
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center size-5 mt-0.5">
                            <input
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="peer appearance-none size-5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 checked:bg-primary checked:border-primary transition-all"
                            />
                            <CheckCircle size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-gray-300 transition-colors">
                                I understand and agree to the responsibilities of being a guarantor for this loan.
                                I have carefully reviewed the loan details and borrower information.
                            </p>
                        </div>
                    </label>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={() => setShowRejectionForm(true)}
                        className="flex-1 border-2"
                    >
                        <XCircle size={20} />
                        Decline
                    </Button>
                    <Button
                        onClick={handleApprove}
                        loading={submitting}
                        disabled={!agreedToTerms}
                        className="flex-1"
                    >
                        <CheckCircle size={20} />
                        Approve Request
                    </Button>
                </div>

                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                    This link expires on {new Date(approval.expiresAt).toLocaleDateString()}
                </p>
            </div>
        </div>
    )
}
