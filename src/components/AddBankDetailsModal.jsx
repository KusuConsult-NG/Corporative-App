import { useState } from 'react'
import { X } from 'lucide-react'
import Button from './ui/Button'
import Input from './ui/Input'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { emailService } from '../services/emailService'

export default function AddBankDetailsModal({ isOpen, onClose, userId, userName, userEmail }) {
    const [formData, setFormData] = useState({
        bankName: '',
        accountNumber: '',
        accountName: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Validate account number (10 digits)
            if (!/^\d{10}$/.test(formData.accountNumber)) {
                throw new Error('Account number must be exactly 10 digits')
            }

            // Create approval request
            await addDoc(collection(db, 'approvalRequests'), {
                userId,
                userName,
                userEmail,
                type: 'bank_details',
                status: 'pending',
                requestData: {
                    bankName: formData.bankName,
                    accountNumber: formData.accountNumber,
                    accountName: formData.accountName
                },
                requestedAt: serverTimestamp(),
                reviewedBy: null,
                reviewedAt: null,
                reviewNote: ''
            })

            // Get all admin users to send notifications
            const adminsQuery = query(
                collection(db, 'users'),
                where('role', 'in', ['admin', 'superadmin'])
            )
            const adminsSnapshot = await getDocs(adminsQuery)

            // Send email to all admins
            const requestDetails = `
                <p><strong>Bank Name:</strong> ${formData.bankName}</p>
                <p><strong>Account Number:</strong> ${formData.accountNumber}</p>
                <p><strong>Account Name:</strong> ${formData.accountName}</p>
            `

            adminsSnapshot.docs.forEach(async (doc) => {
                const adminData = doc.data()
                if (adminData.email) {
                    await emailService.sendAdminApprovalNotification(
                        adminData.email,
                        'bank_details',
                        userName,
                        requestDetails
                    )
                }
            })

            // Reset form and close modal
            setFormData({ bankName: '', accountNumber: '', accountName: '' })
            onClose()
            alert('Bank details submitted for approval! You will be notified once reviewed.')
        } catch (err) {
            setError(err.message || 'Failed to submit bank details')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Add Bank Account
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Bank Name
                        </label>
                        <select
                            value={formData.bankName}
                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            required
                        >
                            <option value="">Select Bank</option>
                            <option value="Access Bank">Access Bank</option>
                            <option value="Citibank">Citibank</option>
                            <option value="Ecobank Nigeria">Ecobank Nigeria</option>
                            <option value="Fidelity Bank">Fidelity Bank</option>
                            <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                            <option value="First City Monument Bank">First City Monument Bank</option>
                            <option value="Globus Bank">Globus Bank</option>
                            <option value="Guaranty Trust Bank">Guaranty Trust Bank</option>
                            <option value="Heritage Bank">Heritage Bank</option>
                            <option value="Keystone Bank">Keystone Bank</option>
                            <option value="Parallex Bank">Parallex Bank</option>
                            <option value="Polaris Bank">Polaris Bank</option>
                            <option value="Providus Bank">Providus Bank</option>
                            <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                            <option value="Standard Chartered Bank">Standard Chartered Bank</option>
                            <option value="Sterling Bank">Sterling Bank</option>
                            <option value="SunTrust Bank">SunTrust Bank</option>
                            <option value="Union Bank of Nigeria">Union Bank of Nigeria</option>
                            <option value="United Bank for Africa">United Bank for Africa</option>
                            <option value="Unity Bank">Unity Bank</option>
                            <option value="Wema Bank">Wema Bank</option>
                            <option value="Zenith Bank">Zenith Bank</option>
                        </select>
                    </div>

                    <Input
                        label="Account Number"
                        type="text"
                        placeholder="0123456789"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        required
                        maxLength={10}
                    />

                    <Input
                        label="Account Name"
                        type="text"
                        placeholder="John Doe"
                        value={formData.accountName}
                        onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                        required
                    />

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                        <p className="text-xs text-yellow-800 dark:text-yellow-400">
                            <strong>Note:</strong> Your bank details will be reviewed by an administrator before being approved.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" loading={loading} className="flex-1">
                            Submit for Approval
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
