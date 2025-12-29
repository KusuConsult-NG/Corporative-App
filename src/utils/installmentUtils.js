/**
 * Installment Payment Utilities
 * Functions for generating and managing commodity installment payment schedules
 */

/**
 * Generate installment payment schedule from commodity order
 * @param {Object} order - Commodity order object
 * @returns {Array} - Array of installment objects
 */
export const generateCommodityInstallmentSchedule = (order) => {
    if (order.paymentType !== 'installment') {
        return []
    }

    const totalAmount = order.totalAmount
    const duration = order.duration || 12
    const monthlyPayment = order.monthlyPayment
    const startDate = order.deductionsStartDate ? new Date(order.deductionsStartDate) : new Date()

    const schedule = []
    let remainingAmount = totalAmount

    for (let i = 0; i < duration; i++) {
        const dueDate = new Date(startDate)
        dueDate.setMonth(dueDate.getMonth() + i)

        // Calculate amount for this installment
        let installmentAmount
        if (i === duration - 1) {
            // Last installment gets any remainder
            installmentAmount = remainingAmount
        } else {
            installmentAmount = Math.min(monthlyPayment, remainingAmount)
        }

        schedule.push({
            installmentNumber: i + 1,
            amount: installmentAmount,
            dueDate: dueDate,
            status: 'pending',
            paidDate: null,
            paidAmount: 0,
            paymentReference: null,
            processedBy: null,
            processedAt: null
        })

        remainingAmount -= installmentAmount
    }

    return schedule
}

/**
 * Generate basic installment schedule (for display purposes)
 * @param {number} totalAmount - Total amount to pay
 * @param {number} numberOfInstallments - Number of installments
 * @param {Date} startDate - Start date for payments
 * @returns {Array} - Array of installment objects
 */
export const generateInstallmentSchedule = (totalAmount, numberOfInstallments, startDate = new Date()) => {
    const installmentAmount = Math.ceil(totalAmount / numberOfInstallments)
    const schedule = []

    for (let i = 0; i < numberOfInstallments; i++) {
        const dueDate = new Date(startDate)
        dueDate.setMonth(dueDate.getMonth() + i)

        schedule.push({
            installmentNumber: i + 1,
            amount: i === numberOfInstallments - 1
                ? totalAmount - (installmentAmount * (numberOfInstallments - 1)) // Last installment gets remainder
                : installmentAmount,
            dueDate: dueDate,
            status: 'pending',
            paidDate: null,
            paidAmount: 0
        })
    }

    return schedule
}

/**
 * Calculate remaining balance from payment schedule
 * @param {Array} schedule - Payment schedule array
 * @returns {number} - Remaining unpaid balance
 */
export const calculateRemainingBalance = (schedule) => {
    return schedule
        .filter(payment => payment.status !== 'paid')
        .reduce((sum, payment) => sum + payment.amount, 0)
}

/**
 * Calculate total paid amount from payment schedule
 * @param {Array} schedule - Payment schedule array
 * @returns {number} - Total paid amount
 */
export const calculateTotalPaid = (schedule) => {
    return schedule
        .filter(payment => payment.status === 'paid')
        .reduce((sum, payment) => sum + payment.paidAmount, 0)
}

/**
 * Get next due payment from schedule
 * @param {Array} schedule - Payment schedule array
 * @returns {Object|null} - Next pending payment or null
 */
export const getNextDuePayment = (schedule) => {
    const pending = schedule.filter(p => p.status === 'pending')
    if (pending.length === 0) return null

    // Sort by due date and return earliest
    return pending.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]
}

/**
 * Get all overdue payments from schedule
 * @param {Array} schedule - Payment schedule array
 * @returns {Array} - Array of overdue payments
 */
export const getOverduePayments = (schedule) => {
    const now = new Date()
    return schedule.filter(payment => {
        return payment.status === 'pending' && new Date(payment.dueDate) < now
    })
}

/**
 * Mark a payment as paid in the schedule
 * @param {Array} schedule - Payment schedule array
 * @param {number} installmentNumber - Installment number to mark as paid
 * @param {number} paidAmount - Amount paid
 * @param {Date} paidDate - Date of payment
 * @param {string} reference - Payment reference
 * @param {string} processedBy - UserID of admin who processed
 * @returns {Array} - Updated schedule
 */
export const markPaymentAsPaid = (schedule, installmentNumber, paidAmount, paidDate, reference = null, processedBy = null) => {
    return schedule.map(payment => {
        if (payment.installmentNumber === installmentNumber) {
            return {
                ...payment,
                status: 'paid',
                paidDate: paidDate,
                paidAmount: paidAmount,
                paymentReference: reference,
                processedBy: processedBy,
                processedAt: new Date()
            }
        }
        return payment
    })
}

/**
 * Get payment progress percentage
 * @param {Array} schedule - Payment schedule array
 * @returns {number} - Completion percentage (0-100)
 */
export const getPaymentProgress = (schedule) => {
    if (!schedule || schedule.length === 0) return 0

    const paidCount = schedule.filter(p => p.status === 'paid').length
    return Math.round((paidCount / schedule.length) * 100)
}

/**
 * Update overdue status for payments past due date
 * @param {Array} schedule - Payment schedule array
 * @returns {Array} - Updated schedule with overdue statuses
 */
export const updateOverdueStatus = (schedule) => {
    const now = new Date()
    return schedule.map(payment => {
        if (payment.status === 'pending' && new Date(payment.dueDate) < now) {
            return { ...payment, status: 'overdue' }
        }
        return payment
    })
}

/**
 * Get payment statistics from schedule
 * @param {Array} schedule - Payment schedule array
 * @returns {Object} - Payment statistics
 */
export const getPaymentStatistics = (schedule) => {
    const totalAmount = schedule.reduce((sum, p) => sum + p.amount, 0)
    const paidAmount = calculateTotalPaid(schedule)
    const remainingAmount = calculateRemainingBalance(schedule)
    const paidCount = schedule.filter(p => p.status === 'paid').length
    const pendingCount = schedule.filter(p => p.status === 'pending').length
    const overdueCount = schedule.filter(p => p.status === 'overdue').length
    const progress = getPaymentProgress(schedule)

    return {
        totalAmount,
        paidAmount,
        remainingAmount,
        totalInstallments: schedule.length,
        paidInstallments: paidCount,
        pendingInstallments: pendingCount,
        overdueInstallments: overdueCount,
        progressPercentage: progress
    }
}

/**
 * Export schedule to CSV
 * @param {Array} schedule - Payment schedule array
 * @param {string} commodityName - Name of commodity
 */
export const exportScheduleToCSV = (schedule, commodityName) => {
    const headers = ['Installment', 'Amount', 'Due Date', 'Status', 'Paid Date', 'Paid Amount']
    const rows = schedule.map(s => [
        s.installmentNumber,
        `₦${s.amount.toLocaleString()}`,
        new Date(s.dueDate).toLocaleDateString(),
        s.status,
        s.paidDate ? new Date(s.paidDate).toLocaleDateString() : 'N/A',
        s.paidAmount ? `₦${s.paidAmount.toLocaleString()}` : 'N/A'
    ])

    let csv = headers.join(',') + '\n'
    rows.forEach(row => {
        csv += row.join(',') + '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${commodityName}_installment_schedule.csv`
    link.click()
}

/**
 * Validate if a payment can be processed
 * @param {Object} payment - Payment object from schedule
 * @returns {Object} - Validation result with isValid and message
 */
export const validatePaymentProcessing = (payment) => {
    if (!payment) {
        return { isValid: false, message: 'Payment not found' }
    }

    if (payment.status === 'paid') {
        return { isValid: false, message: 'Payment already processed' }
    }

    return { isValid: true, message: 'Payment can be processed' }
}
