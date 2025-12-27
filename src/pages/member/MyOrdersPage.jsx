import { useState } from 'react'
import { Package, Search, Filter, Download, Eye, X } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

// Mock Orders Data
const MOCK_ORDERS = [
    {
        id: 'ORD-001',
        productName: 'Bag of Rice (50kg)',
        category: 'Foodstuff',
        quantity: 2,
        amount: 130000,
        orderDate: '2023-12-20',
        status: 'delivered',
        deliveryDate: '2023-12-23',
        paymentMethod: 'Monthly Deduction'
    },
    {
        id: 'ORD-002',
        productName: 'Samsung Galaxy A54',
        category: 'Electronics',
        quantity: 1,
        amount: 450000,
        orderDate: '2023-12-15',
        status: 'approved',
        deliveryDate: null,
        paymentMethod: 'Installment (6 months)'
    },
    {
        id: 'ORD-003',
        productName: '3.5kVA Solar Inverter System',
        category: 'Solar & Power',
        quantity: 1,
        amount: 1200000,
        orderDate: '2023-12-10',
        status: 'pending',
        deliveryDate: null,
        paymentMethod: 'Installment (12 months)'
    },
    {
        id: 'ORD-004',
        productName: 'Double Door Refrigerator',
        category: 'Home Appliances',
        quantity: 1,
        amount: 550000,
        orderDate: '2023-11-28',
        status: 'delivered',
        deliveryDate: '2023-12-02',
        paymentMethod: 'Installment (10 months)'
    },
    {
        id: 'ORD-005',
        productName: 'Vegetable Oil (25L)',
        category: 'Foodstuff',
        quantity: 3,
        amount: 135000,
        orderDate: '2023-12-01',
        status: 'cancelled',
        deliveryDate: null,
        paymentMethod: 'Monthly Deduction'
    }
]

const STATUS_FILTERS = ['all', 'pending', 'approved', 'delivered', 'cancelled']

export default function MyOrdersPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selectedOrder, setSelectedOrder] = useState(null)

    const filteredOrders = MOCK_ORDERS.filter(order => {
        const matchesSearch = order.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.id.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const getStatusBadge = (status) => {
        const statusStyles = {
            pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize ${statusStyles[status]}`}>
                {status}
            </span>
        )
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Orders</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Track and manage your commodity orders
                    </p>
                </div>
                <Button variant="outline">
                    <Download size={20} />
                    Export Orders
                </Button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 max-w-md">
                    <Input
                        placeholder="Search by order ID or product name..."
                        icon={Search}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Status Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {STATUS_FILTERS.map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap border ${statusFilter === status
                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/25'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/50'
                                }`}
                        >
                            {status === 'all' ? 'All Orders' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Table */}
            <Card className="overflow-hidden p-0">
                {filteredOrders.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Order ID</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Product</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Quantity</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Order Date</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm font-semibold text-primary">
                                            {order.id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{order.productName}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{order.category}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {order.quantity}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                            {formatCurrency(order.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {formatDate(order.orderDate)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(order.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedOrder(order)}
                                            >
                                                <Eye size={16} />
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-16 text-center">
                        <div className="mx-auto size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                            <Package size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                            No orders found
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400">
                            {searchQuery || statusFilter !== 'all'
                                ? 'Try adjusting your search or filter'
                                : 'You haven\'t placed any orders yet'}
                        </p>
                    </div>
                )}
            </Card>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Order Details</h2>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Order Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Order ID</p>
                                    <p className="font-mono text-primary font-bold">{selectedOrder.id}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Status</p>
                                    {getStatusBadge(selectedOrder.status)}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Order Date</p>
                                    <p className="text-slate-900 dark:text-white">{formatDate(selectedOrder.orderDate)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Delivery Date</p>
                                    <p className="text-slate-900 dark:text-white">
                                        {selectedOrder.deliveryDate ? formatDate(selectedOrder.deliveryDate) : 'Pending'}
                                    </p>
                                </div>
                            </div>

                            <hr className="border-slate-200 dark:border-slate-700" />

                            {/* Product Details */}
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Product Information</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">Product Name</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{selectedOrder.productName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">Category</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{selectedOrder.category}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">Quantity</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{selectedOrder.quantity}</span>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-200 dark:border-slate-700" />

                            {/* Payment Info */}
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Payment Information</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">Payment Method</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{selectedOrder.paymentMethod}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">Total Amount</span>
                                        <span className="font-bold text-xl text-primary">{formatCurrency(selectedOrder.amount)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button onClick={() => setSelectedOrder(null)} className="flex-1">
                                    Close
                                </Button>
                                {selectedOrder.status === 'pending' && (
                                    <Button variant="outline" className="flex-1">
                                        Cancel Order
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
