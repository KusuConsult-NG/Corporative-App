import { X, FileText, Download } from 'lucide-react'
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

export default function ByeLawModal({ isOpen, onClose }) {
    const [bylawContent, setBylawContent] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isOpen) {
            fetch('/documents/AWSLMCSL_BYE_LAW.md')
                .then(res => res.text())
                .then(text => {
                    setBylawContent(text)
                    setLoading(false)
                })
                .catch(error => {
                    console.error('Error loading bye-law:', error)
                    setLoading(false)
                })
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-primary to-blue-600">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                            <FileText className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">AWSLMCSL Bye-Law</h2>
                            <p className="text-sm text-blue-100">Anchorage Welfare Savings and Loans Multipurpose Cooperative Society Limited</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-800">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                        </div>
                    ) : (
                        <div className="prose prose-slate dark:prose-invert prose-lg max-w-none text-slate-900 dark:text-slate-100 
                                        prose-headings:font-bold prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:text-primary
                                        prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-6 prose-h2:text-slate-800 dark:prose-h2:text-white
                                        prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-5 prose-h3:text-slate-700 dark:prose-h3:text-slate-200
                                        prose-p:mb-4 prose-p:leading-relaxed prose-p:text-slate-700 dark:prose-p:text-slate-300
                                        prose-li:mb-2 prose-li:text-slate-700 dark:prose-li:text-slate-300
                                        prose-ul:my-4 prose-ol:my-4 prose-ul:space-y-2 prose-ol:space-y-2
                                        prose-hr:my-8 prose-hr:border-slate-300 dark:prose-hr:border-slate-600
                                        prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-semibold">
                            <ReactMarkdown>
                                {bylawContent}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Registration Number: <span className="font-bold">PL 26267</span>
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-primary/20"
                    >
                        I Have Read and Understood
                    </button>
                </div>
            </div>
        </div>
    )
}
