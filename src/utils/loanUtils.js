/**
 * Calculate loan repayment schedule with monthly deductions
 * Deductions start on the last day of the month in which the loan was applied
 */
export const calculateLoanRepaymentSchedule = (loanAmount, duration, interestRate, applicationDate = new Date()) => {
    // Calculate total amount with interest
    const totalInterest = (loanAmount * interestRate * duration) / (100 * 12)
    const totalAmount = loanAmount + totalInterest

    // Calculate standard monthly payment
    const standardMonthlyPayment = totalAmount / duration

    // Get the last day of the application month
    const appDate = new Date(applicationDate)
    const firstDeductionDate = new Date(appDate.getFullYear(), appDate.getMonth() + 1, 0) // Last day of current month

    // Generate repayment schedule
    const schedule = []
    for (let i = 0; i < duration; i++) {
        const deductionDate = new Date(firstDeductionDate)
        deductionDate.setMonth(firstDeductionDate.getMonth() + i + 1)
        deductionDate.setDate(0) // Last day of that month

        schedule.push({
            month: i + 1,
            dueDate: deductionDate,
            amount: standardMonthlyPayment,
            status: 'pending'
        })
    }

    return {
        loanAmount,
        interestRate,
        duration,
        totalInterest,
        totalAmount,
        monthlyPayment: standardMonthlyPayment,
        firstDeductionDate,
        schedule
    }
}

/**
 * Calculate custom monthly payment based on user's preferred deduction amount
 */
export const calculateCustomRepayment = (loanAmount, duration, interestRate, customMonthlyAmount) => {
    const totalInterest = (loanAmount * interestRate * duration) / (100 * 12)
    const totalAmount = loanAmount + totalInterest
    const standardMonthlyPayment = totalAmount / duration

    // Validate custom amount
    if (customMonthlyAmount < standardMonthlyPayment) {
        return {
            valid: false,
            error: `Minimum monthly payment is ₦${standardMonthlyPayment.toFixed(2)}`,
            minimumPayment: standardMonthlyPayment
        }
    }

    // Calculate new duration with custom payment
    const newDuration = Math.ceil(totalAmount / customMonthlyAmount)

    if (newDuration > 12) {
        return {
            valid: false,
            error: 'Payment period cannot exceed 12 months',
            minimumPayment: standardMonthlyPayment
        }
    }

    return {
        valid: true,
        totalAmount,
        monthlyPayment: customMonthlyAmount,
        duration: newDuration,
        totalSavings: (duration - newDuration) * standardMonthlyPayment
    }
}

/**
 * Get the last day of the current month
 */
export const getLastDayOfMonth = (date = new Date()) => {
    const d = new Date(date)
    return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

/**
 * Get the last day of next month (for first deduction)
 */
export const getFirstDeductionDate = (applicationDate = new Date()) => {
    const d = new Date(applicationDate)
    // Get last day of next month
    return new Date(d.getFullYear(), d.getMonth() + 2, 0)
}

/**
 * Format deduction schedule for display
 */
export const formatDeductionSchedule = (schedule) => {
    return schedule.map(item => ({
        ...item,
        formattedDate: new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(item.dueDate),
        formattedAmount: `₦${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }))
}
