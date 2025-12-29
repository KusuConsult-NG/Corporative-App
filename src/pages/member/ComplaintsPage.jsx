import { useState } from 'react'
import { FileText, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { complaintsAPI } from '../../services/complaintsAPI'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

export default function ComplaintsPage() {
    const { user } = useAuthStore()
    const [formData, setFormData] = useState({
        subject: '',
        description: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.subject.trim() || !formData.description.trim()) {
            setError('Please fill in all fields')
            return
        }

        setSubmitting(true)
        setError('')

        try {
            await complaintsAPI.create({
                userId: user.userId,
                memberId: user.memberId,
                memberName: user.name,
                subject: formData.subject,
                description: formData.description
            })

            setSuccess(true)
            setFormData({ subject: '', description: '' })

            setTimeout(() => setSuccess(false), 5000)
        } catch (err) {
            setError('Failed to submit complaint. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="p-6 lg:p-10 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Submit a Complaint</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    We're here to help. Let us know if you're experiencing any issues.
                </p>
            </div>

            {success && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
                    <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                    <div>
                        <p className="font-semibold text-green-900 dark:text-green-400">Complaint Submitted</p>
                        <p className="text-sm text-green-700 dark:text-green-500">We'll review your complaint and get back to you soon.</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                    <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                    <p className="text-sm text-red-700 dark:text-red-500">{error}</p>
                </div>
            )}

            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Subject"
                        placeholder="Brief description of the issue"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        icon={FileText}
                        required
                    />

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            rows="6"
                            placeholder="Provide details about your complaint..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>

                    <Button type="submit" loading={submitting} className="w-full sm:w-auto">
                        <Send size={18} />
                        Submit Complaint
                    </Button>
                </form>
            </Card>
        </div>
    )
}
