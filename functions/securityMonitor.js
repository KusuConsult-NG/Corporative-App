const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { sendAlert } = require('./emailAlertService')

/**
 * Monitor failed login attempts
 * Triggers alert when user has 3+ failed logins in 10 minutes
 */
exports.monitorFailedLogins = functions.firestore
    .document('failed_logins/{id}')
    .onCreate(async (snap, context) => {
        try {
            const { email, ip, timestamp } = snap.data()

            // Count recent failures for this email (last 10 minutes)
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
            const recentFailures = await admin.firestore()
                .collection('failed_logins')
                .where('email', '==', email)
                .where('timestamp', '>', tenMinutesAgo)
                .get()

            const attemptCount = recentFailures.size

            if (attemptCount >= 3) {
                // Get user name if exists
                const userQuery = await admin.firestore()
                    .collection('users')
                    .where('email', '==', email)
                    .limit(1)
                    .get()

                const userName = userQuery.empty ? 'Unknown' : userQuery.docs[0].data().name

                // Send alert
                await sendAlert('FAILED_LOGIN_ATTEMPTS', {
                    userName,
                    email,
                    attempts: attemptCount,
                    ip: ip || 'Unknown',
                    timestamp: new Date()
                })

                console.log(`🚨 Failed login alert sent: ${email} (${attemptCount} attempts)`)
            }
        } catch (error) {
            console.error('Error monitoring failed logins:', error)
        }
    })

/**
 * Monitor large withdrawals
 * Triggers alert for withdrawals > ₦50,000
 */
exports.monitorLargeWithdrawals = functions.firestore
    .document('savings_transactions/{id}')
    .onCreate(async (snap, context) => {
        try {
            const transaction = snap.data()

            if (transaction.type === 'withdrawal' && transaction.amount > 50000) {
                // Get user details
                const userDoc = await admin.firestore()
                    .collection('users')
                    .doc(transaction.userId)
                    .get()

                if (!userDoc.exists) return

                const user = userDoc.data()

                await sendAlert('LARGE_WITHDRAWAL', {
                    amount: transaction.amount,
                    userName: user.name,
                    memberId: user.memberId,
                    accountType: 'Savings',
                    balance: transaction.balanceAfter || transaction.newBalance
                })

                console.log(`🚨 Large withdrawal alert: ₦${transaction.amount} by ${user.name}`)
            }
        } catch (error) {
            console.error('Error monitoring withdrawals:', error)
        }
    })

/**
 * Monitor role changes
 * Triggers alert when user role is changed
 */
exports.monitorRoleChanges = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        try {
            const before = change.before.data()
            const after = change.after.data()

            // Check if role changed
            if (before.role !== after.role) {
                // Get who made the change (from audit log if available)
                const recentAuditLog = await admin.firestore()
                    .collection('audit_logs')
                    .where('targetUserId', '==', context.params.userId)
                    .where('action', '==', 'UPDATE_USER_ROLE')
                    .orderBy('timestamp', 'desc')
                    .limit(1)
                    .get()

                const changedBy = recentAuditLog.empty
                    ? 'System'
                    : recentAuditLog.docs[0].data().actorName

                await sendAlert('ROLE_CHANGE', {
                    userName: after.name,
                    memberId: after.memberId,
                    oldRole: before.role,
                    newRole: after.role,
                    changedBy
                })

                console.log(`🚨 Role change alert: ${after.name} (${before.role} → ${after.role})`)
            }
        } catch (error) {
            console.error('Error monitoring role changes:', error)
        }
    })

/**
 * Monitor savings reduction requests
 * Triggers alert for any savings reduction request
 */
exports.monitorSavingsReduction = functions.firestore
    .document('savings_reductions/{id}')
    .onCreate(async (snap, context) => {
        try {
            const reduction = snap.data()

            // Get user details
            const userDoc = await admin.firestore()
                .collection('users')
                .doc(reduction.userId)
                .get()

            if (!userDoc.exists) return

            const user = userDoc.data()

            await sendAlert('SAVINGS_REDUCTION', {
                amount: reduction.amount,
                userName: user.name,
                memberId: user.memberId,
                reason: reduction.reason,
                currentSavings: reduction.currentAmount,
                status: reduction.status
            })

            console.log(`⚠️ Savings reduction alert: ₦${reduction.amount} by ${user.name}`)
        } catch (error) {
            console.error('Error monitoring savings reduction:', error)
        }
    })

/**
 * Monitor large commodity orders
 * Triggers alert for orders > ₦30,000
 */
exports.monitorLargeCommodityOrders = functions.firestore
    .document('commodity_orders/{id}')
    .onCreate(async (snap, context) => {
        try {
            const order = snap.data()

            if (order.totalAmount > 30000) {
                // Get user details
                const userDoc = await admin.firestore()
                    .collection('users')
                    .doc(order.userId)
                    .get()

                if (!userDoc.exists) return

                const user = userDoc.data()

                await sendAlert('LARGE_COMMODITY_ORDER', {
                    amount: order.totalAmount,
                    userName: user.name,
                    memberId: user.memberId,
                    items: order.items?.length || 0,
                    commodityType: order.items?.[0]?.name || 'Multiple items'
                })

                console.log(`⚠️ Large commodity order: ₦${order.totalAmount} by ${user.name}`)
            }
        } catch (error) {
            console.error('Error monitoring commodity orders:', error)
        }
    })

/**
 * Log failed login attempt
 * Call this from frontend when login fails
 */
exports.logFailedLogin = functions.https.onCall(async (data, context) => {
    try {
        const { email } = data
        const ip = context.rawRequest?.ip || 'Unknown'

        await admin.firestore().collection('failed_logins').add({
            email,
            ip,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userAgent: context.rawRequest?.headers['user-agent'] || 'Unknown'
        })

        return { success: true }
    } catch (error) {
        console.error('Error logging failed login:', error)
        return { success: false, error: error.message }
    }
})
