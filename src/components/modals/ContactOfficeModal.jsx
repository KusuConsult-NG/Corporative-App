import { X, MapPin, Phone, Mail } from 'lucide-react'

export default function ContactOfficeModal({ isOpen, onClose }) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-primary to-blue-600">
                    <div>
                        <h2 className="text-xl font-bold text-white">Contact Cooperative Office</h2>
                        <p className="text-sm text-blue-100">AWSLMCSL Headquarters</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Address */}
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
                            <MapPin size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Office Address</h3>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                University of Jos Library<br />
                                PMB 2084<br />
                                Jos, Plateau State, Nigeria
                            </p>
                        </div>
                    </div>

                    {/* Phone Numbers */}
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
                            <Phone size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Contact Numbers</h3>
                            <div className="space-y-2">
                                <a
                                    href="tel:08065810868"
                                    className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors"
                                >
                                    <span className="font-mono">08065810868</span>
                                </a>
                                <a
                                    href="tel:08136905553"
                                    className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors"
                                >
                                    <span className="font-mono">08136905553</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
                            <Mail size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Email Address</h3>
                            <a
                                href="mailto:support@anchoragecs.com"
                                className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors underline"
                            >
                                support@anchoragecs.com
                            </a>
                        </div>
                    </div>

                    {/* Office Hours */}
                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Office Hours</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Monday - Friday: 8:00 AM - 5:00 PM<br />
                            Saturday - Sunday: Closed
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <button
                        onClick={() => window.location.href = 'mailto:support@anchoragecs.com'}
                        className="px-6 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-primary/20"
                    >
                        Send Email
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-semibold transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
