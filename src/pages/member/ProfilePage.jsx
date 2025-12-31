import { useState, useEffect } from 'react'
import { User, Mail, Building, Phone, Upload, CreditCard, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { uploadPassport, deletePassport } from '../../utils/storageUtils'
import { calculateProfileCompletion, getMissingProfileFields } from '../../utils/profileUtils'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import AddBankDetailsModal from '../../components/AddBankDetailsModal'
import ApprovalStatusBadge from '../../components/ui/ApprovalStatusBadge'
import { useToast } from '../../context/ToastContext'

export default function ProfilePage() {
    const { user, updateProfileField } = useAuthStore()
    const toast = useToast()
    const [loading, setLoading] = useState(false)
    const [uploadingPassport, setUploadingPassport] = useState(false)
    const [showBankModal, setShowBankModal] = useState(false)
    const [bankRequests, setBankRequests] = useState([])
    const [phone, setPhone] = useState(user?.phone || '')

    // Sync phone state when user profile is updated/hydrated
    useEffect(() => {
        if (!loading && user?.phone) {
            setPhone(user.phone)
        }
    }, [user?.phone, loading])

    // Calculate profile completion
    const completionPercentage = calculateProfileCompletion(user)
    const missingFields = getMissingProfileFields(user)

    // Listen to bank detail approval requests
    useEffect(() => {
        if (!user?.userId) return

        const q = query(
            collection(db, 'approvalRequests'),
            where('userId', '==', user.userId),
            where('type', '==', 'bank_details')
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setBankRequests(requests)
        })

        return () => unsubscribe()
    }, [user?.userId])

    const handlePassportUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        const validExtensions = ['jpg', 'jpeg', 'png', 'webp']
        const extension = file.name.split('.').pop().toLowerCase()
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

        if (!allowedTypes.includes(file.type) && !validExtensions.includes(extension)) {
            toast.error('Please upload a valid image (JPEG, JPG, PNG)')
            return
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
            toast.error('Image size must be less than 5MB')
            return
        }

        setUploadingPassport(true)

        try {
            // Capture old passport for cleanup
            const oldPassportUrl = user?.passport

            // Upload new passport
            const downloadURL = await uploadPassport(file, user.userId)

            // Update user profile
            const profileUpdates = {
                passport: downloadURL,
                passportUploadedAt: new Date()
            }

            // Check if this makes the profile complete
            const updatedUser = { ...user, ...profileUpdates }
            const isComplete = calculateProfileCompletion(updatedUser) === 100

            if (isComplete) {
                profileUpdates.profileComplete = true
            }

            const result = await updateProfileField(user.userId, profileUpdates)

            if (result.success) {
                toast.success('Passport photo uploaded successfully!')

                // Cleanup old passport (Non-blocking)
                if (oldPassportUrl) {
                    deletePassport(oldPassportUrl).catch(console.error)
                }
            } else {
                toast.error(result.error || 'Photo uploaded but failed to update profile.')
            }
        } catch (err) {
            console.error('Upload flow error:', err)
            toast.error(err.message || 'Failed to upload passport photo')
        } finally {
            setUploadingPassport(false)
            // Reset input
            e.target.value = ''
        }
    }

    const handlePhoneUpdate = async () => {
        if (phone === user?.phone) return

        // Validate phone number (11 digits starting with 0)
        if (!/^0\d{10}$/.test(phone)) {
            toast.error('Phone number must be 11 digits starting with 0')
            return
        }

        setLoading(true)

        try {
            const result = await updateProfileField(user.userId, 'phone', phone)

            if (result.success) {
                toast.success('Phone number updated successfully!')
            } else {
                toast.error(result.error || 'Failed to update phone number')
            }
        } catch (err) {
            toast.error(err.message || 'Failed to update phone number')
        } finally {
            setLoading(false)
        }
    }

    const getApprovedBankAccounts = () => {
        return bankRequests.filter(req => req.status === 'approved')
    }

    return (
        <div className="p-6 lg:p-10 max-w-6xl mx-auto flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Profile</h1>
            </div>

            {/* Profile Completion */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                            Profile Completion
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Complete your profile to apply for loans
                        </p>
                    </div>
                    <div className="text-3xl font-bold text-primary">
                        {completionPercentage}%
                    </div>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                    <div
                        className="bg-gradient-to-r from-primary to-purple-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${completionPercentage}%` }}
                    />
                </div>

                {missingFields.length > 0 && (
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Missing fields:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {missingFields.map((field, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                >
                                    {field}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </Card>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <Card className="lg:col-span-1 flex flex-col items-center p-6 text-center">
                    <div className="relative mb-4">
                        {user?.passport ? (
                            <img
                                src={user.passport}
                                alt="Passport"
                                className="size-32 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-lg"
                            />
                        ) : (
                            <div className="size-32 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-4xl font-bold text-slate-500 dark:text-slate-400 border-4 border-white dark:border-gray-700 shadow-lg">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                        )}

                        <label
                            htmlFor="passport-upload"
                            className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
                        >
                            {uploadingPassport ? (
                                <Loader size={16} className="animate-spin" />
                            ) : (
                                <Upload size={16} />
                            )}
                        </label>
                        <input
                            id="passport-upload"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png"
                            onChange={handlePassportUpload}
                            className="hidden"
                            disabled={uploadingPassport}
                        />
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">
                        {user?.role === 'admin' ? 'Administrator' : 'Cooperative Member'}
                    </p>

                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-sm font-medium mb-6">
                        <CheckCircle size={16} />
                        {user?.status === 'active' ? 'Active Member' : user?.status || 'Pending'}
                    </div>

                    <div className="w-full space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Member ID</span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                                {user?.memberId || user?.staffId}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Email Verified</span>
                            <span className="font-semibold">
                                {user?.emailVerified ? (
                                    <CheckCircle size={16} className="text-green-600" />
                                ) : (
                                    <AlertCircle size={16} className="text-yellow-600" />
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Registration Fee</span>
                            <span className="font-semibold">
                                {user?.registrationFeePaid ? (
                                    <CheckCircle size={16} className="text-green-600" />
                                ) : (
                                    <AlertCircle size={16} className="text-yellow-600" />
                                )}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Details Form */}
                <Card className="lg:col-span-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                        Personal Information
                    </h3>

                    <div className="space-y-6">
                        {/* Read-only fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">
                                    Full Name
                                </label>
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                    <User size={18} className="text-slate-400" />
                                    <span className="text-slate-900 dark:text-white">{user?.name}</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">
                                    Email Address
                                </label>
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                    <Mail size={18} className="text-slate-400" />
                                    <span className="text-slate-900 dark:text-white text-sm">{user?.email}</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">
                                    Staff Number
                                </label>
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-900 dark:text-white">{user?.staffId}</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">
                                    Department
                                </label>
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                    <Building size={18} className="text-slate-400" />
                                    <span className="text-slate-900 dark:text-white">{user?.department}</span>
                                </div>
                            </div>
                        </div>

                        {/* Phone Number - Editable */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">
                                Phone Number
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                <div className="w-full max-w-md">
                                    <Input
                                        type="tel"
                                        icon={Phone}
                                        placeholder="08012345678"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                        maxLength={11}
                                    />
                                </div>
                                {(phone !== user?.phone) && (
                                    <Button onClick={handlePhoneUpdate} loading={loading} className="w-full sm:w-auto">
                                        Save Changes
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-2 italic">
                                11 digits starting with 0 (e.g., 08012345678)
                            </p>
                        </div>

                        {/* Bank Details Section */}
                        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-md font-bold text-slate-900 dark:text-white">
                                    Bank Accounts
                                </h4>
                                <Button size="sm" onClick={() => setShowBankModal(true)}>
                                    <CreditCard size={16} />
                                    Add Bank Account
                                </Button>
                            </div>

                            {bankRequests.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <CreditCard size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                                        No bank accounts added yet
                                    </p>
                                    <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
                                        Add a bank account to receive loan disbursements
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {bankRequests.map((request) => (
                                        <div
                                            key={request.id}
                                            className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-900 dark:text-white">
                                                        {request.requestData?.bankName}
                                                    </p>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                                        {request.requestData?.accountNumber}
                                                    </p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-500">
                                                        {request.requestData?.accountName}
                                                    </p>
                                                </div>
                                                <ApprovalStatusBadge status={request.status} />
                                            </div>
                                            {request.reviewNote && request.status === 'rejected' && (
                                                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-400">
                                                    <strong>Reason:</strong> {request.reviewNote}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {getApprovedBankAccounts().length === 0 && bankRequests.length > 0 && (
                                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-2 text-yellow-800 dark:text-yellow-400 text-xs">
                                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                    <span>
                                        You need at least one approved bank account to apply for loans.
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Add Bank Details Modal */}
            <AddBankDetailsModal
                isOpen={showBankModal}
                onClose={() => setShowBankModal(false)}
                userId={user?.userId}
                userName={user?.name}
                userEmail={user?.email}
            />
        </div>
    )
}
