import { useState, useEffect } from 'react'
import { Search, CheckCircle, XCircle, Clock, MessageCircle, Send } from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import { complaintsAPI } from '../../services/complaintsAPI'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

export default function AdminComplaintsPage() {
    const [complaints, setComplaints] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, open, in_progress, resolved
    const [searchQuery, setSearchQuery] = useState('')
    const [showResponseModal, setShowResponseModal] = useState(false)
    const [selectedComplaint, setSelectedComplaint] = useState(null)
    const [response, setResponse] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchComplaints()
    }, [])

    const fetchComplaints = async () => {
        try {
            setLoading(true)
            const data = await complaintsAPI.getAll()
            setComplaints(data)
        } catch (error) {
            console.error('Error fetching complaints:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRespond = (complaint) => {
        setSelectedComplaint(complaint)
        setResponse(complaint.adminResponse || '')
        setShowResponseModal(true)
    }

    const handleSubmitResponse = async () => {
        if (!response.trim()) return

        setSubmitting(true)
        try {
            await complaintsAPI.updateStatus(selectedComplaint.id, 'resolved', response)
            await fetchComplaints()
            setShowResponseModal(false)
            setSelectedComplaint(null)
            setResponse('')
            alert('Response submitted successfully!')
        } catch (error) {
            console.error('Error submitting response:', error)
            alert('Failed to submit response')
        } finally {
            setSubmitting(false)
        }
    }

    const filteredComplaints = complaints.filter(c => {
        const matchesFilter = filter === 'all' || c.status === filter
        const matchesSearch = c.memberName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.subject?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesFilter && matchesSearch
    })

    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        }
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Complaints Management</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Review and respond to member complaints
                </p>
            </div>

            {/* Filters */}
            <Card className="p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                        {['all', 'open', 'in_progress', 'resolved'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize whitespace-nowrap ${filter === tab
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {tab.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <div className="w-full md:w-72">
                        <Input
                            placeholder="Search complaints..."
                            icon={Search}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Complaints Table */}
            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Member</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Subject</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Date</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Status</th>
                                <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredComplaints.map((complaint) => (
                                <tr key={complaint.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                {complaint.memberName}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {complaint.memberId}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {complaint.subject}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                            {complaint.description}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {complaint.createdAt ? formatDate(complaint.createdAt.toDate()) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(complaint.status)}`}>
                                            {complaint.status === 'resolved' && <CheckCircle size={12} />}
                                            {complaint.status === 'open' && <Clock size={12} />}
                                            <span className="capitalize">{complaint.status?.replace('_', ' ')}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            size="sm"
                                            variant={complaint.status === 'resolved' ? 'ghost' : 'default'}
                                            onClick={() => handleRespond(complaint)}
                                        >
                                            <MessageCircle size={16} />
                                            {complaint.status === 'resolved' ? 'View' : 'Respond'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Response Modal */}
            {showResponseModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            Respond to Complaint
                        </h3>
                        <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                                {selectedComplaint?.subject}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                                From: {selectedComplaint?.memberName}
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                {selectedComplaint?.description}
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                                Your Response
                            </label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                rows="6"
                                placeholder="Type your response..."
                                value={response}
                                onChange={(e) => setResponse(e.target.value)}
                                disabled={selectedComplaint?.status === 'resolved'}
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="ghost"
                                onClick={() => setShowResponseModal(false)}
                            >
                                Close
                            </Button>
                            {selectedComplaint?.status !== 'resolved' && (
                                <Button
                                    onClick={handleSubmitResponse}
                                    loading={submitting}
                                    disabled={!response.trim()}
                                >
                                    <Send size={16} />
                                    Send Response
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
