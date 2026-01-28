import { XCircle } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { useAuthStore } from '../../store/authStore'
import { useEffect, useState } from 'react'

export default function RegistrationRejectedPage() {
    const { user } = useAuthStore()
    const [reason, setReason] = useState('')

    useEffect(() => {
        if (user?.rejectionReason) {
            setReason(user.rejectionReason)
        }
    }, [user])

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <Card className="max-w-md w-full p-8 text-center">
                <div className="inline-flex p-4 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                    <XCircle className="text-red-600 dark:text-red-400" size={48} />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Registration Not Approved
                </h1>

                <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Unfortunately, your registration could not be approved at this time.
                </p>

                {reason && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                            Reason:
                        </p>
                        <p className="text-sm text-red-800 dark:text-red-200">
                            {reason}
                        </p>
                    </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Need help?</strong><br />
                        If you believe this decision was made in error or have questions,
                        please contact our admin team for assistance.
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={() => window.location.href = '/auth'}
                    className="w-full"
                >
                    Back to Login
                </Button>
            </Card>
        </div>
    )
}
