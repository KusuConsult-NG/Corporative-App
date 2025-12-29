import { useState, useEffect } from 'react'
import { Calendar, CheckCircle, Clock, AlertTriangle, User, DollarSign, Search, Filter } from 'lucide-react'
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { updateOverdueStatus } from '../../utils/installmentUtils'
import { emailService } from '../../services/emailService'
import { createSystemNotification } from '../../utils/notificationUtils'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function AdminCommodityDeductionsPage() {
    const { user } = useAuthStore()
    const [deductions, setDeductions] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filter, setFilter] = useState('due_this_month') // 'all', 'due_this_month', 'overdue', 'upcoming'
    const [processingId, setProcessingId] = useState(null)
    const [selectedDeductions, setSelectedDeductions] = useState(new Set())

    useEffect(() => {
        fetchDeductions()
    }, [])

    const fetchDeductions = async () => {
        setLoading(true)
        try {
            // Get all orders with installment payment type that are approved or in progress
            const ordersQuery = query(
                collection(db, 'commodityOrders'),
                where('paymentType', '==', 'installment'),
                where('status', 'in', ['approved', 'processing', 'delivered'])
            )

            const ordersSnapshot = await getDocs(ordersQuery)
            const allDeductions = []

            // For each order, get its installment schedule
            for (const orderDoc of ordersSnapshot.docs) {
                const order = { id: orderDoc.id, ...orderDoc.data() }

                const scheduleQuery = query(collection(db, `commodityOrders/${order.id}/installmentSchedule`))
                const scheduleSnapshot = await getDocs(scheduleQuery)

                const schedulePayments = scheduleSnapshot.docs.map(doc => ({
                    id: doc.id,
                    orderId: order.id,
                    orderData: order,
                    ...doc.data(),
                    dueDate: doc.data().dueDate?.toDate?.() || new Date(),
                    paidDate: doc.data().paidDate?.toDate?.() || null
                }))

                // Update overdue statuses
                const updatedPayments = updateOverdueStatus(schedulePayments)

                // Only include pending or overdue payments
                const pendingPayments = updatedPayments.filter(p => p.status === 'pending' || p.status === 'overdue')

                allDeductions.push(...pendingPayments)
            }

            // Sort by due date (earliest first)
            allDeductions.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))

            setDeductions(allDeductions)
        } catch (error) {
            console.error('Error fetching deductions:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleProcessDeduction = async (deduction) => {
        const confirm = window.confirm(
            `Process payment of ${formatCurrency(deduction.amount)} for ${deduction.orderData.userName}?`
        )
        if (!confirm) return

        setProcessingId(deduction.id)
        try {
            const reference = `PAY-${Date.now()}`
            const now = new Date()

            // Update installment schedule
            await updateDoc(doc(db, `commodityOrders/${deduction.orderId}/installmentSchedule/${deduction.id}`), {
                status: 'paid',
                paidDate: Timestamp.fromDate(now),
                paidAmount: deduction.amount,
                paymentReference: reference,
                processedBy: user.userId,
                processedAt: Timestamp.fromDate(now)
            })

            // Update order's paid/remaining counts
            const newPaidCount = (deduction.orderData.deductionsPaid || 0) + 1
            const newRemainingCount = (deduction.orderData.deductionsRemaining || deduction.orderData.duration) - 1

            await updateDoc(doc(db, 'commodityOrders', deduction.orderId), {
                deductionsPaid: newPaidCount,
                deductionsRemaining: newRemainingCount,
                updatedAt: serverTimestamp()
            })

            // Log payment in commodityPayments collection
            await addDoc(collection(db, 'commodityPayments'), {
                orderId: deduction.orderId,
                userId: deduction.orderData.userId,
                userName: deduction.orderData.userName,
                productName: deduction.orderData.productName,
                installmentNumber: deduction.installmentNumber,
                amount: deduction.amount,
                paymentDate: serverTimestamp(),
                paymentMethod: 'salary_deduction',
                processedBy: user.userId,
                processedByName: user.name,
                reference: reference,
                notes: `Installment ${deduction.installmentNumber} of ${deduction.orderData.duration}`
            })

            // Send notification and email to member
            await createSystemNotification({
                userId: deduction.orderData.userId,
                type: 'payment_due',
                title: 'Payment Processed',
                message: `Installment payment of ${formatCurrency(deduction.amount)} has been processed`,
                actionUrl: '/member/orders'
            })

            await emailService.sendPaymentConfirmationEmail(
                deduction.orderData.userEmail,
                {
                    userName: deduction.orderData.userName,
                    productName: deduction.orderData.productName,
                    installmentNumber: deduction.installmentNumber,
                    totalInstallments: deduction.orderData.duration,
                    amount: deduction.amount,
                    reference
                }
            )

            alert('Payment processed successfully!')
            await fetchDeductions()
        } catch (error) {
            console.error('Error processing payment:', error)
            alert('Failed to process payment')
        } finally {
            setProcessingId(null)
        }
    }

    const handleBulkProcess = async () => {
        if (selectedDeductions.size === 0) {
            alert('Please select at least one deduction to process')
            return
        }

        const confirm = window.confirm(
            `Process ${selectedDeductions.size} selected payment(s)?`
        )
        if (!confirm) return

        setLoading(true)
        let successCount = 0
        let errorCount = 0

        for (const deductionId of selectedDeductions) {
            const deduction = deductions.find(d => d.id === deductionId)
            if (!deduction) continue

            try {
                const reference = `PAY-${Date.now()}-${successCount}`
                const now = new Date()

                await updateDoc(doc(db, `commodityOrders/${deduction.orderId}/installmentSchedule/${deduction.id}`), {
                    status: 'paid',
                    paidDate: Timestamp.fromDate(now),
                    paidAmount: deduction.amount,
                    paymentReference: reference,
                    processedBy: user.userId,
                    processedAt: Timestamp.fromDate(now)
                })

                const newPaidCount = (deduction.orderData.deductionsPaid || 0) + 1
                const newRemainingCount = (deduction.orderData.deductionsRemaining || deduction.orderData.duration) - 1

                await updateDoc(doc(db, 'commodityOrders', deduction.orderId), {
                    deductionsPaid: newPaidCount,
                    deductionsRemaining: newRemainingCount,
                    updatedAt: serverTimestamp()
                })

                await addDoc(collection(db, 'commodityPayments'), {
                    orderId: deduction.orderId,
                    userId: deduction.orderData.userId,
                    userName: deduction.orderData.userName,
                    productName: deduction.orderData.productName,
                    installmentNumber: deduction.installmentNumber,
                    amount: deduction.amount,
                    paymentDate: serverTimestamp(),
                    paymentMethod: 'salary_deduction',
                    processedBy: user.userId,
                    processedByName: user.name,
                    reference: reference,
                    notes: `Bulk processing - Installment ${deduction.installmentNumber} of ${deduction.orderData.duration}`
                })

                successCount++
            } catch (error) {
                console.error(`Error processing deduction ${deduction.id}:`, error)
                errorCount++
            }
        }

        setLoading(false)
        setSelectedDeductions(new Set())
        alert(`Processed ${successCount} payment(s) successfully${errorCount > 0 ? `. ${errorCount} failed.` : ''}`)
        await fetchDeductions()
    }

    const toggleSelection = (deductionId) => {
        const newSelection = new Set(selectedDeductions)
        if (newSelection.has(deductionId)) {
            newSelection.delete(deductionId)
        } else {
            newSelection.add(deductionId)
        }
        setSelectedDeductions(newSelection)
    }

    const selectAll = () => {
        const filtered = getFilteredDeductions()
        if (selectedDeductions.size === filtered.length) {
            setSelectedDeductions(new Set())
        } else {
            setSelectedDeductions(new Set(filtered.map(d => d.id)))
        }
    }

    const getFilteredDeductions = () => {
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        return deductions.filter(deduction => {
            // Search filter
            const matchesSearch = deduction.orderData.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                deduction.orderData.productName.toLowerCase().includes(searchQuery.toLowerCase())

            if (!matchesSearch) return false

            // Status filter
            const dueDate = new Date(deduction.dueDate)
            const isOverdue = deduction.status === 'overdue'
            const isDueThisMonth = dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear
            const isUpcoming = dueDate > now && !isDueThisMonth

            if (filter === 'due_this_month') return isDueThisMonth || isOverdue
            if (filter === 'overdue') return isOverdue
            if (filter === 'upcoming') return isUpcoming
            return true // 'all'
        })
    }

    const filteredDeductions = getFilteredDeductions()

    const getStats = () => {
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        const dueThisMonth = deductions.filter(d => {
            const dueDate = new Date(d.dueDate)
            return (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) || d.status === 'overdue'
        })

        const overdue = deductions.filter(d => d.status === 'overdue')
        const totalAmount = dueThisMonth.reduce((sum, d) => sum + d.amount, 0)

        return {
            totalPending: deductions.length,
            dueThisMonth: dueThisMonth.length,
            overdueCount: overdue.length,
            totalCollectible: totalAmount
        }
    }

    const stats = getStats()

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Commodity Salary Deductions
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Process monthly installment payments for commodity orders
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Due This Month</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.dueThisMonth}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <DollarSign className="text-green-600 dark:text-green-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Collectible</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {formatCurrency(stats.totalCollectible)}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <Clock className="text-yellow-600 dark:text-yellow-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Pending</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalPending}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Overdue</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.overdueCount}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 max-w-md">
                    <Input
                        placeholder="Search by member or product name..."
                        icon={Search}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto">
                    {['due_this_month', 'overdue', 'upcoming', 'all'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap border ${filter === f
                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/25'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/50'
                                }`}
                        >
                            {f === 'due_this_month' ? 'Due This Month' :
                                f === 'overdue' ? 'Overdue' :
                                    f === 'upcoming' ? 'Upcoming' : 'All'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedDeductions.size > 0 && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        {selectedDeductions.size} payment(s) selected
                    </span>
                    <Button onClick={handleBulkProcess} className="bg-blue-600 hover:bg-blue-700">
                        <CheckCircle size={16} />
                        Process Selected
                    </Button>
                </div>
            )}

            {/* Deductions Table */}
            <Card className="overflow-hidden p-0">
                {loading ? (
                    <div className="py-16 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="mt-4 text-slate-600 dark:text-slate-400">Loading deductions...</p>
                    </div>
                ) : filteredDeductions.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-4 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedDeductions.size === filteredDeductions.length}
                                            onChange={selectAll}
                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Member</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Product</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Installment</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Due Date</th>
                                    <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-400">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredDeductions.map((deduction) => (
                                    <tr key={deduction.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedDeductions.has(deduction.id)}
                                                onChange={() => toggleSelection(deduction.id)}
                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <User size={16} className="text-slate-400" />
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">
                                                        {deduction.orderData.userName}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {deduction.orderData.userEmail}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {deduction.orderData.productName}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {deduction.orderData.productCategory}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {deduction.installmentNumber} / {deduction.orderData.duration}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {formatDate(deduction.dueDate)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                            {formatCurrency(deduction.amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {deduction.status === 'overdue' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                                    <AlertTriangle size={12} />
                                                    Overdue
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                                                    <Clock size={12} />
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                size="sm"
                                                onClick={() => handleProcessDeduction(deduction)}
                                                disabled={processingId === deduction.id}
                                                loading={processingId === deduction.id}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <CheckCircle size={16} />
                                                Process
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-16 text-center">
                        <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            No deductions found
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400">
                            {searchQuery || filter !== 'all'
                                ? 'Try adjusting your search or filter'
                                : 'No pending installment payments at this time'}
                        </p>
                    </div>
                )}
            </Card>
        </div>
    )
}
