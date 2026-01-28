import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * Analytics Service for fetching and processing data for charts
 */

/**
 * Get loan statistics for analytics
 */
export async function getLoanAnalytics(startDate = null) {
    try {
        const loansSnapshot = await getDocs(collection(db, 'loans'))
        let loans = loansSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
        }))

        // Filter by date range if provided
        if (startDate) {
            loans = loans.filter(loan => loan.createdAt >= startDate)
        }

        // Loan status distribution
        const statusDistribution = {
            pending: loans.filter(l => l.status === 'pending').length,
            approved: loans.filter(l => l.status === 'approved').length,
            active: loans.filter(l => l.status === 'active').length,
            completed: loans.filter(l => l.status === 'completed').length,
            rejected: loans.filter(l => l.status === 'rejected').length
        }

        // Loan type distribution
        const typeDistribution = loans.reduce((acc, loan) => {
            const type = loan.loanType || 'unknown'
            acc[type] = (acc[type] || 0) + 1
            return acc
        }, {})

        // Monthly loan trends (last 6 months)
        const monthlyTrends = getMonthlyTrends(loans, 6)

        // Total amounts
        const totalDisbursed = loans
            .filter(l => ['active', 'completed'].includes(l.status))
            .reduce((sum, l) => sum + (l.amount || 0), 0)

        const totalOutstanding = loans
            .filter(l => l.status === 'active')
            .reduce((sum, l) => sum + (l.remainingBalance || l.amount || 0), 0)

        return {
            statusDistribution,
            typeDistribution,
            monthlyTrends,
            totalDisbursed,
            totalOutstanding,
            totalLoans: loans.length
        }
    } catch (error) {
        console.error('Error fetching loan analytics:', error)
        throw error
    }
}

/**
 * Get savings analytics
 */
export async function getSavingsAnalytics(startDate = null) {
    try {
        const walletsSnapshot = await getDocs(collection(db, 'wallets'))
        const wallets = walletsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        // Get transactions for trend analysis
        const transactionsSnapshot = await getDocs(
            query(collection(db, 'wallet_transactions'), orderBy('createdAt', 'desc'))
        )
        const transactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
        }))

        // Total savings
        const totalSavings = wallets.reduce((sum, w) => sum + (w.balance || 0), 0)

        // Average savings per member
        const avgSavings = wallets.length > 0 ? totalSavings / wallets.length : 0

        // Monthly savings trend (last 6 months)
        const monthlySavingsTrend = getMonthlyTransactionTrends(
            transactions.filter(t => t.type === 'credit' || t.type === 'deposit'),
            6
        )

        // Savings distribution by range
        const savingsRanges = {
            '0-50k': wallets.filter(w => w.balance < 50000).length,
            '50k-100k': wallets.filter(w => w.balance >= 50000 && w.balance < 100000).length,
            '100k-200k': wallets.filter(w => w.balance >= 100000 && w.balance < 200000).length,
            '200k+': wallets.filter(w => w.balance >= 200000).length
        }

        return {
            totalSavings,
            avgSavings,
            monthlySavingsTrend,
            savingsRanges,
            totalMembers: wallets.length
        }
    } catch (error) {
        console.error('Error fetching savings analytics:', error)
        throw error
    }
}

/**
 * Get member analytics
 */
export async function getMemberAnalytics(startDate = null) {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'))
        let users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
        }))

        // Filter by date range if provided (for growth metrics)
        const allUsers = users
        if (startDate) {
            users = users.filter(user => user.createdAt >= startDate)
        }

        // Total members (always use all users for total count)
        const totalMembers = allUsers.length

        // Verified vs unverified (use all users)
        const verified = allUsers.filter(u => u.emailVerified).length
        const unverified = totalMembers - verified

        // Registration fee paid (use all users)
        const feePaid = allUsers.filter(u => u.registrationFeePaid).length
        const feeNotPaid = totalMembers - feePaid

        // Monthly member growth (last 6 months)
        const monthlyGrowth = getMonthlyTrends(users, 6)

        // Department distribution (use all users)
        const departmentDistribution = allUsers.reduce((acc, user) => {
            const dept = user.department || 'Unspecified'
            acc[dept] = (acc[dept] || 0) + 1
            return acc
        }, {})

        // Role distribution (use all users)
        const roleDistribution = allUsers.reduce((acc, user) => {
            const role = user.role || 'member'
            acc[role] = (acc[role] || 0) + 1
            return acc
        }, {})

        return {
            totalMembers,
            verified,
            unverified,
            feePaid,
            feeNotPaid,
            monthlyGrowth,
            departmentDistribution,
            roleDistribution
        }
    } catch (error) {
        console.error('Error fetching member analytics:', error)
        throw error
    }
}

/**
 * Get commodity analytics
 */
export async function getCommodityAnalytics(startDate = null) {
    try {
        const ordersSnapshot = await getDocs(collection(db, 'commodity_orders'))
        let orders = ordersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
        }))

        // Filter by date range if provided
        if (startDate) {
            orders = orders.filter(order => order.createdAt >= startDate)
        }

        // Status distribution
        const statusDistribution = {
            pending: orders.filter(o => o.status === 'pending').length,
            approved: orders.filter(o => o.status === 'approved').length,
            delivered: orders.filter(o => o.status === 'delivered').length,
            rejected: orders.filter(o => o.status === 'rejected').length
        }

        // Total revenue
        const totalRevenue = orders
            .filter(o => o.status === 'delivered')
            .reduce((sum, o) => sum + (o.totalPrice || 0), 0)

        // Monthly order trends
        const monthlyTrends = getMonthlyTrends(orders, 6)

        // Popular items
        const itemFrequency = orders.reduce((acc, order) => {
            const item = order.itemName || order.commodityId
            acc[item] = (acc[item] || 0) + 1
            return acc
        }, {})

        const popularItems = Object.entries(itemFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }))

        return {
            statusDistribution,
            totalRevenue,
            totalOrders: orders.length,
            monthlyTrends,
            popularItems
        }
    } catch (error) {
        console.error('Error fetching commodity analytics:', error)
        throw error
    }
}

/**
 * Helper: Get monthly trends for documents
 */
function getMonthlyTrends(documents, monthsCount = 6) {
    const now = new Date()
    const trends = []

    for (let i = monthsCount - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' })

        const count = documents.filter(doc => {
            const docDate = doc.createdAt
            return (
                docDate.getMonth() === date.getMonth() &&
                docDate.getFullYear() === date.getFullYear()
            )
        }).length

        trends.push({ month: monthName, count })
    }

    return trends
}

/**
 * Helper: Get monthly transaction trends
 */
function getMonthlyTransactionTrends(transactions, monthsCount = 6) {
    const now = new Date()
    const trends = []

    for (let i = monthsCount - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' })

        const monthTotal = transactions
            .filter(txn => {
                const txnDate = txn.createdAt
                return (
                    txnDate.getMonth() === date.getMonth() &&
                    txnDate.getFullYear() === date.getFullYear()
                )
            })
            .reduce((sum, txn) => sum + (txn.amount || 0), 0)

        trends.push({ month: monthName, amount: monthTotal })
    }

    return trends
}

/**
 * Get dashboard overview stats
 */
export async function getDashboardStats() {
    try {
        const [loanStats, savingsStats, memberStats] = await Promise.all([
            getLoanAnalytics(),
            getSavingsAnalytics(),
            getMemberAnalytics()
        ])

        return {
            loans: loanStats,
            savings: savingsStats,
            members: memberStats
        }
    } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        throw error
    }
}
