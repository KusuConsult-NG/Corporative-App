import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, FileText, Calendar, User } from 'lucide-react'
import { collection, getDocs, doc, updateDoc, serverTimestamp, orderBy, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

export default function AdminReportsPage() {
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('pending')
    const [processingId, setProcessingId] = useState(null)

    useEffect(() => {
        fetchReports()
    }, [filter])

    const fetchReports = async () => {
        setLoading(true)
        try {
            let q
            if (filter === 'all') {
                q = query(collection(db, 'reports'), orderBy('submittedAt', 'desc'))
            } else {
                q = query(
                    collection(db, 'reports'),
                    where('status', '==', filter),
                    orderBy('submittedAt', 'desc')
                )
            }

            const snapshot = await getDocs(q)
            const reportsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))

            setReports(reportsList)
        } catch (error) {
            console.error('Error fetching reports:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusUpdate = async (reportId, newStatus, response = '') => {
        setProcessingId(reportId)
        try {
            await updateDoc(doc(db, 'reports', reportId), {
                status: newStatus,
                response: response || null,
                respondedBy: 'Admin',
                respondedAt: serverTimestamp()
            })

            await fetchReports()
            alert('Report status updated successfully!')
        } catch (error) {
            console.error('Error updating report:', error)
            alert('Failed to update report status')
        } finally {
            setProcessingId(null)
        }
    }

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A'
        const date = timestamp.toDate()
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date)
    }

    const getStatusBadge = (status) => {
        const config = {
            pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Pending' },
            in_review: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'In Review' },
            resolved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Resolved' },
            closed: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-400', label: 'Closed' }
        }
        const item = config[status] || config.pending
        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.bg} ${item.text}`}>{item.label}</span>
    }

    const getCategoryBadge = (category) => {
        const labels = {
            complaint: 'Complaint',
            technical_issue: 'Technical Issue',
            suggestion: 'Suggestion',
            financial_query: 'Financial Query',
            other: 'Other'
        }
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{labels[category] || category}</span>
    }

    const getStatusCount = (status) => status === 'all' ? reports.length : reports.filter(r => r.status === status).length

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Reports Management</h1>
                <p className="text-slate-600 dark:text-slate-400">Review and manage member reports and feedback</p>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {['pending', 'in_review', 'resolved', 'closed', 'all'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filter === status
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')} ({getStatusCount(status)})
                    </button>
                ))}
            </div>

            {/* Reports List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Loading reports...</p>
                </div>
            ) : reports.length === 0 ? (
                <Card className="text-center py-12">
                    <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No {filter !== 'all' ? filter : ''} reports</h3>
                    <p className="text-slate-600 dark:text-slate-400">No reports found</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {reports.map((report) => (
                        <Card key={report.id} className="hover:shadow-lg transition-shadow">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                {getCategoryBadge(report.category)}
                                                {getStatusBadge(report.status)}
                                            </div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">{report.subject}</h3>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-3">
                                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{report.description}</p>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
                                        <div className="flex items-center gap-1">
                                            <User size={14} />
                                            <span>{report.userName}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            <span>Submitted: {formatDate(report.submittedAt)}</span>
                                        </div>
                                    </div>

                                    {report.response && (
                                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                            <p className="text-xs font-semibold text-blue-900 dark:text-blue-400 mb-1">Admin Response:</p>
                                            <p className="text-sm text-blue-800 dark:text-blue-300">{report.response}</p>
                                        </div>
                                    )}
                                </div>

                                {report.status === 'pending' && (
                                    <div className="flex lg:flex-col gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                const response = prompt('Add response message (optional):')
                                                if (response !== null) {
                                                    handleStatusUpdate(report.id, 'in_review', response)
                                                }
                                            }}
                                            disabled={processingId === report.id}
                                            className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-700"
                                        >
                                            Start Review
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                const response = prompt('Resolution message (required):')
                                                if (response && response.trim()) {
                                                    handleStatusUpdate(report.id, 'resolved', response)
                                                } else if (response !== null) {
                                                    alert('Please provide a resolution message')
                                                }
                                            }}
                                            disabled={processingId === report.id}
                                            className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700"
                                        >
                                            Resolve
                                        </Button>
                                    </div>
                                )}

                                {report.status === 'in_review' && (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            const response = prompt('Resolution message (required):')
                                            if (response && response.trim()) {
                                                handleStatusUpdate(report.id, 'resolved', response)
                                            } else if (response !== null) {
                                                alert('Please provide a resolution message')
                                            }
                                        }}
                                        disabled={processingId === report.id}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        Mark as Resolved
                                    </Button>
                                )}

                                {report.status === 'resolved' && (
                                    <Button
                                        size="sm"
                                        onClick={() => handleStatusUpdate(report.id, 'closed')}
                                        disabled={processingId === report.id}
                                        variant="outline"
                                    >
                                        Close Report
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
