import { Clock, AlertTriangle } from 'lucide-react'
import Card from './ui/Card'
import Button from './ui/Button'

export default function SessionTimeoutWarning({ remainingTime, onExtend }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
            <Card className="max-w-md w-full p-6 shadow-2xl border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                        <AlertTriangle className="text-orange-600 dark:text-orange-400" size={28} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                            Session Expiring Soon
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Your session will expire due to inactivity
                        </p>
                    </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Clock className="text-orange-600 dark:text-orange-400" size={20} />
                        <div>
                            <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                                Time Remaining
                            </p>
                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                                {remainingTime}
                            </p>
                        </div>
                    </div>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    You will be automatically logged out when the timer reaches zero. Click the button below to stay logged in.
                </p>

                <div className="flex gap-3">
                    <Button
                        onClick={onExtend}
                        className="flex-1"
                        size="lg"
                    >
                        Stay Logged In
                    </Button>
                </div>
            </Card>
        </div>
    )
}
