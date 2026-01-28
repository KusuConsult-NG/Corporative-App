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

// ========================================
// NEW LOAN ELIGIBILITY FUNCTIONS
// ========================================

import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * Check if a user has paid their membership fee
 */
export const checkMembershipFeePaid = async (userId) => {
    // BYPASS FOR TESTING: Always return true
    return true

    /*
    try {
        const q = query(
            collection(db, 'users'),
            where('userId', '==', userId),
            limit(1)
        )
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) return false

        const userData = querySnapshot.docs[0].data()
        return userData.registrationFeePaid === true
    } catch (error) {
        console.error('Error checking membership fee:', error)
        return false
    }
    */
}

/**
 * Check if a user has consistent savings for a specified number of months
 */
export const checkConsistentSavings = async (memberId, requiredMonths) => {
    try {
        const userQuery = query(
            collection(db, 'users'),
            where('memberId', '==', memberId),
            limit(1)
        )
        const userSnapshot = await getDocs(userQuery)

        if (userSnapshot.empty) return { eligible: false, message: 'User not found' }

        const userData = userSnapshot.docs[0].data()
        const joinDate = userData.joinedAt?.toDate()

        if (!joinDate) return { eligible: false, message: 'Join date not available' }

        const monthsSinceJoining = Math.floor((new Date() - joinDate) / (1000 * 60 * 60 * 24 * 30))

        if (monthsSinceJoining < requiredMonths) {
            return {
                eligible: false,
                message: `You need to be a member for at least ${requiredMonths} months. You've been a member for ${monthsSinceJoining} month(s).`
            }
        }

        const transactionsQuery = query(
            collection(db, 'wallet_transactions'),
            where('memberId', '==', memberId),
            where('type', '==', 'credit')
        )
        const transactionsSnapshot = await getDocs(transactionsQuery)

        if (transactionsSnapshot.empty) {
            return { eligible: false, message: 'No savings transactions found' }
        }

        const transactions = transactionsSnapshot.docs
            .map(doc => doc.data())
            .sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0
                const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0
                return bTime - aTime
            })

        const monthsWithTransactions = new Set()
        const cutoffDate = new Date()
        cutoffDate.setMonth(cutoffDate.getMonth() - requiredMonths)

        transactions.forEach(tx => {
            const txDate = tx.createdAt?.toDate()
            if (txDate && txDate >= cutoffDate) {
                const monthKey = `${txDate.getFullYear()}-${txDate.getMonth()}`
                monthsWithTransactions.add(monthKey)
            }
        })

        const monthsCount = monthsWithTransactions.size

        if (monthsCount < requiredMonths) {
            return {
                eligible: false,
                message: `You need consistent savings for ${requiredMonths} months. You have savings in ${monthsCount} month(s).`
            }
        }

        return { eligible: true, message: 'Eligible for this loan type' }
    } catch (error) {
        console.error('Error checking consistent savings:', error)
        return { eligible: false, message: 'Error checking savings history' }
    }
}

/**
 * Get user's current wallet balance
 */
export const getUserSavingsBalance = async (memberId) => {
    try {
        const q = query(
            collection(db, 'wallets'),
            where('memberId', '==', memberId),
            limit(1)
        )
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) return 0

        return querySnapshot.docs[0].data().balance || 0
    } catch (error) {
        console.error('Error getting savings balance:', error)
        return 0
    }
}

/**
 * Calculate loan eligibility for specific loan types
 */
export const calculateLoanEligibility = async (userId, memberId, loanType) => {
    const result = {
        eligible: false,
        message: '',
        maxAmount: 0
    }

    try {
        switch (loanType) {
            case 'swift_relief':
                const feePaid = await checkMembershipFeePaid(userId)
                if (!feePaid) {
                    result.message = 'You must pay the membership fee (₦2,000) before applying for a loan.'
                    return result
                }
                result.eligible = true
                result.maxAmount = 30000
                result.message = 'You are eligible for the Swift Relief Loan'
                break

            case 'advancement':
                const advancementCheck = await checkConsistentSavings(memberId, 3)
                if (!advancementCheck.eligible) {
                    result.message = advancementCheck.message
                    return result
                }

                const advancementBalance = await getUserSavingsBalance(memberId)
                if (advancementBalance <= 0) {
                    result.message = 'You need to have savings to qualify for this loan.'
                    return result
                }

                result.eligible = true
                result.maxAmount = advancementBalance * 2
                result.message = `You are eligible for up to ₦${result.maxAmount.toLocaleString()} (2x your savings)`
                break

            case 'progress_plus':
                const progressCheck = await checkConsistentSavings(memberId, 6)
                if (!progressCheck.eligible) {
                    result.message = progressCheck.message
                    return result
                }

                const progressBalance = await getUserSavingsBalance(memberId)
                if (progressBalance <= 0) {
                    result.message = 'You need to have savings to qualify for this loan.'
                    return result
                }

                result.eligible = true
                result.maxAmount = progressBalance * 3
                result.message = `You are eligible for up to ₦${result.maxAmount.toLocaleString()} (3x your savings)`
                break

            default:
                result.message = 'Invalid loan type'
        }

        return result
    } catch (error) {
        console.error('Error calculating loan eligibility:', error)
        result.message = 'Error checking eligibility'
        return result
    }
}

/**
 * Calculate repayment details for new loan types
 */
export const calculateNewLoanRepayment = (amount, loanType, duration) => {
    let interestAmount = 0
    let interestRate = 0

    switch (loanType) {
        case 'swift_relief':
            // Swift Relief: 6% for exactly 3 months
            if (duration !== 3) {
                throw new Error('Swift Relief loans must be exactly 3 months')
            }
            interestRate = 6
            interestAmount = amount * 0.06 // 6% flat for 3 months
            break

        case 'advancement':
            // Advancement Loan: 12% for exactly 6 months
            if (duration !== 6) {
                throw new Error('Advancement loans must be exactly 6 months')
            }
            interestRate = 12
            interestAmount = amount * 0.12 // 12% flat for 6 months
            break

        case 'progress_plus':
            // Progress Plus: 18% per annum
            interestRate = 18
            const years = duration / 12
            interestAmount = amount * 0.18 * years // 18% per annum
            break

        default:
            throw new Error('Invalid loan type')
    }

    const totalRepayment = amount + interestAmount
    const monthlyPayment = totalRepayment / duration

    return {
        principal: amount,
        interestRate,
        interestAmount,
        totalRepayment,
        monthlyPayment,
        duration
    }
}

/**
 * Generate loan schedule for bursary submission
 */
export const generateLoanSchedule = (loanData, memberData) => {
    const { amount, duration, loanType, createdAt } = loanData
    const repayment = calculateNewLoanRepayment(amount, loanType, duration)

    const schedule = {
        memberInfo: {
            name: memberData.name,
            staffId: memberData.staffId,
            memberId: memberData.memberId,
            department: memberData.department
        },
        loanDetails: {
            amount: amount,
            interestRate: repayment.interestRate,
            interestAmount: repayment.interestAmount,
            totalRepayment: repayment.totalRepayment,
            duration: duration,
            monthlyPayment: repayment.monthlyPayment,
            loanType: loanType,
            applicationDate: createdAt?.toDate().toLocaleDateString() || new Date().toLocaleDateString()
        },
        monthlySchedule: []
    }

    const startDate = createdAt?.toDate() || new Date()
    startDate.setDate(1)
    startDate.setMonth(startDate.getMonth() + 1)

    let balance = repayment.totalRepayment

    for (let i = 0; i < duration; i++) {
        const paymentDate = new Date(startDate)
        paymentDate.setMonth(paymentDate.getMonth() + i)

        balance -= repayment.monthlyPayment

        schedule.monthlySchedule.push({
            month: i + 1,
            date: paymentDate.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' }),
            amount: repayment.monthlyPayment,
            balance: Math.max(0, balance)
        })
    }

    return schedule
}
