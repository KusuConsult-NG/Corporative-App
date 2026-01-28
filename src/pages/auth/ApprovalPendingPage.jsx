import { AlertCircle } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

export default function ApprovalPendingPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <Card className="max-w-md w-full p-8 text-center">
                <div className="inline-flex p-4 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4">
                    <AlertCircle className="text-orange-600 dark:text-orange-400" size={48} />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Approval Pending
                </h1>

                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Your registration is currently under review by our administrators.
                    You will receive an email notification once your account has been approved.
                </p>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>What happens next?</strong><br />
                        Our admin team will review your information and verify your details.
                        This process typically takes 1-2 business days.
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
