import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, ShoppingBag, User, Calendar, DollarSign } from 'lucide-react'
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { formatCurrency } from '../../utils/formatters'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

export default function AdminCommodityOrdersPage() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('pending_approval') // 'all', 'pending_approval', 'approved', 'rejected', 'processing', 'delivered'
    const [processingId, setProcessingId] = useState(null)

    useEffect(() => {
        fetchOrders()
    }, [filter])

    const fetchOrders = async () => {
        setLoading(true)
        try {
            let q
            if (filter === 'all') {
                q = query(collection(db, 'commodityOrders'), orderBy('orderedAt', 'desc'))
            } else {
                q = query(
                    collection(db, 'commodityOrders'),
                    where('status', '==', filter),
                    orderBy('orderedAt', 'desc')
                )
            }

            const snapshot = await getDocs(q)
            const ordersList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))

            setOrders(ordersList)
        } catch (error) {
            console.error('Error fetching orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusUpdate = async (orderId, newStatus, note = '') => {
        setProcessingId(orderId)
        try {
            const order = orders.find(o => o.id === orderId)
            if (!order) return

            await updateDoc(doc(db, 'commodityOrders', orderId), {
                status: newStatus,
                approvedBy: newStatus === 'approved' ? 'Admin' : null,
                approvedAt: newStatus === 'approved' ? serverTimestamp() : null,
                rejectionReason: newStatus === 'rejected' ? note : null,
                updatedAt: serverTimestamp()
            })

            // TODO: Send email notification to user
            alert(`Order ${newStatus} successfully!`)
            await fetchOrders()
        } catch (error) {
            console.error('Error updating order:', error)
            alert('Failed to update order status')
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
            pending_approval: {
                bg: 'bg-yellow-100 dark:bg-yellow-900/30',
                text: 'text-yellow-700 dark:text-yellow-400',
                label: 'Pending Approval'
            },
            approved: {
                bg: 'bg-green-100 dark:bg-green-900/30',
                text: 'text-green-700 dark:text-green-400',
                label: 'Approved'
            },
            rejected: {
                bg: 'bg-red-100 dark:bg-red-900/30',
                text: 'text-red-700 dark:text-red-400',
                label: 'Rejected'
            },
            processing: {
                bg: 'bg-blue-100 dark:bg-blue-900/30',
                text: 'text-blue-700 dark:text-blue-400',
                label: 'Processing'
            },
            delivered: {
                bg: 'bg-green-100 dark:bg-green-900/30',
                text: 'text-green-700 dark:text-green-400',
                label: 'Delivered'
            },
            cancelled: {
                bg: 'bg-gray-100 dark:bg-gray-900/30',
                text: 'text-gray-700 dark:text-gray-400',
                label: 'Cancelled'
            }
        }

        const item = config[status] || config.pending_approval
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.bg} ${item.text}`}>
                {item.label}
            </span>
        )
    }

    const getStatusCount = (status) => {
        if (status === 'all') return orders.length
        return orders.filter(o => o.status === status).length
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Commodity Orders Management
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Review and manage member commodity orders
                </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setFilter('pending_approval')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filter === 'pending_approval'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <Clock size={16} className="inline mr-1" />
                    Pending ({getStatusCount('pending_approval')})
                </button>
                <button
                    onClick={() => setFilter('approved')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filter === 'approved'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <CheckCircle size={16} className="inline mr-1" />
                    Approved ({getStatusCount('approved')})
                </button>
                <button
                    onClick={() => setFilter('processing')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filter === 'processing'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    Processing ({getStatusCount('processing')})
                </button>
                <button
                    onClick={() => setFilter('delivered')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filter === 'delivered'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    Delivered ({getStatusCount('delivered')})
                </button>
                <button
                    onClick={() => setFilter('rejected')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filter === 'rejected'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <XCircle size={16} className="inline mr-1" />
                    Rejected ({getStatusCount('rejected')})
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filter === 'all'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    All ({orders.length})
                </button>
            </div>

            {/* Orders List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Loading orders...</p>
                </div>
            ) : orders.length === 0 ? (
                <Card className="text-center py-12">
                    <ShoppingBag size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No {filter !== 'all' ? filter.replace('_', ' ') : ''} orders
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                        {filter === 'pending_approval'
                            ? 'All orders have been processed'
                            : `No ${filter} orders found`}
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <Card key={order.id} className="hover:shadow-lg transition-shadow">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                {/* Order Info */}
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                                <ShoppingBag className="text-blue-600 dark:text-blue-400" size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                                    {order.productName}
                                                </h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    {order.productCategory}
                                                </p>
                                            </div>
                                        </div>
                                        {getStatusBadge(order.status)}
                                    </div>

                                    {/* User Info */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <User size={16} className="text-slate-400" />
                                                <div>
                                                    <p className="text-slate-500 dark:text-slate-400 text-xs">Member</p>
                                                    <p className="font-medium text-slate-900 dark:text-white">{order.userName}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <DollarSign size={16} className="text-slate-400" />
                                                <div>
                                                    <p className="text-slate-500 dark:text-slate-400 text-xs">Total Amount</p>
                                                    <p className="font-medium text-slate-900 dark:text-white">
                                                        {formatCurrency(order.totalAmount)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Details */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-3">
                                        <div>
                                            <p className="text-slate-500 dark:text-slate-400">Payment Type</p>
                                            <p className="font-medium text-slate-900 dark:text-white capitalize">
                                                {order.paymentType?.replace('_', ' ') || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 dark:text-slate-400">Monthly Payment</p>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {formatCurrency(order.monthlyPayment)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 dark:text-slate-400">Duration</p>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {order.duration} month{order.duration !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Timestamps */}
                                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            <span>Ordered: {formatDate(order.orderedAt)}</span>
                                        </div>
                                        {order.approvedAt && (
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                <span>Approved: {formatDate(order.approvedAt)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Rejection Reason */}
                                    {order.rejectionReason && (
                                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                            <p className="text-xs font-semibold text-red-900 dark:text-red-400 mb-1">
                                                Rejection Reason:
                                            </p>
                                            <p className="text-sm text-red-800 dark:text-red-300">
                                                {order.rejectionReason}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {order.status === 'pending_approval' && (
                                    <div className="flex lg:flex-col gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                const note = prompt('Add approval note (optional):')
                                                if (note !== null) {
                                                    handleStatusUpdate(order.id, 'approved', note)
                                                }
                                            }}
                                            disabled={processingId === order.id}
                                            loading={processingId === order.id}
                                            className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700"
                                        >
                                            <CheckCircle size={16} />
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const reason = prompt('Reason for rejection (required):')
                                                if (reason && reason.trim()) {
                                                    handleStatusUpdate(order.id, 'rejected', reason)
                                                } else if (reason !== null) {
                                                    alert('Please provide a reason for rejection')
                                                }
                                            }}
                                            disabled={processingId === order.id}
                                            className="flex-1 lg:flex-none border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                                        >
                                            <XCircle size={16} />
                                            Reject
                                        </Button>
                                    </div>
                                )}

                                {order.status === 'approved' && (
                                    <Button
                                        size="sm"
                                        onClick={() => handleStatusUpdate(order.id, 'processing')}
                                        disabled={processingId === order.id}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        Mark as Processing
                                    </Button>
                                )}

                                {order.status === 'processing' && (
                                    <Button
                                        size="sm"
                                        onClick={() => handleStatusUpdate(order.id, 'delivered')}
                                        disabled={processingId === order.id}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        Mark as Delivered
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
