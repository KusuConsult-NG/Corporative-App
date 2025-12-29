import { useState } from 'react'
import { Send, AlertCircle } from 'lucide-react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuthStore } from '../../store/authStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

const REPORT_CATEGORIES = [
    { value: 'complaint', label: 'Complaint' },
    { value: 'technical_issue', label: 'Technical Issue' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'financial_query', label: 'Financial Query' },
    { value: 'other', label: 'Other' }
]

export default function SubmitReportPage() {
    const { user } = useAuthStore()
    const [formData, setFormData] = useState({
        category: '',
        subject: '',
        description: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess(false)
        setLoading(true)

        try {
            if (!formData.category || !formData.subject.trim() || !formData.description.trim()) {
                throw new Error('Please fill in all fields')
            }

            await addDoc(collection(db, 'reports'), {
                userId: user.userId,
                userName: user.name,
                userEmail: user.email,
                category: formData.category,
                subject: formData.subject,
                description: formData.description,
                status: 'pending', // pending, in_review, resolved, closed
                response: null,
                respondedBy: null,
                respondedAt: null,
                submittedAt: serverTimestamp()
            })

            setSuccess(true)
            setFormData({ category: '', subject: '', description: '' })
            setTimeout(() => setSuccess(false), 5000)
        } catch (err) {
            setError(err.message || 'Failed to submit report')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 lg:p-10 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Submit a Report
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Share your feedback, report issues, or ask questions
                </p>
            </div>

            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Select
                        label="Category"
                        options={REPORT_CATEGORIES}
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="Select category..."
                        required
                    />

                    <Input
                        label="Subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Brief description of your report"
                        required
                    />

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={8}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                            placeholder="Provide detailed information about your report..."
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400 text-sm">
                            Report submitted successfully! We'll review it and respond soon.
                        </div>
                    )}

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            <strong>Note:</strong> Your report will be reviewed by our admin team. We aim to respond within 48 hours.
                        </p>
                    </div>

                    <Button type="submit" loading={loading} className="w-full">
                        <Send size={20} />
                        Submit Report
                    </Button>
                </form>
            </Card>
        </div>
    )
}
